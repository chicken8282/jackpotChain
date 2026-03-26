// 모듈 4.2 커스텀 개념학습: JACK & POT 이코노미
// 교환소 그래픽 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 교환소 그래픽 ── JACK → POT 변환 + 소각 루프 ── */
function EconomyHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 300, height: 180 }}>
        {/* JACK 코인 100개가 왼쪽에서 모임 */}
        {Array.from({ length: 8 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 rounded-full border border-yellow-500/50 bg-yellow-500/20 flex items-center justify-center"
            style={{ left: 20 + (i % 4) * 16, top: 50 + Math.floor(i / 4) * 18 }}
            animate={{
              x: [0, 100 - (i % 4) * 16],
              opacity: [1, 1, 0],
              scale: [1, 1, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              delay: i * 0.1,
              ease: "easeInOut",
              repeatDelay: 1,
            }}
          >
            <span className="text-[6px] font-bold text-yellow-400">J</span>
          </motion.div>
        ))}

        {/* 교환소 박스 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-xl border-2 border-white/15 bg-white/[0.04] flex items-center justify-center">
          <motion.span
            className="text-lg text-white/40"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          >
            {"\u21C4"}
          </motion.span>
        </div>

        {/* POT 토큰 오른쪽으로 나옴 */}
        <motion.div
          className="absolute w-8 h-8 rounded-full border-2 border-purple-500/50 bg-purple-500/20 flex items-center justify-center"
          style={{ right: 40, top: 60 }}
          animate={{
            x: [0, 30],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            delay: 1.5,
            ease: "easeOut",
            repeatDelay: 1,
          }}
        >
          <span className="text-[8px] font-bold text-purple-400">P</span>
        </motion.div>

        {/* 소각 불꽃 */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`fire-${i}`}
            className="absolute text-lg"
            style={{ right: 15 + i * 12, bottom: 20 }}
            animate={{
              y: [0, -15, -25],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              delay: i * 0.3 + 2,
              repeatDelay: 2.5,
            }}
          >
            {"\u{1F525}"}
          </motion.div>
        ))}

        {/* 라벨 */}
        <p className="absolute left-4 bottom-0 text-[10px] text-yellow-400/60 font-mono">100 JACK</p>
        <p className="absolute left-1/2 -translate-x-1/2 bottom-0 text-[10px] text-white/30">{"\u2192"}</p>
        <p className="absolute right-4 bottom-0 text-[10px] text-purple-400/60 font-mono">1 POT</p>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** JACK: 코인이 쌓이는 애니메이션 */
function JackAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 120 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-10 rounded-full border border-yellow-500/40 bg-yellow-500/20 flex items-center justify-center"
            style={{ height: 10 }}
            animate={{
              y: [0, 100 - i * 10],
              opacity: [0, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: i * 0.15,
              ease: "easeIn",
              repeatDelay: 1,
            }}
          >
            <span className="text-[6px] font-bold text-yellow-400">JACK</span>
          </motion.div>
        ))}
        <motion.p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-400 whitespace-nowrap"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.5, 0.6, 0.85, 1] }}
        >
          채굴 보상 · 송금 · 수수료
        </motion.p>
      </div>
    </div>
  );
}

/** POT: 교환 변환 애니메이션 */
function PotAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 110 }}>
        {/* 100 JACK 묶음 */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-0.5">
              {Array.from({ length: 4 }, (_, j) => (
                <motion.div
                  key={j}
                  className="w-4 h-4 rounded-full border border-yellow-500/30 bg-yellow-500/15 flex items-center justify-center"
                  animate={{ opacity: [1, 1, 0.2] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    delay: (row * 4 + j) * 0.05,
                    repeatDelay: 1,
                  }}
                >
                  <span className="text-[4px] text-yellow-400">J</span>
                </motion.div>
              ))}
            </div>
          ))}
          <p className="text-[8px] text-yellow-400/50 font-mono">100 JACK</p>
        </div>

        {/* 화살표 */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ x: [-5, 5, -5], opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-2xl text-white/30">{"\u27A1"}</span>
        </motion.div>

        {/* 1 POT */}
        <motion.div
          className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-purple-500/40 bg-purple-500/15 flex flex-col items-center justify-center"
          animate={{ scale: [0.8, 1.1, 1], opacity: [0, 1, 1] }}
          transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }}
        >
          <span className="text-sm font-bold text-purple-400">1</span>
          <span className="text-[8px] font-bold text-purple-400">POT</span>
        </motion.div>
      </div>
    </div>
  );
}

