// 모듈 1.2 커스텀 개념학습: 디지털 봉인 (해시)
// 자동재생 애니메이션 + 정적 설명 (버튼/입력 없음)

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* 간단한 해시 흉내 (시각용) */
function fakeHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (v: number) => ((v >>> 0).toString(16)).padStart(8, "0");
  return hex(h) + hex(h ^ 0xdeadbeef) + hex(h ^ 0xcafebabe) + hex(h ^ 0x12345678);
}

/* ── 히어로: 해시 머신 깔때기 그래픽 ──────────────── */
function HashMachineHero() {
  const dataItems = [
    { label: "텍스트", emoji: "\u{1F4DD}", delay: 0 },
    { label: "이미지", emoji: "\u{1F5BC}\uFE0F", delay: 2 },
    { label: "숫자", emoji: "\u{1F522}", delay: 4 },
  ];
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 280, height: 200 }}>
        {/* 깔때기 머신 */}
        <svg viewBox="0 0 280 200" className="absolute inset-0 w-full h-full">
          {/* 깔때기 본체 */}
          <path d="M60 40 L220 40 L170 120 L110 120 Z"
            fill="rgba(212,168,67,0.06)" stroke="rgba(212,168,67,0.25)" strokeWidth="1.5" />
          {/* 출구 파이프 */}
          <rect x="110" y="120" width="60" height="30" rx="4"
            fill="rgba(212,168,67,0.04)" stroke="rgba(212,168,67,0.2)" strokeWidth="1" />
          {/* HASH 라벨 */}
          <text x="140" y="82" textAnchor="middle" fill="rgba(212,168,67,0.35)" fontSize="14" fontWeight="bold">HASH</text>
          {/* 역방향 X */}
          <motion.g
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 2.5 }}>
            <line x1="128" y1="170" x2="152" y2="185" stroke="rgba(239,68,68,0.5)" strokeWidth="2" />
            <line x1="152" y1="170" x2="128" y2="185" stroke="rgba(239,68,68,0.5)" strokeWidth="2" />
          </motion.g>
          <text x="140" y="198" textAnchor="middle" fill="rgba(239,68,68,0.3)" fontSize="8">역방향 불가</text>
        </svg>

        {/* 데이터 블록들이 깔때기로 떨어짐 (자동 루프) */}
        {dataItems.map((d, i) => (
          <motion.div key={i}
            className="absolute flex flex-col items-center"
            style={{ left: 100 + i * 40 }}
            animate={{ y: [0, 90], opacity: [1, 0], scale: [1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, delay: d.delay, ease: "easeIn", repeatDelay: 4 }}>
            <span className="text-xl">{d.emoji}</span>
            <span className="text-[8px] text-white/30">{d.label}</span>
          </motion.div>
        ))}

        {/* 해시 출력 (아래에서 나옴) */}
        <motion.div
          className="absolute rounded-md border border-accent-gold/30 bg-accent-gold/[0.08] px-2 py-1"
          style={{ left: 105, bottom: 30, width: 70 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [10, 10, 0, 0, -5] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.3, 0.4, 0.8, 1] }}>
          <p className="text-[7px] font-mono text-accent-gold text-center">a3f7b2e1...</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생) ────────────────────── */

/** 단방향성: 깔때기 머신 - 데이터 들어가고 해시 나오지만 역방향 X */
function OneWayAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 120 }}>
        {/* 깔때기 */}
        <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full">
          <path d="M30 10 L170 10 L130 70 L70 70 Z" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" rx="4" />
          <text x="100" y="45" textAnchor="middle" fill="rgba(239,68,68,0.4)" fontSize="10" fontWeight="bold">HASH</text>
          {/* 출력 */}
          <rect x="70" y="80" width="60" height="24" rx="6" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.25)" strokeWidth="1" />
          <text x="100" y="96" textAnchor="middle" fill="rgba(239,68,68,0.6)" fontSize="8" fontFamily="monospace">a3f7b2e1</text>
          {/* 역방향 X */}
          <line x1="88" y1="110" x2="112" y2="110" stroke="rgba(239,68,68,0.3)" strokeWidth="1" />
          <motion.g animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2 }}>
            <line x1="94" y1="112" x2="106" y2="118" stroke="rgba(239,68,68,0.5)" strokeWidth="2" />
            <line x1="106" y1="112" x2="94" y2="118" stroke="rgba(239,68,68,0.5)" strokeWidth="2" />
          </motion.g>
        </svg>
        {/* 데이터 블록 (위에서 아래로 떨어짐) */}
        <motion.div className="absolute rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5"
          style={{ left: 80, width: 40 }}
          animate={{ top: [0, 55], opacity: [1, 0], scale: [1, 0.6] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeIn" }}>
          <p className="text-[8px] text-blue-300 text-center">DATA</p>
        </motion.div>
      </div>
    </div>
  );
}

