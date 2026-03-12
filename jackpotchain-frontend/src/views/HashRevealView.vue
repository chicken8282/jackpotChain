<template>
  <div class="hash-reveal">
    <!-- Mining Complete Overlay -->
    <transition name="fade">
      <div v-if="showOverlay" class="overlay">
        <div class="checkmark">✓</div>
        <h1 class="overlay-title">채굴 완료!</h1>
        <p class="overlay-subtitle">블록 해시가 확정되었습니다</p>
      </div>
    </transition>

    <!-- Main Content -->
    <div v-if="!showOverlay" class="main-content">
      <div class="header">
        <div class="chapter-label">CHAPTER 6 · RESULT</div>
        <h1 class="title">당신의 번호 vs 블록 해시</h1>
      </div>

      <!-- Block Cards -->
      <div class="block-cards">
        <div
          v-for="(block, index) in blockHashes"
          :key="index"
          class="block-card"
          :class="{ revealed: revealedCards[index] }"
        >
          <div class="block-number">BLOCK #{{ block.blockNum }}</div>
          <div class="block-hash">{{ block.hash }}</div>
          <div class="last-char">
            마지막 자리: <span class="char">{{ block.lastChar }}</span>
          </div>
        </div>
      </div>

      <!-- Comparison Section -->
      <div v-if="cardsFullyRevealed" class="comparison-section">
        <div class="comparison-row">
          <div class="row-label">내 번호</div>
          <div class="number-boxes">
            <div
              v-for="(num, index) in userNumbers"
              :key="`user-${index}`"
              class="number-box user"
              :class="comparisonResults[index]"
            >
              {{ num }}
            </div>
          </div>
        </div>

        <div class="comparison-row">
          <div class="row-label">블록 해시</div>
          <div class="number-boxes">
            <div
              v-for="(block, index) in blockHashes"
              :key="`block-${index}`"
              class="number-box block"
              :class="comparisonResults[index]"
            >
              {{ block.lastChar }}
            </div>
          </div>
        </div>
      </div>

      <!-- Continue Button -->
      <button
        v-if="comparisonComplete"
        class="continue-btn"
        @click="goToResult"
      >
        결과 확인하기 →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface BlockHash {
  blockNum: number
  hash: string
  lastChar: string
}

// State
const showOverlay = ref(true)
const userNumbers = ref<string[]>([])
const blockHashes = ref<BlockHash[]>([])
const revealedCards = ref<boolean[]>([false, false, false, false, false, false])
const cardsFullyRevealed = ref(false)
const comparisonResults = ref<string[]>(['', '', '', '', '', ''])
const comparisonComplete = ref(false)

