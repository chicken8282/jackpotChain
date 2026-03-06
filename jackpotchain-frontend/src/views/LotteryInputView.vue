<template>
  <div class="lottery-container">
    <!-- Phase 1: 제목 -->
    <section class="phase-section phase-intro">
      <div class="phase-content">
        <div class="intro-header">
          <h1 class="intro-title">블록체인 학습을 시작하기 전,<br />당신의 행운 번호 6자리를<br />먼저 선택하세요.</h1>
        </div>
        <div class="scroll-indicator">
          <span class="scroll-text">아래로 스크롤</span>
          <span class="scroll-icon">↓</span>
        </div>
      </div>
    </section>

    <!-- Phase 2: 당첨 방식 -->
    <section class="phase-section phase-explanation">
      <div class="phase-content">
        <div class="exp-section">
          <div class="exp-section-title">
            <span class="section-icon">⛓️</span>
            <span>당첨 방식</span>
          </div>
          <p class="exp-text">
            학습하는 동안 블록이 계속 생성됩니다.<br />
            <strong>마지막 6개 블록의 끝자리를 연달아 맞추면 당첨!</strong>
          </p>
          <div class="example-box">
            <div class="example-label">예시: 블록 #100~#105의 해시값</div>
            <div class="blockchain-visual">
              <div class="block-row">
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#100</div>
                    <div class="block-hash">...a<span class="highlight">3</span></div>
                  </div>
                </div>
                <span class="connector">→</span>
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#101</div>
                    <div class="block-hash">...2<span class="highlight">e</span></div>
                  </div>
                </div>
                <span class="connector">→</span>
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#102</div>
                    <div class="block-hash">...4<span class="highlight">1</span></div>
                  </div>
                </div>
              </div>
              <div class="block-row">
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#103</div>
                    <div class="block-hash">...f<span class="highlight">8</span></div>
                  </div>
                </div>
                <span class="connector">→</span>
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#104</div>
                    <div class="block-hash">...9<span class="highlight">b</span></div>
                  </div>
                </div>
                <span class="connector">→</span>
                <div class="block-item">
                  <div class="block-box">
                    <div class="block-number">#105</div>
                    <div class="block-hash">...d<span class="highlight">a</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="match-section">
              <div class="match-visual">
                <div class="match-row">
                  <span class="match-box">3</span>
                  <span class="match-box">e</span>
                  <span class="match-box">1</span>
                  <span class="match-box">8</span>
                  <span class="match-box">b</span>
                  <span class="match-box">a</span>
                </div>
                <div class="match-arrows">
                  <span class="match-arrow">↑</span>
                  <span class="match-arrow">↑</span>
                  <span class="match-arrow">↑</span>
                  <span class="match-arrow">↑</span>
                  <span class="match-arrow">↑</span>
                  <span class="match-arrow">↑</span>
                </div>
                <div class="match-label-row">
                  <span class="match-small-label">당신 번호</span>
                </div>
              </div>
              <div class="match-result-box">
                <span class="match-result-text">6개 모두 일치 → 전액 당첨!</span>
              </div>
            </div>
          </div>
        </div>
        <div class="scroll-indicator">
          <span class="scroll-text">아래로 스크롤</span>
          <span class="scroll-icon">↓</span>
        </div>
      </div>
    </section>

    <!-- Phase 3: 탈중앙화 -->
    <section class="phase-section phase-explanation">
      <div class="phase-content">
        <div class="exp-section">
          <div class="exp-section-title">
            <span class="section-icon">🔐</span>
            <span>탈중앙화된 공정한 추첨</span>
          </div>
          <p class="exp-text">
            <strong>분산원장 기술(DLT)</strong>로 모든 블록 생성 과정이 네트워크 전체에 공개됩니다.<br />
            <strong>탈중앙화</strong>되어 있어 특정 개인이나 조직이 결과를 조작할 수 없습니다.<br />
            전통적인 로또는 운영사를 신뢰해야 하지만, 블록체인은 <strong>코드와 수학을 신뢰</strong>합니다.
          </p>
          <p class="exp-text">
            6개 블록을 연속으로 조작하려면 네트워크 전체 컴퓨팅 파워의 51% 이상을 장악해야 하며,<br />
            그 비용과 난이도는 <strong>기하급수적으로 증가</strong>합니다.
          </p>
          <p class="exp-text exp-hint">
            (지금은 어려워도 괜찮아요! 학습을 마치면 완벽하게 이해됩니다)
          </p>
        </div>
        <div class="scroll-indicator">
          <span class="scroll-text">아래로 스크롤</span>
          <span class="scroll-icon">↓</span>
        </div>
      </div>
    </section>

    <!-- Phase 4: 마지막 메시지 -->
    <section class="phase-section phase-final">
      <div class="phase-content">
        <div class="exp-footer">
          <span class="footer-icon">✨</span>
          <p class="footer-text">
            학습을 마치고 로또 결과를 확인하는 순간,<br />
            블록체인의 작동 원리를 완벽하게 이해하게 됩니다.
          </p>
        </div>
        <div class="scroll-indicator">
          <span class="scroll-text">아래로 스크롤하여 번호 입력</span>
          <span class="scroll-icon">↓</span>
        </div>
      </div>
    </section>

    <!-- Phase 5: 입력 -->
    <section class="phase-section phase-input">
      <div class="phase-content">
        <div class="header">
          <div class="icon">🔗</div>
          <h1 class="title">당신의 여섯 자리를 선택하세요</h1>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const userNumbers = ref<string[]>(['', '', '', '', '', ''])