/** 눈사태: Hello vs Hello! 해시 비교 (정적) */
function AvalancheAnim() {
  const hA = fakeHash("Hello");
  const hB = fakeHash("Hello!");
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3 text-center">
          <p className="font-mono text-base font-bold text-blue-300">Hello</p>
          <div className="flex flex-wrap justify-center gap-px mt-2">
            {hA.slice(0, 20).split("").map((c, i) => (
              <span key={i} className="text-[7px] font-mono font-bold text-blue-400">{c}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-3 text-center">
          <p className="font-mono text-base font-bold text-orange-300">Hello!</p>
          <div className="flex flex-wrap justify-center gap-px mt-2">
            {hB.slice(0, 20).split("").map((c, i) => (
              <motion.span key={i} className="text-[7px] font-mono font-bold text-orange-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}>{c}</motion.span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-3">
        <p className="text-[10px] text-white/40">입력: <span className="text-emerald-400">90% 동일</span></p>
        <p className="text-[10px] text-white/40">해시: <span className="text-red-400">100% 다름</span></p>
      </div>
    </div>
  );
}

/** 결정성: 같은 문서 → 같은 지문 (자동 스캔 루프) */
function DeterministicAnim() {
  const hash = fakeHash("블록체인").slice(0, 16);
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-2xl">{"\u{1F4C4}"}</p>
          <p className="text-[10px] text-white/40 mt-1">"블록체인"</p>
        </div>
        <motion.div
          animate={{ x: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}>
          <span className="text-white/30 text-xl">{"\u2192"}</span>
        </motion.div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-center">
          <p className="text-2xl">{"\u{1F9EC}"}</p>
          <motion.p className="text-[8px] font-mono text-emerald-400/80 mt-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}>{hash}</motion.p>
        </div>
      </div>
      <p className="text-[10px] text-white/30">1번째 스캔 = 2번째 스캔 = N번째 스캔 ... 항상 동일</p>
    </div>
  );
}

/* ── 카드 데이터 ──────────────────────────────────── */
const CARDS = [
  {
    title: "단방향성", short: "거꾸로 풀 수 없는 기계",
    desc: "데이터는 해시로 변환되지만, 해시에서 원본을 되돌릴 수 없습니다.",
    accent: "text-red-400", border: "border-red-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(239,68,68,0.3)] hover:border-red-500/50",
    bg: "from-red-500/[0.08] to-red-600/[0.02]",
    Anim: OneWayAnim,
  },
  {
    title: "눈사태 효과", short: "한 글자가 전부를 바꿉니다",
    desc: "글자 하나만 바꿔도 해시가 완전히 달라집니다. 90% 같아도 결과는 100% 다릅니다.",
    accent: "text-orange-400", border: "border-orange-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(249,115,22,0.3)] hover:border-orange-500/50",
    bg: "from-orange-500/[0.08] to-orange-600/[0.02]",
    Anim: AvalancheAnim,
  },
  {
    title: "결정성", short: "같은 입력, 항상 같은 결과",
    desc: "같은 입력은 항상 같은 해시를 만듭니다. 해시는 데이터의 유일한 이름표입니다.",
    accent: "text-emerald-400", border: "border-emerald-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:border-emerald-500/50",
    bg: "from-emerald-500/[0.08] to-emerald-600/[0.02]",
    Anim: DeterministicAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 3, -3, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
    <path d="M3 4h18l-6 8v6l-6 2V12L3 4z" strokeLinejoin="round" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
    <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" opacity={0.4} /><circle cx="12" cy="12" r="11" opacity={0.2} />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }}>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /><path d="M12 6a6 6 0 0 1 6 6" strokeLinecap="round" />
    <path d="M12 10a2 2 0 0 1 2 2" strokeLinecap="round" /><circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function HashConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">디지털 봉인 (해시)</h2>
        <p className="mt-2 text-sm text-white/50">
          어떤 데이터든 고유한 64자리 지문으로 바꾸는 마법의 함수
        </p>
      </div>

      <HashMachineHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 해시 함수의 세 가지 핵심 성질을 알아볼까요?
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
          이 기계가 실제로 어떻게 작동하는지 확인해보세요! {"\u2192"}
        </GlassButton>
      </div>
    </div>
  );
}
