// 모듈 3.2 커스텀 개념학습: 트랜잭션 구조
// Input=Output+Fee 자동재생 애니메이션 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 디지털 영수증 그래픽 ─────────────────── */
function ReceiptHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* 영수증 카드 */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-52 rounded-2xl border border-white/[0.1] bg-white/[0.03] overflow-hidden"
          style={{ top: 0 }}
          animate={{ y: [-10, 0, 0, 0], opacity: [0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.1, 0.85, 1] }}>
          {/* 헤더 */}
          <div className="border-b border-white/[0.06] px-4 py-2 text-center">
            <p className="text-[10px] text-accent-gold/60 uppercase tracking-wider">Transaction Receipt</p>
          </div>
          {/* Input */}
          <motion.div className="px-4 py-2 border-b border-white/[0.04]"
            animate={{ opacity: [0, 0, 1, 1] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.1, 0.2, 1] }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{"\u{1F4B5}"}</span>
                <p className="text-[10px] text-sky-400">Input</p>
              </div>
              <p className="text-xs font-bold text-sky-300">100 JACK</p>
            </div>
          </motion.div>
          {/* Output 1 */}
          <motion.div className="px-4 py-2 border-b border-white/[0.04]"
            animate={{ opacity: [0, 0, 0, 1, 1] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.2, 0.3, 0.4, 1] }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{"\u{1F464}"}</span>
                <p className="text-[10px] text-emerald-400">상대방</p>
              </div>
              <p className="text-xs font-bold text-emerald-300">30 JACK</p>
            </div>
          </motion.div>
          {/* Output 2 (잔돈) */}
          <motion.div className="px-4 py-2 border-b border-white/[0.04]"
            animate={{ opacity: [0, 0, 0, 0, 1, 1] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.3, 0.4, 0.45, 0.55, 1] }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{"\u{1F45B}"}</span>
                <p className="text-[10px] text-emerald-400">잔돈</p>
              </div>
              <p className="text-xs font-bold text-emerald-300">69.999 JACK</p>
            </div>
          </motion.div>
          {/* Fee */}
          <motion.div className="px-4 py-2"
            animate={{ opacity: [0, 0, 0, 0, 0, 1, 1] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.4, 0.5, 0.55, 0.6, 0.7, 1] }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{"\u26D1"}</span>
                <p className="text-[10px] text-amber-400">수수료</p>
              </div>
              <p className="text-xs font-bold text-amber-300">0.001 JACK</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 입력: 지갑에서 지폐를 꺼내는 애니메이션 */
function InputAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 130 }}>
        {/* 지갑 */}
        <div className="absolute left-4 top-4 w-20 h-24 rounded-xl border-2 border-white/15 bg-white/[0.04] flex items-center justify-center">
          <span className="text-2xl">{"\u{1F45B}"}</span>
        </div>

        {/* 지폐가 빠져나옴 */}
        <motion.div
          className="absolute w-24 h-12 rounded-lg border-2 border-sky-400/40 bg-sky-500/15 flex items-center justify-center"
          style={{ top: 20 }}
          animate={{
            x: [30, 30, 130, 130, 30],
            opacity: [0, 1, 1, 0.3, 0],
            rotate: [0, 0, -5, -5, 0],
          }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.1, 0.5, 0.8, 1], ease: "easeInOut" }}
        >
          <p className="text-[10px] font-bold text-sky-300">100 JACK</p>
        </motion.div>

        {/* 계산대 */}
        <motion.div
          className="absolute right-2 top-4 w-16 h-24 rounded-xl border-2 border-accent-gold/20 bg-accent-gold/[0.05] flex items-center justify-center"
          animate={{ borderColor: ["rgba(212,168,67,0.2)", "rgba(212,168,67,0.2)", "rgba(212,168,67,0.5)", "rgba(212,168,67,0.5)", "rgba(212,168,67,0.2)"] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.5, 0.7, 1] }}
        >
          <p className="text-[9px] text-accent-gold/60 text-center">계산대</p>
        </motion.div>
      </div>
    </div>
  );
}

