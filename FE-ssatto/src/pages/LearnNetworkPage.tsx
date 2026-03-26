// [학습 프론트엔드 v2] 추가: 최종 정리 — 네트워크 시각화 페이지

import PageLayout from "../components/layout/PageLayout";
import AdaptiveStepper from "../components/learning/AdaptiveStepper";
import NetworkDemo from "../components/learning/modules/NetworkDemo";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

export default function LearnNetworkPage() {
  return (
    <PageLayout>
      <AdaptiveStepper />
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-accent-gold/90 uppercase">
            최종 정리
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            블록체인 네트워크의 모든 것
          </h1>
          <p className="mt-2 text-sm text-white/60">
            네트워크 참여부터 블록 전파까지, 단계별로 직접 체험해보세요
          </p>
        </div>

        <div className={`${glass} p-6`}>
          <NetworkDemo />
        </div>
      </div>
    </PageLayout>
  );
}