// Generate mock block hashes
const generateBlockHashes = (): BlockHash[] => {
  const hashes: BlockHash[] = []
  const baseBlockNum = 105

  for (let i = 0; i < 6; i++) {
    const randomHash = Array.from({ length: 60 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')

    // For demo: make some matches
    const shouldMatch = Math.random() > 0.5
    const lastChar = shouldMatch && userNumbers.value[i]
      ? userNumbers.value[i]
      : Math.floor(Math.random() * 16).toString(16)

    hashes.push({
      blockNum: baseBlockNum + i * 5,
      hash: `0000${randomHash.slice(0, 56)}${lastChar}`,
      lastChar,
    })
  }

  return hashes
}

// Reveal cards sequentially
const revealCards = () => {
  revealedCards.value.forEach((_, index) => {
    setTimeout(() => {
      revealedCards.value[index] = true

      // Start comparison after all cards revealed
      if (index === 5) {
        setTimeout(() => {
          cardsFullyRevealed.value = true
          startComparison()
        }, 500)
      }
    }, index * 500)
  })
}

// Compare numbers sequentially
const startComparison = () => {
  userNumbers.value.forEach((userNum, index) => {
    setTimeout(() => {
      const blockChar = blockHashes.value[index].lastChar
      const isMatch = userNum.toLowerCase() === blockChar.toLowerCase()

      comparisonResults.value[index] = isMatch ? 'match' : 'mismatch'

      // Mark comparison complete
      if (index === 5) {
        setTimeout(() => {
          comparisonComplete.value = true
        }, 500)
      }
    }, index * 1000)
  })
}

// Count matches
const countMatches = (): number => {
  return comparisonResults.value.filter(result => result === 'match').length
}

// Go to result page
const goToResult = () => {
  const matchCount = countMatches()
  sessionStorage.setItem('matchCount', matchCount.toString())
  router.push('/result')
}

onMounted(() => {
  // Load user numbers
  const saved = sessionStorage.getItem('userNumbers')
  if (saved) {
    userNumbers.value = JSON.parse(saved)
  }

  // Generate block hashes
  blockHashes.value = generateBlockHashes()

  // Hide overlay after 2 seconds
  setTimeout(() => {
    showOverlay.value = false

    // Start revealing cards
    setTimeout(() => {
      revealCards()
    }, 300)
  }, 2000)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.hash-reveal {
  min-height: 100vh;
  background-color: #0A0A0F;
  color: #FFFFFF;
  padding: 48px 24px;
}

/* Overlay */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(10, 10, 15, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.checkmark {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #F0B429;
  color: #0A0A0F;
  font-size: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scaleIn 0.5s ease-out;
}

.overlay-title {
  font-family: 'Syne', sans-serif;
  font-size: 64px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 32px 0 16px 0;
}

.overlay-subtitle {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 18px;
  color: #888899;
  margin: 0;
}

/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.chapter-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #F0B429;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.title {
  font-family: 'Syne', sans-serif;
  font-size: 48px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 0;
}

/* Block Cards */
.block-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 64px;
}

.block-card {
  background-color: #1A1A26;
  border: 2px solid #2A2A3A;
  border-radius: 12px;
  padding: 24px;
  opacity: 0;
  transform: rotateY(90deg);
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.block-card.revealed {
  opacity: 1;
  transform: rotateY(0deg);
}

.block-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #888899;
  margin-bottom: 12px;
}

.block-hash {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #FFFFFF;
  word-break: break-all;
  margin-bottom: 16px;
}

.last-char {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: #888899;
}

.last-char .char {
  font-size: 24px;
  color: #F0B429;
  font-weight: 600;
  margin-left: 8px;
}

/* Comparison Section */
.comparison-section {
  max-width: 800px;
  margin: 0 auto 48px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.comparison-row {
  margin-bottom: 24px;
}

.row-label {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  color: #888899;
  margin-bottom: 12px;
  text-align: center;
}

.number-boxes {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.number-box {
  width: 80px;
  height: 80px;
  background-color: #1A1A26;
  border: 2px solid #2A2A3A;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  color: #F0B429;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  transition: all 0.5s;
  position: relative;
}

.number-box.match {
  background-color: #22C55E;
  border-color: #22C55E;
  color: #FFFFFF;
  animation: lightDrop 0.5s ease-out;
}

.number-box.match::after {
  content: '✓';
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 16px;
}

.number-box.mismatch {
  background-color: #3A1A1A;
  border-color: #3A1A1A;
  color: #888899;
  opacity: 0.5;
}

.number-box.mismatch::after {
  content: '✗';
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 16px;
  color: #EF4444;
}

/* Continue Button */
.continue-btn {
  display: block;
  width: 100%;
  max-width: 400px;
  height: 56px;
  margin: 0 auto;
  background-color: #F0B429;
  color: #0A0A0F;
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  animation: fadeIn 0.5s ease-out;
}

.continue-btn:hover {
  background-color: #FFD15C;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(240, 180, 41, 0.3);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
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

@keyframes lightDrop {
  0% {
    box-shadow: 0 -50px 30px rgba(34, 197, 94, 0.8);
  }
  100% {
    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
}

/* 반응형 */
@media (max-width: 1024px) {
  .block-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .title {
    font-size: 32px;
  }

  .block-cards {
    grid-template-columns: 1fr;
  }

  .number-box {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .number-boxes {
    gap: 8px;
  }
}
</style>
