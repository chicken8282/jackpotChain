// [학습 프론트엔드 v2] 추가: 모듈 3.2 - TxBuilder
import { useState } from "react";
import { motion } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function TxBuilder() {
  const [from, setFrom] = useState("0xABCD...1234");
  const [to, setTo] = useState("0xEF01...5678");
  const [amount, setAmount] = useState("25");
  const [built, setBuilt] = useState(false);

  const txData = `${from}${to}${amount}${Date.now()}`;
  const txHash = bytesToHex(sha256(new TextEncoder().encode(txData))).slice(0, 16);

  const build = () => setBuilt(true);
  const reset = () => setBuilt(false);

  const fields = [
    { label: "보내는 주소 (from)", value: from, setter: setFrom, color: "text-blue-400" },
    { label: "받는 주소 (to)", value: to, setter: setTo, color: "text-green-400" },
    { label: "금액 (JACK)", value: amount, setter: setAmount, color: "text-accent-gold" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">트랜잭션 빌더</h2>
      <p className="text-white/60 text-sm">트랜잭션 구조를 직접 구성해보세요</p>

      <div className={`${glass} p-4 w-full max-w-lg space-y-3`}>
        {fields.map((f) => (
          <div key={f.label}>
            <label className="text-white/60 text-xs mb-1 block">{f.label}</label>
            <input type="text" value={f.value}
              onChange={(e) => { f.setter(e.target.value); setBuilt(false); }}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2 text-white font-mono text-sm outline-none focus:border-accent-gold"
            />
          </div>
        ))}
      </div>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={build}
        className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer`}>
        트랜잭션 생성
      </motion.button>

      {built && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`${glass} p-4 w-full max-w-lg font-mono text-xs space-y-2`}>
          <p className="text-white/60 text-center text-sm font-sans font-bold mb-3">TX 구조</p>
          <div className="flex justify-between">
            <span className="text-white/30">txHash</span>
            <span className="text-accent-gold">0x{txHash}...</span>
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
            <span className="text-green-400">pending</span>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={reset}
            className="w-full mt-2 bg-white/[0.05] border border-white/[0.10] rounded-xl py-2 text-white/60 text-sm font-sans cursor-pointer">
            초기화
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