const errors = ref<boolean[]>([false, false, false, false, false, false])
const inputRefs = ref<HTMLInputElement[]>([])

const isComplete = computed(() => {
  return userNumbers.value.every(num => num !== '')
})

// 스크롤 애니메이션
onMounted(() => {
  const sections = document.querySelectorAll('.phase-section')

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    {
      threshold: 0.3,
      rootMargin: '0px'
    }
  )

  sections.forEach((section) => {
    observer.observe(section)
  })
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

.lottery-container {
  width: 100vw;
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  background-color: #0A0A0F;
}

.phase-section {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  scroll-snap-align: start;
  opacity: 0;
  transform: translateY(60px);
  transition: opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1),
              transform 1.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.phase-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.phase-section:first-child {
  opacity: 1;
  transform: translateY(0);
}

.phase-intro {
  background: linear-gradient(135deg, #0A0A0F 0%, #12121A 100%);
}

.phase-explanation {
  background: linear-gradient(135deg, #12121A 0%, #1A1A26 100%);
}

.phase-final {
  background: linear-gradient(135deg, #1A1A26 0%, #12121A 100%);
}

.phase-input {
  background-color: #0A0A0F;
}

.phase-content {
  max-width: 1100px;
  width: 100%;
}

/* Phase 1: 제목 */
.intro-header {
  text-align: center;
  margin-bottom: 80px;
}

.intro-title {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.6;
  margin: 0;
}


.exp-section {
  margin-bottom: 32px;
}

.exp-section:last-of-type {
  margin-bottom: 0;
}

.exp-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.exp-section-title span {
  font-family: 'Noto Sans KR', sans-serif !important;
  font-size: 36px;
  font-weight: 700;
  color: #F0B429;
}

.section-icon {
  font-size: 30px;
}

.exp-text {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 17px;
  color: #CCCCDD;
  line-height: 1.8;
  margin: 0 0 16px 42px;
}

.exp-hint {
  color: #888899;
  font-size: 15px;
  display: block;
  margin-top: 12px;
}

.example-box {
  background-color: #0A0A0F;
  border: 1px solid #2A2A3A;
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0 0 0;
}

.example-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #888899;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  text-align: center;
}

.blockchain-visual {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.block-row {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.block-item {
  display: flex;
  align-items: center;
}

.block-box {
  background-color: #1A1A26;
  border: 2px solid #F0B429;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 70px;
}

.block-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #888899;
  letter-spacing: 0.5px;
}

.block-hash {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  color: #CCCCDD;
}

.block-hash .highlight {
  color: #F0B429;
  font-weight: 600;
  font-size: 20px;
}

.connector {
  color: #F0B429;
  font-size: 20px;
  font-weight: 600;
}

.match-section {
  padding-top: 16px;
  border-top: 1px solid #2A2A3A;
}

.match-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.match-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.match-box {
  background-color: #1A1A26;
  border: 2px solid #10B981;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: #F0B429;
  font-weight: 600;
  min-width: 42px;
  text-align: center;
}

.match-arrows {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.match-arrow {
  font-size: 20px;
  color: #10B981;
  min-width: 42px;
  text-align: center;
}

.match-label-row {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.match-small-label {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 12px;
  color: #888899;
}

.match-result-box {
  text-align: center;
  padding: 12px;
  background-color: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  border: 1px solid #10B981;
}

.match-result-text {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #10B981;
  font-weight: 700;
}

/* Phase 4: 마지막 메시지 */
.phase-final .phase-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.exp-footer {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  text-align: center;
  margin-bottom: 80px;
}

.footer-icon {
  font-size: 52px;
  flex-shrink: 0;
}

.footer-text {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 36px;
  color: #F0B429;
  line-height: 1.6;
  margin: 0;
  font-weight: 700;
}

.scroll-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
  animation: bounce 2s infinite;
}

.scroll-text {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  color: #888899;
}

.scroll-icon {
  font-size: 32px;
  color: #F0B429;
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
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 48px;
  font-weight: 700;
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
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 32px;
  font-weight: 600;
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

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 반응형 */
@media (max-width: 768px) {
  .phase-section {
    padding: 40px 24px;
  }

  .intro-header {
    margin-bottom: 60px;
  }

  .intro-title {
    font-size: 32px;
  }

  .exp-section {
    margin-bottom: 24px;
  }

  .exp-section-title span {
    font-size: 28px !important;
  }

  .section-icon {
    font-size: 32px;
  }

  .exp-text {
    font-size: 15px;
    margin-left: 0;
  }

  .exp-hint {
    font-size: 14px;
  }

  .example-box {
    padding: 16px;
  }

  .example-label {
    font-size: 12px;
    margin-bottom: 12px;
  }

  .blockchain-visual {
    gap: 12px;
    margin-bottom: 16px;
  }

  .block-row {
    flex-direction: column;
    gap: 8px;
  }

  .connector {
    transform: rotate(90deg);
    font-size: 16px;
  }

  .block-box {
    min-width: 100%;
    padding: 8px 12px;
  }

  .block-number {
    font-size: 9px;
  }

  .block-hash {
    font-size: 14px;
  }

  .block-hash .highlight {
    font-size: 18px;
  }

  .match-section {
    padding-top: 12px;
  }

  .match-visual {
    margin-bottom: 10px;
    gap: 4px;
  }

  .match-row {
    flex-wrap: wrap;
    gap: 6px;
  }

  .match-box {
    font-size: 14px;
    padding: 6px 10px;
    min-width: 36px;
  }

  .match-arrows {
    gap: 6px;
  }

  .match-arrow {
    font-size: 16px;
    min-width: 36px;
  }

  .match-small-label {
    font-size: 11px;
  }

  .match-result-box {
    padding: 10px;
  }

  .match-result-text {
    font-size: 14px;
  }

  .exp-footer {
    margin-bottom: 60px;
  }

  .footer-icon {
    font-size: 40px;
  }

  .footer-text {
    font-size: 28px;
  }

  .scroll-indicator {
    margin-top: 24px;
    gap: 8px;
  }

  .scroll-text {
    font-size: 12px;
  }

  .scroll-icon {
    font-size: 24px;
  }

  .title {
    font-size: 36px;
    font-family: 'Noto Sans KR', sans-serif;
    font-weight: 700;
  }

  .input-box {
    width: 55px;
    height: 55px;
    font-size: 22px;
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
