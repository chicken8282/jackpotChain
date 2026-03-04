<template>
  <div class="result">
    <!-- Particle Canvas for Jackpot -->
    <canvas v-if="matchCount === 6" ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- Result Content -->
    <div class="result-content">
      <!-- Jackpot (6 matches) -->
      <div v-if="matchCount === 6" class="jackpot">
        <div class="badge bounce">🎰 JACKPOT! 🎰</div>
        <h1 class="title jackpot-title">6개 모두 일치!</h1>
        <p class="subtitle">잭팟 풀의 50%를 획득하셨습니다!</p>
        <div class="reward-counter">{{ formattedReward }} JACK</div>
      </div>

      <!-- 2nd Place (5 matches) -->
      <div v-else-if="matchCount === 5" class="rank-result">
        <div class="trophy">🥇</div>
        <div class="badge scale-in">2등 당첨!</div>
        <h1 class="title">5개 일치</h1>
        <div class="reward">보상: <span class="amount">100,000 JACK</span></div>
      </div>

      <!-- 3rd Place (4 matches) -->
      <div v-else-if="matchCount === 4" class="rank-result">
        <div class="trophy">🥈</div>
        <div class="badge scale-in">3등 당첨!</div>
        <h1 class="title">4개 일치</h1>
        <div class="reward">보상: <span class="amount">20,000 JACK</span></div>
      </div>

      <!-- 4th Place (3 matches) -->
      <div v-else-if="matchCount === 3" class="rank-result">
        <div class="trophy">🥉</div>
        <div class="badge scale-in">4등 당첨!</div>
        <h1 class="title">3개 일치</h1>
        <div class="reward">보상: <span class="amount">2,000 JACK</span></div>
      </div>

      <!-- 5th Place (2 matches) -->
      <div v-else-if="matchCount === 2" class="rank-result">
        <div class="trophy">✨</div>
        <div class="badge scale-in">5등 당첨!</div>
        <h1 class="title">2개 일치</h1>
        <div class="reward">보상: <span class="amount">300 JACK</span></div>
      </div>

      <!-- 6th Place (1 match) -->
      <div v-else-if="matchCount === 1" class="rank-result">
        <div class="trophy">🎟️</div>
        <div class="badge scale-in">6등</div>
        <h1 class="title">1개 일치</h1>
        <p class="subtitle">티켓 1장 재지급</p>
        <div class="reward">다음 기회를 노려보세요!</div>
      </div>

      <!-- No Match (0 matches) -->
      <div v-else class="no-match">
        <div class="emoji">✊</div>
        <h1 class="title">아쉽지만 다음 기회에</h1>
        <p class="fairness">블록체인은 조작이 불가능합니다.<br />공정한 결과입니다.</p>
      </div>

      <!-- CTA Buttons -->
      <div class="cta-buttons">
        <button class="btn-primary" @click="playAgain">다시 도전하기</button>
        <button class="btn-secondary">블록체인 더 배우기</button>
      </div>

      <!-- Share Button (optional) -->
      <button class="share-btn">결과 공유하기</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const matchCount = ref(0)
const particleCanvas = ref<HTMLCanvasElement | null>(null)
const rewardValue = ref(0)

const rewards: { [key: number]: number } = {
  6: 285000,
  5: 100000,
  4: 20000,
  3: 2000,
  2: 300,
}

const formattedReward = computed(() => {
  return rewardValue.value.toLocaleString()
})

// Particle system for jackpot
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

let particles: Particle[] = []
let animationId: number

const createParticles = (canvas: HTMLCanvasElement) => {
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  for (let i = 0; i < 300; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 5 + 2

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color: Math.random() > 0.5 ? '#F0B429' : '#FFFFFF',
    })
  }
}

