import PageLayout from "../components/layout/PageLayout";
import MinedBlocks from "../components/mining/MinedBlocks";
import MiningGuide from "../components/mining/MiningGuide";
import RewardPolicy from "../components/mining/RewardPolicy";
import { useWalletStore } from "../stores/useWalletStore";

export default function MiningPage() {
  const minedBlocks = useWalletStore((state) => state.minedBlocks);

  return (
    <PageLayout>
      <MinedBlocks blocks={minedBlocks} />
      <MiningGuide />
      <RewardPolicy />
    </PageLayout>
  );
}
