/**
 * 모듈 0.1 — 개념 학습 탭: 탈중앙화의 필요성
 *
 * 구조:
 *   1) 히어로 동영상 (수레에 돈을 싣고 가는 장면, 하단 60% 포커스)
 *   2) 짐바브웨 사례 3열 카드 (클릭 → 모달 팝업 + 자동재생 애니메이션)
 *   3) CTA 버튼 → 체험하기 탭 전환
 *
 * VaultConcept(1.1) 패턴을 동일하게 따름:
 *   - SVG 아이콘 + hover glow + whileHover 스케일
 *   - AnimatePresence 모달 (spring 트랜지션)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

/* ================================================================
   타입
   ================================================================ */

interface Props {
  /** 체험하기 탭으로 전환하는 콜백 (ModuleCanvas에서 주입) */
  onGoInteraction: () => void;
}

/** 카드 1장의 데이터 구조 */
interface CardData {
  title: string;
  short: string;
  desc: string;
  accent: string;
  border: string;
  glowHover: string;
  bg: string;
  Anim: React.FC;
}

/* ================================================================
   모달 팝업 애니메이션 컴포넌트 (카드 클릭 시 자동재생)
   ================================================================ */

/**
 * 무너진 경제 애니메이션
 * - 지폐가 아래에서 쌓이며 액면가가 점점 커짐 (100 → 100조)
 * - 우측 상단 하락 화살표 반복
 */
function EconomyCollapseAnim() {
  const denominations = ["100", "1만", "100만", "1억", "100조"];

  return (
    <div className="w-full">
      <div className="relative mx-auto w-56 h-40 rounded-xl border-2 border-red-500/30 overflow-hidden">
        {/* 배경: 점점 어두워지는 그라디언트 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-red-950/60"
          animate={{ opacity: [0.3, 0.3, 0.8, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.2, 0.5, 0.8, 1] }}
        />

        {/* 쌓이는 지폐들 — 위에서 아래로 떨어져 쌓임 */}
        {denominations.map((label, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-16 h-8 rounded border border-green-500/30 bg-green-900/40 flex items-center justify-center text-[8px] font-mono text-green-300/60"
            style={{ bottom: 10 + i * 22 }}
            animate={{
              y: [-160, 0, 0, 40],
              opacity: [0, 1, 1, 0],
              rotate: [0, 0, (i % 2 === 0 ? 3 : -3), (i % 2 === 0 ? 15 : -15)],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              times: [0, 0.15 + i * 0.08, 0.7, 0.95],
              delay: i * 0.15,
            }}
          >
            Z$ {label}
          </motion.div>
        ))}

        {/* 하락 화살표 */}
        <motion.div
          className="absolute right-3 top-3 text-red-400 text-2xl"
          animate={{ y: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          ↘
        </motion.div>
      </div>
    </div>
  );
}

/**
 * 796억% 초인플레이션 애니메이션
 * - 중앙에서 물가 상승률이 순차적으로 커지며 표시
 * - 주변 경고 파티클 + 배경 링 펄스
 */
function HyperinflationAnim() {
  const rates = ["10%", "100%", "1,000%", "100만%", "796억%"];
  const n = rates.length;
  // 각 숫자의 표시 구간: fadeIn → hold → fadeOut, 겹침 없이 순차 전환
  const slotDur = 1 / n; // 각 숫자에 할당된 시간 비율 (0.2)

  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 140 }}>
        {/* 중앙: 상승률 숫자가 순차적으로 전환 (겹침 없음) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {rates.map((rate, i) => {
            // 각 숫자의 키프레임: 나타남 전 0 → fadeIn → hold → fadeOut → 나머지 0
            const start = i * slotDur;
            const fadeIn = start + slotDur * 0.1;
            const holdEnd = start + slotDur * 0.75;
            const fadeOut = start + slotDur * 0.95;
            // times와 values를 정밀하게 설정
            const times = [0, Math.max(start, 0.001), fadeIn, holdEnd, Math.min(fadeOut, 0.999), 1];
            const opacityValues = [0, 0, 1, 1, 0, 0];
            const scaleValues = [0.5, 0.5, 1, 1, 0.5, 0.5];

            return (
              <motion.span
                key={i}
                className="absolute font-mono font-bold"
                style={{ fontSize: `${14 + i * 4}px`, color: i < 3 ? "rgb(251,191,36)" : "rgb(239,68,68)" }}
                animate={{ opacity: opacityValues, scale: scaleValues }}
                transition={{ repeat: Infinity, duration: 6, times, ease: "easeInOut" }}
              >
                {rate}
              </motion.span>
            );
          })}
        </div>

        {/* 주변 경고 파티클 — 6방향으로 퍼져나감 */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-orange-400/60"
            style={{ left: "50%", top: "50%" }}
            animate={{
              x: [0, Math.cos((i * Math.PI) / 3) * 70],
              y: [0, Math.sin((i * Math.PI) / 3) * 50],
              opacity: [0, 0, 0, 1, 0],
              scale: [1, 1, 1, 1.5, 0],
            }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.5, 0.7, 0.85, 1], delay: i * 0.1 }}
          />
        ))}

        {/* 배경 링 — 펄스 효과 */}
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-orange-500/20"
          animate={{
            scale: [1, 1.1, 1],
            borderColor: ["rgba(249,115,22,0.2)", "rgba(239,68,68,0.4)", "rgba(249,115,22,0.2)"],
          }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
      </div>
    </div>
  );
}

