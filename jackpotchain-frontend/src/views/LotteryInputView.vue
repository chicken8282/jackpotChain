<template>
  <div class="lottery-input">
    <div class="card">
      <div class="header">
        <div class="icon">🔗</div>
        <h1 class="title">당신의 6자리를 선택하세요</h1>
        <p class="description">0~f 사이의 hex 숫자 입력 · 미래 블록 해시와 비교됩니다</p>
      </div>

      <div class="input-section">
        <div class="input-boxes">
          <input
            v-for="(value, index) in userNumbers"
            :key="index"
            :ref="el => (inputRefs[index] = el as HTMLInputElement)"
            v-model="userNumbers[index]"
            type="text"
            maxlength="1"
            class="input-box"
            :class="{ error: errors[index], filled: userNumbers[index] }"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            @paste="handlePaste"
          />
        </div>

        <div class="info-bar">
          <div class="info-item">
            <span class="label">TOTAL JACKPOT</span>
            <span class="value gold">12.85 ETH</span>
          </div>
          <div class="divider">|</div>
          <div class="info-item">
            <span class="label">PARTICIPANTS</span>
            <span class="value">1,429</span>
          </div>
          <div class="divider">|</div>
          <div class="info-item">
            <span class="label">NEXT DRAW</span>
            <span class="value">02:45:12</span>
          </div>
        </div>

        <button
          class="submit-btn"
          :class="{ active: isComplete }"
          :disabled="!isComplete"
          @click="startMining"
        >
          당신의 번호로 채굴 시작하기 →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const userNumbers = ref<string[]>(['', '', '', '', '', ''])
const errors = ref<boolean[]>([false, false, false, false, false, false])
const inputRefs = ref<HTMLInputElement[]>([])

const isComplete = computed(() => {
  return userNumbers.value.every(num => num !== '')
})

const isValidHex = (char: string): boolean => {
  return /^[0-9a-fA-F]$/.test(char)
}

const handleInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.toLowerCase()

  if (value && !isValidHex(value)) {
    // Invalid character - shake animation
    errors.value[index] = true
    userNumbers.value[index] = ''
    setTimeout(() => {
      errors.value[index] = false
    }, 500)
    return
  }

  if (value) {
    userNumbers.value[index] = value
    // Move to next input
    if (index < 5) {
      nextTick(() => {
        inputRefs.value[index + 1]?.focus()
      })
    }

    // Shimmer effect when all filled
    if (isComplete.value) {
      triggerShimmer()
    }
  }
}

const handleKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !userNumbers.value[index] && index > 0) {
    // Move to previous input
    nextTick(() => {
      inputRefs.value[index - 1]?.focus()
    })
  }

  if (event.key === 'ArrowLeft' && index > 0) {
    nextTick(() => {
      inputRefs.value[index - 1]?.focus()
    })
  }

  if (event.key === 'ArrowRight' && index < 5) {
    nextTick(() => {
      inputRefs.value[index + 1]?.focus()
    })
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const paste = event.clipboardData?.getData('text') || ''
  const chars = paste.toLowerCase().slice(0, 6).split('')

  chars.forEach((char, index) => {
    if (index < 6 && isValidHex(char)) {
      userNumbers.value[index] = char
    }
  })

  if (isComplete.value) {
    triggerShimmer()
  }
}

const triggerShimmer = () => {
  // Add shimmer effect class
  document.querySelector('.input-boxes')?.classList.add('shimmer')
  setTimeout(() => {
    document.querySelector('.input-boxes')?.classList.remove('shimmer')
  }, 1000)
}

const startMining = () => {
  if (!isComplete.value) return

  // Save user numbers to session storage
  sessionStorage.setItem('userNumbers', JSON.stringify(userNumbers.value))

  // Navigate to education screen
  router.push('/education')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.lottery-input {
  width: 100vw;
  height: 100vh;
  background-color: #0A0A0F;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  max-width: 800px;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.title {
  font-family: 'Syne', sans-serif;
  font-size: 40px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 0 0 16px 0;
}

.description {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #888899;
  margin: 0;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.input-boxes {
  display: flex;
  gap: 16px;
  justify-content: center;
  position: relative;
}

.input-box {
  width: 80px;
  height: 80px;
  background-color: #1A1A26;
  border: 2px solid #2A2A3A;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  color: #F0B429;
  text-align: center;
  text-transform: uppercase;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  outline: none;
}

.input-box:focus {
  border-color: #F0B429;
  box-shadow: 0 0 20px rgba(240, 180, 41, 0.3);
}

.input-box.filled {
  border-color: #F0B429;
}

.input-box.error {
  border-color: #EF4444;
  animation: shake 0.5s;
}

.info-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background-color: #12121A;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #888899;
  letter-spacing: 1px;
}

.value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.value.gold {
  color: #F0B429;
}

.divider {
  color: #2A2A3A;
  font-size: 20px;
}

.submit-btn {
  width: 100%;
  height: 56px;
  background-color: #F0B429;
  color: #0A0A0F;
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  opacity: 0.4;
}

.submit-btn:disabled {
  cursor: not-allowed;
}

.submit-btn.active {
  opacity: 1;
  animation: pulse 2s infinite;
}

.submit-btn.active:hover {
  background-color: #FFD15C;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(240, 180, 41, 0.3);
}

.submit-btn.active:hover::after {
  content: '→';
  margin-left: 8px;
  animation: slideRight 0.3s ease-out;
}

/* Shimmer effect */
.input-boxes.shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(240, 180, 41, 0.3),
    transparent
  );
  animation: shimmer 1s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(240, 180, 41, 0.7);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(240, 180, 41, 0);
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes slideRight {
  from {
    transform: translateX(-5px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 반응형 */
@media (max-width: 768px) {
  .title {
    font-size: 28px;
  }

  .input-box {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .input-boxes {
    gap: 8px;
  }

  .info-bar {
    flex-direction: column;
    gap: 12px;
  }

  .divider {
    display: none;
  }
}
</style>
