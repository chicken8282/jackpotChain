// 모듈 5.2 커스텀 개념학습: 공정성 증명
// 저울 그래픽 + 3카드 (Anim 컴포넌트)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 히어로: 저울 그래픽 ── 평형 → 빨갛게 무너짐 → 복원 ── */
function FairnessHero() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 280, height: 200 }}>
        {/* 저울 받침대 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-20 bg-white/10 rounded" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-white/10 rounded-full" />

        {/* 저울 막대 (기울기 애니메이션) */}
        <motion.div
          className="absolute top-12 left-1/2 -translate-x-1/2 origin-center"
          style={{ width: 240, height: 4 }}
          animate={{
            rotate: [0, 0, 0, 15, -10, 15, 0, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 6,
            times: [0, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 1],
            ease: "easeInOut",
          }}
        >
          {/* 막대 */}
          <motion.div
            className="w-full h-full rounded-full"
            animate={{
              backgroundColor: [
                "rgba(255,255,255,0.2)",
                "rgba(255,255,255,0.2)",
                "rgba(239,68,68,0.5)",
                "rgba(239,68,68,0.5)",
                "rgba(255,255,255,0.2)",
              ],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              times: [0, 0.4, 0.5, 0.65, 0.75],
            }}
          />

          {/* 왼쪽 접시: 블록 해시 */}
          <motion.div
            className="absolute -left-2 -top-8 flex flex-col items-center"
            animate={{
              y: [0, 0, 20, -15, 20, 0, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              times: [0, 0.4, 0.5, 0.55, 0.6, 0.7, 1],
            }}
          >
            <div className="w-16 h-10 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
              <span className="text-[8px] font-mono text-blue-400">0xa3f7...</span>
            </div>
            <div className="w-20 h-1 rounded-full bg-white/10 mt-1" />
          </motion.div>

          {/* 오른쪽 접시: 물음표 */}
          <motion.div
            className="absolute -right-2 -top-8 flex flex-col items-center"
            animate={{
              y: [0, 0, -15, 20, -15, 0, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              times: [0, 0.4, 0.5, 0.55, 0.6, 0.7, 1],
            }}
          >
            <div className="w-16 h-10 rounded-lg border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
              <motion.span
                className="text-lg text-purple-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ?
              </motion.span>
            </div>
            <div className="w-20 h-1 rounded-full bg-white/10 mt-1" />
          </motion.div>
        </motion.div>

        {/* 경고 이펙트: 누가 건드릴 때 */}
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-red-500/40 pointer-events-none"
          animate={{
            opacity: [0, 0, 0.6, 0, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 6,
            times: [0, 0.44, 0.5, 0.65, 1],
          }}
        />

        {/* 손 아이콘 */}
        <motion.div
          className="absolute right-4 top-4 text-xl"
          animate={{
            opacity: [0, 0, 1, 0, 0],
            x: [20, 20, 0, -10, 20],
          }}
          transition={{
            repeat: Infinity,
            duration: 6,
            times: [0, 0.38, 0.45, 0.55, 0.65],
          }}
        >
          {"\u{1F91A}"}
        </motion.div>

        {/* 라벨 */}
        <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-white/30">
          블록 해시 = 수학적 평형
        </p>
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 예측 불가: 수정 구슬 + 물음표 회전 */
function UnpredictableAnim() {
  const qMarks = Array.from({ length: 6 }, (_, i) => ({
    angle: (i / 6) * Math.PI * 2,
    delay: i * 0.3,
  }));
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        {/* 수정 구슬 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-blue-400/30 bg-blue-500/10 flex items-center justify-center">
            <motion.span
              className="text-3xl"
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              {"\u{1F52E}"}
            </motion.span>
          </div>
        </div>

        {/* 회전하는 물음표들 */}
        {qMarks.map((q, i) => (
          <motion.div
            key={i}
            className="absolute text-lg font-bold text-blue-300/60"
            style={{ left: 80, top: 80 }}
            animate={{
              x: [0, 55 * Math.cos(q.angle), 55 * Math.cos(q.angle + Math.PI), 0],
              y: [0, 55 * Math.sin(q.angle), 55 * Math.sin(q.angle + Math.PI), 0],
              opacity: [0, 1, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              repeat: Infinity,
              duration: 4,
              delay: q.delay,
              ease: "easeInOut",
            }}
          >
            ?
          </motion.div>
        ))}

        {/* 라벨 */}
        <motion.p
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-blue-400/60 whitespace-nowrap"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          미래 해시 = ???
        </motion.p>
      </div>
    </div>
  );
}

/** 조작 불가: 데이터 변경 → 해시 폭발적 변화 */
function TamperProofAnim() {
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 130 }}>
        {/* 원본 블록 */}
        <div className="absolute left-2 top-2">
          <div className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-center">
            <p className="text-[8px] text-white/30">원본 데이터</p>
            <p className="text-xs font-mono text-white/60">TX: 50 JACK</p>
          </div>
          <p className="text-[7px] font-mono text-emerald-400/60 mt-1 text-center">0xa3f7b2e1...</p>
        </div>

        {/* 변조 블록 */}
        <motion.div
          className="absolute left-2 bottom-2"
          animate={{
            opacity: [0, 0, 1, 1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            times: [0, 0.3, 0.35, 0.9, 1],
          }}
        >
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-center">
            <p className="text-[8px] text-red-400/50">변조 시도!</p>
            <p className="text-xs font-mono text-red-400">TX: <span className="line-through">50</span> 500 JACK</p>
          </div>
        </motion.div>

        {/* 화살표 */}
        <motion.span
          className="absolute right-[85px] top-1/2 -translate-y-1/2 text-white/20 text-xl"
          animate={{ x: [-3, 3, -3], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {"\u2192"}
        </motion.span>

        {/* 해시 결과: 폭발적 변화 */}
        <div className="absolute right-2 top-2">
          <p className="text-[7px] font-mono text-emerald-400/60 text-center">0xa3f7b2e1...</p>
        </div>
        <motion.div
          className="absolute right-2 bottom-2"
          animate={{
            opacity: [0, 0, 1, 1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            times: [0, 0.35, 0.4, 0.9, 1],
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5, delay: 2 }}
          >
            <p className="text-[7px] font-mono text-red-400 text-center">
              0x<motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
              >
                ????
              </motion.span>!!!!
            </p>
            <p className="text-[8px] text-red-400/80 text-center mt-1">100% 다름!</p>
          </motion.div>
        </motion.div>

        {/* 폭발 이펙트 */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-red-500/40"
            style={{ right: 40, bottom: 30 }}
            animate={{
              x: [-10 + i * 15, -20 + i * 20],
              y: [0, -20 + Math.random() * 40],
              opacity: [0, 0, 1, 0],
              scale: [0.5, 1.5],
            }}
            transition={{
              repeat: Infinity,
              duration: 5,
              times: [0, 0.38, 0.42, 0.6],
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** 검증 가능: 여러 눈/돋보기가 해시 확인 → 체크마크 */
function VerifiableAnim() {
  const observers = [
    { emoji: "\u{1F441}\uFE0F", x: 20, label: "검증자 A" },
    { emoji: "\u{1F50D}", x: 90, label: "검증자 B" },
    { emoji: "\u{1F441}\uFE0F", x: 160, label: "검증자 C" },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 220, height: 130 }}>
        {/* 공통 해시 (중앙 상단) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-1">
          <p className="text-[8px] font-mono text-white/50 text-center">블록 해시</p>
          <motion.p
            className="text-[9px] font-mono text-accent-gold text-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            0xa3f7b2e1c9d4...
          </motion.p>
        </div>

        {/* 검증자들 */}
        {observers.map((o, i) => (
          <motion.div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: o.x, top: 55 }}
            animate={{
              y: [5, 0, 5],
            }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
          >
            <span className="text-xl">{o.emoji}</span>
            <p className="text-[7px] text-white/30 mt-0.5">{o.label}</p>

            {/* 체크마크 */}
            <motion.div
              className="mt-1 w-5 h-5 rounded-full border border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center"
              animate={{
                scale: [0, 0, 1, 1],
                opacity: [0, 0, 1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                delay: i * 0.4 + 0.5,
                times: [0, 0.3, 0.4, 1],
                repeatDelay: 1,
              }}
            >
              <span className="text-[10px] text-emerald-400">{"\u2713"}</span>
            </motion.div>
          </motion.div>
        ))}

        {/* 결과 라벨 */}
        <motion.p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 whitespace-nowrap"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 4, times: [0, 0.5, 0.6, 0.85, 1] }}
        >
          모두 동일한 결과 확인!
        </motion.p>
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "예측 불가", short: "미래 블록 해시는 아무도 미리 알 수 없습니다",
    desc: "블록 해시는 채굴 과정에서 결정됩니다. 미래 블록이 생성되기 전에는 그 해시를 예측할 수 없습니다.",
    accent: "text-blue-400", border: "border-blue-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:border-blue-500/60",
    bg: "from-blue-500/[0.14] to-blue-600/[0.04]",
    Anim: UnpredictableAnim,
  },
  {
    title: "조작 불가", short: "데이터를 바꾸면 해시가 완전히 변합니다",
    desc: "블록 데이터를 조금이라도 변경하면 해시가 완전히 달라집니다. 원하는 결과를 만들어낼 수 없습니다.",
    accent: "text-red-400", border: "border-red-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:border-red-500/60",
    bg: "from-red-500/[0.14] to-red-600/[0.04]",
    Anim: TamperProofAnim,
  },
  {
    title: "검증 가능", short: "누구나 블록 해시를 확인하여 결과를 검증합니다",
    desc: "블록체인의 모든 데이터는 공개되어 있습니다. 누구나 블록 해시를 직접 확인하여 로또 결과를 검증할 수 있습니다.",
    accent: "text-emerald-400", border: "border-emerald-500/40",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/60",
    bg: "from-emerald-500/[0.14] to-emerald-600/[0.04]",
    Anim: VerifiableAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
    <circle cx="12" cy="12" r="9" opacity={0.4} />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 7v0.5M12 16.5v0.5M7 12h0.5M16.5 12h0.5" strokeLinecap="round" opacity={0.5} />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" opacity={0.3} />
    <path d="M2 12l10 5 10-5" opacity={0.5} />
    <line x1="8" y1="8" x2="16" y2="16" stroke="rgba(239,68,68,0.6)" strokeWidth="2" />
    <line x1="16" y1="8" x2="8" y2="16" stroke="rgba(239,68,68,0.6)" strokeWidth="2" />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    <path d="M8 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function FairnessConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">수학적 공정성</h2>
        <p className="mt-2 text-sm text-white/65">
          블록 해시는 예측할 수도, 조작할 수도 없습니다
        </p>
      </div>

      <FairnessHero />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 어떻게 공정성을 수학적으로 증명할 수 있을까요?
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
