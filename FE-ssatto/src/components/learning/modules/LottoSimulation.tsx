// [학습 프론트엔드 v2] 추가: 모듈 5.1 - LottoSimulation
import { useState } from "react";
import { motion } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";
const hexDigits = "0123456789ABCDEF".split("");

function randomHexDigit() {
  return hexDigits[Math.floor(Math.random() * 16)];
}

export default function LottoSimulation() {
  const [picks, setPicks] = useState<string[]>(Array(6).fill("0"));
  const [blockHash, setBlockHash] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);

  const setPick = (i: number, v: string) => {
    setPicks((p) => { const n = [...p]; n[i] = v; return n; });
  };

  const draw = () => {
    setRunning(true);
    setRevealed(0);
    const hash = Array.from({ length: 6 }, () => randomHexDigit());
    setBlockHash(hash);
    hash.forEach((_, i) => {
      setTimeout(() => {
        setRevealed(i + 1);
        if (i === 5) setRunning(false);
      }, (i + 1) * 600);
    });
  };

  const matchCount = blockHash.filter((h, i) => h === picks[i]).length;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">블록해시 로또 시뮬레이션</h2>
      <p className="text-white/60 text-sm">6자리 헥스(0x0~0xF)를 선택하고 블록 해시와 비교합니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <p className="text-white/60 text-xs mb-3">내 선택 (각 자리 0~F)</p>
        <div className="flex gap-2 justify-center">
          {picks.map((p, i) => (
            <select key={i} value={p} onChange={(e) => setPick(i, e.target.value)}
              disabled={running}
              className="bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2 text-accent-gold font-mono text-lg text-center outline-none cursor-pointer">
              {hexDigits.map((h) => (
                <option key={h} value={h} className="bg-gray-900">{h}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={draw} disabled={running}
        className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer disabled:opacity-40`}>
        블록 해시 추첨
      </motion.button>

      {blockHash.length > 0 && (
        <div className={`${glass} p-4 w-full max-w-lg`}>
          <p className="text-white/60 text-xs mb-3">블록 해시 결과</p>
          <div className="flex gap-2 justify-center">
            {blockHash.map((h, i) => {
              const show = i < revealed;
              const match = show && h === picks[i];
              return (
                <motion.div key={i}
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: show ? 0 : 90 }}
                  transition={{ duration: 0.3 }}
                  className={`${glass} w-12 h-14 flex items-center justify-center font-mono text-lg font-bold ${
                    show ? (match ? "text-green-400 border-green-400/40" : "text-red-400 border-red-400/40") : "text-white/30"
                  }`}>
                  {show ? h : "?"}
                </motion.div>
              );
            })}
          </div>
          {revealed === 6 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center mt-4 font-bold text-sm">
              <span className="text-white">일치: </span>
              <span className={matchCount >= 4 ? "text-green-400" : matchCount >= 2 ? "text-accent-gold" : "text-red-400"}>
                {matchCount}/6
              </span>
              <span className="text-white/60 text-xs ml-2">
                {matchCount === 6 ? "JACKPOT!" : matchCount >= 4 ? "대단합니다!" : matchCount >= 2 ? "아깝습니다" : "다음 기회에"}
              </span>
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
}
