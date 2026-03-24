// [학습 프론트엔드 v2] 추가: 모듈 3.3 - 트랜잭션 전파 & 블록 확정 시각화
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

type Phase = "mempool" | "mining" | "confirmed";

interface MempoolTx {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  isMine?: boolean;
}

const MEMPOOL_TXS: MempoolTx[] = [
  { id: "tx1", hash: "0xa7f3c1d2", from: "0xABCD...1234", to: "0xEF01...5678", amount: "25", isMine: true },
  { id: "tx2", hash: "0xe9b04f81", from: "0x7B2E...9a01", to: "0x3C8F...b412", amount: "12" },
  { id: "tx3", hash: "0x3d2c8e7a", from: "0x1D5A...c723", to: "0x8E6B...d934", amount: "48" },
  { id: "tx4", hash: "0xf1a09b56", from: "0x4F7C...e245", to: "0x9A1D...f567", amount: "7" },
];

function TxCard({ tx, dimmed = false, delay = 0 }: { tx: MempoolTx; dimmed?: boolean; delay?: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: dimmed ? 0.35 : 1,
        x: 0,
        y: tx.isMine && !dimmed ? [0, -3, 0] : 0,
      }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      transition={{
        delay,
        y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`${glass} p-2.5 ${tx.isMine ? "border-orange-400/30" : "border-white/[0.06]"}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${tx.isMine ? "text-orange-400" : "text-white/30"}`}>
          {tx.isMine ? "내 TX" : "TX"}
        </span>
        <span className="text-white/25 font-mono text-[10px]">{tx.hash.slice(0, 10)}...</span>
      </div>
      <p className="text-white/30 text-[10px] mt-0.5">
        {tx.from} → {tx.to} | {tx.amount} JACK
      </p>
    </motion.div>
  );
}

