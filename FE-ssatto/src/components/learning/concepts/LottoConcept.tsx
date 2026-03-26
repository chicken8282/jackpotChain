// 모듈 5.1 커스텀 개념학습: 로또 참여 시뮬레이션
// 로또 드럼 그래픽 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 로또 드럼 ── 16진수 공들이 순차 선택 ── */
function LottoHero() {
  const hexChars = "0123456789ABCDEF".split("");
  const selectedIndices = [2, 7, 10, 4, 15, 9]; // 선택되는 공들

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* 드럼 원형 */}
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* 투명 원형 테두리 */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10 bg-white/[0.02]" />

        {/* 16진수 공들이 원형 배치 + 회전 */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        >
          {hexChars.map((c, i) => {
            const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
            const r = 85;
            const x = 110 + r * Math.cos(angle) - 12;
            const y = 110 + r * Math.sin(angle) - 12;
            const isSelected = selectedIndices.includes(i);
            return (
              <motion.div
                key={i}
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  isSelected
                    ? "border-2 border-accent-gold/60 bg-accent-gold/20 text-accent-gold"
                    : "border border-white/15 bg-white/[0.04] text-white/30"
                }`}
                style={{ left: x, top: y }}
                animate={isSelected ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : {}}
                transition={isSelected ? { repeat: Infinity, duration: 2, delay: selectedIndices.indexOf(i) * 0.3 } : {}}
              >
                <motion.span
                  animate={{ rotate: [0, -360] }}
                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                >
                  {c}
                </motion.span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 중앙 라벨 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">LOTTO</p>
            <p className="text-lg font-bold text-accent-gold">6 / 16</p>
          </div>
        </div>
      </div>

      {/* 선택된 공 줄 */}
      <div className="flex gap-2">
        {selectedIndices.map((idx, i) => (
          <motion.div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-accent-gold/40 bg-accent-gold/10 flex items-center justify-center"
            animate={{ opacity: [0, 1], scale: [0.5, 1] }}
            transition={{
              repeat: Infinity,
              duration: 4,
              delay: i * 0.5,
              repeatDelay: 2,
            }}
          >
            <span className="text-xs font-mono font-bold text-accent-gold">
              {hexChars[idx]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 번호 선택: 6개 hex 공이 뽑히는 애니메이션 */
function PickAnim() {
  const picks = ["3", "A", "7", "F", "1", "C"];
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 110 }}>
        {/* 풀에서 6개 공이 순차 빠져나옴 */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1 w-20">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
              <span className="text-[5px] font-mono text-white/20">{i.toString(16).toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* 선택된 6개 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {picks.map((p, i) => (
            <motion.div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-blue-400/40 bg-blue-500/15 flex items-center justify-center"
              animate={{
                x: [-40, 0],
                opacity: [0, 1],
                scale: [0.3, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                delay: i * 0.5,
                repeatDelay: 2,
              }}
            >
              <span className="text-xs font-mono font-bold text-blue-400">{p}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 블록 해시 결과: 블록들이 나타나며 해시값 표시 */
function BlockHashAnim() {
  const blocks = [
    { n: "N+3", hash: "a7f3" },
    { n: "N+6", hash: "2b1e" },
    { n: "N+9", hash: "c9d4" },
    { n: "N+12", hash: "5e8a" },
    { n: "N+15", hash: "f1b7" },
    { n: "N+18", hash: "3c6f" },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="flex flex-col items-center gap-2">
        {blocks.map((b, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2"
            animate={{
              opacity: [0, 1, 1, 0],
              x: [-15, 0, 0, 15],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              delay: i * 0.8,
              times: [0, 0.1, 0.7, 0.85],
            }}
          >
            <div className="w-14 h-7 rounded border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
              <span className="text-[9px] font-mono font-bold text-purple-400">{b.n}</span>
            </div>
            <span className="text-white/20 text-xs">{"\u2192"}</span>
            <div className="rounded border border-purple-400/20 bg-purple-400/[0.06] px-2 py-0.5">
              <span className="text-[9px] font-mono text-purple-300">0x{b.hash}...</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 수령 기간: 블록 카운트 타이머 */
function ClaimTimerAnim() {
  const blockNumbers = Array.from({ length: 8 }, (_, i) => `N+${18 + i * 7}`);
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 120 }}>
        {/* 타임라인 바 */}
        <div className="absolute top-10 left-4 right-4 h-1 rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-emerald-500/50"
            animate={{ width: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear", repeatDelay: 1 }}
          />
        </div>

        {/* 시작/끝 라벨 */}
        <div className="absolute top-0 left-4">
          <p className="text-[9px] font-mono text-emerald-400">N+18</p>
        </div>
        <div className="absolute top-0 right-4">
          <p className="text-[9px] font-mono text-emerald-400">N+68</p>
        </div>

        {/* 블록 넘버 순차 표시 */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          {blockNumbers.map((bn, i) => (
            <motion.div
              key={i}
              className="rounded border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-0.5"
              animate={{
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                delay: i * 0.6,
                times: [0, 0.1, 0.6, 0.8],
              }}
            >
              <span className="text-[9px] font-mono text-emerald-400">블록 {bn}</span>
            </motion.div>
          ))}
        </div>

        {/* 수령 가능 텍스트 */}
        <motion.p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 whitespace-nowrap"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.6, 0.7, 0.9, 1] }}
        >
          50블록 안에 수령하세요!
        </motion.p>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "번호 선택", short: "0x0~0xF 중 6개를 고릅니다",
    desc: "0부터 F까지 16진수 중 6개 번호를 선택합니다. 블록체인 특성에 맞는 16진수 로또 시스템입니다.",
    accent: "text-blue-400", border: "border-blue-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:border-blue-500/60",
    bg: "from-blue-500/[0.14] to-blue-600/[0.04]",
    Anim: PickAnim,
  },
  {
    title: "블록 해시 결과", short: "N+3, N+6, ..., N+18 블록의 해시로 결정",
    desc: "당첨 번호는 미래 블록(N+3, N+6, ..., N+18)의 해시에서 추출됩니다. 아무도 미리 알 수 없으므로 공정합니다.",
    accent: "text-purple-400", border: "border-purple-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:border-purple-500/60",
    bg: "from-purple-500/[0.14] to-purple-600/[0.04]",
    Anim: BlockHashAnim,
  },
  {
    title: "수령 기간", short: "N+18 ~ N+68 블록 사이에 당첨금 수령",
    desc: "당첨 결과는 N+18 블록 이후 확정됩니다. N+68 블록까지 50블록 이내에 당첨금을 수령해야 합니다.",
    accent: "text-emerald-400", border: "border-emerald-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/60",
    bg: "from-emerald-500/[0.14] to-emerald-600/[0.04]",
    Anim: ClaimTimerAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="9" />
    <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold" fontFamily="monospace">6</text>
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 9h18M9 3v18" opacity={0.3} />
    <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontFamily="monospace">#</text>
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function LottoConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">공정한 로또 시스템</h2>
        <p className="mt-2 text-sm text-white/65">
          6개 번호를 선택하면, 블록 해시가 결과를 결정합니다
        </p>
      </div>

      <LottoHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 로또 결과는 어떻게 결정될까요?
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
