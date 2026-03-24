// [학습 프론트엔드 v2] 추가: 모듈 4.1 - MiningPuzzle
import { useState, useRef } from "react";
import { motion } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function MiningPuzzle() {
  const [difficulty, setDifficulty] = useState(2);
  const [nonce, setNonce] = useState(0);
  const [hash, setHash] = useState("");
  const [mining, setMining] = useState(false);
  const [found, setFound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonceRef = useRef(0);
  const blockData = "JACKPOT-BLOCK-2026";
  const target = "0".repeat(difficulty);

  const mine = () => {
    setMining(true);
    setFound(false);
    nonceRef.current = 0;

    const step = () => {
      const batch = 50;
      for (let i = 0; i < batch; i++) {
        const input = blockData + nonceRef.current;
        const h = bytesToHex(sha256(new TextEncoder().encode(input)));
        setNonce(nonceRef.current);
        setHash(h);
        if (h.startsWith(target)) {
          setMining(false);
          setFound(true);
          return;
        }
        nonceRef.current++;
      }
      timerRef.current = setTimeout(step, 16);
    };
    step();
  };

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMining(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">채굴 퍼즐 시뮬레이션</h2>
      <p className="text-white/60 text-sm">해시 앞자리가 {difficulty}개의 0으로 시작하는 논스를 찾습니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <label className="text-white/60 text-xs mb-2 block">난이도 (앞자리 0 개수): {difficulty}</label>
        <input type="range" min={1} max={4} value={difficulty}
          onChange={(e) => { setDifficulty(Number(e.target.value)); stop(); setFound(false); setHash(""); }}
          className="w-full accent-amber-400" disabled={mining} />
      </div>

      <div className={`${glass} p-4 w-full max-w-lg space-y-2`}>
        <div className="flex justify-between">
          <span className="text-white/60 text-xs">블록 데이터</span>
          <span className="font-mono text-xs text-white">{blockData}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60 text-xs">현재 논스</span>
          <motion.span key={nonce} className="font-mono text-xs text-accent-gold">
            {nonce.toLocaleString()}
          </motion.span>
        </div>
        <div>
          <span className="text-white/60 text-xs">해시: </span>
          <span className="font-mono text-xs break-all">
            <span className={found ? "text-green-400" : "text-red-400"}>{hash.slice(0, difficulty)}</span>
            <span className="text-white/60">{hash.slice(difficulty)}</span>
          </span>
        </div>
        <div className="text-white/30 text-xs">목표: {target}{"*".repeat(64 - difficulty)}</div>
      </div>

      {found && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-green-400 font-bold text-sm">
          채굴 성공 -- 논스 {nonce.toLocaleString()}에서 발견
        </motion.div>
      )}

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={mining ? stop : mine}
        className={`${glass} px-6 py-3 font-semibold cursor-pointer ${mining ? "text-red-400" : "text-accent-gold"}`}>
        {mining ? "중지" : "채굴 시작"}
      </motion.button>
    </div>
  );
}
