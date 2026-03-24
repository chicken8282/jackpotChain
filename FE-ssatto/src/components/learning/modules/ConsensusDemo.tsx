// [학습 프론트엔드 v2] 추가: 모듈 1.3 - ConsensusDemo
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

type Vote = "pending" | "reject" | "approve";

export default function ConsensusDemo() {
  const [votes, setVotes] = useState<Vote[]>(Array(5).fill("pending"));
  const [phase, setPhase] = useState<"idle" | "voting" | "done">("idle");

  const tamper = () => {
    setPhase("voting");
    setVotes(Array(5).fill("pending"));
    const results: Vote[] = ["reject", "reject", "approve", "reject", "reject"];
    results.forEach((v, i) => {
      setTimeout(() => {
        setVotes((prev) => { const n = [...prev]; n[i] = v; return n; });
        if (i === 4) setPhase("done");
      }, (i + 1) * 500);
    });
  };

  const reset = () => { setVotes(Array(5).fill("pending")); setPhase("idle"); };

  const rejectCount = votes.filter((v) => v === "reject").length;
  const approveCount = votes.filter((v) => v === "approve").length;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">합의 메커니즘 시뮬레이션</h2>
      <p className="text-white/60 text-sm">과반수가 거부하면 위조는 실패합니다</p>

      <div className="flex gap-3 flex-wrap justify-center">
        {votes.map((v, i) => (
          <motion.div
            key={i}
            className={`${glass} w-24 h-28 flex flex-col items-center justify-center gap-2`}
            animate={{
              borderColor: v === "reject" ? "rgba(248,113,113,0.5)"
                : v === "approve" ? "rgba(74,222,128,0.5)"
                : "rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-white text-sm font-semibold">노드 {i + 1}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={v}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={
                  v === "reject" ? "text-red-400 text-xs font-bold"
                  : v === "approve" ? "text-green-400 text-xs font-bold"
                  : "text-white/30 text-xs"
                }
              >
                {v === "pending" ? "대기 중" : v === "reject" ? "거부" : "승인"}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${glass} p-4 text-center`}
        >
          <p className="text-red-400 font-bold">위조 시도 거부됨</p>
          <p className="text-white/60 text-xs mt-1">
            거부 {rejectCount} / 승인 {approveCount} -- 과반수 거부로 블록 무효
          </p>
        </motion.div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={tamper}
          disabled={phase === "voting"}
          className={`${glass} px-6 py-3 text-red-400 font-semibold cursor-pointer disabled:opacity-40`}
        >
          위조 시도
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className={`${glass} px-6 py-3 text-white/60 font-semibold cursor-pointer`}
        >
          초기화
        </motion.button>
      </div>
    </div>
  );
}
