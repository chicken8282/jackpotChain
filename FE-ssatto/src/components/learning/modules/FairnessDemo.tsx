// [학습 프론트엔드 v2] 추가: 모듈 5.2 - FairnessDemo
import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function FairnessDemo() {
  const [blockData, setBlockData] = useState("Block #12345 | Prev: 0xABCD | Nonce: 42");
  const [tampered, setTampered] = useState(false);
  const [tamperedData, setTamperedData] = useState("");

  const originalHash = useMemo(
    () => bytesToHex(sha256(new TextEncoder().encode(blockData))),
    [blockData]
  );

  const tamperedHash = useMemo(
    () => (tamperedData ? bytesToHex(sha256(new TextEncoder().encode(tamperedData))) : ""),
    [tamperedData]
  );

  const tamper = () => {
    const modified = blockData.replace("Nonce: 42", "Nonce: 43");
    setTamperedData(modified);
    setTampered(true);
  };

  const reset = () => {
    setTampered(false);
    setTamperedData("");
  };

  const diffCount = tampered
    ? originalHash.split("").filter((c, i) => c !== tamperedHash[i]).length
    : 0;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">공정성 검증</h2>
      <p className="text-white/60 text-sm">블록 데이터를 조작하면 해시가 완전히 달라집니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <label className="text-white/60 text-xs mb-1 block">원본 블록 데이터</label>
        <input type="text" value={blockData}
          onChange={(e) => { setBlockData(e.target.value); reset(); }}
          className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2 text-white font-mono text-sm outline-none focus:border-accent-gold" />
      </div>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <p className="text-green-400 text-xs font-semibold mb-1">원본 해시</p>
        <p className="font-mono text-xs text-white/60 break-all">{originalHash}</p>
      </div>

      {tampered && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`${glass} p-4 w-full max-w-lg space-y-3`}>
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">위조된 데이터</p>
            <p className="font-mono text-xs text-red-400/80 break-all">{tamperedData}</p>
          </div>
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">위조 해시</p>
            <div className="font-mono text-xs break-all">
              {tamperedHash.split("").map((c, i) => (
                <span key={i} className={c !== originalHash[i] ? "text-red-400" : "text-white/30"}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <p className="text-white/60 text-xs text-center">
            64자 중 <span className="text-red-400 font-bold">{diffCount}자</span>가 변경됨 ({((diffCount / 64) * 100).toFixed(0)}%)
            -- 조작 즉시 감지 가능
          </p>
        </motion.div>
      )}

      <div className="flex gap-3">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={tamper} disabled={tampered}
          className={`${glass} px-6 py-3 text-red-400 font-semibold cursor-pointer disabled:opacity-40`}>
          위조 시도 (Nonce 변경)
        </motion.button>
        {tampered && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={reset}
            className={`${glass} px-6 py-3 text-white/60 font-semibold cursor-pointer`}>
            초기화
          </motion.button>
        )}
      </div>
    </div>
  );
}
