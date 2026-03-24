// [학습 프론트엔드 v2] 추가: 모듈 3.1 - UTXOFlow
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function UTXOFlow() {
  const [amount, setAmount] = useState(30);
  const [sent, setSent] = useState(false);
  const total = 100;
  const change = total - amount;

  const send = () => setSent(true);
  const reset = () => setSent(false);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">UTXO 흐름 시각화</h2>
      <p className="text-white/60 text-sm">{total} JACK를 보내면 송금액과 잔돈 UTXO로 분리됩니다</p>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <label className="text-white/60 text-xs mb-2 block">송금액: {amount} JACK</label>
        <input
          type="range" min={1} max={99} value={amount}
          onChange={(e) => { setAmount(Number(e.target.value)); setSent(false); }}
          className="w-full accent-amber-400"
        />
      </div>

      <div className="flex items-center gap-4 w-full max-w-lg">
        <motion.div className={`${glass} p-4 flex-1 text-center`}
          animate={{ borderColor: sent ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.5)" }}>
          <p className="text-white/60 text-xs">입력 UTXO</p>
          <p className="text-accent-gold text-lg font-bold">{total} JACK</p>
        </motion.div>

        <motion.div animate={{ opacity: sent ? 1 : 0.3 }} className="text-white/30 text-xl">
          {"-->"}
        </motion.div>

        <div className="flex flex-col gap-2 flex-1">
          <AnimatePresence>
            {sent && (
              <>
                <motion.div key="send"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`${glass} p-3 text-center border-green-400/30`}>
                  <p className="text-white/60 text-xs">송금 UTXO</p>
                  <p className="text-green-400 text-lg font-bold">{amount} JACK</p>
                  <p className="text-white/30 text-xs">수신자에게 전달</p>
                </motion.div>
                <motion.div key="change"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`${glass} p-3 text-center border-blue-400/30`}>
                  <p className="text-white/60 text-xs">잔돈 UTXO</p>
                  <p className="text-blue-400 text-lg font-bold">{change} JACK</p>
                  <p className="text-white/30 text-xs">본인에게 반환</p>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-3">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={send} disabled={sent}
          className={`${glass} px-6 py-3 text-accent-gold font-semibold cursor-pointer disabled:opacity-40`}>
          전송 실행
        </motion.button>
        {sent && (
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
