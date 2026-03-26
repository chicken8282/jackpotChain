// 모듈 3.1 커스텀 개념학습: 디지털 지폐의 여행 (UTXO)
// 자동재생 분할 애니메이션 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 지갑→지폐→가위→양쪽 지갑 순환 ──────── */
function SplitHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 300, height: 200 }}>
        {/* 내 지갑 (좌상단) */}
        <div className="absolute left-0 top-2 text-center">
          <span className="text-2xl">{"\u{1F45B}"}</span>
          <p className="text-[8px] text-white/30">내 지갑</p>
        </div>

        {/* 100 JACK 지폐 (지갑에서 나옴) */}
        <motion.div
          className="absolute w-36 h-14 rounded-xl border-2 border-accent-gold/40 bg-gradient-to-br from-accent-gold/[0.15] to-accent-gold/[0.05] flex items-center justify-center"
          animate={{ left: [40, 82, 82, 82], top: [10, 10, 10, 10], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.15, 0.35, 0.45] }}>
          <div className="text-center">
            <p className="text-[8px] text-accent-gold/60">UTXO</p>
            <p className="text-base font-bold text-accent-gold">100 JACK</p>
          </div>
        </motion.div>

        {/* 가위 */}
        <motion.div className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 65 }}
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.5, 0.5, 1.2, 1, 0.5], rotate: [0, 0, -20, 0, 0] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.35, 0.42, 0.5, 0.55] }}>
          <span className="text-2xl">{"\u2702\uFE0F"}</span>
        </motion.div>

        {/* 30 JACK → 상대방 지갑 */}
        <motion.div
          className="absolute w-28 h-12 rounded-lg border-2 border-sky-400/40 bg-sky-500/[0.12] flex items-center justify-center"
          animate={{ left: [120, 120, 10, 10], top: [90, 90, 130, 130], opacity: [0, 0, 1, 0], scale: [0.5, 0.5, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.5, 0.65, 0.9] }}>
          <p className="text-xs font-bold text-sky-300">30 JACK</p>
        </motion.div>
        <motion.div className="absolute left-0 bottom-0 text-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.5, 0.6, 0.65, 0.85, 1] }}>
          <span className="text-xl">{"\u{1F464}"}</span>
          <p className="text-[8px] text-sky-300/50">상대방</p>
        </motion.div>

        {/* 70 JACK → 내 지갑으로 복귀 */}
        <motion.div
          className="absolute w-28 h-12 rounded-lg border-2 border-emerald-400/40 bg-emerald-500/[0.12] flex items-center justify-center"
          animate={{ left: [130, 130, 180, 180], top: [90, 90, 130, 130], opacity: [0, 0, 1, 0], scale: [0.5, 0.5, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.5, 0.65, 0.9] }}>
          <p className="text-xs font-bold text-emerald-300">70 JACK</p>
        </motion.div>
        <motion.div className="absolute right-4 bottom-0 text-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.5, 0.6, 0.65, 0.85, 1] }}>
          <span className="text-xl">{"\u{1F45B}"}</span>
          <p className="text-[8px] text-emerald-300/50">잔돈 복귀</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 지폐 모델: 지갑 속 다양한 지폐 조각들 */
