// [학습 프론트엔드 v2] 추가: 모듈 학습 페이지 (Concept → Interaction → Verify)

import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import AdaptiveStepper from "../components/learning/AdaptiveStepper";
import ModuleCanvas from "../components/learning/ModuleCanvas";

export default function LearnModulePage() {
  const { stage, module: moduleId } = useParams<{ stage: string; module: string }>();
  const navigate = useNavigate();

  if (!stage || !moduleId) { navigate("/learn"); return null; }

  return (
    <PageLayout>
      <AdaptiveStepper />
      <ModuleCanvas stageNumber={Number(stage)} moduleId={moduleId} />
    </PageLayout>
  );
}