/** 출력: 지폐 → 화살표 2개 → 두 지갑 */
function OutputAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 140 }}>
        {/* 원본 지폐 (중앙 상단) */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-28 h-10 rounded-lg border border-sky-400/30 bg-sky-500/10 flex items-center justify-center"
          animate={{ opacity: [1, 1, 0.3, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.4, 0.9, 1] }}
        >
          <p className="text-[10px] font-bold text-sky-300">100 JACK</p>
        </motion.div>

        {/* 화살표 */}
        <motion.span className="absolute left-[55px] top-[38px] text-emerald-400"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 4, 4, 0] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.35, 0.8, 1] }}
        >{"\u2199"}</motion.span>
        <motion.span className="absolute right-[55px] top-[38px] text-emerald-400"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 4, 4, 0] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.35, 0.8, 1] }}
        >{"\u2198"}</motion.span>

        {/* 받는 사람 지갑 */}
        <motion.div
          className="absolute left-0 bottom-4 w-24 h-14 rounded-lg border-2 border-emerald-400/40 bg-emerald-500/15 flex flex-col items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], x: [-10, -10, -10, 0, 0, -10] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.25, 0.35, 0.45, 0.85, 1] }}
        >
          <p className="text-[8px] text-emerald-300/60">{"\u{1F464}"} 상대방</p>
          <p className="text-xs font-bold text-emerald-300">30 JACK</p>
        </motion.div>

        {/* 내 잔돈 */}
        <motion.div
          className="absolute right-0 bottom-4 w-24 h-14 rounded-lg border-2 border-sky-400/40 bg-sky-500/15 flex flex-col items-center justify-center"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], x: [10, 10, 10, 0, 0, 10] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.25, 0.4, 0.5, 0.85, 1] }}
        >
          <p className="text-[8px] text-sky-300/60">{"\u{1F464}"} 나 (잔돈)</p>
          <p className="text-xs font-bold text-sky-300">69.999 JACK</p>
        </motion.div>
      </div>
    </div>
  );
}

/** 수수료: 코인이 채굴자 헬멧으로 날아감 */
function FeeAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 120 }}>
        {/* Input - Output 표시 */}
        <div className="absolute left-4 top-4 text-center">
          <p className="text-[9px] text-white/30">Input - Output</p>
          <p className="text-xs font-bold text-white/50">= 0.001</p>
        </div>

        {/* 채굴자 헬멧 */}
        <motion.div
          className="absolute right-4 top-4 w-14 h-14 rounded-full border-2 border-amber-400/30 bg-amber-500/10 flex items-center justify-center"
          animate={{ scale: [1, 1, 1.15, 1, 1] }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.55, 0.65, 0.75, 1] }}
        >
          <span className="text-xl">{"\u26D1"}</span>
        </motion.div>

        {/* 코인 날아감 */}
        <motion.div
          className="absolute w-8 h-8 rounded-full border border-amber-400/50 bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300"
          style={{ top: 12 }}
          animate={{
            x: [30, 30, 120, 120, 30],
            y: [30, 30, 8, 8, 30],
            opacity: [0, 1, 1, 0, 0],
            scale: [0.5, 1, 0.8, 0.3, 0.5],
          }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.1, 0.5, 0.6, 1], ease: "easeInOut" }}
        >
          {"\u{1FA99}"}
        </motion.div>

        {/* "TIP" 텍스트 */}
        <motion.p
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-400/60"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.5, 0.6, 0.85, 1] }}
        >
          Fee = 채굴자의 팁
        </motion.p>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "입력 (Input)", short: "지갑에서 지폐를 꺼냅니다",
    desc: "내 지갑 속 UTXO를 선택합니다. 계산대에 지폐를 올려놓는 행위입니다.",
    accent: "text-sky-400", border: "border-sky-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:border-sky-500/50",
    bg: "from-sky-500/[0.08] to-sky-600/[0.02]",
    Anim: InputAnim,
  },
  {
    title: "출력 (Output)", short: "송금액 + 잔돈이 생성됩니다",
    desc: "받는 사람에게 갈 금액과, 나에게 돌아올 잔돈 두 개의 UTXO가 생성됩니다.",
    accent: "text-emerald-400", border: "border-emerald-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/50",
    bg: "from-emerald-500/[0.08] to-emerald-600/[0.02]",
    Anim: OutputAnim,
  },
  {
    title: "수수료", short: "광부에게 주는 팁입니다",
    desc: "입력과 출력의 차이가 채굴자의 수수료가 됩니다. 광부에게 주는 팁입니다.",
    accent: "text-amber-400", border: "border-amber-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:border-amber-500/50",
    bg: "from-amber-500/[0.08] to-amber-600/[0.02]",
    Anim: FeeAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <path d="M12 3v12M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="4" y="17" width="16" height="4" rx="1" opacity={0.4} />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <path d="M12 3v6M8 12l-4 6h16l-4-6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="20" r="2" /><circle cx="18" cy="20" r="2" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
    <path d="M8 2l2 2M16 2l-2 2" opacity={0.4} />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function TxConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">트랜잭션은 어떻게 만들어질까요?</h2>
        <p className="mt-2 text-sm text-white/50">
          송금 전표 — 누가, 누구에게, 얼마를 보내는지 기록합니다
        </p>
      </div>

      <ReceiptHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 서명 없이 트랜잭션을 보내면 어떻게 될까요?
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