/**
 * 100조 = 달걀 3개 애니메이션
 * - 달걀 3개가 순차적으로 펄스
 */
function EggExchangeAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="text-4xl"
            animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
          >
            🥚
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   SVG 아이콘 (VaultConcept 패턴: 각 카드 상단에 표시되는 애니메이션 아이콘)
   ================================================================ */

const CARD_ICONS = [
  // [0] 무너진 경제: 하락 그래프 아이콘
  <motion.svg key="icon-economy" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
    <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 14l4-4 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7h3v3" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,

  // [1] 796억%: 경고 삼각형 아이콘
  <motion.svg key="icon-inflation" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </motion.svg>,

  // [2] 100조 달러: 지폐 아이콘
  <motion.svg key="icon-bill" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <rect x="2" y="6" width="20" height="12" rx="2" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
    <path d="M6 6v12M18 6v12" opacity={0.3} />
  </motion.svg>,
];

/* ================================================================
   카드 데이터 — 짐바브웨 사례 3장
   ================================================================ */

const CARDS: CardData[] = [
  {
    title: "무너진 경제",
    short: "2000년대, 돈이 휴지조각이 되었습니다",
    desc: "무가베 정부의 무리한 토지 개혁으로 농업이 붕괴했습니다. 정부는 부족한 예산을 메우기 위해 중앙은행을 통해 돈을 마구 찍어냈습니다. 물건은 귀해졌고, 돈의 가치는 빠르게 휴지조각이 되었습니다.",
    accent: "text-red-400",
    border: "border-red-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:border-red-500/60",
    bg: "from-red-500/[0.14] to-red-600/[0.04]",
    Anim: EconomyCollapseAnim,
  },
  {
    title: "796억%",
    short: "24시간마다 물가가 두 배로 뛰었습니다",
    desc: "월간 물가 상승률이 796억%에 달했습니다. 물가가 24시간마다 두 배로 뛰었습니다. 아침에 커피 한 잔 가격이 점심엔 두 배가 됐고, 사람들은 돈을 받는 즉시 물건으로 바꾸려 했습니다.",
    accent: "text-orange-400",
    border: "border-orange-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:border-orange-500/60",
    bg: "from-orange-500/[0.14] to-orange-600/[0.04]",
    Anim: HyperinflationAnim,
  },
  {
    title: "100조 = 달걀 3개",
    short: "100조 달러로 달걀 3개를 샀습니다",
    desc: "정부는 인플레이션을 따라잡기 위해 100조 짐바브웨 달러 지폐를 발행했습니다. 그 한 장으로 살 수 있는 것은 달걀 세 개뿐이었습니다. 결국 2009년 4월, 짐바브웨는 자국 화폐 사용을 완전히 포기했습니다.",
    accent: "text-yellow-400",
    border: "border-yellow-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(234,179,8,0.35)] hover:border-yellow-500/60",
    bg: "from-yellow-500/[0.14] to-yellow-600/[0.04]",
    Anim: EggExchangeAnim,
  },
];

