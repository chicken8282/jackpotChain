<template>
  <!-- 우측 하단 고정 컨테이너 -->
  <div class="chatbot-wrapper">

    <!-- 채팅창 (열려 있을 때) -->
    <Transition name="slide-up">
      <div v-if="isOpen" class="chat-window">
        <!-- 헤더 -->
        <div class="chat-header">
          <span class="chat-title">🎰 싸또 AI 도우미</span>
          <button class="close-btn" @click="isOpen = false">✕</button>
        </div>

        <!-- 메시지 영역 -->
        <div ref="msgBox" class="chat-messages">
          <div v-if="messages.length === 0" class="chat-empty">
            안녕하세요! 블록체인에 대해 궁금한 것을 물어보세요 😊
          </div>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['chat-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-bot']"
          >
            <span v-if="msg.role === 'assistant'" class="bot-label">싸또</span>
            <p>{{ msg.content }}</p>
          </div>
          <!-- 스트리밍 시작 전(마지막 메시지가 user)에만 타이핑 인디케이터 표시 -->
          <div v-if="isLoading && messages[messages.length - 1]?.role === 'user'" class="chat-bubble bubble-bot">
            <span class="bot-label">싸또</span>
            <p class="typing-indicator"><span></span><span></span><span></span></p>
          </div>
        </div>

        <!-- 입력창 -->
        <div class="chat-input-row">
          <input
            v-model="inputText"
            type="text"
            placeholder="메시지를 입력하세요..."
            class="chat-input"
            @keydown.enter="handleSend"
            :disabled="isLoading"
          />
          <button class="send-btn" @click="handleSend" :disabled="isLoading || !inputText.trim()">
            ➤
          </button>
        </div>
      </div>
    </Transition>

    <!-- 챗봇 버튼 (영상 반복재생) -->
    <button class="chatbot-btn" @click="isOpen = !isOpen" :title="isOpen ? '닫기' : '싸또에게 물어보기'">
      <video
        src="/chatbot.mp4"
        autoplay
        loop
        muted
        playsinline
        class="chatbot-video"
      />
      <div v-if="!isOpen" class="pulse-ring" />
    </button>

  </div>
</template>

<script setup>
// 챗봇 UI 컴포넌트: 우측 하단 고정, 채팅창 열고닫기, 메시지 렌더링
import { ref, watch, nextTick } from 'vue'
import { useChatBot } from '../composables/useChatBot'

// 채팅창 열림 상태 및 입력값
const isOpen    = ref(false)
const inputText = ref('')
// 메시지 영역 DOM 참조 (스크롤 제어용)
const msgBox    = ref(null)

// GMS API 연동 composable에서 상태와 액션을 가져옵니다
const { messages, isLoading, sendMessage } = useChatBot()

/** 메시지 전송 핸들러 (버튼 클릭 / Enter) */
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return
  inputText.value = ''
  await sendMessage(text)
}

// 새 메시지가 추가될 때마다 스크롤을 최하단으로 이동
watch(messages, async () => {
  await nextTick()
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}, { deep: true })
</script>

<style scoped>
/* ── 위치 고정 ─────────────────────────────────── */
.chatbot-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

/* ── 챗봇 버튼 ─────────────────────────────────── */
.chatbot-btn {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid rgba(255, 215, 0, 0.6);
  overflow: hidden;
  cursor: pointer;
  background: #1a1a1a;
  padding: 0;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.chatbot-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 0 32px rgba(255, 215, 0, 0.5);
}
.chatbot-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 215, 0, 0.5);
  animation: pulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes pulse {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* ── 채팅창 ────────────────────────────────────── */
.chat-window {
  width: 340px;
  max-height: 480px;
  background: rgba(20, 20, 20, 0.97);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
}

/* 헤더 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 215, 0, 0.08);
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}
.chat-title {
  color: #ffd700;
  font-weight: 700;
  font-size: 14px;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s;
}
.close-btn:hover { color: #fff; }

/* 메시지 영역 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,215,0,0.2) transparent;
}
.chat-empty {
  color: #666;
  font-size: 13px;
  text-align: center;
  margin-top: 40px;
}

/* 말풍선 */
.chat-bubble {
  max-width: 88%;
  font-size: 13px;
  line-height: 1.5;
}
.chat-bubble p { margin: 0; }
.bubble-user {
  align-self: flex-end;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
  color: #f0e68c;
  border-radius: 14px 14px 2px 14px;
  padding: 8px 12px;
}
.bubble-bot {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ddd;
  border-radius: 14px 14px 14px 2px;
  padding: 8px 12px;
}
.bot-label {
  display: block;
  font-size: 10px;
  color: #ffd700;
  font-weight: 700;
  margin-bottom: 4px;
}

/* 타이핑 인디케이터 */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 16px;
}
.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd700;
  animation: bounce 1.2s ease-in-out infinite;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}

/* 입력창 */
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.chat-input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,215,0,0.25);
  border-radius: 20px;
  padding: 8px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input::placeholder { color: #555; }
.chat-input:focus { border-color: rgba(255,215,0,0.6); }
.chat-input:disabled { opacity: 0.5; }
.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #ffd700;
  color: #111;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.1s;
}
.send-btn:hover:not(:disabled) { background: #ffe44d; transform: scale(1.05); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 트랜지션 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
</style>
