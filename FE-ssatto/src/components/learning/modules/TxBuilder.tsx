// [학습 프론트엔드 v2] 수정: 모듈 3.2 - TxBuilder + 멤풀 전송 단계
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

type Phase = "editing" | "built" | "mempool";

export default function TxBuilder() {
  const [from, setFrom] = useState("0xABCD...1234");
  const [to, setTo] = useState("0xEF01...5678");
  const [amount, setAmount] = useState("25");
  const [phase, setPhase] = useState<Phase>("editing");
  const hashRef = useRef("");

  const build = () => {
    const txData = `${from}${to}${amount}${Date.now()}`;
    hashRef.current = bytesToHex(sha256(new TextEncoder().encode(txData))).slice(0, 16);
    setPhase("built");
  };

  const sendToMempool = () => setPhase("mempool");

  const reset = () => {
    setPhase("editing");
    hashRef.current = "";
  };

  const fields = [
    { label: "보내는 주소 (from)", value: from, setter: setFrom, color: "text-blue-400" },
    { label: "받는 주소 (to)", value: to, setter: setTo, color: "text-green-400" },
    { label: "금액 (JACK)", value: amount, setter: setAmount, color: "text-accent-gold" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">트랜잭션 빌더</h2>
      <p className="text-white/60 text-sm">트랜잭션을 구성하고 멤풀에 전송해보세요</p>

      {/* 입력 폼 */}
      <div className={`${glass} p-4 w-full max-w-lg space-y-3`}>
        {fields.map((f) => (
          <div key={f.label}>
            <label className="text-white/60 text-xs mb-1 block">{f.label}</label>
            <input type="text" value={f.value}
              onChange={(e) => { f.setter(e.target.value); setPhase("editing"); }}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2 text-white font-mono text-sm outline-none focus:border-accent-gold"
            />
          </div>
        ))}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        {phase === "editing" && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={build}
            className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer`}>
            트랜잭션 생성
          </motion.button>
        )}
        {phase === "built" && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={sendToMempool}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`${glass} px-6 py-3 text-orange-400 font-semibold cursor-pointer`}>
            멤풀에 전송
          </motion.button>
        )}
        {(phase === "built" || phase === "mempool") && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={reset}
            className={`${glass} px-6 py-3 text-white/60 font-semibold cursor-pointer`}>
            초기화
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* TX 구조 */}
        {phase !== "editing" && (
          <motion.div key="tx-card"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`${glass} p-4 w-full max-w-lg font-mono text-xs space-y-2`}>
            <p className="text-white/60 text-center text-sm font-sans font-bold mb-3">TX 구조</p>
            <div className="flex justify-between">
              <span className="text-white/30">txHash</span>
              <span className="text-accent-gold">0x{hashRef.current}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">from</span>
              <span className="text-blue-400">{from}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">to</span>
              <span className="text-green-400">{to}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">value</span>
              <span className="text-accent-gold">{amount} JACK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">fee</span>
              <span className="text-white/60">0.001 JACK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">status</span>
              <span className={phase === "mempool" ? "text-orange-400" : "text-green-400"}>
                {phase === "mempool" ? "unconfirmed (멤풀)" : "pending"}
              </span>
            </div>
          </motion.div>
        )}

        {/* 멤풀 시각화 */}
        {phase === "mempool" && (
          <motion.div key="mempool-area"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <div className="rounded-3xl border-2 border-dashed border-orange-400/30 bg-orange-400/[0.03] p-5 relative overflow-hidden">
              {/* 펄스 배경 */}
              <motion.div
                className="absolute inset-0 rounded-3xl bg-orange-400/[0.04]"
                animate={{ opacity: [0, 0.08, 0] }}
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
                  <span className="text-white/30 text-xs">— 미확정 트랜잭션 대기 공간</span>
                </div>

                {/* 내 TX */}
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1, y: [0, -3, 0] }}
                  transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                  className={`${glass} p-3 mb-2 border-orange-400/30`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 text-xs font-bold">내 TX</span>
                    <span className="text-white/40 font-mono text-[10px]">0x{hashRef.current.slice(0, 8)}...</span>
                  </div>
                  <p className="text-white/50 text-[10px] mt-1">{from} → {to} | {amount} JACK</p>
                </motion.div>

                {/* 다른 TX들 (배경) */}
                {[
                  { hash: "a7f3c1d2", from: "0x7B2E...9a01", to: "0x3C8F...b412", amount: "12" },
                  { hash: "e9b04f81", from: "0x1D5A...c723", to: "0x8E6B...d934", amount: "48" },
                ].map((tx, i) => (
                  <motion.div key={tx.hash}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 0.5, y: [0, -2, 0] }}
                    transition={{
                      delay: 0.3 + i * 0.2,
                      y: { duration: 2.5 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 },
                    }}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-2 mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-[10px]">TX</span>
                      <span className="text-white/20 font-mono text-[10px]">0x{tx.hash}...</span>
                    </div>
                    <p className="text-white/20 text-[10px] mt-0.5">{tx.from} → {tx.to} | {tx.amount} JACK</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 설명 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/40 text-xs text-center mt-3 leading-5"
            >
              트랜잭션은 멤풀에서 <span className="text-orange-400 font-semibold">미확정 상태</span>로 대기합니다.
              채굴자가 이 TX를 블록에 포함시켜야 비로소 확정됩니다.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
