// [학습 프론트엔드 v2] 추가: 모듈 4.2 - TokenEconomy
import { useState } from "react";
import { motion } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

const tokens = [
  { name: "JACK", type: "유틸리티 토큰", supply: "1,000,000", use: "서비스 수수료, 스테이킹", color: "text-accent-gold" },
  { name: "POT", type: "거버넌스 토큰", supply: "100,000", use: "투표권, 보상 분배", color: "text-blue-400" },
];

const feeData = [
  { label: "채굴 보상", pct: 40, color: "bg-accent-gold" },
  { label: "운영 수수료", pct: 25, color: "bg-blue-400" },
  { label: "커뮤니티 풀", pct: 20, color: "bg-green-400" },
  { label: "소각", pct: 15, color: "bg-red-400" },
];

export default function TokenEconomy() {
  const [jackAmt, setJackAmt] = useState(100);
  const rate = 10;
  const potAmt = (jackAmt / rate).toFixed(1);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-bold text-white">토큰 이코노미</h2>
      <p className="text-white/60 text-sm">JACK과 POT 토큰의 구조와 교환을 이해합니다</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {tokens.map((t) => (
          <motion.div key={t.name} whileHover={{ scale: 1.02 }}
            className={`${glass} p-4`}>
            <p className={`${t.color} font-bold text-lg`}>{t.name}</p>
            <p className="text-white/60 text-xs mt-1">{t.type}</p>
            <p className="text-white/30 text-xs mt-2">총 공급량: {t.supply}</p>
            <p className="text-white/30 text-xs">용도: {t.use}</p>
          </motion.div>
        ))}
      </div>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <p className="text-white text-sm font-semibold mb-3">교환 시뮬레이터</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-white/60 text-xs">JACK</label>
            <input type="number" value={jackAmt}
              onChange={(e) => setJackAmt(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2 text-accent-gold font-mono text-sm outline-none" />
          </div>
          <span className="text-white/30 mt-4">{"-->"}</span>
          <div className="flex-1">
            <label className="text-white/60 text-xs">POT</label>
            <div className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2 text-blue-400 font-mono text-sm">
              {potAmt}
            </div>
          </div>
        </div>
        <p className="text-white/30 text-xs mt-2 text-center">교환 비율: 1 POT = {rate} JACK</p>
      </div>

      <div className={`${glass} p-4 w-full max-w-lg`}>
        <p className="text-white text-sm font-semibold mb-3">수수료 분배 구조</p>
        <div className="flex h-6 rounded-full overflow-hidden mb-3">
          {feeData.map((f) => (
            <motion.div key={f.label} className={`${f.color} h-full`}
              initial={{ width: 0 }} animate={{ width: `${f.pct}%` }}
              transition={{ duration: 0.8 }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {feeData.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${f.color}`} />
              <span className="text-white/60 text-xs">{f.label} ({f.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
