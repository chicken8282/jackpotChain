<template>
  <div class="education">
    <!-- Fixed Header -->
    <header class="fixed-header">
      <div class="logo">JackpotChain</div>
      <div class="progress-section">
        <span class="progress-label">채굴 진행 중...</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${miningProgress}%` }"></div>
        </div>
        <span class="progress-percent">{{ miningProgress }}%</span>
      </div>
      <div class="user-numbers">
        내 번호: <span class="numbers">{{ userNumbersDisplay }}</span>
      </div>
    </header>

    <!-- Chapter Indicator -->
    <div class="chapter-indicator">
      <div
        v-for="i in 5"
        :key="i"
        class="dot"
        :class="{ active: currentChapter === i }"
      ></div>
    </div>

    <!-- Chapters -->
    <section ref="chapter1" class="chapter chapter-1">
      <div class="content-left">
        <div class="chapter-label">CHAPTER 1 · INTRODUCTION</div>
        <h2 class="chapter-title">왜 블록체인인가?</h2>
        <p class="chapter-text">
          기존 은행 시스템은 중앙 서버 하나가 모든 장부를 관리합니다.<br />
          서버가 멈추면? 거래도 멈춥니다.<br />
          블록체인은 모두가 장부를 나눠 가집니다.<br />
          누군가 조작해도 나머지가 거부합니다.
        </p>
      </div>
      <div class="content-right">
        <svg class="network-svg" width="400" height="400" viewBox="0 0 400 400">
          <!-- Centralized Network -->
          <g class="centralized" :class="{ fade: chapter1Animated }">
            <circle cx="200" cy="200" r="15" fill="#F0B429" />
            <circle cx="200" cy="100" r="8" fill="#888899" />
            <circle cx="280" cy="150" r="8" fill="#888899" />
            <circle cx="300" cy="250" r="8" fill="#888899" />
            <circle cx="200" cy="300" r="8" fill="#888899" />
            <circle cx="100" cy="250" r="8" fill="#888899" />
            <circle cx="120" cy="150" r="8" fill="#888899" />
            <line x1="200" y1="200" x2="200" y2="100" stroke="#444455" stroke-width="2" />
            <line x1="200" y1="200" x2="280" y2="150" stroke="#444455" stroke-width="2" />
            <line x1="200" y1="200" x2="300" y2="250" stroke="#444455" stroke-width="2" />
            <line x1="200" y1="200" x2="200" y2="300" stroke="#444455" stroke-width="2" />
            <line x1="200" y1="200" x2="100" y2="250" stroke="#444455" stroke-width="2" />
            <line x1="200" y1="200" x2="120" y2="150" stroke="#444455" stroke-width="2" />
          </g>

          <!-- Decentralized Network -->
          <g class="decentralized" :class="{ show: chapter1Animated }">
            <circle cx="200" cy="100" r="10" fill="#F0B429" />
            <circle cx="280" cy="150" r="10" fill="#F0B429" />
            <circle cx="300" cy="250" r="10" fill="#F0B429" />
            <circle cx="200" cy="300" r="10" fill="#F0B429" />
            <circle cx="100" cy="250" r="10" fill="#F0B429" />
            <circle cx="120" cy="150" r="10" fill="#F0B429" />
            <line x1="200" y1="100" x2="280" y2="150" stroke="#F0B429" stroke-width="2" />
            <line x1="280" y1="150" x2="300" y2="250" stroke="#F0B429" stroke-width="2" />
            <line x1="300" y1="250" x2="200" y2="300" stroke="#F0B429" stroke-width="2" />
            <line x1="200" y1="300" x2="100" y2="250" stroke="#F0B429" stroke-width="2" />
            <line x1="100" y1="250" x2="120" y2="150" stroke="#F0B429" stroke-width="2" />
            <line x1="120" y1="150" x2="200" y2="100" stroke="#F0B429" stroke-width="2" />
          </g>
        </svg>
      </div>
    </section>

    <div class="chapter-divider"></div>

    <section ref="chapter2" class="chapter chapter-2">
      <div class="chapter-label">CHAPTER 2 · MINING</div>
      <h2 class="chapter-title">채굴이란 수학 문제 풀기다</h2>
      <p class="chapter-text">
        비트코인 채굴은 특정 조건을 만족하는 숫자(Nonce)를 찾는 작업입니다.<br />
        로또처럼, 수많은 시도 끝에 당첨 숫자를 찾는 것과 같습니다.
      </p>
      <div class="nonce-counter" :class="{ animate: chapter2Animated }">
        {{ nonceValue.toLocaleString() }}
      </div>
      <div class="attempt-count">현재 시도 횟수: {{ nonceValue.toLocaleString() }}</div>
    </section>

    <div class="chapter-divider"></div>

    <section ref="chapter3" class="chapter chapter-3">
      <div class="content-left">
        <div class="chapter-label">CHAPTER 3 · HASH</div>
        <h2 class="chapter-title">입력이 1글자만 바뀌어도<br />해시는 완전히 달라진다</h2>
      </div>
      <div class="content-right">
        <div class="hash-demo">
          <input
            v-model="hashInput"
            type="text"
            placeholder="아무 텍스트나 입력하세요"
            class="hash-input"
          />
          <div class="hash-output">{{ hashOutput }}</div>
        </div>
      </div>
    </section>

    <div class="chapter-divider"></div>

    <section ref="chapter4" class="chapter chapter-4">
      <div class="chapter-label">CHAPTER 4 · BLOCK STRUCTURE</div>
      <h2 class="chapter-title">블록은 디지털 기록 상자다</h2>
      <div class="block-card">
        <div class="block-field" :class="{ highlight: highlightIndex >= 0 }">
          <span class="field-icon">🔗</span>
          <span class="field-label">Previous Hash:</span>
          <span class="field-value">0000ab3f...</span>
        </div>
        <div class="block-field" :class="{ highlight: highlightIndex >= 1 }">
          <span class="field-icon">⏰</span>
          <span class="field-label">Timestamp:</span>
          <span class="field-value">2026-03-03 14:23:11</span>
        </div>
        <div class="block-field" :class="{ highlight: highlightIndex >= 2 }">
          <span class="field-icon">📝</span>
          <span class="field-label">Transactions:</span>
          <span class="field-value">A→B: 0.5 BTC | B→C: 1.2 BTC</span>
        </div>
        <div class="block-field" :class="{ highlight: highlightIndex >= 3 }">
          <span class="field-icon">🎲</span>
          <span class="field-label">Nonce:</span>
          <span class="field-value">284,731</span>
        </div>
        <div class="block-field" :class="{ highlight: highlightIndex >= 4 }">
          <span class="field-icon">#️⃣</span>
          <span class="field-label">Hash:</span>
          <span class="field-value">0000f3a2...</span>
        </div>
      </div>
    </section>

    <div class="chapter-divider"></div>

    <section ref="chapter5" class="chapter chapter-5">
      <div class="chapter-label">CHAPTER 5 · BLOCKCHAIN</div>
      <h2 class="chapter-title">블록들이 이어져 체인이 된다</h2>
      <p class="chapter-text">
        각 블록은 이전 블록의 해시를 품고 있습니다.<br />
        하나를 바꾸면 이후 모든 블록이 무효가 됩니다.
      </p>
      <div class="blockchain-visual">
        <div
          v-for="(block, index) in blocks"
          :key="index"
          class="mini-block"
          :class="{ show: blockVisibility[index] }"
        >
          <div class="mini-block-title">Block #{{ block.id }}</div>
          <div class="mini-block-field">Hash: {{ block.hash }}</div>
          <div class="mini-block-field">Prev: {{ block.prev }}</div>
        </div>
        <div v-if="blockVisibility[0]" class="chain-arrow">→</div>
        <div v-if="blockVisibility[1]" class="chain-arrow">→</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// User numbers from session storage
const userNumbers = ref<string[]>([])
const userNumbersDisplay = computed(() => userNumbers.value.join('').toUpperCase())

// Mining progress
const miningProgress = ref(0)
let miningInterval: number

// Current chapter tracking
const currentChapter = ref(1)

// Chapter refs
const chapter1 = ref<HTMLElement | null>(null)
const chapter2 = ref<HTMLElement | null>(null)
const chapter3 = ref<HTMLElement | null>(null)
const chapter4 = ref<HTMLElement | null>(null)
const chapter5 = ref<HTMLElement | null>(null)

// Chapter animations
const chapter1Animated = ref(false)
const chapter2Animated = ref(false)

// Chapter 2: Nonce counter
const nonceValue = ref(0)
let nonceInterval: number

// Chapter 3: Hash demo
const hashInput = ref('')
const hashOutput = ref('')

// Chapter 4: Block field highlight
const highlightIndex = ref(-1)

// Chapter 5: Blockchain visual
const blocks = [
  { id: 101, hash: '0000a3f2...', prev: '0000b1c4...' },
  { id: 102, hash: '0000d5e6...', prev: '0000a3f2...' },
  { id: 103, hash: '0000f7a8...', prev: '0000d5e6...' },
]
const blockVisibility = ref([false, false, false])

// Hash function
const computeHash = async (text: string): Promise<string> => {
  if (!text) return ''

  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

watch(hashInput, async (newValue) => {
  hashOutput.value = await computeHash(newValue)
})

// Mining progress timer
const startMining = () => {
  miningInterval = setInterval(() => {
    if (miningProgress.value < 100) {
      miningProgress.value += 100 / 150 // 15 seconds total (150 * 100ms)
    } else {
      clearInterval(miningInterval)
      // Navigate to reveal screen
      router.push('/reveal')
    }
  }, 100)
}

// Intersection Observer for chapters
const setupObserver = () => {
  const options = {
    threshold: 0.15,
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement

        if (target === chapter1.value) {
          currentChapter.value = 1
          setTimeout(() => {
            chapter1Animated.value = true
          }, 300)
        } else if (target === chapter2.value) {
          currentChapter.value = 2
          chapter2Animated.value = true
          startNonceCounter()
        } else if (target === chapter3.value) {
          currentChapter.value = 3
        } else if (target === chapter4.value) {
          currentChapter.value = 4
          animateBlockFields()
        } else if (target === chapter5.value) {
          currentChapter.value = 5
          animateBlockchain()
        }
      }
    })
  }, options)

  if (chapter1.value) observer.observe(chapter1.value)
  if (chapter2.value) observer.observe(chapter2.value)
  if (chapter3.value) observer.observe(chapter3.value)
  if (chapter4.value) observer.observe(chapter4.value)
  if (chapter5.value) observer.observe(chapter5.value)
}

const startNonceCounter = () => {
  if (nonceInterval) return

  nonceInterval = setInterval(() => {
    nonceValue.value = Math.floor(Math.random() * 999999)
  }, 100)
}

const animateBlockFields = () => {
  highlightIndex.value = -1

  const delays = [0, 500, 1000, 1500, 2000]
  delays.forEach((delay, index) => {
    setTimeout(() => {
      highlightIndex.value = index
    }, delay)
  })
}

const animateBlockchain = () => {
  blockVisibility.value = [false, false, false]

  setTimeout(() => { blockVisibility.value[0] = true }, 0)
  setTimeout(() => { blockVisibility.value[1] = true }, 500)
  setTimeout(() => { blockVisibility.value[2] = true }, 1000)
}

onMounted(() => {
  // Load user numbers
  const saved = sessionStorage.getItem('userNumbers')
  if (saved) {
    userNumbers.value = JSON.parse(saved)
  }

  // Start mining progress
  startMining()

  // Setup intersection observer
  setupObserver()
})

onUnmounted(() => {
  clearInterval(miningInterval)
  clearInterval(nonceInterval)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.education {
  background-color: #0A0A0F;
  color: #FFFFFF;
  padding-top: 80px;
}

/* Fixed Header */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background-color: #12121A;
  border-bottom: 1px solid #2A2A3A;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  z-index: 100;
}

.logo {
  font-family: 'Syne', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #F0B429;
}

.progress-section {
  flex: 1;
  max-width: 400px;
  margin: 0 48px;
}

.progress-label {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 12px;
  color: #888899;
  display: block;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #2A2A3A;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #F0B429, #FFD15C);
  transition: width 0.1s linear;
}

.progress-percent {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #F0B429;
  display: block;
  margin-top: 4px;
  text-align: right;
}

.user-numbers {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  color: #888899;
}

.user-numbers .numbers {
  font-family: 'JetBrains Mono', monospace;
  color: #F0B429;
  font-weight: 600;
  margin-left: 8px;
}

/* Chapter Indicator */
.chapter-indicator {
  position: fixed;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #2A2A3A;
  transition: all 0.3s;
}

.dot.active {
  background-color: #F0B429;
  transform: scale(1.5);
}

/* Chapters */
.chapter {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 48px;
  opacity: 0;
  transform: translateY(40px);
  animation: fadeInUp 0.6s ease-out forwards;
}

.chapter-1,
.chapter-3 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
}

.chapter-2,
.chapter-4,
.chapter-5 {
  flex-direction: column;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.chapter-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #F0B429;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.chapter-title {
  font-family: 'Syne', sans-serif;
  font-size: 48px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 0 0 24px 0;
  line-height: 1.2;
}

.chapter-text {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #888899;
  line-height: 1.8;
  margin: 0;
}

/* Chapter Divider */
.chapter-divider {
  width: 80px;
  height: 1px;
  background-color: #F0B429;
  margin: 0 auto;
}

/* Chapter 1: Network SVG */
.network-svg {
  display: block;
  margin: 0 auto;
}

.centralized {
  transition: opacity 0.6s;
}

.centralized.fade {
  opacity: 0;
}

.decentralized {
  opacity: 0;
  transition: opacity 0.6s;
}

.decentralized.show {
  opacity: 1;
}

/* Chapter 2: Nonce Counter */
.nonce-counter {
  font-family: 'JetBrains Mono', monospace;
  font-size: 72px;
  font-weight: 600;
  color: #F0B429;
  margin: 32px 0;
}

.nonce-counter.animate {
  animation: pulse 0.1s infinite;
}

.attempt-count {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #888899;
}

/* Chapter 3: Hash Demo */
.hash-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hash-input {
  width: 100%;
  padding: 16px;
  background-color: #1A1A26;
  border: 2px solid #2A2A3A;
  border-radius: 8px;
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #FFFFFF;
  outline: none;
}

.hash-input:focus {
  border-color: #F0B429;
}

.hash-output {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: #F0B429;
  padding: 16px;
  background-color: #1A1A26;
  border-radius: 8px;
  word-break: break-all;
  min-height: 50px;
}

/* Chapter 4: Block Card */
.block-card {
  width: 100%;
  max-width: 600px;
  margin: 32px auto 0;
  background-color: #1A1A26;
  border: 2px solid #F0B429;
  border-radius: 12px;
  padding: 32px;
}

.block-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  transition: all 0.3s;
}

.block-field.highlight {
  background-color: rgba(240, 180, 41, 0.1);
  border-left: 4px solid #F0B429;
}

.field-icon {
  font-size: 20px;
}

.field-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #888899;
}

.field-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: #FFFFFF;
  margin-left: auto;
}

/* Chapter 5: Blockchain Visual */
.blockchain-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 48px;
}

.mini-block {
  background-color: #1A1A26;
  border: 2px solid #2A2A3A;
  border-radius: 12px;
  padding: 24px;
  width: 200px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s;
}

.mini-block.show {
  opacity: 1;
  transform: translateY(0);
}

.mini-block-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #F0B429;
  margin-bottom: 12px;
}

.mini-block-field {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #888899;
  margin-bottom: 8px;
}

.chain-arrow {
  font-size: 32px;
  color: #F0B429;
  animation: fadeIn 0.5s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 반응형 */
@media (max-width: 1024px) {
  .chapter-indicator {
    display: none;
  }

  .chapter-1,
  .chapter-3 {
    grid-template-columns: 1fr;
  }

  .blockchain-visual {
    flex-direction: column;
  }

  .chain-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 768px) {
  .fixed-header {
    padding: 0 24px;
  }

  .progress-section {
    margin: 0 24px;
  }

  .chapter-title {
    font-size: 32px;
  }

  .nonce-counter {
    font-size: 48px;
  }
}
</style>
