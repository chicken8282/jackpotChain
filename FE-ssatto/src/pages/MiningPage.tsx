import PageLayout from "../components/layout/PageLayout";
import MinedBlocks from "../components/mining/MinedBlocks";
import MiningGuide from "../components/mining/MiningGuide";
import RewardPolicy from "../components/mining/RewardPolicy";

export default function MiningPage() {
  return (
    <PageLayout>
      <MinedBlocks blocks={[]} />
      <MiningGuide />
      <RewardPolicy />
    </PageLayout>
  );
}
