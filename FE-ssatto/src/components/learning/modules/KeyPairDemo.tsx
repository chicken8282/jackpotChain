// [학습 프론트엔드 v2] 추가: 모듈 2.1 - KeyPairDemo
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export default function KeyPairDemo() {
  const [step, setStep] = useState(0);
  const [privKey, setPrivKey] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [address, setAddress] = useState("");

  const generate = () => {
    setStep(0);
    const priv = randomHex(64);
    setPrivKey(priv);
    setTimeout(() => {
      setStep(1);
      const pub = "04" + bytesToHex(sha256(new TextEncoder().encode(priv))).slice(0, 62);
      setPubKey(pub);
      setTimeout(() => {
        setStep(2);
        const addr = "0x" + bytesToHex(sha256(new TextEncoder().encode(pub))).slice(0, 40);
        setAddress(addr);
        setTimeout(() => setStep(3), 400);
      }, 800);
    }, 800);
  };

  const steps = [
    { label: "개인키 (Private Key)", value: privKey, color: "text-red-400", active: step >= 1 },
    { label: "공개키 (Public Key)", value: pubKey, color: "text-blue-400", active: step >= 2 },
    { label: "지갑 주소 (Address)", value: address, color: "text-green-400", active: step >= 3 },
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">키 쌍 생성 과정</h2>
      <p className="text-white/60 text-sm">개인키로부터 공개키와 지갑 주소가 단방향으로 파생됩니다</p>

      <div className="w-full max-w-lg space-y-3">
        <AnimatePresence>
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className={`${glass} p-4`}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: s.active ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-1">
                {i > 0 && (
                  <motion.span
                    className="text-accent-gold text-xs"
                    animate={{ opacity: s.active ? 1 : 0 }}
                  >
                    {"-->"}
                  </motion.span>
                )}
                <span className={`${s.color} text-xs font-semibold`}>{s.label}</span>
              </div>
              <p className="font-mono text-xs text-white/60 break-all min-h-[1.25rem]">
                {s.active ? s.value : "---"}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={generate}
        className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer`}
      >
        키 쌍 생성
      </motion.button>

      {step >= 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/30 text-xs text-center max-w-md"
        >
          개인키 --{">"} 공개키 --{">"} 주소: 역방향 추적이 불가능한 단방향 함수입니다
        </motion.p>
      )}
    </div>
  );
}
