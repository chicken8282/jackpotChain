/**
 * @file ChatBot.tsx
 * @description 싸또 AI 챗봇 UI 컴포넌트.
 *
 * 우측 하단에 고정된 플로팅 버튼을 누르면 채팅창이 열립니다.
 * SSE 스트리밍으로 실시간 응답이 표시됩니다.
 *
 * [비활성화 방법]
 * chatbotConfig.ts의 CHATBOT_ENABLED를 false로 변경하면 됩니다.
 *
 * [구조]
 * - 플로팅 버튼: 동영상(chatbot.mp4) + 펄스 애니메이션
 * - 채팅창: 헤더 + 메시지 영역 + 입력창
 * - 말풍선: 사용자(우측, 골드) / 봇(좌측, 회색)
 */

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { CHATBOT_ENABLED } from "./chatbotConfig";
import { useChatBot } from "./useChatBot";

export default function ChatBot() {
  // ── 챗봇 비활성화 시 아무것도 렌더링하지 않음 ──
  if (!CHATBOT_ENABLED) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  const { messages, isLoading, sendMessage, clearMessages } = useChatBot();

  // 메시지 영역 DOM ref (자동 스크롤용)
  const msgBoxRef = useRef<HTMLDivElement>(null);

  // ── 메시지가 추가될 때마다 스크롤을 최하단으로 이동 ──
  useEffect(() => {
    if (msgBoxRef.current) {
      msgBoxRef.current.scrollTop = msgBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // ── 메시지 전송 핸들러 ──
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");
    sendMessage(text);
  };

  // ── Enter 키 전송 ──
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 마지막 메시지가 user일 때만 타이핑 인디케이터 표시 ──
  const showTyping =
    isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <div className="fixed bottom-20 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* ════════════════════════════════════════════════════════════════════
          채팅창
          ════════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="flex w-[360px] max-h-[520px] flex-col overflow-hidden rounded-2xl
                     border border-[rgba(255,215,0,0.3)] bg-[rgba(20,20,20,0.97)]
                     shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl
                     animate-[slideUp_0.25s_ease]"
        >
          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between border-b border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.08)] px-4 py-3">
            <span className="text-sm font-bold text-[#ffd700]">
              🎰 싸또 AI 도우미
            </span>
            <div className="flex items-center gap-2">
              {/* 대화 초기화 버튼 */}
              <button
                onClick={clearMessages}
                className="text-xs text-gray-500 transition-colors hover:text-white"
                title="대화 초기화"
              >
                🗑️
              </button>
              {/* 닫기 버튼 */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-base text-gray-500 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── 메시지 영역 ── */}
          <div
            ref={msgBoxRef}
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3.5
                       scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[rgba(255,215,0,0.2)]"
          >
            {/* 빈 상태 안내 */}
            {messages.length === 0 && (
              <p className="mt-10 text-center text-[13px] text-gray-500">
                안녕하세요! 블록체인에 대해 궁금한 것을 물어보세요 😊
              </p>
            )}

            {/* 메시지 말풍선 */}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                // ── 사용자 말풍선 (우측, 골드) ──
                <div
                  key={i}
                  className="max-w-[88%] self-end rounded-[14px_14px_2px_14px]
                             border border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.15)]
                             px-3 py-2 text-[13px] leading-relaxed text-[#f0e68c]"
                >
                  {msg.content}
                </div>
              ) : (
                // ── 봇 말풍선 (좌측, 회색) ──
                <div
                  key={i}
                  className="max-w-[88%] self-start rounded-[14px_14px_14px_2px]
                             border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]
                             px-3 py-2 text-[13px] leading-relaxed text-[#ddd]"
                >
                  <span className="mb-1 block text-[10px] font-bold text-[#ffd700]">
                    싸또
                  </span>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ),
            )}

            {/* ── 타이핑 인디케이터 (●●●) ── */}
            {showTyping && (
              <div
                className="max-w-[88%] self-start rounded-[14px_14px_14px_2px]
                           border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]
                           px-3 py-2"
              >
                <span className="mb-1 block text-[10px] font-bold text-[#ffd700]">
                  싸또
                </span>
                <div className="flex items-center gap-1 h-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700] animate-[bounce_1.2s_ease-in-out_infinite]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700] animate-[bounce_1.2s_ease-in-out_0.2s_infinite]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700] animate-[bounce_1.2s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
            )}
          </div>

          {/* ── 입력창 ── */}
          <div className="flex gap-2 border-t border-[rgba(255,255,255,0.08)] px-3 py-2.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              className="flex-1 rounded-full border border-[rgba(255,215,0,0.25)]
                         bg-[rgba(255,255,255,0.05)] px-3.5 py-2 text-[13px] text-white
                         outline-none transition-colors placeholder:text-gray-600
                         focus:border-[rgba(255,215,0,0.6)] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center
                         rounded-full bg-[#ffd700] text-sm text-[#111]
                         transition-all hover:bg-[#ffe44d] hover:scale-105
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          플로팅 버튼 (우측 하단 고정)
          ════════════════════════════════════════════════════════════════════ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "닫기" : "싸또에게 물어보기"}
        className="relative h-[72px] w-[72px] overflow-hidden rounded-full
                   border-2 border-[rgba(255,215,0,0.6)] bg-[#1a1a1a] p-0
                   shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all
                   hover:scale-[1.08] hover:shadow-[0_0_32px_rgba(255,215,0,0.5)]"
      >
        {/* 챗봇 동영상 썸네일 */}
        <video
          src="/chatbot.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />

        {/* 펄스 링 애니메이션 (닫혀있을 때만) */}
        {!isOpen && (
          <span
            className="pointer-events-none absolute -inset-1 rounded-full
                       border-2 border-[rgba(255,215,0,0.5)]
                       animate-[pulse_2s_ease-out_infinite]"
          />
        )}
      </button>
    </div>
  );
}