/** 소각: 코인이 불에 타는 애니메이션 */
function BurnAnim() {
  const coins = Array.from({ length: 6 }, (_, i) => ({
    x: -30 + Math.random() * 60,
    delay: i * 0.3,
  }));
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 130 }}>
        {/* 불꽃 베이스 */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl"
          animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          {"\u{1F525}"}
        </motion.div>

        {/* 코인 떨어져 소멸 */}
        {coins.map((c, i) => (
          <motion.div
            key={i}
            className="absolute w-5 h-5 rounded-full border border-red-500/40 bg-red-500/20 flex items-center justify-center"
            style={{ left: "50%", top: 10 }}
            animate={{
              x: [c.x, c.x * 0.3],
              y: [0, 80],
              opacity: [1, 1, 0],
              scale: [1, 0.6, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: c.delay,
              ease: "easeIn",
            }}
          >
            <span className="text-[6px] text-red-400 font-bold">J</span>
          </motion.div>
        ))}

        {/* 19% 소각 텍스트 */}
        <motion.p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-bold text-red-400 whitespace-nowrap"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.2, 0.8, 1] }}
        >
          19% 영구 소각 → 디플레이션
        </motion.p>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "JACK", short: "채굴 보상, 송금, 수수료에 사용되는 기본 코인",
    desc: "JACK은 JackpotChain의 기본 화폐입니다. 채굴 보상으로 획득하고, 송금과 수수료 지불에 사용합니다.",
    accent: "text-yellow-400", border: "border-yellow-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(234,179,8,0.35)] hover:border-yellow-500/60",
    bg: "from-yellow-500/[0.14] to-yellow-600/[0.04]",
    Anim: JackAnim,
  },
  {
    title: "POT", short: "로또 참여에 필요한 전용 토큰. 100 JACK = 1 POT",
    desc: "POT은 로또 참여 전용 토큰입니다. 100 JACK을 교환하여 1 POT을 받고, 이를 통해 로또에 참여할 수 있습니다.",
    accent: "text-purple-400", border: "border-purple-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:border-purple-500/60",
    bg: "from-purple-500/[0.14] to-purple-600/[0.04]",
    Anim: PotAnim,
  },
  {
    title: "소각", short: "참가비의 19%는 영구 소각되어 디플레이션 효과",
    desc: "로또 참가비의 19%는 영구적으로 소각됩니다. 이를 통해 JACK의 총 공급량이 점차 줄어 디플레이션 효과를 만듭니다.",
    accent: "text-red-400", border: "border-red-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:border-red-500/60",
    bg: "from-red-500/[0.14] to-red-600/[0.04]",
    Anim: BurnAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v3M9.5 14h5" strokeLinecap="round" />
    <path d="M8 2l2 2M16 2l-2 2" opacity={0.4} />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9h3l2 3-2 3H9" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
    <path d="M12 2C6.48 2 2 6 2 12s4.48 10 10 10" strokeLinecap="round" />
    <path d="M17 8l2 4-2 4" opacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 16l-2-2 2-2" opacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function EconomyConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">JACK & POT 이코노미</h2>
        <p className="mt-2 text-sm text-white/65">
          JackpotChain에는 JACK과 POT 두 가지가 있습니다
        </p>
      </div>

      <EconomyHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 왜 두 가지 토큰이 필요할까요?
      </p>

      <div className="grid grid-cols-3 gap-3 min-h-[180px]">
        {CARDS.map((card, i) => (
          <motion.div key={i}
            className={`relative cursor-pointer rounded-2xl border ${card.border} ${card.glowHover} bg-gradient-to-b ${card.bg} backdrop-blur-xl p-5 flex flex-col items-center text-center gap-3 transition-shadow duration-300`}
            whileHover={{ scale: 1.05, y: -6 }} whileTap={{ scale: 0.97 }}
            onClick={() => setExpandedCard(expandedCard === i ? null : i)}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className={card.accent}>{icons[i]}</div>
            <p className={`text-sm font-bold ${card.accent}`}>{card.title}</p>
            <p className="text-xs text-white/60 leading-relaxed">{card.short}</p>
          </motion.div>
        ))}
      </div>

      {/* 팝업: 자동재생 애니메이션 + 설명 텍스트 (버튼/입력 없음) */}
      <AnimatePresence>
        {expandedCard !== null && (() => {
          const card = CARDS[expandedCard];
          const CardAnim = card.Anim;
          return (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExpandedCard(null)}>
              <motion.div
                className={`relative rounded-3xl overflow-hidden border ${card.border} bg-gradient-to-b ${card.bg} bg-bg-primary backdrop-blur-2xl p-8 max-w-sm w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setExpandedCard(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors" aria-label="닫기">&times;</button>
                <div className="flex flex-col items-center gap-6">
                  <CardAnim />
                  <div className="text-center">
                    <p className={`text-lg font-bold ${card.accent} mb-2`}>{card.title}</p>
                    <p className="text-sm text-white/70 leading-[1.7]">{card.desc}</p>
                  </div>
                  <button onClick={() => setExpandedCard(null)}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-1.5 rounded-lg hover:bg-white/[0.06]">닫기</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <div className="text-center pt-2">
        <GlassButton onClick={onGoInteraction}>
          직접 체험해보기 {"\u2192"}
        </GlassButton>
      </div>
    </div>
  );
}
