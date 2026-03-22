// [학습 프론트엔드 v2] 추가: 학습 수료증 발급 카드 컴포넌트
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

type Grade = "GOLD" | "SILVER" | "BRONZE";

const GRADE_CONFIG: Record<
  Grade,
  { label: string; borderClass: string; shadowClass: string; reward: number; textClass: string }
> = {
  GOLD: {
    label: "GOLD",
    borderClass: "border-accent-gold/50",
    shadowClass: "shadow-[0_0_40px_rgba(243,196,76,0.2)]",
    reward: 10,
    textClass: "text-accent-gold",
  },
  SILVER: {
    label: "SILVER",
    borderClass: "border-gray-400/50",
    shadowClass: "shadow-[0_0_40px_rgba(156,163,175,0.15)]",
    reward: 5,
    textClass: "text-gray-400",
  },
  BRONZE: {
    label: "BRONZE",
    borderClass: "border-orange-700/50",
    shadowClass: "shadow-[0_0_40px_rgba(194,65,12,0.15)]",
    reward: 2,
    textClass: "text-orange-700",
  },
};

// Mock data
const MOCK_GRADE: Grade = "GOLD";
const MOCK_ADDRESS = "0x7a3F...E9c2";
const MOCK_DATE = "2026-03-23";
const MOCK_SCORE = 87;

export default function Certificate() {
  const navigate = useNavigate();
  const config = GRADE_CONFIG[MOCK_GRADE];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`backdrop-blur-xl bg-white/[0.05] border ${config.borderClass} ${config.shadowClass} rounded-3xl p-8 max-w-md mx-auto text-center`}
    >
      {/* Grade badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${config.borderClass} bg-white/[0.03] mb-6`}
      >
        <span className={`text-2xl font-black ${config.textClass}`}>
          {config.label}
        </span>
      </motion.div>

      {/* Title */}
      <h2 className="text-white text-xl font-bold mb-1">
        블록체인 이해도 수료증
      </h2>
      <p className="text-white/30 text-sm mb-6">Blockchain Literacy Certificate</p>

      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-white/60 text-sm">주소</span>
          <span className="text-white text-sm font-mono">{MOCK_ADDRESS}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-white/60 text-sm">발급일</span>
          <span className="text-white text-sm">{MOCK_DATE}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-white/60 text-sm">종합 점수</span>
          <span className="text-white text-sm font-semibold">{MOCK_SCORE}점</span>
        </div>
      </div>

      {/* Welcome JACK reward */}
      <div className="mb-8 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <p className="text-white/60 text-xs mb-1">Welcome JACK 보상</p>
        <p className={`text-2xl font-black ${config.textClass}`}>
          {config.reward} JACK
        </p>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/lotto")}
        className="w-full py-4 rounded-2xl bg-accent-gold/20 border border-accent-gold/40 text-accent-gold font-semibold text-lg"
      >
        서비스 시작하기
      </motion.button>
    </motion.div>
  );
}
