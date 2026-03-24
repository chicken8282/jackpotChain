// [학습 프론트엔드 v2] 수정: 종합 리포트 — 수료증 → 네트워크 시각화로 교체

import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import PageLayout from "../components/layout/PageLayout";
import SkillRadarChart from "../components/learning/report/SkillRadarChart";
import NetworkDemo from "../components/learning/modules/NetworkDemo";
import GlassCard from "../components/learning/ui/GlassCard";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function LearnReportPage() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <GlassCard elevation={3} className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-accent-gold/80 uppercase">
          학습 완료
        </p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">
          블록체인 이해도 리포트
        </h1>
      </GlassCard>
      <SkillRadarChart />

      {/* 최종 정리: 네트워크 시각화 */}
      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold tracking-[0.24em] text-accent-gold/70 uppercase">
          최종 정리
        </h2>
        <div className={`${glass} p-6`}>
          <NetworkDemo />
        </div>
      </div>

      {/* 서비스 시작하기 */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/")}
        className="w-full max-w-md mx-auto block py-4 rounded-2xl bg-accent-gold/20 border border-accent-gold/40 text-accent-gold font-semibold text-lg cursor-pointer"
      >
        서비스 시작하기
      </motion.button>
    </PageLayout>
  );
}
