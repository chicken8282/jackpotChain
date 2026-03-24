// 모듈 1.1 커스텀 개념학습: 투명한 유리 금고
// 3D 유리 큐브 + 3카드 (클릭 시 자동재생 애니메이션 + 정적 설명)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassButton from "../ui/GlassButton";

interface Props {
  onGoInteraction: () => void;
}

/* ── 3D 유리 큐브 (기존 유지) ─────────────────────── */
function GlassCube() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative" style={{ width: 260, height: 240, perspective: 800 }}>
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: "rotateX(-15deg) rotateY(-25deg)" }}>
          {[
            { z: 90, bg: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", bd: 0.12 },
            { z: -90, bg: "rgba(255,255,255,0.01)", bd: 0.06 },
            { rx: 90, z: 90, bg: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))", bd: 0.10 },
            { rx: -90, z: 90, bg: "rgba(255,255,255,0.01)", bd: 0.04 },
            { ry: 90, z: 90, bg: "linear-gradient(270deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))", bd: 0.08 },
            { ry: -90, z: 90, bg: "rgba(255,255,255,0.02)", bd: 0.06 },
          ].map((f, i) => (
            <div key={i} className="absolute border rounded-lg"
              style={{ width: 180, height: 180, left: 40, top: 30, background: f.bg,
                borderColor: `rgba(255,255,255,${f.bd})`,
                transform: `${f.rx ? `rotateX(${f.rx}deg) ` : ""}${f.ry ? `rotateY(${f.ry}deg) ` : ""}translateZ(${f.z}px)`,
              }} />
          ))}
        </div>
        <svg className="absolute w-full h-full" style={{ left: 0, top: -10, zIndex: 10 }} viewBox="0 0 260 240">
          <line x1="82" y1="105" x2="178" y2="105" stroke="rgba(100,200,255,0.3)" strokeWidth="1.2" />
          <line x1="130" y1="68" x2="130" y2="150" stroke="rgba(100,200,255,0.3)" strokeWidth="1.2" />
          <line x1="82" y1="105" x2="130" y2="68" stroke="rgba(100,200,255,0.25)" strokeWidth="1.2" />
          <line x1="178" y1="105" x2="130" y2="68" stroke="rgba(100,200,255,0.25)" strokeWidth="1.2" />
          <line x1="82" y1="105" x2="130" y2="150" stroke="rgba(100,200,255,0.25)" strokeWidth="1.2" />
          <line x1="178" y1="105" x2="130" y2="150" stroke="rgba(100,200,255,0.25)" strokeWidth="1.2" />
        </svg>
        {[
          { l: 66, t: 87, z: 11, w: 9, c: "blue", d: 3, dl: 0 },
          { l: 114, t: 50, z: 11, w: 9, c: "sky", d: 2.8, dl: 0.3 },
          { l: 162, t: 87, z: 11, w: 9, c: "purple", d: 3.2, dl: 0.6 },
          { l: 114, t: 132, z: 11, w: 9, c: "violet", d: 2.6, dl: 0.9 },
          { l: 157, t: 38, z: 5, w: 6, c: "slate", d: 3.5, dl: 0.4 },
          { l: 194, t: 72, z: 5, w: 6, c: "slate", d: 3.3, dl: 0.7 },
          { l: 157, t: 155, z: 5, w: 6, c: "slate", d: 3.1, dl: 1.0 },
        ].map((n, i) => (
          <motion.div key={i} className="absolute" style={{ left: n.l, top: n.t, zIndex: n.z }}
            animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: n.d, ease: "easeInOut", delay: n.dl }}>
            <div className={`w-${n.w} h-${n.w} rounded ${n.w === 9 ? "border-2" : "border"} border-${n.c}-400/${n.w === 9 ? 50 : 25} bg-gradient-to-br from-${n.c}-500/${n.w === 9 ? 40 : 20} to-${n.c}-600/${n.w === 9 ? 15 : 5} shadow-[0_0_${n.w === 9 ? 14 : 6}px_rgba(${n.c === "blue" ? "59,130,246" : n.c === "sky" ? "56,189,248" : n.c === "purple" ? "168,85,247" : n.c === "violet" ? "139,92,246" : "148,163,184"},${n.w === 9 ? 0.4 : 0.15})]`}
              style={{ width: n.w * 4, height: n.w * 4 }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── 팝업 애니메이션 (자동재생, 버튼 없음) ─────────── */

/** 투명성: 불투명 금고가 서서히 투명해지며 장부 공개 */
function TransparencyAnim() {
  const ledger = ["Alice → Bob  10 JACK", "Bob → Carol  5 JACK", "Carol → Dave  3 JACK", "Dave → Alice  7 JACK"];
  return (
    <div className="w-full">
      <div className="relative mx-auto w-56 h-40 rounded-xl border-2 border-blue-500/30 overflow-hidden">
        {/* 불투명 → 투명 전환 (자동 루프) */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900"
          animate={{ opacity: [1, 1, 0, 0, 1] }}
          transition={{ repeat: Infinity, duration: 6, times: [0, 0.2, 0.4, 0.8, 1] }}
        />
        {/* 장부 데이터 (투명해질 때 보임) */}
        <div className="absolute inset-0 flex flex-col justify-center px-4 gap-1.5">
          {ledger.map((tx, i) => (
            <motion.div key={i}
              className="rounded-md bg-blue-500/15 border border-blue-500/25 px-2 py-1 text-[10px] font-mono text-blue-300"
              animate={{ opacity: [0, 0, 1, 1, 0] }}
              transition={{ repeat: Infinity, duration: 6, times: [0, 0.3, 0.45 + i * 0.05, 0.8, 0.95], delay: i * 0.05 }}
            />
          ))}
          {ledger.map((tx, i) => (
            <motion.div key={`t${i}`}
              className="absolute rounded-md px-2 py-1 text-[10px] font-mono text-blue-300"
              style={{ top: 10 + i * 30, left: 16, right: 16 }}
              animate={{ opacity: [0, 0, 1, 1, 0] }}
              transition={{ repeat: Infinity, duration: 6, times: [0, 0.3, 0.45 + i * 0.05, 0.8, 0.95] }}>
              {tx}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 분산 저장: 중앙에서 4개 노드로 데이터 파티클 퍼져나감 */
function DistributedAnim() {
  const positions = [
    { x: -60, y: -40 }, { x: 60, y: -40 },
    { x: -60, y: 40 }, { x: 60, y: 40 },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="relative" style={{ width: 200, height: 140 }}>
        {/* 중앙 노드 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-purple-400/60 bg-purple-500/20 flex items-center justify-center">
          <span className="text-sm">{"\u{1F4E6}"}</span>
        </div>
        {/* 외곽 4개 노드 + 파티클 */}
        {positions.map((p, i) => (
          <div key={i}>
            {/* 노드 */}
            <motion.div
              className="absolute w-8 h-8 rounded-full border-2 border-purple-400/30 bg-purple-500/10 flex items-center justify-center"
              style={{ left: `calc(50% + ${p.x}px - 16px)`, top: `calc(50% + ${p.y}px - 16px)` }}
              animate={{ borderColor: ["rgba(168,85,247,0.3)", "rgba(168,85,247,0.7)", "rgba(168,85,247,0.3)"] }}
              transition={{ repeat: Infinity, duration: 3, delay: 1 + i * 0.4 }}
            >
              <motion.span className="text-[10px] text-purple-300"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 + i * 0.4 }}>
                {"\u2713"}
              </motion.span>
            </motion.div>
            {/* 파티클 (중앙→외곽) */}
            <motion.div
              className="absolute w-2 h-2 rounded-full bg-purple-400"
              style={{ left: "calc(50% - 4px)", top: "calc(50% - 4px)" }}
              animate={{ x: [0, p.x], y: [0, p.y], opacity: [1, 0], scale: [1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: "easeOut" }}
            />
          </div>
        ))}
        {/* 연결선 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 140">
          {positions.map((p, i) => (
            <motion.line key={i} x1="100" y1="70" x2={100 + p.x} y2={70 + p.y}
              stroke="rgba(168,85,247,0.15)" strokeWidth="1" strokeDasharray="3 3"
              animate={{ stroke: ["rgba(168,85,247,0.15)", "rgba(168,85,247,0.4)", "rgba(168,85,247,0.15)"] }}
              transition={{ repeat: Infinity, duration: 3, delay: 1 + i * 0.4 }} />
          ))}
        </svg>
      </div>
    </div>
  );
}

/** 조작 불가: 3블록 체인 → 2번째 블록 빨갛게 → 체인 끊어짐 (자동루프) */
function TamperAnim() {
  const blocks = [{ h: "a3f7", d: "TX #1" }, { h: "b2e1", d: "TX #2" }, { h: "c8d4", d: "TX #3" }];
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-1.5">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <motion.div
              className="rounded-lg border px-3 py-2 text-center"
              animate={i === 1
                ? { borderColor: ["rgba(34,197,94,0.3)", "rgba(34,197,94,0.3)", "rgba(239,68,68,0.6)", "rgba(239,68,68,0.6)", "rgba(34,197,94,0.3)"],
                    backgroundColor: ["rgba(34,197,94,0.04)", "rgba(34,197,94,0.04)", "rgba(239,68,68,0.12)", "rgba(239,68,68,0.12)", "rgba(34,197,94,0.04)"],
                    x: [0, 0, -2, 2, 0] }
                : i > 1
                  ? { borderColor: ["rgba(34,197,94,0.3)", "rgba(34,197,94,0.3)", "rgba(239,68,68,0.3)", "rgba(239,68,68,0.3)", "rgba(34,197,94,0.3)"] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.4, 0.7, 1] }}
              style={{ borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.04)" }}
            >
              <p className="text-[9px] text-white/30">{b.d}</p>
              <motion.p className="text-[10px] font-mono font-bold"
                animate={i >= 1
                  ? { color: ["rgb(52,211,153)", "rgb(52,211,153)", "rgb(248,113,113)", "rgb(248,113,113)", "rgb(52,211,153)"] }
                  : { color: "rgb(52,211,153)" }
                }
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.4, 0.7, 1] }}>
                {b.h}
              </motion.p>
            </motion.div>
            {i < 2 && (
              <motion.span className="text-xs"
                animate={i >= 1
                  ? { color: ["rgba(52,211,153,0.4)", "rgba(52,211,153,0.4)", "rgba(239,68,68,0.8)", "rgba(239,68,68,0.8)", "rgba(52,211,153,0.4)"] }
                  : { color: "rgba(52,211,153,0.4)" }
                }
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.4, 0.7, 1] }}>
                {"\u2192"}
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 카드 + 팝업 데이터 ───────────────────────────── */
const CARDS = [
  {
    title: "투명성", short: "모든 것이 공개됩니다",
    desc: "모든 거래 기록이 공개됩니다. 유리 금고처럼, 숨길 수 없습니다.",
    accent: "text-blue-400", border: "border-blue-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:border-blue-500/50",
    bg: "from-blue-500/[0.08] to-blue-600/[0.02]",
    Anim: TransparencyAnim,
  },
  {
    title: "분산 저장", short: "수천 곳에 동시 보관됩니다",
    desc: "수천 대의 컴퓨터에 동시 저장됩니다. 한 곳이 꺼져도 데이터는 살아있습니다.",
    accent: "text-purple-400", border: "border-purple-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:border-purple-500/50",
    bg: "from-purple-500/[0.08] to-purple-600/[0.02]",
    Anim: DistributedAnim,
  },
  {
    title: "조작 불가", short: "변조하면 즉시 발각됩니다",
    desc: "하나를 바꾸면 전체 체인이 무너집니다. 다수결로 즉시 발각됩니다.",
    accent: "text-emerald-400", border: "border-emerald-500/25",
    glowHover: "hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:border-emerald-500/50",
    bg: "from-emerald-500/[0.08] to-emerald-600/[0.02]",
    Anim: TamperAnim,
  },
];

const icons = [
  <motion.svg key="a" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
    <circle cx="11" cy="11" r="3" strokeDasharray="2 2" />
  </motion.svg>,
  <motion.svg key="b" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
    <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" />
    <path d="M8.5 6h7M7.5 7.5 11 16.5M16.5 7.5 13 16.5" strokeDasharray="3 2" opacity={0.6} />
  </motion.svg>,
  <motion.svg key="c" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
    <path d="M12 2l7 4v6c0 5.25-3.5 8.5-7 10-3.5-1.5-7-4.75-7-10V6l7-4z" />
    <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>,
];

/* ── 메인 ─────────────────────────────────────────── */
export default function VaultConcept({ onGoInteraction }: Props) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">투명한 유리 금고</h2>
        <p className="mt-2 text-sm text-white/50">
          블록체인은 모든 참여자가 동일한 복사본을 가진 공유 장부입니다
        </p>
      </div>

      <GlassCube />

      <p className="text-center text-sm font-semibold text-accent-gold">
        {"\u{1F914}"} 왜 유리 금고일까요? 블록체인을 지탱하는 3대 기둥을 알아보세요
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
                  {/* 애니메이션 */}
                  <CardAnim />
                  {/* 설명 */}
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
