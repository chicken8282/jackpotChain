import PageLayout from "../components/layout/PageLayout";
import MinedBlocks from "../components/mining/MinedBlocks";
import MiningGuide from "../components/mining/MiningGuide";
import RewardPolicy from "../components/mining/RewardPolicy";
import { useWalletStore } from "../stores/useWalletStore";

export default function MiningPage() {
  const minedBlocks = useWalletStore((state) => state.minedBlocks);

  return (
    <PageLayout>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-gold/20 bg-accent-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-accent-gold uppercase drop-shadow-sm">
            채굴
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold tracking-[0.05em] text-text-secondary shadow-sm">
            최근 블록 {minedBlocks.length}개
          </span>
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-bold tracking-[0.05em] text-success shadow-sm">
            보상 50 JACK/블록
          </span>
        </div>
        <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[11px] font-bold tracking-[0.05em] text-info shadow-sm">
          네트워크 추적 중
        </span>
      </section>
      <MinedBlocks blocks={minedBlocks} />
      <MiningGuide />
      <RewardPolicy />
    </PageLayout>
  );
}
