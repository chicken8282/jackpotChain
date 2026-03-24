/**
 * @file useChatBot.ts
 * @description 싸또 AI 챗봇 React 커스텀 훅.
 *
 * GMS 프록시 → OpenAI gpt-4.1-mini (비추론 모델, 빠른 응답)
 * SSE 스트리밍으로 답변이 생성되는 즉시 글자 단위로 화면에 표시합니다.
 *
 * [사용법]
 *   const { messages, isLoading, sendMessage, clearMessages } = useChatBot();
 *
 * [Vue → React 변환 내역]
 *   - ref()      → useState()
 *   - watch()    → useEffect()
 *   - composable → 커스텀 훅
 */

import { useState, useCallback, useRef } from "react";
import {
  GMS_ENDPOINT,
  GMS_API_KEY,
  MODEL,
  MAX_TOKENS,
  SYSTEM_PROMPT,
} from "./chatbotConfig";

// ──────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────────────────────────────────────

/** 대화 메시지 역할 */
type Role = "user" | "assistant" | "system";

/** 단일 대화 메시지 */
export interface ChatMessage {
  role: Role;
  content: string;
}

/** 훅 반환 타입 */
export interface UseChatBotReturn {
  /** 대화 메시지 배열 */
  messages: ChatMessage[];
  /** API 호출/스트리밍 진행 중 여부 */
  isLoading: boolean;
  /** 마지막 오류 메시지 (없으면 null) */
  error: string | null;
  /** 사용자 메시지 전송 + SSE 스트리밍 수신 */
  sendMessage: (text: string) => Promise<void>;
  /** 대화 히스토리 초기화 */
  clearMessages: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// 훅 본체
// ──────────────────────────────────────────────────────────────────────────────

export function useChatBot(): UseChatBotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 스트리밍 중 abort를 위한 ref (연속 요청 방지)
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 사용자 메시지를 전송하고 SSE 스트리밍으로 응답을 수신합니다.
   *
   * [동작 흐름]
   * 1. 사용자 메시지를 messages 배열에 추가
   * 2. 빈 assistant 메시지를 미리 추가 (스트리밍 청크 누적용)
   * 3. fetch + SSE 스트리밍으로 GMS API 호출
   * 4. 청크가 올 때마다 assistant 메시지의 content에 글자 누적
   * 5. 스트리밍 완료 시 isLoading = false
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // 이전 요청이 진행 중이면 취소
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setIsLoading(true);

      // 1) 사용자 메시지 추가 + 빈 assistant 메시지 준비
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const botMsg: ChatMessage = { role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, botMsg]);

      try {
        // 2) GMS API 호출 (SSE 스트리밍)
        const res = await fetch(GMS_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GMS_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            stream: true, // SSE 스트리밍 활성화
            messages: [
              // 시스템 프롬프트 (챗봇의 역할/지식 정의)
              { role: "system", content: SYSTEM_PROMPT },
              // 대화 히스토리 (현재까지의 user/assistant 메시지)
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              // 이번에 보낸 사용자 메시지
              { role: "user", content: trimmed },
            ],
          }),
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        // 3) SSE 스트림 파싱 ─────────────────────────────────────
        //    네트워크 청크가 줄 중간에서 잘릴 수 있으므로
        //    buffer에 불완전한 줄을 보관하고 다음 청크와 이어붙입니다.
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 완전한 줄(\n으로 끝남)만 처리
          const lines = buffer.split("\n");
          // 마지막 요소(불완전할 수 있음)를 다음 루프로 이월
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const json = JSON.parse(data);
              const delta: string | undefined =
                json.choices?.[0]?.delta?.content;
              if (delta) {
                // 4) assistant 메시지에 글자 누적 (React 불변 업데이트)
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + delta,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // JSON 파싱 실패 시 무시 (잘린 줄은 buffer에서 처리됨)
            }
          }
        }

        // 빈 응답 처리
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              content: "답변을 가져올 수 없습니다.",
            };
            return updated;
          }
          return prev;
        });
      } catch (e: unknown) {
        // AbortError는 사용자가 의도적으로 취소한 경우이므로 무시
        if (e instanceof DOMException && e.name === "AbortError") return;

        const msg =
          e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
        setError(msg);

        // 오류 메시지를 assistant 말풍선에 표시
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "⚠️ 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  /** 대화 히스토리를 초기화합니다. */
  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
