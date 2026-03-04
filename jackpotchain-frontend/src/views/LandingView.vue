<template>
  <div class="landing" ref="landingRef">
    <canvas ref="canvasRef" class="particle-canvas"></canvas>

    <!-- Background patterns -->
    <div class="visual-pattern pattern-scattered" v-show="activePattern === 'scattered'"></div>
    <div class="visual-pattern pattern-connected" v-show="activePattern === 'connected'"></div>

    <nav class="navbar">
      <div class="logo">
        <img src="@/assets/images/landing/jackpotchain-logo.svg" alt="JackpotChain" class="logo-icon" />
        <span>JackpotChain</span>
      </div>
    </nav>

    <!-- Phase 1 -->
    <section class="phase-section" data-phase="1">
      <div class="phase-visual">
        <img src="@/assets/images/landing/icons/puzzle-block.svg" alt="" class="phase-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">블록체인은 늘<br />파편으로 설명됐습니다.</h1>
      </div>
    </section>

    <!-- Phase 2 -->
    <section class="phase-section" data-phase="2">
      <div class="phase-visual">
        <img src="@/assets/images/landing/icons/question-maze.svg" alt="" class="phase-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">알 것 같으면서도<br />모르는 이유,</h1>
      </div>
    </section>

    <!-- Phase 3 -->
    <section class="phase-section" data-phase="3">
      <div class="phase-visual">
        <img src="@/assets/images/landing/icons/broken-chain.svg" alt="" class="phase-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">한 번도 흐름으로<br />배운 적이 없어서입니다.</h1>
      </div>
    </section>

    <!-- Phase 4 -->
    <section class="phase-section hero-phase" data-phase="4">
      <div class="hero-visual">
        <img src="@/assets/images/landing/icons/blockchain-flow.svg" alt="" class="hero-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">
          <span class="gold">JackpotChain</span>은<br />그 흐름을 잇습니다.
        </h1>
      </div>
    </section>

    <!-- Phase 5 -->
    <section class="phase-section" data-phase="5">
      <div class="phase-visual">
        <img src="@/assets/images/landing/icons/mining-pickaxe.svg" alt="" class="phase-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">클릭 한 번으로,<br />직접 채굴에 참여하고</h1>
      </div>
    </section>

    <!-- Phase 6 -->
    <section class="phase-section" data-phase="6">
      <div class="phase-visual">
        <img src="@/assets/images/landing/icons/coin-exchange.svg" alt="" class="phase-icon" loading="lazy" />
      </div>
      <div class="phase-content">
        <h1 class="main-text">채굴로 얻은 코인으로,<br />거래에 참여하며 지식을 체화합니다.</h1>
      </div>
    </section>

    <!-- Phase 7 -->
    <section class="phase-section" data-phase="7">
      <div class="phase-content">
        <div class="cta-logo">
          <img src="@/assets/images/landing/jackpotchain-logo.svg" alt="" class="cta-logo-icon" loading="lazy" />
        </div>
        <h1 class="final-text">준비되셨나요?</h1>
        <div class="cta-buttons">
          <button class="btn-primary" @click="startMining">
            채굴 시작하기 →
          </button>
          <button class="btn-secondary">개념 먼저 보기</button>
        </div>
      </div>
    </section>

    <div class="scroll-indicator" :class="{ hide: hideScrollIndicator }">
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
const hideScrollIndicator = ref(false)
const activePattern = ref<'scattered' | 'connected'>('scattered')

let isScrolling = false
let scrollTimeout: number
let currentSection = 0

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

  // Intersection Observer for smooth animations (Toss style)
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')

          // Pattern switching based on phase
          const phase = entry.target.getAttribute('data-phase')
          if (phase) {
            activePattern.value = Number(phase) >= 4 ? 'connected' : 'scattered'
          }
        }
      })
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -15% 0px'
    }
  )

  // Observe all sections
  const sections = document.querySelectorAll('.phase-section')
  sections.forEach(section => observer.observe(section))

  // Hide scroll indicator on scroll
  const handleLandingScroll = () => {
    if (landingRef.value && landingRef.value.scrollTop > 100) {
      hideScrollIndicator.value = true
    }
  }

  // Custom wheel handler for better scroll control
  const handleWheel = (e: WheelEvent) => {
    if (isScrolling) {
      e.preventDefault()
      return
    }

    const delta = e.deltaY
    const threshold = 100 // Increase this to make scroll less sensitive

    if (Math.abs(delta) > threshold) {
      e.preventDefault()
      isScrolling = true

      const sections = document.querySelectorAll('.phase-section')
      const direction = delta > 0 ? 1 : -1
      const nextSection = currentSection + direction

      if (nextSection >= 0 && nextSection < sections.length) {
        currentSection = nextSection
        sections[nextSection].scrollIntoView({ behavior: 'smooth' })
      }

      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isScrolling = false
      }, 800)
    }
  }

  landingRef.value?.addEventListener('scroll', handleLandingScroll)
  landingRef.value?.addEventListener('wheel', handleWheel, { passive: false })

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('fullscreenchange', handleResize)
    document.removeEventListener('webkitfullscreenchange', handleResize)
    landingRef.value?.removeEventListener('scroll', handleLandingScroll)
    landingRef.value?.removeEventListener('wheel', handleWheel)
    clearTimeout(scrollTimeout)
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
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.landing::-webkit-scrollbar {
  display: none;
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

/* Background Patterns */
.visual-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.visual-pattern[style*="display: none"] {
  display: none !important;
}

.pattern-scattered {
  background-image: url('@/assets/images/landing/patterns/scattered-blocks.svg');
  background-size: 400px;
  background-repeat: repeat;
  opacity: 0.08;
}

.pattern-connected {
  background-image: url('@/assets/images/landing/patterns/connected-nodes.svg');
  background-size: 400px;
  background-repeat: repeat;
  opacity: 0.08;
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
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #F0B429;
}

.logo-icon {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 0 8px rgba(240, 180, 41, 0.4));
}

