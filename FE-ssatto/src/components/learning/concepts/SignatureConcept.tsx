// 모듈 2.2 커스텀 개념학습: 디지털 서명
// 서명-검증 자동재생 애니메이션 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 봉인 인장 3단계 루프 (도장→검증→영구기록) ─ */
function SealHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 280, height: 180 }}>
        {/* 1단계: 문서 + 도장 찍힘 */}
        <motion.div className="absolute left-4 top-4 w-20 h-24 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center"
          animate={{ opacity: [0, 1, 1, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.05, 0.3, 0.65, 0.9, 1] }}>
          <span className="text-2xl">{"\u{1F4C4}"}</span>
        </motion.div>
        <motion.div className="absolute left-8 top-6 text-3xl"
          animate={{ y: [-20, -20, 0, 0, 0], opacity: [0, 0, 1, 1, 0], scale: [1.2, 1.2, 1, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.05, 0.15, 0.3, 0.35] }}>
          {"\u{1F4DB}"}
        </motion.div>

        {/* 2단계: 돋보기 스캔 → 체크 */}
        <motion.div className="absolute left-1/2 -translate-x-1/2 top-2 text-3xl"
          animate={{ x: [-40, -40, 0, 40, 40], opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.3, 0.4, 0.55, 0.6] }}>
          {"\u{1F50D}"}
        </motion.div>
        <motion.div className="absolute left-1/2 -translate-x-1/2 top-12 text-3xl"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], scale: [0.5, 0.5, 0.5, 1.2, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.45, 0.5, 0.55, 0.65, 0.7] }}>
          {"\u2705"}
        </motion.div>

        {/* 3단계: 블록에 영구 새겨짐 */}
        <motion.div
          className="absolute right-4 top-4 w-24 h-24 rounded-xl border-2 border-purple-400/30 bg-purple-500/[0.08] flex flex-col items-center justify-center"
          animate={{ opacity: [0, 0, 0, 0, 1, 1, 0], borderColor: ["rgba(168,85,247,0.3)", "rgba(168,85,247,0.3)", "rgba(168,85,247,0.3)", "rgba(168,85,247,0.3)", "rgba(168,85,247,0.6)", "rgba(168,85,247,0.6)", "rgba(168,85,247,0.3)"] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.55, 0.6, 0.65, 0.7, 0.9, 1] }}>
          <span className="text-lg">{"\u{1F4DC}"}</span>
          <p className="text-[8px] text-purple-300/60 mt-1">Block #42</p>
          <p className="text-[7px] font-mono text-purple-300">sig: 0x7a3f</p>
        </motion.div>

        {/* 화살표 흐름 */}
        <motion.span className="absolute top-14 left-[90px] text-accent-gold text-lg"
          animate={{ opacity: [0, 0, 1, 1, 0], x: [0, 0, 4, 4, 0] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.15, 0.25, 0.35, 0.4] }}>{"\u2192"}</motion.span>
        <motion.span className="absolute top-14 right-[100px] text-purple-400 text-lg"
          animate={{ opacity: [0, 0, 0, 1, 0], x: [0, 0, 0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 7, times: [0, 0.55, 0.6, 0.7, 0.75] }}>{"\u2192"}</motion.span>

        {/* 하단 단계 라벨 */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6">
          <motion.p className="text-[9px] text-accent-gold/50"
            animate={{ opacity: [0, 1, 1, 0.3, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.05, 0.3, 0.35, 0.9, 1] }}>
            {"\u2460"} 서명
          </motion.p>
          <motion.p className="text-[9px] text-blue-400/50"
            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.25, 0.3, 0.4, 0.6, 0.65] }}>
            {"\u2461"} 검증
          </motion.p>
          <motion.p className="text-[9px] text-purple-400/50"
            animate={{ opacity: [0, 0, 0, 0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 7, times: [0, 0.55, 0.6, 0.65, 0.9, 1] }}>
            {"\u2462"} 영구기록
          </motion.p>
        </div>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 위조 불가: 도장 → 복사 시도 실패 */
function ForgeryAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 140 }}>
        {/* 원본 도장 찍힘 */}
        <motion.div
          className="absolute left-6 top-4 w-20 h-20 rounded-full border-2 border-red-400/50 bg-red-500/20 flex items-center justify-center"
          animate={{ scale: [0.5, 1.1, 1, 1, 1], opacity: [0, 1, 1, 1, 1] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.15, 0.25, 0.7, 1] }}
        >
          <motion.span className="text-2xl"
            animate={{ rotate: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.15, 0.25] }}
          >{"\u{1F4DB}"}</motion.span>
        </motion.div>

        {/* 복사 시도 → 페이드 실패 */}
        <motion.div
          className="absolute right-6 top-4 w-20 h-20 rounded-full border-2 border-dashed border-white/20 bg-white/[0.03] flex items-center justify-center"
          animate={{
            opacity: [0, 0, 0.6, 0.6, 0],
            scale: [0.8, 0.8, 1, 1, 0.5],
            borderColor: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.2)", "rgba(239,68,68,0.5)", "rgba(239,68,68,0.5)", "rgba(239,68,68,0.1)"],
          }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.6, 0.8] }}
        >
          <motion.span className="text-lg text-white/40"
            animate={{ opacity: [0, 0, 0.5, 0.5, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.45, 0.6, 0.8] }}
          >{"\u{1F4DB}"}</motion.span>
        </motion.div>

        {/* COPY 화살표 */}
        <motion.span
          className="absolute top-8 left-1/2 -translate-x-1/2 text-sm text-white/30"
          animate={{ opacity: [0, 0, 0.6, 0.6, 0] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.3, 0.4, 0.55, 0.7] }}
        >{"\u2192"} copy?</motion.span>

        {/* X 표시 */}
        <motion.span
          className="absolute right-10 bottom-4 text-3xl text-red-500"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], scale: [0.5, 0.5, 0.5, 1.3, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.45, 0.6, 0.65, 0.8, 1] }}
        >{"\u274C"}</motion.span>
      </div>
    </div>
  );
}

