// [학습 프론트엔드 v2] 수정: 모듈 1.3 - PoW 포크 & 합의 시각화
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

const glass =
  "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

interface Block {
  id: string;
  label: string;
  hash: string;
  miner?: string;
}

interface ChainState {
  base: Block[];
  forkA: Block[];
  forkB: Block[];
  phase: "initial" | "forked" | "resolving" | "resolved";
  discarded: "none" | "a" | "b";
}

function randomHash() {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

const INITIAL_CHAIN: Block[] = [
  { id: "b1", label: "B1", hash: "0a3f" + randomHash() },
  { id: "b2", label: "B2", hash: "00b7" + randomHash() },
  { id: "b3", label: "B3", hash: "009e" + randomHash() },
];

function BlockBox({
  block,
  color = "white",
  discarding = false,
  delay = 0,
}: {
  block: Block;
  color?: string;
  discarding?: boolean;
  delay?: number;
}) {
  const borderColor =
    color === "blue"
      ? "rgba(96,165,250,0.5)"
      : color === "orange"
        ? "rgba(251,146,60,0.5)"
        : "rgba(255,255,255,0.1)";

  const labelColor =
    color === "blue"
      ? "text-blue-400"
      : color === "orange"
        ? "text-orange-400"
        : "text-white";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={
        discarding
          ? {
              opacity: [1, 0.8, 0],
              scale: [1, 1.15, 0],
              rotate: [0, -5, 90],
              filter: ["blur(0px)", "blur(2px)", "blur(16px)"],
              y: [0, -10, 40],
              transition: { duration: 0.8, delay, ease: "easeIn" },
            }
          : { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", y: 0 }
      }
      exit={{ opacity: 0, scale: 0.5 }}
      className={`${glass} w-20 h-20 flex flex-col items-center justify-center gap-1 shrink-0`}
      style={{ borderColor }}
    >
      <span className={`${labelColor} text-sm font-bold`}>{block.label}</span>
      <span className="text-white/30 text-[10px] font-mono">{block.hash.slice(0, 8)}</span>
      {block.miner && (
        <span className={`${labelColor} text-[10px]`}>{block.miner}</span>
      )}
    </motion.div>
  );
}

function Arrow({ discarding = false, delay = 0 }: { discarding?: boolean; delay?: number }) {
  return (
    <motion.span
      className="text-white/30 text-lg shrink-0 select-none"
      animate={
        discarding
          ? { opacity: 0, transition: { duration: 0.4, delay } }
          : { opacity: 1 }
      }
    >
      {"\u2192"}
    </motion.span>
  );
}

export default function ConsensusDemo() {
  const [state, setState] = useState<ChainState>({
    base: INITIAL_CHAIN,
    forkA: [],
    forkB: [],
    phase: "initial",
    discarded: "none",
  });

  const triggerFork = useCallback(() => {
    setState((prev) => ({
      ...prev,
      forkA: [
        {
          id: "b4a",
          label: "B4",
          hash: "00a1" + randomHash(),
          miner: "채굴자 A",
        },
      ],
      forkB: [
        {
          id: "b4b",
          label: "B4'",
          hash: "00c3" + randomHash(),
          miner: "채굴자 B",
        },
      ],
      phase: "forked",
      discarded: "none",
    }));
  }, []);

  const resolveChain = useCallback(() => {
    const winnerIsA = Math.random() < 0.5;

    setState((prev) => ({
      ...prev,
      ...(winnerIsA
        ? {
            forkA: [
              ...prev.forkA,
              {
                id: "b5a",
                label: "B5",
                hash: "0012" + randomHash(),
                miner: "채굴자 A",
              },
            ],
          }
        : {
            forkB: [
              ...prev.forkB,
              {
                id: "b5b",
                label: "B5'",
                hash: "0045" + randomHash(),
                miner: "채굴자 B",
              },
            ],
          }),
      phase: "resolving",
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        phase: "resolved",
        discarded: winnerIsA ? "b" : "a",
      }));
    }, 1200);
  }, []);

  const reset = useCallback(() => {
    setState({
      base: INITIAL_CHAIN.map((b) => ({
        ...b,
        hash: b.hash.slice(0, 4) + randomHash(),
      })),
      forkA: [],
      forkB: [],
      phase: "initial",
      discarded: "none",
    });
  }, []);

  const phaseMessages: Record<ChainState["phase"], { title: string; desc: string }> = {
    initial: {
      title: "정상 체인",
      desc: "모든 노드가 동일한 체인을 공유하고 있습니다",
    },
    forked: {
      title: "포크 발생!",
      desc: "두 채굴자가 동시에 블록을 발견했습니다. 어떤 체인이 진짜일까요?",
    },
    resolving: {
      title: "경쟁 중...",
      desc: "누군가 다음 블록을 먼저 채굴했습니다!",
    },
    resolved: {
      title: "합의 완료",
      desc: "가장 긴 유효 체인이 승리합니다. 짧은 체인의 블록은 파기됩니다.",
    },
  };

  const msg = phaseMessages[state.phase];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">
        PoW 합의: 포크와 체인 선택
      </h2>

      <motion.div
        key={state.phase}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p
          className={`font-bold text-sm ${
            state.phase === "forked"
              ? "text-orange-400"
              : state.phase === "resolved"
                ? "text-green-400"
                : "text-white/80"
          }`}
        >
          {msg.title}
        </p>
        <p className="text-white/50 text-xs mt-1">{msg.desc}</p>
      </motion.div>

      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 justify-center">
          {/* 베이스 체인 */}
          {state.base.map((block, i) => (
            <div key={block.id} className="flex items-center gap-2">
              <BlockBox block={block} />
              {i < state.base.length - 1 && <Arrow />}
            </div>
          ))}

          {/* 포크 분기 — 위/아래 대칭 */}
          {state.phase !== "initial" && (
            <div className="flex flex-col gap-4 ml-2">
              {/* Fork A (위쪽) */}
              <div className="flex items-center gap-2">
                <Arrow discarding={state.discarded === "a"} delay={0} />
                <AnimatePresence>
                  {state.forkA.map((block, i) => (
                    <div key={block.id} className="flex items-center gap-2">
                      <BlockBox
                        block={block}
                        color="blue"
                        discarding={state.discarded === "a"}
                        delay={0.1 + i * 0.15}
                      />
                      {i < state.forkA.length - 1 && <Arrow />}
                    </div>
                  ))}
                </AnimatePresence>
                {state.phase === "resolved" && state.discarded === "b" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-green-400 text-sm font-bold ml-1"
                  >
                    MAIN CHAIN
                  </motion.span>
                )}
                {state.discarded === "a" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-red-400/80 text-xs font-bold ml-1"
                  >
                    ORPHANED
                  </motion.span>
                )}
              </div>

              {/* Fork B (아래쪽) */}
              <div className="flex items-center gap-2">
                <Arrow discarding={state.discarded === "b"} delay={0} />
                <AnimatePresence>
                  {state.forkB.map((block, i) => (
                    <div key={block.id} className="flex items-center gap-2">
                      <BlockBox
                        block={block}
                        color="orange"
                        discarding={state.discarded === "b"}
                        delay={0.1 + i * 0.15}
                      />
                      {i < state.forkB.length - 1 && <Arrow />}
                    </div>
                  ))}
                </AnimatePresence>
                {state.phase === "resolved" && state.discarded === "a" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-green-400 text-sm font-bold ml-1"
                  >
                    MAIN CHAIN
                  </motion.span>
                )}
                {state.discarded === "b" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-red-400/80 text-xs font-bold ml-1"
                  >
                    ORPHANED
                  </motion.span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        {state.phase === "initial" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={triggerFork}
            className={`${glass} px-6 py-3 text-orange-400 font-semibold cursor-pointer`}
          >
            포크 발생시키기
          </motion.button>
        )}

        {state.phase === "forked" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resolveChain}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${glass} px-6 py-3 text-blue-400 font-semibold cursor-pointer`}
          >
            다음 블록 채굴
          </motion.button>
        )}

        {(state.phase === "resolved" || state.phase === "resolving") && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={reset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${glass} px-6 py-3 text-white/60 font-semibold cursor-pointer`}
          >
            다시 해보기
          </motion.button>
        )}
      </div>

      {/* 하단 설명 */}
      {state.phase === "resolved" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className={`${glass} p-4 text-center max-w-lg`}
        >
          <p className="text-accent-gold font-bold text-sm">
            Longest Chain Rule
          </p>
          <p className="text-white/50 text-xs mt-2 leading-5">
            PoW에서는 투표가 아닌 <span className="text-white/80 font-semibold">연산량(해시파워)</span>으로
            합의합니다. 더 많은 작업이 투입된 긴 체인이 정본이 되고, 짧은
            체인의 블록은 고아(orphan)가 되어 파기됩니다.
          </p>
        </motion.div>
      )}
    </div>
  );
}
