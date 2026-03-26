// 모듈 3.3 커스텀 개념학습: 블록 확정까지의 여정
// 카드 3개 클릭 패턴으로 통일 (다른 모듈과 동일한 UX)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 우체통 → 배달 흐름 ──────────────────── */
function PropagationHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 280, height: 120 }}>
        {/* 연결선 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 120">
          <motion.line x1="60" y1="60" x2="140" y2="60"
            stroke="rgba(59,130,246,0.3)" strokeWidth="2" strokeDasharray="6 4"
            animate={{ strokeDashoffset: [0, -20] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
          <motion.line x1="140" y1="60" x2="220" y2="60"
            stroke="rgba(34,197,94,0.3)" strokeWidth="2" strokeDasharray="6 4"
            animate={{ strokeDashoffset: [0, -20] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.5 }} />
        </svg>

        {/* 멤풀 */}
        <motion.div className="absolute left-2 top-1/2 -translate-y-1/2 w-16 h-16 rounded-xl border-2 border-orange-500/30 bg-orange-500/[0.08] flex flex-col items-center justify-center"
          animate={{ borderColor: ["rgba(249,115,22,0.3)", "rgba(249,115,22,0.6)", "rgba(249,115,22,0.3)"] }}
          transition={{ repeat: Infinity, duration: 3 }}>
          <span className="text-lg">📮</span>
          <span className="text-[8px] text-orange-400 mt-0.5">멤풀</span>
        </motion.div>

        {/* 채굴자 */}
        <motion.div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-16 h-16 rounded-xl border-2 border-blue-500/30 bg-blue-500/[0.08] flex flex-col items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}>
          <span className="text-lg">⛏️</span>
          <span className="text-[8px] text-blue-400 mt-0.5">채굴자</span>
        </motion.div>

        {/* 블록 확정 */}
        <motion.div className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-16 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.08] flex flex-col items-center justify-center"
          animate={{ borderColor: ["rgba(34,197,94,0.3)", "rgba(34,197,94,0.6)", "rgba(34,197,94,0.3)"] }}
          transition={{ repeat: Infinity, duration: 3, delay: 1 }}>
          <span className="text-lg">📦</span>
          <span className="text-[8px] text-emerald-400 mt-0.5">블록</span>
        </motion.div>

        {/* 이동하는 TX 파티클 */}
        <motion.div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent-gold/60"
          animate={{ left: [50, 130, 210], scale: [0.8, 1.2, 0.8], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} />
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 ──────────────────────────────── */

/** 멤풀: TX들이 대기하며 진동 */
function MempoolAnim() {
  const txs = ["TX #1", "TX #2", "TX #3", "TX #4"];
  return (
    <div className="w-full flex justify-center">
      <div className="flex flex-col gap-1.5">
        {txs.map((tx, i) => (
          <motion.div key={i}
            className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-1.5"
            animate={{ x: [0, i % 2 === 0 ? 3 : -3, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}>
            <span className="text-[10px] font-mono text-orange-300">{tx}</span>
            <span className="text-[8px] text-orange-400/60">대기중</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 채굴자 선택: 수수료 순으로 TX를 골라 블록에 담는 모습 */
function MinerSelectAnim() {
  const txs = [
    { id: "TX #3", fee: "0.5" },
    { id: "TX #1", fee: "0.3" },
    { id: "TX #4", fee: "0.1" },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          {txs.map((tx, i) => (
            <motion.div key={i}
              className="flex items-center gap-2 rounded border border-blue-500/20 bg-blue-500/[0.06] px-2 py-1 text-[9px] font-mono text-blue-300"
              animate={{ x: [0, 20, 20], opacity: [1, 1, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.6, times: [0, 0.4, 1] }}>
              {tx.id} <span className="text-blue-400/50">{tx.fee}J</span>
            </motion.div>
          ))}
        </div>
        <span className="text-white/30">→</span>
        <motion.div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/[0.06] px-3 py-2 text-center"
          animate={{ borderColor: ["rgba(59,130,246,0.3)", "rgba(59,130,246,0.6)", "rgba(59,130,246,0.3)"] }}
          transition={{ repeat: Infinity, duration: 2 }}>
          <span className="text-lg">📦</span>
          <p className="text-[8px] text-blue-400 mt-0.5">블록</p>
        </motion.div>
      </div>
    </div>
  );
}

/** 블록 확정: 체인에 연결되는 모습 */
function BlockConfirmAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="flex items-center gap-2">
            <motion.div
              className={`rounded-lg border-2 px-2 py-1.5 text-center ${
                i < 2 ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                  : "border-accent-gold/30 bg-accent-gold/[0.06]"
              }`}
              animate={i === 2 ? { scale: [0.9, 1.1, 1], borderColor: ["rgba(212,168,67,0.3)", "rgba(34,197,94,0.6)", "rgba(34,197,94,0.6)"] } : {}}
              transition={{ repeat: Infinity, duration: 3 }}>
              <p className="text-[8px] text-white/60 font-mono">#{100 + i}</p>
              <p className="text-[7px] text-white/40">{i < 2 ? "확정" : "NEW"}</p>
            </motion.div>
            {i < 2 && <span className="text-white/20 text-xs">→</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── 카드 데이터 ──────────────────────────────────── */
const CARDS = [
  {
    title: "멤풀 (Mempool)", short: "미확정 트랜잭션이 대기하는 공간입니다",
    desc: "트랜잭션은 생성 직후 멤풀(대기실)에 들어갑니다. 아직 어떤 블록에도 포함되지 않은 상태입니다.",
    accent: "text-orange-400", border: "border-orange-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(249,115,22,0.3)] hover:border-orange-500/50",
    bg: "from-orange-500/[0.08] to-orange-600/[0.02]",
    Anim: MempoolAnim,
  },
  {
    title: "채굴자 선택", short: "수수료 순으로 TX를 골라 블록에 담습니다",
    desc: "채굴자는 멤풀에서 수수료가 높은 트랜잭션부터 골라 블록에 담습니다. 수수료가 높을수록 빨리 처리됩니다.",
    accent: "text-blue-400", border: "border-blue-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:border-blue-500/50",
    bg: "from-blue-500/[0.08] to-blue-600/[0.02]",
    Anim: MinerSelectAnim,
  },
  {
    title: "블록 확정", short: "체인에 연결되면 TX가 확정됩니다",
    desc: "채굴자가 유효한 nonce를 찾으면 블록이 체인에 연결되고, 포함된 모든 트랜잭션이 확정(confirmed)됩니다.",
    accent: "text-emerald-400", border: "border-emerald-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:border-emerald-500/50",
    bg: "from-emerald-500/[0.08] to-emerald-600/[0.02]",
    Anim: BlockConfirmAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 8h8M8 12h5M8 16h8" strokeLinecap="round" opacity={0.6} />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="9" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function PropagationConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">블록 확정까지의 여정</h2>
        <p className="mt-2 text-sm text-white/50">
          트랜잭션이 생성되어 블록에 확정되기까지의 과정
        </p>
      </div>

      <PropagationHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        🤔 트랜잭션은 어떻게 블록에 포함될까요?
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
          직접 체험해보기 →
        </GlassButton>
      </div>
    </div>
  );
}
