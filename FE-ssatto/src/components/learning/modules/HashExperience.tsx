// [학습 프론트엔드 v2] 추가: 모듈 1.2 - HashExperience
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

function hashColor(hex: string) {
  return hex.split("").map((c) => {
    const v = parseInt(c, 16);
    if (v < 4) return "text-red-400";
    if (v < 8) return "text-accent-gold";
    if (v < 12) return "text-blue-400";
    return "text-green-400";
  });
}

export default function HashExperience() {
  const [input, setInput] = useState("안녕하세요");
  const [hash, setHash] = useState("");
  const [prevHash, setPrevHash] = useState("");
  const prevInput = useRef(input);

  useEffect(() => {
    const h = bytesToHex(sha256(new TextEncoder().encode(input)));
    setPrevHash(hash);
    setHash(h);
    prevInput.current = input;
  }, [input]);

  const colors = hashColor(hash);
  const changed = hash !== prevHash;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">SHA-256 해시 체험</h2>
      <p className="text-white/60 text-sm">한 글자만 바꿔도 해시가 완전히 달라집니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <label className="text-white/60 text-xs mb-1 block">입력 텍스트</label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2 text-white font-mono text-sm outline-none focus:border-accent-gold"
        />
      </div>

      <motion.div
        className={`${glass} p-4 w-full max-w-lg`}
        animate={{ scale: changed ? [1, 1.02, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <label className="text-white/60 text-xs mb-1 block">SHA-256 해시 결과</label>
        <div className="font-mono text-xs leading-relaxed break-all">
          {hash.split("").map((c, i) => (
            <motion.span
              key={i}
              className={colors[i]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.005 }}
            >
              {c}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <div className={`${glass} p-3 w-full max-w-lg`}>
        <p className="text-white/30 text-xs">
          입력 길이: {input.length}자 / 해시 길이: 항상 64자 (256비트)
        </p>
      </div>
    </div>
  );
}
