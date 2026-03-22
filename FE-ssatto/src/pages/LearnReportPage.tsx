// [학습 프론트엔드 v2] 추가: 종합 리포트 & 수료증 페이지

import PageLayout from "../components/layout/PageLayout";
import SkillRadarChart from "../components/learning/report/SkillRadarChart";
import Certificate from "../components/learning/report/Certificate";
import GlassCard from "../components/learning/ui/GlassCard";

export default function LearnReportPage() {
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
      <Certificate />
    </PageLayout>
  );
}
