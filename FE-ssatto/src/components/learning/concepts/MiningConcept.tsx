// 모듈 4.1 커스텀 개념학습: 행운의 숫자 찾기 (채굴/PoW)
// PoW 수식 + 슬롯 자동재생 애니메이션 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: PoW 수식 + 슬롯 자동 스핀 ──────────── */
function MiningHero() {
  const hexChars = "0123456789abcdef".split("");
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* PoW 수식 */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-center">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">작업 증명 조건</p>
        <p className="font-mono text-sm text-white/70">
          Hash(BlockData + <span className="text-accent-gold font-bold">Nonce</span>) &lt;{" "}
          <span className="text-red-400 font-bold">Target</span>
        </p>
      </div>

      {/* 슬롯 릴 자동 스핀 */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="relative w-11 h-14 rounded-lg border-2 border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
            <motion.div
              className="flex flex-col items-center"
              animate={{ y: [0, -14 * 16] }}
              transition={{
                repeat: Infinity,
                duration: 2 + i * 0.3,
                ease: "linear",
              }}
            >
              {/* 두 세트를 렌더링해서 심리스 루프 */}
              {[...hexChars, ...hexChars].map((c, j) => (
                <span key={j} className={`text-lg font-mono font-bold leading-[14px] py-[1px] ${
                  i < 2 ? "text-red-400/80" : "text-white/50"
                }`}>{c}</span>
              ))}
            </motion.div>
          </div>
        ))}
        <span className="self-center text-white/20 font-mono text-sm">...</span>
      </div>

      {/* 목표 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/30">목표:</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`w-6 h-6 rounded text-center text-xs leading-6 font-mono font-bold ${
              i < 2
                ? "bg-red-500/20 border border-red-500/30 text-red-400"
                : "bg-white/[0.03] border border-white/[0.06] text-white/20"
            }`}>
              {i < 2 ? "0" : "*"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 작업 증명: 슬롯머신 릴이 끝없이 돌아감 */
function PowAnim() {
  const symbols = ["7", "0", "3", "a", "f", "0", "9", "b"];
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 100 }}>
        {/* 슬롯 프레임 */}
        <div className="absolute inset-0 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/[0.05] flex items-center justify-center gap-2 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-12 h-14 rounded-lg border border-yellow-400/20 bg-black/30 overflow-hidden flex items-center justify-center">
              <motion.div
                className="flex flex-col items-center"
                animate={{ y: [0, -symbols.length * 20] }}
                transition={{ repeat: Infinity, duration: 1.5 + i * 0.4, ease: "linear" }}
              >
                {[...symbols, ...symbols].map((s, j) => (
                  <span key={j} className="text-xl font-mono font-bold text-yellow-300 leading-[20px]">{s}</span>
                ))}
              </motion.div>
            </div>
          ))}
        </div>

        {/* 레버 */}
        <motion.div
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-12 rounded-full bg-red-500/40 border border-red-400/30"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/** 난이도 조정: 0의 개수가 1→2→3→4로 증가 */
function DifficultyAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex flex-col items-center gap-2">
        {[1, 2, 3, 4].map((d, idx) => (
          <motion.div
            key={d}
            className="flex items-center gap-2"
            animate={{
              opacity: [0, 0, 1, 1, 0],
              x: [-10, -10, 0, 0, 10],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              times: [
                Math.max(0, idx * 0.22 - 0.05),
                idx * 0.22,
                idx * 0.22 + 0.05,
                Math.min(1, idx * 0.22 + 0.2),
                Math.min(1, idx * 0.22 + 0.25),
              ],
            }}
          >
            <span className="text-[10px] text-white/30 w-12">난이도 {d}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`w-5 h-6 rounded text-center text-[10px] leading-6 font-mono font-bold ${
                  i < d
                    ? "bg-red-500/25 border border-red-500/40 text-red-400"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/15"
                }`}>
                  {i < d ? "0" : "*"}
                </span>
              ))}
            </div>
            <motion.span
              className="text-[10px] text-purple-300/60"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: idx * 0.3 }}
            >
              {d === 1 ? "쉬움" : d === 2 ? "보통" : d === 3 ? "어려움" : "극한"}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 보상: JACKPOT + 코인 쏟아짐 */