function BillModelAnim() {
  const bills = [
    { amount: "50", color: "accent-gold", w: 80 },
    { amount: "30", color: "sky-400", w: 65 },
    { amount: "15", color: "emerald-400", w: 55 },
    { amount: "5", color: "purple-400", w: 45 },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="relative w-48 h-36 rounded-xl border-2 border-white/10 bg-white/[0.03] overflow-hidden">
        <p className="absolute top-2 left-3 text-[9px] text-white/30">{"\u{1F45B}"} 내 지갑</p>
        {bills.map((b, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-lg border border-${b.color}/30 bg-${b.color}/10 flex items-center justify-center`}
            style={{ width: b.w, height: 28, left: 12 + (i % 2) * 20 }}
            animate={{
              y: [120, 36 + i * 22],
              opacity: [0, 1],
            }}
            transition={{
              repeat: Infinity, duration: 4, delay: i * 0.4,
              repeatDelay: 1,
              ease: "easeOut",
            }}
          >
            <p className={`text-[10px] font-bold text-${b.color}`}>{b.amount} JACK</p>
          </motion.div>
        ))}
        {/* 합계 표시 */}
        <motion.p
          className="absolute bottom-2 right-3 text-[10px] font-bold text-accent-gold"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.6, 0.7, 0.9, 1] }}
        >
          = 100 JACK
        </motion.p>
      </div>
    </div>
  );
}

/** 소멸과 생성: 100 → 회색 소멸 → 30 + 70 새로 생성 */
function DestroyCreateAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 130 }}>
        {/* 기존 100 JACK → 회색 소멸 */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-36 h-14 rounded-lg border flex items-center justify-center"
          animate={{
            borderColor: ["rgba(212,168,67,0.4)", "rgba(212,168,67,0.4)", "rgba(100,100,100,0.3)", "rgba(100,100,100,0.1)"],
            backgroundColor: ["rgba(212,168,67,0.1)", "rgba(212,168,67,0.1)", "rgba(100,100,100,0.05)", "rgba(100,100,100,0.02)"],
            opacity: [1, 1, 0.4, 0.1],
          }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.25, 0.45, 0.55] }}
        >
          <motion.p
            className="text-sm font-bold"
            animate={{ color: ["rgb(212,168,67)", "rgb(212,168,67)", "rgb(120,120,120)", "rgb(80,80,80)"] }}
            transition={{ repeat: Infinity, duration: 4, times: [0, 0.25, 0.45, 0.55] }}
          >100 JACK</motion.p>
        </motion.div>

        {/* 새 30 JACK */}
        <motion.div
          className="absolute left-2 bottom-2 w-24 h-12 rounded-lg border-2 border-sky-400/40 bg-sky-500/15 flex items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], scale: [0.5, 0.5, 0.5, 1.1, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.4, 0.5, 0.6, 0.9, 1] }}
        >
          <p className="text-xs font-bold text-sky-300">30 JACK</p>
        </motion.div>

        {/* 새 70 JACK */}
        <motion.div
          className="absolute right-2 bottom-2 w-24 h-12 rounded-lg border-2 border-emerald-400/40 bg-emerald-500/15 flex items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], scale: [0.5, 0.5, 0.5, 1.1, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.4, 0.55, 0.65, 0.9, 1] }}
        >
          <p className="text-xs font-bold text-emerald-300">70 JACK</p>
        </motion.div>
      </div>
    </div>
  );
}

/** 추적 가능: 가계도처럼 지폐 계보가 아래로 펼쳐짐 */
function TraceAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 140 }}>
        {/* 루트: 채굴 보상 */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-28 h-10 rounded-lg border border-accent-gold/40 bg-accent-gold/10 flex items-center justify-center"
          animate={{ opacity: [0, 1, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.1, 0.8, 0.9, 1] }}
        >
          <p className="text-[9px] font-bold text-accent-gold">{"\u26CF"} 100 JACK</p>
        </motion.div>

        {/* 연결선 SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 140">
          <motion.line x1="110" y1="38" x2="65" y2="58" stroke="rgba(212,168,67,0.3)" strokeWidth="1"
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.2, 0.3, 0.8, 1] }} />
          <motion.line x1="110" y1="38" x2="155" y2="58" stroke="rgba(212,168,67,0.3)" strokeWidth="1"
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.2, 0.3, 0.8, 1] }} />
          <motion.line x1="65" y1="78" x2="35" y2="100" stroke="rgba(212,168,67,0.2)" strokeWidth="1"
            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.55, 0.8, 1] }} />
          <motion.line x1="65" y1="78" x2="95" y2="100" stroke="rgba(212,168,67,0.2)" strokeWidth="1"
            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.55, 0.8, 1] }} />
        </svg>

        {/* 2세대 */}
        <motion.div
          className="absolute left-4 top-[54px] w-24 h-9 rounded-lg border border-sky-400/30 bg-sky-500/10 flex items-center justify-center"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [5, 5, 0, 0, 5] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.2, 0.3, 0.8, 1] }}
        >
          <p className="text-[8px] font-bold text-sky-300">60 JACK</p>
        </motion.div>
        <motion.div
          className="absolute right-4 top-[54px] w-24 h-9 rounded-lg border border-emerald-400/30 bg-emerald-500/10 flex items-center justify-center"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [5, 5, 0, 0, 5] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.2, 0.3, 0.8, 1] }}
        >
          <p className="text-[8px] font-bold text-emerald-300">40 JACK</p>
        </motion.div>

        {/* 3세대 */}
        <motion.div
          className="absolute left-0 top-[96px] w-20 h-8 rounded-lg border border-purple-400/30 bg-purple-500/10 flex items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], y: [5, 5, 5, 0, 0, 5] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.55, 0.8, 1] }}
        >
          <p className="text-[8px] font-bold text-purple-300">25 JACK</p>
        </motion.div>
        <motion.div
          className="absolute left-[60px] top-[96px] w-20 h-8 rounded-lg border border-pink-400/30 bg-pink-500/10 flex items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], y: [5, 5, 5, 0, 0, 5] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.55, 0.8, 1] }}
        >
          <p className="text-[8px] font-bold text-pink-300">35 JACK</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "지폐 모델", short: "잔액 = 지폐 조각들의 합",
    desc: "잔액이라는 개념이 없습니다. 지갑 속 '지폐 조각들'의 합이 잔액입니다.",
    accent: "text-emerald-400", border: "border-emerald-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/60",
    bg: "from-emerald-500/[0.14] to-emerald-600/[0.04]",
    Anim: BillModelAnim,
  },
  {
    title: "소멸과 생성", short: "지폐는 소멸 후 새로 생성됩니다",
    desc: "기존 지폐는 소멸하고, 송금액과 잔돈 두 장의 새 지폐가 생성됩니다.",
    accent: "text-orange-400", border: "border-orange-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:border-orange-500/60",
    bg: "from-orange-500/[0.14] to-orange-600/[0.04]",
    Anim: DestroyCreateAnim,
  },
  {
    title: "추적 가능", short: "최초 채굴까지 거슬러 올라갑니다",
    desc: "모든 코인의 출처를 최초 채굴까지 거슬러 추적할 수 있습니다.",
    accent: "text-blue-400", border: "border-blue-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:border-blue-500/60",
    bg: "from-blue-500/[0.14] to-blue-600/[0.04]",
    Anim: TraceAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
    <path d="M6 6v-2M18 6v-2" opacity={0.4} />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <path d="M12 2v8M8 14h8" strokeLinecap="round" />
    <circle cx="8" cy="18" r="3" /><circle cx="16" cy="18" r="3" />
    <path d="M12 10l-4 4M12 10l4 4" opacity={0.6} />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="12" cy="5" r="3" /><circle cx="6" cy="14" r="2.5" /><circle cx="18" cy="14" r="2.5" />
    <circle cx="4" cy="21" r="2" /><circle cx="10" cy="21" r="2" />
    <path d="M12 8v3M9 13l-2 5M9 13l2 5M15 13v0" strokeDasharray="2 2" opacity={0.5} />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function UTXOConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">블록체인에는 잔액이 없다?</h2>
        <p className="mt-2 text-sm text-white/65">
          만원짜리와 거스름돈 — UTXO는 실제 지폐처럼 작동합니다
        </p>
      </div>

      <SplitHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 잔돈은 왜 나에게 다시 보내야 할까요?
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
