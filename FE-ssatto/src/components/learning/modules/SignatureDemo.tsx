// [학습 프론트엔드 v2] 추가: 모듈 2.2 - SignatureDemo
import { useState } from "react";
import { motion } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function SignatureDemo() {
  const [message, setMessage] = useState("10 JACK를 Alice에게 전송");
  const [signature, setSignature] = useState("");
  const [verified, setVerified] = useState<null | boolean>(null);
  const [tampered, setTampered] = useState(false);
  const [displayMsg, setDisplayMsg] = useState("");

  const sign = () => {
    const sig = bytesToHex(sha256(new TextEncoder().encode(message))).slice(0, 32);
    setSignature(sig);
    setVerified(null);
    setTampered(false);
    setDisplayMsg(message);
  };

  const verify = () => {
    const expected = bytesToHex(sha256(new TextEncoder().encode(displayMsg))).slice(0, 32);
    setVerified(expected === signature);
  };

  const tamper = () => {
    setTampered(true);
    setDisplayMsg("999 JACK를 Hacker에게 전송 (위조됨)");
    setVerified(null);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">전자 서명 체험</h2>
      <p className="text-white/60 text-sm">서명 후 메시지가 변경되면 검증에 실패합니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <label className="text-white/60 text-xs mb-1 block">원본 메시지</label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2 text-white font-mono text-sm outline-none focus:border-accent-gold"
        />
      </div>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={sign} className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer`}>
        서명하기
      </motion.button>

      {signature && (
        <div className={`${glass} p-4 w-full max-w-lg space-y-3`}>
          <div>
            <span className="text-white/60 text-xs">서명값: </span>
            <span className="font-mono text-xs text-blue-400">{signature}</span>
          </div>
          <div>
            <span className="text-white/60 text-xs">현재 메시지: </span>
            <span className={`font-mono text-xs ${tampered ? "text-red-400" : "text-white"}`}>
              {displayMsg}
            </span>
          </div>
          {verified !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`text-sm font-bold ${verified ? "text-green-400" : "text-red-400"}`}>
              {verified ? "검증 성공 -- 서명이 유효합니다" : "검증 실패 -- 메시지가 위조되었습니다"}
            </motion.div>
          )}
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={verify} className={`${glass} px-4 py-2 text-green-400 text-sm cursor-pointer`}>
              검증하기
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={tamper} disabled={tampered}
              className={`${glass} px-4 py-2 text-red-400 text-sm cursor-pointer disabled:opacity-40`}>
              위조 시도
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
