// 모듈 2.1 커스텀 개념학습: 나만의 열쇠 만들기
// 자동재생 애니메이션 + 정적 설명 (버튼/입력 없음)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 상단: 키 파생 흐름도 (정적 비주얼) ───────────── */
function KeyFlowChart() {
  const layers = [
    { emoji: "\u{1F511}", label: "개인키", sub: "황금 열쇠", desc: "절대 공유 금지! 분실 시 복구 불가",
      color: "border-yellow-500/40 bg-yellow-500/[0.06]", accent: "text-yellow-400" },
    { emoji: "\u{1F512}", label: "공개키", sub: "은색 자물쇠", desc: "서명 검증용, 공개해도 안전",
      color: "border-sky-500/30 bg-sky-500/[0.06]", accent: "text-sky-400" },
    { emoji: "\u{1F4EC}", label: "주소", sub: "공개 우편함", desc: "누구나 코인을 보낼 수 있는 입구",
      color: "border-emerald-500/30 bg-emerald-500/[0.06]", accent: "text-emerald-400" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-xs font-semibold tracking-widest text-accent-gold/70 uppercase mb-4 text-center">
        키 파생 구조 (단방향)
      </p>
      <div className="flex flex-col items-center gap-2">
        {layers.map((l, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={`rounded-xl border-2 ${l.color} px-6 py-3 w-64`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.emoji}</span>
                <div>
                  <p className={`text-sm font-bold ${l.accent}`}>{l.label} <span className="text-[10px] text-white/30 font-normal">({l.sub})</span></p>
                  <p className="text-[10px] text-white/40">{l.desc}</p>
                </div>
              </div>
            </div>
            {i < layers.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <motion.span className="text-white/20 text-lg"
                  animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>{"\u2193"}</motion.span>
                <span className="text-[8px] text-white/20">단방향 파생</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-red-400/50 text-center mt-3">
        {"\u{1F6AB}"} 역방향 추적 불가: 주소에서 개인키를 알아낼 수 없습니다
      </p>
    </div>
  );
}

/* ── 팝업 애니메이션 ──────────────────────────────── */

/** 개인키: 황금 열쇠 빛나다가 사라지며 자물쇠 영구 잠김 */
function PrivKeyAnim() {
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex items-center gap-6">
        <motion.div className="text-center"
          animate={{ opacity: [1, 1, 0.1, 0.1, 1], scale: [1, 1, 0.7, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.4, 0.7, 1] }}>
          <span className="text-4xl">{"\u{1F511}"}</span>
          <p className="text-[9px] text-yellow-400/60 mt-1">개인키</p>
        </motion.div>
        <motion.span className="text-white/20 text-xl"
          animate={{ opacity: [1, 1, 0.2, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.4, 0.7, 1] }}>{"\u2192"}</motion.span>
        <motion.div className="text-center"
          animate={{ opacity: [0.4, 0.4, 1, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.4, 0.7, 1] }}>
          <span className="text-4xl">{"\u{1F512}"}</span>
          <motion.p className="text-[9px] mt-1"
            animate={{ color: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.3)", "rgba(239,68,68,0.8)", "rgba(239,68,68,0.8)", "rgba(255,255,255,0.3)"] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.4, 0.7, 1] }}>
            영구 잠김
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

/** 공개키: 자물쇠에서 빛이 퍼지며 여러 사람에게 도달 */
function PubKeyAnim() {
  const targets = [{ x: -50, y: -20 }, { x: 50, y: -20 }, { x: -40, y: 25 }, { x: 40, y: 25 }];
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 180, height: 100 }}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">{"\u{1F512}"}</div>
        {targets.map((t, i) => (
          <motion.div key={i}
            className="absolute left-1/2 top-1/2 w-6 h-6 rounded-full border border-sky-400/30 bg-sky-500/10 flex items-center justify-center text-[10px]"
            animate={{ x: [0, t.x], y: [0, t.y], opacity: [0, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4, ease: "easeOut" }}>
            {"\u{1F464}"}
          </motion.div>
        ))}
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-sky-400/20"
          animate={{ scale: [0.5, 2], opacity: [0.5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }} />
      </div>
    </div>
  );
}

/** 주소: 우편함으로 코인이 들어감. 열쇠 없이 안 열림 */
function AddressAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-4">
        <motion.div
          animate={{ x: [0, 40], opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeIn" }}>
          <span className="text-2xl">{"\u{1F4B0}"}</span>
        </motion.div>
        <div className="text-center">
          <span className="text-4xl">{"\u{1F4EC}"}</span>
          <p className="text-[9px] text-emerald-400/60 mt-1">내 우편함</p>
        </div>
        <div className="flex flex-col items-center opacity-30">
          <span className="text-xl">{"\u{1F512}"}</span>
          <p className="text-[8px] text-white/30">열쇠 필요</p>
        </div>
      </div>
    </div>
  );
}

/* ── 카드 데이터 ──────────────────────────────────── */
const CARDS = [
  {
    title: "개인키 = 열쇠", short: "절대 공유 금지",
    desc: "세상에 단 하나뿐인 마스터키. 잃어버리면 자산에 영원히 접근할 수 없습니다.",
    accent: "text-yellow-400", border: "border-yellow-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(234,179,8,0.3)] hover:border-yellow-500/60",
    bg: "from-yellow-500/[0.14] to-yellow-600/[0.04]",
    Anim: PrivKeyAnim,
  },
  {
    title: "공개키 = 신분증", short: "공개해도 안전합니다",
    desc: "개인키에서 파생되지만, 공개해도 개인키를 역추적할 수 없어 안전합니다.",
    accent: "text-sky-400", border: "border-sky-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(56,189,248,0.3)] hover:border-sky-500/60",
    bg: "from-sky-500/[0.14] to-sky-600/[0.04]",
    Anim: PubKeyAnim,
  },
  {
    title: "주소 = 우편함", short: "코인을 받는 입구",
    desc: "누구나 코인을 보낼 수 있지만, 꺼내려면 반드시 개인키가 필요합니다.",
    accent: "text-emerald-400", border: "border-emerald-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:border-emerald-500/60",
    bg: "from-emerald-500/[0.14] to-emerald-600/[0.04]",
    Anim: AddressAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
    <circle cx="8" cy="15" r="4" /><path d="M12 15h5l2-2-2-2h-5" /><path d="M15 11v4" strokeLinecap="round" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }}>
    <path d="M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4V7z" /><path d="M9 3v14M15 7v14" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function KeyConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">나만의 열쇠 만들기</h2>
        <p className="mt-2 text-sm text-white/65">
          개인키는 금고의 열쇠, 주소는 누구나 접근 가능한 우편함
        </p>
      </div>

      <KeyFlowChart />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 열쇠, 자물쇠, 우편함 — 각각 어떤 역할일까요?
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
          직접 키 쌍을 생성해보세요! {"\u2192"}
        </GlassButton>
      </div>
    </div>
  );
}