const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles = particles.filter(p => p.life > 0)

  particles.forEach(p => {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1 // Gravity
    p.life -= 0.01

    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  if (particles.length > 0) {
    animationId = requestAnimationFrame(() => drawParticles(ctx, canvas))
  }
}

// Counter animation
const animateCounter = (target: number) => {
  const duration = 2000
  const start = 0
  const startTime = Date.now()

  const update = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    rewardValue.value = Math.floor(start + (target - start) * progress)

    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }

  update()
}

const playAgain = () => {
  // Clear session storage
  sessionStorage.removeItem('userNumbers')
  sessionStorage.removeItem('matchCount')

  // Navigate to lottery input
  router.push('/lottery')
}

onMounted(() => {
  // Load match count from session storage
  const saved = sessionStorage.getItem('matchCount')
  if (saved) {
    matchCount.value = parseInt(saved)
  }

  // Initialize particle canvas for jackpot
  if (matchCount.value === 6 && particleCanvas.value) {
    const canvas = particleCanvas.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    createParticles(canvas)
    drawParticles(ctx, canvas)

    // Animate reward counter
    animateCounter(rewards[6])
  }

  // Animate counter for other ranks
  if (matchCount.value > 0 && matchCount.value < 6) {
    const reward = rewards[matchCount.value] || 0
    if (reward > 0) {
      animateCounter(reward)
    }
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.result {
  min-height: 100vh;
  background-color: #0A0A0F;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  position: relative;
  overflow: hidden;
}

.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.result-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
}

/* Jackpot */
.jackpot {
  animation: fadeIn 0.5s ease-out;
}

.jackpot-title {
  color: #F0B429;
  animation: vibrate 0.3s infinite;
}

.reward-counter {
  font-family: 'JetBrains Mono', monospace;
  font-size: 64px;
  font-weight: 600;
  color: #F0B429;
  margin: 32px 0;
  animation: pulse 1s infinite;
}

/* Rank Result */
.rank-result {
  animation: fadeIn 0.5s ease-out;
}

.trophy {
  font-size: 96px;
  margin-bottom: 24px;
  animation: scaleIn 0.5s ease-out;
}

.badge {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #F0B429, #FFD15C);
  color: #0A0A0F;
  font-family: 'Syne', sans-serif;
  font-size: 24px;
  font-weight: 800;
  border-radius: 50px;
  margin-bottom: 16px;
}

.badge.bounce {
  animation: bounce 0.6s ease-out;
}

.badge.scale-in {
  animation: scaleIn 0.5s ease-out;
}

.title {
  font-family: 'Syne', sans-serif;
  font-size: 48px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 16px 0;
}

.subtitle {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 18px;
  color: #888899;
  margin: 16px 0;
}

.reward {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 20px;
  color: #888899;
  margin: 24px 0;
}

.reward .amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 48px;
  font-weight: 600;
  color: #F0B429;
  display: block;
  margin-top: 8px;
}

/* No Match */
.no-match {
  animation: fadeIn 0.5s ease-out;
}

.emoji {
  font-size: 96px;
  margin-bottom: 24px;
}

.fairness {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  color: #888899;
  margin: 24px 0;
}

/* CTA Buttons */
.cta-buttons {
  display: flex;
  gap: 16px;
  margin: 48px 0 24px;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  font-weight: 500;
  padding: 16px 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #F0B429;
  color: #0A0A0F;
}

.btn-primary:hover {
  background-color: #FFD15C;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(240, 180, 41, 0.3);
}

.btn-secondary {
  background-color: transparent;
  color: #F0B429;
  border: 1px solid #F0B429;
}

.btn-secondary:hover {
  background-color: #F0B429;
  color: #0A0A0F;
}

.share-btn {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  color: #888899;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.3s;
}

.share-btn:hover {
  color: #F0B429;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

@keyframes vibrate {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* 반응형 */
@media (max-width: 768px) {
  .title {
    font-size: 32px;
  }

  .trophy {
    font-size: 64px;
  }

  .reward-counter {
    font-size: 48px;
  }

  .reward .amount {
    font-size: 36px;
  }

  .cta-buttons {
    flex-direction: column;
    width: 100%;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
