<template>
  <div class="landing" @scroll="handleScroll" ref="landingRef">
    <canvas ref="canvasRef" class="particle-canvas"></canvas>

    <nav class="navbar">
      <div class="logo">JackpotChain</div>
    </nav>

    <!-- Phase 1 -->
    <section class="phase-section">
      <div class="phase-content">
        <h1 class="main-text fade-in">블록체인은 늘<br />파편으로 설명됐습니다.</h1>
      </div>
    </section>

    <!-- Phase 2 -->
    <section class="phase-section">
      <div class="phase-content">
        <h1 class="main-text fade-in">알 것 같으면서도<br />모르는 이유,</h1>
        <h1 class="main-text fade-in delay">한 번도 흐름으로<br />배운 적이 없어서입니다.</h1>
      </div>
    </section>

    <!-- Phase 3 -->
    <section class="phase-section">
      <div class="phase-content">
        <h1 class="main-text fade-in">
          <span class="gold">JackpotChain</span>은<br />그 흐름을 잇습니다.
        </h1>
        <h1 class="main-text fade-in delay">클릭 한 번으로,<br />직접 채굴에 참여하고</h1>
      </div>
    </section>

    <!-- Phase 4 -->
    <section class="phase-section">
      <div class="phase-content">
        <h1 class="main-text fade-in">채굴로 얻은 코인으로,</h1>
        <h1 class="main-text fade-in delay">로또에 참여하며<br />지식을 체화합니다.</h1>
      </div>
    </section>

    <!-- Phase 5 -->
    <section class="phase-section">
      <div class="phase-content">
        <h1 class="final-text fade-in">준비되셨나요?</h1>
        <div class="cta-buttons fade-in delay">
          <button class="btn-primary" @click="startMining">
            채굴 시작하기 →
          </button>
          <button class="btn-secondary">개념 먼저 보기</button>
        </div>
      </div>
    </section>

    <div class="scroll-indicator" :class="{ hide: currentPhase >= 4 }">
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
const landingRef = ref<HTMLElement | null>(null)
const currentPhase = ref(0)

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

const handleScroll = () => {
  if (!landingRef.value) return

  const scrollTop = landingRef.value.scrollTop
  const windowHeight = window.innerHeight

  // Calculate current phase based on scroll position
  const phase = Math.floor(scrollTop / windowHeight)
  currentPhase.value = phase
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
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

  // Intersection Observer for fade-in animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fadeElements = entry.target.querySelectorAll('.fade-in')
          fadeElements.forEach(el => {
            el.classList.add('fade-in')
          })
        }
      })
    },
    { threshold: 0.3 }
  )

  // Observe all sections
  const sections = document.querySelectorAll('.phase-section')
  sections.forEach(section => observer.observe(section))

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('fullscreenchange', handleResize)
    document.removeEventListener('webkitfullscreenchange', handleResize)
    cancelAnimationFrame(animationId)
    observer.disconnect()
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
  overflow-y: scroll;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
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

/* Phase Sections */
.phase-section {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  z-index: 1;
}

.phase-content {
  width: 100%;
  max-width: min(1200px, 90vw);
  padding: 0 48px;
  text-align: center;
}

.main-text {
  font-family: 'Syne', sans-serif;
  font-size: 72px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.3;
  margin: 0 0 32px 0;
  opacity: 0;
  transform: translateY(40px);
  transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.main-text.fade-in {
  opacity: 1;
  transform: translateY(0);
}

.main-text.delay {
  transition-delay: 0.3s;
}

.main-text:last-child {
  margin-bottom: 0;
}

.main-text .gold {
  color: #F0B429;
  text-shadow: 0 0 30px rgba(240, 180, 41, 0.5);
}

.final-text {
  font-family: 'Syne', sans-serif;
  font-size: 96px;
  font-weight: 800;
  color: #F0B429;
  line-height: 1.2;
  margin: 0 0 48px 0;
  opacity: 0;
  transform: scale(0.9);
  transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-shadow: 0 0 40px rgba(240, 180, 41, 0.6);
}

.final-text.fade-in {
  opacity: 1;
  transform: scale(1);
}

.cta-buttons {
  display: flex;
  gap: 24px;
  justify-content: center;
  opacity: 0;
  transform: translateY(30px);
  transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.cta-buttons.fade-in {
  opacity: 1;
  transform: translateY(0);
}

.cta-buttons.delay {
  transition-delay: 0.4s;
}

.btn-primary,
.btn-secondary {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 18px;
  font-weight: 600;
  padding: 20px 48px;
  border-radius: 12px;
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
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: bounce 2s infinite;
  opacity: 1;
  transition: opacity 0.5s;
}

.scroll-indicator.hide {
  opacity: 0;
  pointer-events: none;
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
  .phase-content {
    padding: 0 24px;
  }

  .main-text {
    font-size: 42px;
    margin-bottom: 24px;
  }

  .final-text {
    font-size: 56px;
    margin-bottom: 32px;
  }

  .cta-buttons {
    flex-direction: column;
    width: 100%;
    gap: 16px;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .main-text {
    font-size: 56px;
  }

  .final-text {
    font-size: 72px;
  }
}
</style>
