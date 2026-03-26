// 모듈 1.3 커스텀 개념학습: 합의의 힘
// 자동재생 애니메이션 + 정적 설명 (버튼/입력 없음)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 원형 회의 테이블 ─────────────────────── */
function ConsensusTableHero() {
  const nodes = [
    { angle: -90, ok: true }, { angle: -18, ok: true }, { angle: 54, ok: false },
    { angle: 126, ok: true }, { angle: 198, ok: true },
  ];
  const r = 70;
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 220, height: 200 }}>
        {/* 연결선 (원형) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 200">
          <circle cx="110" cy="95" r={r} fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="1" strokeDasharray="4 4" />
          {nodes.map((n, i) => (
            <motion.line key={i}
              x1="110" y1="95"
              x2={110 + r * Math.cos((n.angle * Math.PI) / 180)}
              y2={95 + r * Math.sin((n.angle * Math.PI) / 180)}
              stroke={n.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}
              strokeWidth="1" strokeDasharray="3 3"
              animate={{ stroke: n.ok ? ["rgba(34,197,94,0.1)", "rgba(34,197,94,0.4)", "rgba(34,197,94,0.1)"] : ["rgba(239,68,68,0.1)", "rgba(239,68,68,0.4)", "rgba(239,68,68,0.1)"] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.4 }} />
          ))}
        </svg>
        {/* 중앙 블록 */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl border-2 border-accent-gold/30 bg-accent-gold/[0.08] flex items-center justify-center"
          style={{ top: 95 - 28 }}
          animate={{ borderColor: ["rgba(212,168,67,0.3)", "rgba(34,197,94,0.5)", "rgba(34,197,94,0.5)", "rgba(212,168,67,0.3)"] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.4, 0.8, 1] }}>
          <span className="text-xl">{"\u{1F4E6}"}</span>
        </motion.div>
        {/* 5개 노드 */}
        {nodes.map((n, i) => {
          const x = 110 + r * Math.cos((n.angle * Math.PI) / 180);
          const y = 95 + r * Math.sin((n.angle * Math.PI) / 180);
          return (
            <motion.div key={i}
              className="absolute flex flex-col items-center"
              style={{ left: x - 16, top: y - 16 }}>
              <motion.div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  n.ok ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-red-500/50 bg-red-500/15 text-red-400"
                }`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 3, delay: i * 0.5 }}>
                {n.ok ? "\u2713" : "\u2717"}
              </motion.div>
            </motion.div>
          );
        })}
        {/* 결과 */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.5, 0.6, 0.9, 1] }}>
          <p className="text-[10px] text-emerald-400 font-bold">{"\u2705"} 4:1 승인</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 ──────────────────────────────── */

/** 다수결: 5노드 순차 승인 루프 */
function MajorityAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex gap-2">
        {[true, true, true, false, true].map((ok, i) => (
          <motion.div key={i}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
              ok ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                : "border-red-500/50 bg-red-500/15 text-red-400"
            }`}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }}>
            {ok ? "\u2713" : "\u2717"}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 비잔틴: 배신자 1명이 빨갛게 빛나지만 시스템은 초록 유지 */
function ByzantineAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-center">
          <p className="text-lg">{"\u{1F482}"}</p>
          <p className="text-[9px] text-emerald-400 mt-1">장군A</p>
        </div>
        <motion.div
          className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3 text-center"
          animate={{ borderColor: ["rgba(239,68,68,0.3)", "rgba(239,68,68,0.8)", "rgba(239,68,68,0.3)"], x: [0, -2, 2, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}>
          <p className="text-lg">{"\u{1F47F}"}</p>
          <p className="text-[9px] text-red-400 mt-1">배신자</p>
        </motion.div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-center">
          <p className="text-lg">{"\u{1F482}"}</p>
          <p className="text-[9px] text-emerald-400 mt-1">장군C</p>
        </div>
      </div>
    </div>
  );
}

/** 탈중앙화: 5노드 중 1개 꺼지고 나머지 연결 유지 */
function DecentralAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 180, height: 100 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 180 100">
          {[[30,20],[90,15],[150,20],[50,75],[130,75]].map((p, i) => (
            i !== 2 && <motion.line key={i} x1="90" y1="50" x2={p[0]} y2={p[1]}
              stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="3 3"
              animate={{ stroke: ["rgba(34,197,94,0.15)", "rgba(34,197,94,0.4)", "rgba(34,197,94,0.15)"] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }} />
          ))}
        </svg>
        {[[30,20],[90,15],[150,20],[50,75],[130,75]].map((p, i) => (
          <motion.div key={i} className="absolute flex items-center justify-center"
            style={{ left: p[0] - 12, top: p[1] - 12, width: 24, height: 24 }}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
              i === 2
                ? "border-red-500/40 bg-red-500/10 text-red-400 opacity-30"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            }`}>
              {i === 2 ? "\u2717" : "\u{1F5A5}\uFE0F"}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── 카드 데이터 ──────────────────────────────────── */
const CARDS = [
  {
    title: "다수결 원칙", short: "과반수가 동의해야 합니다",
    desc: "과반수 이상이 '맞다'고 동의해야 기록이 확정됩니다.",
    accent: "text-blue-400", border: "border-blue-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:border-blue-500/60",
    bg: "from-blue-500/[0.14] to-blue-600/[0.04]",
    Anim: MajorityAnim,
  },
  {
    title: "비잔틴 내결함", short: "배신자가 있어도 안전합니다",
    desc: "일부가 거짓말을 해도, 정직한 다수가 시스템을 지킵니다.",
    accent: "text-purple-400", border: "border-purple-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.3)] hover:border-purple-500/60",
    bg: "from-purple-500/[0.14] to-purple-600/[0.04]",
    Anim: ByzantineAnim,
  },
  {
    title: "탈중앙화", short: "중앙 관리자가 없습니다",
    desc: "중앙 관리자 없이 네트워크 전체가 함께 검증합니다.",
    accent: "text-emerald-400", border: "border-emerald-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:border-emerald-500/60",
    bg: "from-emerald-500/[0.14] to-emerald-600/[0.04]",
    Anim: DecentralAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 3, -3, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
    <path d="M12 3v3M3 12h3M21 12h-3M12 21v-3" strokeLinecap="round" />
    <circle cx="12" cy="12" r="5" /><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
    <path d="M12 2l7 4v6c0 5.25-3.5 8.5-7 10-3.5-1.5-7-4.75-7-10V6l7-4z" />
    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }}>
    <circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" />
    <circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" />
    <path d="M7 6h10M5 8v8M19 8v8M7 18h4M13 18h4" strokeDasharray="2 2" opacity={0.5} />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function ConsensusConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">합의의 힘</h2>
        <p className="mt-2 text-sm text-white/65">
          과반수 이상이 동의해야 기록이 인정되는 마을 회의
        </p>
      </div>

      <ConsensusTableHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 블록체인은 어떻게 거짓말쟁이를 걸러낼까요?
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
          직접 위조 시도를 막아보세요! {"\u2192"}
        </GlassButton>
      </div>
    </div>
  );
}