/* Phase Sections */
.phase-section {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

/* Phase glass morphism effect */
.phase-section::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 60%;
  background: linear-gradient(
    135deg,
    rgba(240, 180, 41, 0.02) 0%,
    transparent 50%
  );
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}

/* Phase Icons */
.phase-visual {
  position: relative;
  margin-bottom: 32px;
  opacity: 0;
  transform: translateX(-100px);
  transition: all 1.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.phase-section.visible .phase-visual {
  opacity: 0.6;
  transform: translateX(0);
}

.phase-icon {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 0 20px rgba(240, 180, 41, 0.3));
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
  margin: 0;
  opacity: 0;
  transform: translateY(80px);
  filter: blur(4px);
  transition: opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1),
              transform 1.4s cubic-bezier(0.19, 1, 0.22, 1),
              filter 1.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.phase-section.visible .main-text {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.main-text .gold {
  color: #F0B429;
  text-shadow:
    0 0 30px rgba(240, 180, 41, 0.6),
    0 0 60px rgba(240, 180, 41, 0.3),
    0 0 90px rgba(240, 180, 41, 0.1);
  display: inline-block;
  animation: text-glow 2s ease-in-out infinite alternate;
}

@keyframes text-glow {
  from {
    text-shadow:
      0 0 30px rgba(240, 180, 41, 0.6),
      0 0 60px rgba(240, 180, 41, 0.3);
  }
  to {
    text-shadow:
      0 0 40px rgba(240, 180, 41, 0.8),
      0 0 80px rgba(240, 180, 41, 0.5);
  }
}

/* Hero Phase (Phase 4) */
.hero-phase {
  background: radial-gradient(
    circle at center,
    rgba(240, 180, 41, 0.03) 0%,
    transparent 60%
  );
}

.hero-visual {
  position: relative;
  margin-bottom: 40px;
}

.hero-icon {
  width: 200px;
  height: 200px;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(240, 180, 41, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(240, 180, 41, 0.8));
  }
}

/* CTA Logo */
.cta-logo {
  opacity: 0;
  transform: translateY(60px);
  filter: blur(4px);
  transition: opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1),
              transform 1.4s cubic-bezier(0.19, 1, 0.22, 1),
              filter 1.4s cubic-bezier(0.19, 1, 0.22, 1);
  margin-bottom: 24px;
}

.phase-section.visible .cta-logo {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.cta-logo-icon {
  width: 80px;
  height: 80px;
  animation: pulse-glow 3s ease-in-out infinite;
}

.final-text {
  font-family: 'Syne', sans-serif;
  font-size: 96px;
  font-weight: 800;
  color: #F0B429;
  line-height: 1.2;
  margin: 0 0 48px 0;
  opacity: 0;
  transform: translateY(80px);
  filter: blur(4px);
  transition: opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.1s,
              transform 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.1s,
              filter 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.1s;
  text-shadow: 0 0 40px rgba(240, 180, 41, 0.6);
}

.phase-section.visible .final-text {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.cta-buttons {
  display: flex;
  gap: 24px;
  justify-content: center;
  opacity: 0;
  transform: translateY(60px);
  filter: blur(4px);
  transition: opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.3s,
              transform 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.3s,
              filter 1.4s cubic-bezier(0.19, 1, 0.22, 1) 0.3s;
}

.phase-section.visible .cta-buttons {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
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

  /* Mobile icon sizes */
  .logo-icon {
    width: 24px;
    height: 24px;
  }

  .phase-icon {
    width: 80px;
    height: 80px;
  }

  .hero-icon {
    width: 120px;
    height: 120px;
  }

  .cta-logo-icon {
    width: 60px;
    height: 60px;
  }

  .phase-visual {
    margin-bottom: 24px;
  }

  .hero-visual {
    margin-bottom: 32px;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .main-text {
    font-size: 56px;
  }

  .final-text {
    font-size: 72px;
  }

  /* Tablet icon sizes */
  .phase-icon {
    width: 100px;
    height: 100px;
  }

  .hero-icon {
    width: 160px;
    height: 160px;
  }

  .cta-logo-icon {
    width: 70px;
    height: 70px;
  }
}

/* Reduced motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .phase-visual,
  .phase-icon,
  .hero-icon,
  .cta-logo,
  .cta-logo-icon,
  .main-text,
  .main-text .gold,
  .final-text,
  .cta-buttons {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
