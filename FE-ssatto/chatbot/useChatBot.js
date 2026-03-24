/**
 * @module useChatBot
 * @description 싸또 AI 챗봇 composable.
 *
 * GMS → OpenAI gpt-4.1-mini (비추론 모델, 빠른 응답)
 * SSE 스트리밍으로 답변이 생성되는 즉시 글자 단위로 표시합니다.
 *
 * 사용:
 *   const { messages, isLoading, sendMessage } = useChatBot()
 */
import { ref } from 'vue'

// ── GMS API 설정 ────────────────────────────────────────────────────────────
// Vite proxy(/gms-proxy → gms.ssafy.io/gmsapi)를 통해 CORS 우회
const GMS_ENDPOINT = '/gms-proxy/api.openai.com/v1/chat/completions'
const GMS_KEY      = 'S14P22E202-4ba1e4df-6ad5-4888-a92f-29c1fbb3f638'
const MODEL        = 'gpt-4.1-mini'

// ── 싸또 시스템 프롬프트 ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 JackpotChain 교육 플랫폼의 블록체인 학습 도우미 "싸또"입니다.

[역할]
- 블록체인 입문자가 핵심 개념을 쉽고 재미있게 이해할 수 있도록 돕습니다.
- JackpotChain 서비스(인플레이션 체험, 분산 장부 체험, 온체인 로또)와 연계해 설명합니다.

[답변 원칙]
- 초보자도 이해할 수 있는 비유와 예시를 적극 활용하세요.
- 답변은 3~5문장 이내로 간결하게 유지하세요.
- 블록체인, 해시, UTXO, PoW, Commit-Reveal, 지갑, 가챠(로또) 관련 질문에 특화되어 있습니다.
- 한국어로 답변하며, 전문 용어는 괄호 안에 영문을 병기합니다.

[JackpotChain 핵심 정보]
- JACK 코인: 채굴 보상 50 JACK/블록, 블록타임 30초
- POT 토큰: 100 JACK = 1 POT (로또 1회 참가권)
- 로또 방식: Commit-Reveal (조작 불가, 미래 블록 해시 활용)
- 당첨: 6개 블록 해시 마지막 자리로 판정, 1등(6일치 일치) = 풀의 50%
- 교육 목적 시뮬레이션이며 JACK/POT은 실제 가치 없음`

export function useChatBot() {
  // 대화 히스토리: { role: 'user'|'assistant', content: string }[]
  const messages  = ref([])
  // API 호출/스트리밍 중 여부 (로딩 인디케이터 표시용)
  const isLoading = ref(false)
  // 마지막 오류 메시지
  const error     = ref(null)

  /**
   * 사용자 메시지를 전송하고 SSE 스트리밍으로 응답을 수신합니다.
   * 빈 assistant 메시지를 먼저 추가한 뒤, 청크가 올 때마다 content에 누적합니다.
   * @param {string} userText - 사용자 입력 문자열
   */
  async function sendMessage(userText) {
    if (!userText.trim() || isLoading.value) return

    error.value = null
    messages.value.push({ role: 'user', content: userText.trim() })
    isLoading.value = true

    // 스트리밍 청크를 누적할 빈 assistant 메시지 미리 추가
    messages.value.push({ role: 'assistant', content: '' })
    const replyIdx = messages.value.length - 1

    try {
      const res = await fetch(GMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GMS_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          stream: true,   // SSE 스트리밍 활성화
          messages: [
            // 시스템 역할 프롬프트
            { role: 'system', content: SYSTEM_PROMPT },
            // 대화 히스토리 (마지막 빈 assistant 메시지 제외)
            ...messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('[GMS 오류]', res.status, errBody)
        throw new Error(`API 오류: ${res.status}`)
      }

      // ── SSE 스트림 파싱 ────────────────────────────────────
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''  // 청크 경계에서 잘린 줄을 보관

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 완전한 줄(\n으로 끝남)만 처리, 마지막 불완전한 줄은 buffer에 보관
        const lines = buffer.split('\n')
        buffer = lines.pop() // 마지막 요소(불완전할 수 있음)를 다음 루프로 이월

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const json  = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) messages.value[replyIdx].content += delta
          } catch { /* JSON 파싱 실패 시 무시 */ }
        }
      }

      // 빈 응답 처리
      if (!messages.value[replyIdx].content) {
        messages.value[replyIdx].content = '답변을 가져올 수 없습니다.'
      }
    } catch (e) {
      error.value = e.message
      messages.value[replyIdx].content = '⚠️ 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    } finally {
      isLoading.value = false
    }
  }

  /** 대화 히스토리를 초기화합니다. */
  function clearMessages() {
    messages.value = []
    error.value    = null
  }

  return { messages, isLoading, error, sendMessage, clearMessages }
}
