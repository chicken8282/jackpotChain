<template>
  <div class="landing">
    <canvas ref="canvasRef" class="particle-canvas"></canvas>

    <nav class="navbar">
      <div class="logo">JackpotChain</div>
    </nav>

    <div class="content-wrapper">
      <div class="hero-content">
        <div class="badge fade-in">BLOCKCHAIN EDUCATION</div>

        <h1 class="headline fade-in">
          블록체인의 원리,<br />
          눈으로 보고 <span class="gold">몸으로</span><br />
          채굴하며 깨닫는다
        </h1>

        <p class="subtitle fade-in">로또 한 장으로 시작하는 블록체인 체험</p>

        <div class="cta-buttons fade-in">
          <button class="btn-primary" @click="startMining">
            채굴 시작하기 →
          </button>
          <button class="btn-secondary">개념 먼저 보기</button>
        </div>
      </div>
    </div>

    <div class="scroll-indicator">
      <div class="mouse-icon"></div>
      <span>SCROLL</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

let particles: Particle[] = []
let animationId: number
let mouseX = 0
let mouseY = 0

const startMining = () => {
  router.push('/lottery')
}

const initParticles = (canvas: HTMLCanvasElement) => {
  const particleCount = 60
  particles = []

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    })
  }
}

const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Update particle positions
  particles.forEach(p => {
    p.x += p.vx
    p.y += p.vy

    // Mouse interaction
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 100) {
      p.x -= dx * 0.01
      p.y -= dy * 0.01
    }

    // Bounce off edges
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1

    // Keep in bounds
    p.x = Math.max(0, Math.min(canvas.width, p.x))
    p.y = Math.max(0, Math.min(canvas.height, p.y))
  })

  // Draw connections
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 150) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.stroke()
      }
    }
  }

  // Draw particles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  particles.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fill()
  })

  animationId = requestAnimationFrame(() => drawParticles(ctx, canvas))
}

onMounted(() => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'

  initParticles(canvas)
  drawParticles(ctx, canvas)

  // Mouse move handler
  const handleMouseMove = (e: MouseEvent) => {
    mouseX = e.clientX
    mouseY = e.clientY
  }

  // Resize handler (for window resize and fullscreen)
  const handleResize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    initParticles(canvas)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)
  document.addEventListener('fullscreenchange', handleResize)
  document.addEventListener('webkitfullscreenchange', handleResize)

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('fullscreenchange', handleResize)
    document.removeEventListener('webkitfullscreenchange', handleResize)
    cancelAnimationFrame(animationId)
  })
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

.landing {
  position: relative;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #0A0A0F;
}

.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 0;
  pointer-events: none;
  display: block;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 24px 48px;
  z-index: 10;
}

.logo {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #F0B429;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero-content {
  width: 100%;
  max-width: min(900px, 90vw);
  padding: 0 24px;
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 8px 16px;
  border: 1px solid #F0B429;
  border-radius: 4px;
  background-color: transparent;
  color: #F0B429;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  margin-bottom: 32px;
  animation: fadeInUp 0.6s ease-out;
}

.headline {
  font-family: 'Syne', sans-serif;
  font-size: 64px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.2;
  margin: 0 auto 24px auto;
  max-width: min(800px, 90vw);
  animation: fadeInUp 0.6s ease-out 0.15s backwards;
}

.headline .gold {
  color: #F0B429;
}

.subtitle {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 18px;
  font-weight: 400;
  color: #888899;
  margin: 0 0 48px 0;
  animation: fadeInUp 0.6s ease-out 0.3s backwards;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  animation: fadeInUp 0.6s ease-out 0.45s backwards;
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
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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

.scroll-indicator {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: bounce 2s infinite;
}

.mouse-icon {
  width: 24px;
  height: 36px;
  border: 2px solid #444455;
  border-radius: 12px;
  position: relative;
}

.mouse-icon::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 8px;
  background-color: #444455;
  border-radius: 2px;
  animation: scroll 1.5s infinite;
}

.scroll-indicator span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #444455;
  letter-spacing: 2px;
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

@keyframes bounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-10px);
  }
}

@keyframes scroll {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(12px);
  }
}

/* 반응형 */
@media (max-width: 768px) {
  .headline {
    font-size: 40px;
  }

  .subtitle {
    font-size: 16px;
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

@media (max-width: 1024px) and (min-width: 769px) {
  .headline {
    font-size: 48px;
  }
}
</style>