/** 누구나 검증: 돋보기가 서명 위를 스캔 → 초록 체크 */
function VerifyAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 120 }}>
        {/* 서명 문서 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-16 rounded-lg border border-accent-gold/30 bg-accent-gold/10 flex items-center justify-center">
          <span className="text-xl">{"\u{1F4DC}"}</span>
        </div>

        {/* 돋보기 스캔 */}
        <motion.div
          className="absolute text-2xl"
          style={{ top: 20 }}
          animate={{ x: [20, 160, 100], y: [0, 0, -5], rotate: [0, 0, 10] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.6, 1], ease: "easeInOut" }}
        >
          {"\u{1F50D}"}
        </motion.div>

        {/* 스캔 라인 */}
        <motion.div
          className="absolute top-8 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
          style={{ width: 60 }}
          animate={{ x: [20, 140, 100], opacity: [0, 0.8, 0] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.6, 1] }}
        />

        {/* 초록 체크마크 */}
        <motion.div
          className="absolute right-4 bottom-0 text-3xl"
          animate={{ opacity: [0, 0, 0, 1, 1, 0], scale: [0.3, 0.3, 0.3, 1.2, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.5, 0.65, 0.72, 0.9, 1] }}
        >
          {"\u2705"}
        </motion.div>
      </div>
    </div>
  );
}

/** 부인 방지: 서명이 블록에 새겨짐 → 지우기 시도 실패 */
function NonRepudiationAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 130 }}>
        {/* 블록 */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 w-40 h-20 rounded-lg border-2 border-purple-400/30 bg-purple-500/10 flex items-center justify-center overflow-hidden">
          {/* 서명이 새겨짐 */}
          <motion.div
            className="text-center"
            animate={{ opacity: [0, 1, 1, 1, 1] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.2, 0.5, 0.8, 1] }}
          >
            <p className="text-[9px] text-purple-300/60">Block #42</p>
            <motion.p
              className="text-xs font-mono font-bold text-purple-300"
              animate={{ opacity: [0, 0, 1, 1, 1] }}
              transition={{ repeat: Infinity, duration: 5, times: [0, 0.1, 0.25, 0.8, 1] }}
            >
              sig: 0x7a3f...
            </motion.p>
          </motion.div>

          {/* 새기는 이펙트 */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-transparent to-transparent"
            animate={{ x: [-160, 160] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 1], ease: "easeInOut" }}
          />
        </div>

        {/* 지우개 시도 */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1"
          animate={{ opacity: [0, 0, 0.8, 0.8, 0], x: [-20, -20, 0, 10, -20] }}
          transition={{ repeat: Infinity, duration: 5, times: [0, 0.5, 0.6, 0.75, 0.9] }}
        >
          <span className="text-lg">{"\u{1F9F9}"}</span>
          <motion.span
            className="text-red-400 text-xl font-bold"
            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.6, 0.7, 0.75, 0.85, 0.95] }}
          >{"\u274C"}</motion.span>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "위조 불가", short: "복제할 수 없는 도장입니다",
    desc: "개인키 없이는 똑같은 서명을 만들 수 없습니다.",
    accent: "text-red-400", border: "border-red-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:border-red-500/60",
    bg: "from-red-500/[0.14] to-red-600/[0.04]",
    Anim: ForgeryAnim,
  },
  {
    title: "누구나 검증", short: "공개키로 진위를 확인합니다",
    desc: "공개키만 있으면 누구나 서명의 진위를 확인할 수 있습니다.",
    accent: "text-blue-400", border: "border-blue-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:border-blue-500/60",
    bg: "from-blue-500/[0.14] to-blue-600/[0.04]",
    Anim: VerifyAnim,
  },
  {
    title: "부인 방지", short: "서명 기록은 영원히 남습니다",
    desc: "한번 서명한 기록은 영원히 남으며, 부인할 수 없습니다.",
    accent: "text-purple-400", border: "border-purple-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:border-purple-500/60",
    bg: "from-purple-500/[0.14] to-purple-600/[0.04]",
    Anim: NonRepudiationAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
    <path d="m9 11 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <path d="M12 2l7 4v6c0 5.25-3.5 8.5-7 10-3.5-1.5-7-4.75-7-10V6l7-4z" />
    <path d="M12 8v4M12 14v2" strokeLinecap="round" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function SignatureConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">디지털 서명은 어떻게 작동할까요?</h2>
        <p className="mt-2 text-sm text-white/65">
          나를 증명하는 도장 — 개인키로 잠그고, 공개키로 확인합니다
        </p>
      </div>

      <SealHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 만약 누군가 서명을 복사하면 어떻게 될까요?
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