export default function PropagationFlow() {
  const [phase, setPhase] = useState<Phase>("mempool");
  const [selectedTxs, setSelectedTxs] = useState<string[]>([]);

  const startMining = useCallback(() => {
    // 채굴자가 수수료 높은 순서로 TX 선택 (여기서는 3개 선택)
    const picked = MEMPOOL_TXS.slice(0, 3).map((t) => t.id);
    setSelectedTxs(picked);
    setPhase("mining");

    setTimeout(() => {
      setPhase("confirmed");
    }, 2500);
  }, []);

  const reset = useCallback(() => {
    setPhase("mempool");
    setSelectedTxs([]);
  }, []);

  const pickedTxs = MEMPOOL_TXS.filter((t) => selectedTxs.includes(t.id));
  const remainingTxs = MEMPOOL_TXS.filter((t) => !selectedTxs.includes(t.id));

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">트랜잭션 전파와 블록 확정</h2>
      <p className="text-white/60 text-sm">멤풀의 트랜잭션이 블록에 포함되어 확정되는 과정</p>

      <div className="w-full max-w-2xl flex flex-col md:flex-row gap-4 items-stretch">
        {/* 멤풀 영역 */}
        <div className="flex-1">
          <div className="rounded-3xl border-2 border-dashed border-orange-400/30 bg-orange-400/[0.03] p-4 h-full relative overflow-hidden">
            <motion.div
              className="absolute inset-0 rounded-3xl bg-orange-400/[0.04]"
              animate={{ opacity: [0, 0.06, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  className="w-2 h-2 rounded-full bg-orange-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-orange-400 text-sm font-bold">Mempool</span>
                <span className="text-white/30 text-[10px]">미확정 대기</span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {phase === "mempool" &&
                    MEMPOOL_TXS.map((tx, i) => (
                      <TxCard key={tx.id} tx={tx} delay={i * 0.1} />
                    ))}
                  {phase !== "mempool" &&
                    remainingTxs.map((tx, i) => (
                      <TxCard key={tx.id} tx={tx} dimmed delay={i * 0.1} />
                    ))}
                </AnimatePresence>
              </div>

              {phase !== "mempool" && remainingTxs.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/20 text-[10px] text-center mt-2"
                >
                  다음 블록을 기다리는 중...
                </motion.p>
              )}
            </div>
          </div>
        </div>

        {/* 화살표 */}
        <div className="flex md:flex-col items-center justify-center gap-1">
          <AnimatePresence>
            {phase !== "mempool" && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-1"
              >
                <motion.span
                  className="text-accent-gold text-xs font-bold"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: phase === "mining" ? Infinity : 0 }}
                >
                  {phase === "mining" ? "채굴 중..." : "채굴 완료!"}
                </motion.span>
                <span className="text-white/30 text-2xl">→</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 블록 영역 */}
        <div className="flex-1">
          <AnimatePresence>
            {phase !== "mempool" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`rounded-3xl border-2 p-4 h-full ${
                  phase === "confirmed"
                    ? "border-green-400/40 bg-green-400/[0.03]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {phase === "confirmed" ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center"
                    >
                      <span className="text-green-400 text-[10px]">✓</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white/30"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      phase === "confirmed" ? "text-green-400" : "text-white/50"
                    }`}
                  >
                    Block #1,284
                  </span>
                  {phase === "confirmed" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-green-400/60 text-[10px]"
                    >
                      확정됨
                    </motion.span>
                  )}
                </div>

                {/* 블록 헤더 */}
                <div className="bg-white/[0.03] rounded-xl p-2 mb-3 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white/25">prevHash</span>
                    <span className="text-white/40">0x00f7a3b1e9...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">nonce</span>
                    <span className="text-accent-gold/60">
                      {phase === "mining" ? (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.3, repeat: Infinity }}
                        >
                          탐색 중...
                        </motion.span>
                      ) : (
                        "284,719"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">merkleRoot</span>
                    <span className="text-white/40">0x9c4e12d8...</span>
                  </div>
                </div>

                {/* 블록에 포함된 TX */}
                <div className="space-y-1.5">
                  {pickedTxs.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.3 }}
                      className={`rounded-xl p-2 text-[10px] ${
                        tx.isMine
                          ? phase === "confirmed"
                            ? "bg-green-400/[0.08] border border-green-400/20"
                            : "bg-orange-400/[0.08] border border-orange-400/20"
                          : "bg-white/[0.03] border border-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold ${
                            tx.isMine
                              ? phase === "confirmed"
                                ? "text-green-400"
                                : "text-orange-400"
                              : "text-white/30"
                          }`}
                        >
                          {tx.isMine ? "내 TX" : "TX"}
                        </span>
                        <span className="text-white/25 font-mono">{tx.hash.slice(0, 10)}...</span>
                      </div>
                      <p className="text-white/25 mt-0.5">{tx.amount} JACK</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "mempool" && (
            <div className="rounded-3xl border-2 border-dashed border-white/[0.06] p-4 h-full flex items-center justify-center">
              <p className="text-white/15 text-sm text-center">
                채굴을 시작하면<br />블록이 생성됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        {phase === "mempool" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startMining}
            className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer`}
          >
            채굴 시작
          </motion.button>
        )}
        {phase === "confirmed" && (
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
      {phase === "confirmed" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`${glass} p-4 text-center max-w-lg`}
        >
          <p className="text-green-400 font-bold text-sm">트랜잭션 확정 완료</p>
          <p className="text-white/50 text-xs mt-2 leading-5">
            채굴자가 멤풀에서 트랜잭션을 선택하여 블록에 담고,
            <span className="text-white/80 font-semibold"> 유효한 nonce를 찾으면</span> 블록이
            네트워크에 전파됩니다. 블록에 포함된 순간 트랜잭션은{" "}
            <span className="text-green-400 font-semibold">확정(confirmed)</span> 상태가 됩니다.
          </p>
        </motion.div>
      )}
    </div>
  );
}