/* ================================================================
   메인 컴포넌트
   ================================================================ */

export default function DecentralizationConcept({ onGoInteraction }: Props) {
  /** 현재 열린 카드 모달 인덱스 (null이면 닫힘) */
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">

      {/* ── 제목 ──────────────────────────────────────── */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">탈중앙화의 필요성</h2>
        <p className="mt-2 text-sm text-white/65">
          왜 중앙 기관 없이도 돈이 작동해야 할까요?
        </p>
      </div>

      {/* ── 히어로 동영상 ─────────────────────────────── */}
      {/* 가로 1/3 크기, 높이 180px 고정, 하단 60% 포커스로 수레+돈 부분 노출 */}
      <div className="flex flex-col items-center">
        <div className="w-1/3 rounded-2xl overflow-hidden border border-white/[0.08] h-[180px]">
          <video
            src="/수레_드는_힘든_영상.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 60%" }}
          />
        </div>
        <blockquote className="text-center text-xs text-white/50 py-3 italic border-l-2 border-white/20 pl-4 mx-auto max-w-xs">
          "2008년 짐바브웨, 빵 한 덩이를 사기 위해 수레 가득한 돈이 필요했습니다"
        </blockquote>
      </div>

      {/* ── 섹션 제목 ─────────────────────────────────── */}
      <p className="text-center text-sm font-semibold text-accent-gold">
        🧾 짐바브웨 사례로 보는 '탈중앙화의 필요성'
      </p>

      {/* ── 3열 카드 그리드 ───────────────────────────── */}
      {/* VaultConcept(1.1)과 동일한 레이아웃: grid-cols-3, hover glow, 클릭 모달 */}
      <div className="grid grid-cols-3 gap-3 min-h-[180px]">
        {CARDS.map((card, i) => (
          <motion.div
            key={i}
            className={`relative cursor-pointer rounded-2xl border ${card.border} ${card.glowHover} bg-gradient-to-b ${card.bg} backdrop-blur-xl p-5 flex flex-col items-center text-center gap-3 transition-shadow duration-300`}
            whileHover={{ scale: 1.05, y: -6 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setExpandedCard(expandedCard === i ? null : i)}
          >
            {/* 글래스 오버레이 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            {/* SVG 아이콘 */}
            <div className={card.accent}>{CARD_ICONS[i]}</div>
            {/* 제목 */}
            <p className={`text-sm font-bold ${card.accent}`}>{card.title}</p>
            {/* 짧은 설명 */}
            <p className="text-xs text-white/60 leading-relaxed">{card.short}</p>
          </motion.div>
        ))}
      </div>

      {/* ── 카드 클릭 모달 (자동재생 애니메이션 + 설명) ── */}
      <AnimatePresence>
        {expandedCard !== null && (() => {
          const card = CARDS[expandedCard];
          const CardAnim = card.Anim;
          return (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedCard(null)}
            >
              <motion.div
                className={`relative rounded-3xl overflow-hidden border ${card.border} bg-gradient-to-b ${card.bg} bg-bg-primary backdrop-blur-2xl p-8 max-w-sm w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => setExpandedCard(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors" aria-label="닫기">&times;</button>
                <div className="flex flex-col items-center gap-6">
                  {/* 자동재생 애니메이션 */}
                  <CardAnim />
                  {/* 텍스트 설명 */}
                  <div className="text-center">
                    <p className={`text-lg font-bold ${card.accent} mb-2`}>{card.title}</p>
                    <p className="text-sm text-white/70 leading-[1.7]">{card.desc}</p>
                  </div>
                  {/* 닫기 버튼 */}
                  <button
                    onClick={() => setExpandedCard(null)}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-1.5 rounded-lg hover:bg-white/[0.06]"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── CTA: 체험하기 탭으로 이동 ─────────────────── */}
      <div className="text-center pt-2">
        <GlassButton onClick={onGoInteraction}>직접 체험해보기 →</GlassButton>
      </div>
    </div>
  );
}