function RewardAnim() {
  const coins = Array.from({ length: 8 }, (_, i) => ({
    x: -40 + Math.random() * 80,
    delay: i * 0.2,
  }));
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 130 }}>
        {/* JACKPOT 텍스트 */}
        <motion.p
          className="absolute top-2 left-1/2 -translate-x-1/2 text-xl font-black text-accent-gold whitespace-nowrap"
          animate={{ scale: [0.8, 1.1, 1, 1.1, 0.8], opacity: [0.6, 1, 1, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          {"\u{1F389}"} JACKPOT! {"\u{1F389}"}
        </motion.p>

        {/* 코인 파티클 */}
        {coins.map((c, i) => (
          <motion.div
            key={i}
            className="absolute w-5 h-5 rounded-full border border-accent-gold/50 bg-accent-gold/30 flex items-center justify-center"
            style={{ left: "50%", top: 30 }}
            animate={{
              x: [0, c.x],
              y: [0, 70 + Math.random() * 20],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: c.delay,
              ease: "easeOut",
            }}
          >
            <span className="text-[8px] text-accent-gold font-bold">{"\u{1FA99}"}</span>
          </motion.div>
        ))}

        {/* +100 JACK */}
        <motion.p
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-emerald-400"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [10, 10, 0, 0, -5] }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 0.85, 1] }}
        >
          +100 JACK 보상!
        </motion.p>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "작업 증명", short: "수백만 번의 해시 계산",
    desc: "정답을 찾을 때까지 수없이 해시를 계산합니다. 슬롯머신을 수백만 번 돌리는 것과 같습니다.",
    accent: "text-yellow-400", border: "border-yellow-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(234,179,8,0.35)] hover:border-yellow-500/50",
    bg: "from-yellow-500/[0.08] to-yellow-600/[0.02]",
    Anim: PowAnim,
  },
  {
    title: "난이도 조정", short: "0의 개수가 난이도를 결정합니다",
    desc: "0의 개수가 늘수록 정답 찾기가 기하급수적으로 어려워집니다.",
    accent: "text-purple-400", border: "border-purple-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:border-purple-500/50",
    bg: "from-purple-500/[0.08] to-purple-600/[0.02]",
    Anim: DifficultyAnim,
  },
  {
    title: "보상", short: "정답을 찾으면 100 JACK!",
    desc: "정답을 찾은 채굴자에게 100 JACK이 새로 발행됩니다.",
    accent: "text-emerald-400", border: "border-emerald-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/50",
    bg: "from-emerald-500/[0.08] to-emerald-600/[0.02]",
    Anim: RewardAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
    <path d="M2 12h2M20 12h2M12 2v2M12 20v2" opacity={0.3} />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v3M9.5 14h5" strokeLinecap="round" />
    <path d="M8 2l2 2M16 2l-2 2" opacity={0.4} />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function MiningConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">채굴은 거대한 슬롯머신이다</h2>
        <p className="mt-2 text-sm text-white/50">
          JackpotChain에서 잭팟을 터뜨려 보세요!
        </p>
      </div>

      <MiningHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 난이도가 높아지면 왜 더 오래 걸릴까요?
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
            <p className="text-[11px] text-white/40 leading-relaxed">{card.short}</p>
          </motion.div>
        ))}
      </div>

      {/* 팝업: 자동재생 애니메이션 + 설명 텍스트 (버튼/입력 없음) */}
      <AnimatePresence>
        {expandedCard !== null && (() => {
          const card = CARDS[expandedCard];
          const CardAnim = card.Anim;
          return (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExpandedCard(null)}>
              <motion.div
                className={`rounded-3xl border ${card.border} bg-gradient-to-b ${card.bg} bg-bg-primary backdrop-blur-2xl p-8 max-w-sm w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-6">
                  <CardAnim />
                  <div className="text-center">
                    <p className={`text-lg font-bold ${card.accent} mb-2`}>{card.title}</p>
                    <p className="text-sm text-white/70 leading-relaxed">{card.desc}</p>
                  </div>
                  <button onClick={() => setExpandedCard(null)}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors">닫기</button>
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
