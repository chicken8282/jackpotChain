// [학습 프론트엔드 v2] 추가: 학습 랜딩 페이지

import PageLayout from "../components/layout/PageLayout";
import LearnHero from "../components/learning/LearnHero";
import AdaptiveStepper from "../components/learning/AdaptiveStepper";
import LearnRoadmap from "../components/learning/LearnRoadmap";

export default function LearnLandingPage() {
  return (
    <PageLayout>
      <LearnHero />
      <AdaptiveStepper />
      <LearnRoadmap />
    </PageLayout>
  );
}
