// [학습 프론트엔드 v2] 추가: 모듈 1.1 - TransparentVault
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Record = { id: number; text: string };

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function TransparentVault() {
  const [records, setRecords] = useState<Record[]>([
    { id: 1, text: "TX #0001 : 10 JACK 전송" },
  ]);
  const [synced, setSynced] = useState([true, true, true, true]);
  const [counter, setCounter] = useState(2);
  const [newRecord, setNewRecord] = useState("");

  const addRecord = () => {
    if (!newRecord.trim()) return;
    const newRec = { id: counter, text: `TX #${String(counter).padStart(4, "0")} : ${newRecord.trim()}` };
    setCounter((c) => c + 1);
    setNewRecord("");
    setSynced([false, false, false, false]);
    setRecords((prev) => [...prev, newRec]);
    [300, 600, 900, 1200].forEach((ms, i) => {
      setTimeout(() => setSynced((s) => { const n = [...s]; n[i] = true; return n; }), ms);
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">분산 원장 -- 투명한 금고</h2>
      <p className="text-white/60 text-sm">모든 노드가 동일한 데이터를 보유합니다</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`${glass} p-4`}
            animate={{ borderColor: synced[i] ? "rgba(74,222,128,0.4)" : "rgba(251,191,36,0.4)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-semibold">노드 {i + 1}</span>
              <span className={synced[i] ? "text-green-400 text-xs" : "text-accent-gold text-xs"}>
                {synced[i] ? "동기화 완료" : "동기화 중..."}
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              <AnimatePresence>
                {records.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-white/60 text-xs font-mono"
                  >
                    {r.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex w-full max-w-xl gap-2">
        <input
          value={newRecord}
          onChange={(e) => setNewRecord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRecord()}
          placeholder="새로운 거래 기록을 입력하세요..."
          className="flex-1 rounded-2xl border border-white/[0.10] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-accent-gold/40 transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={addRecord}
          className={`${glass} shrink-0 px-6 py-3 text-accent-gold font-semibold cursor-pointer`}
        >
          기록 추가
        </motion.button>
      </div>
      <p className="text-white/30 text-xs">입력한 기록이 4개 노드에 동시에 공유됩니다</p>
    </div>
  );
}
