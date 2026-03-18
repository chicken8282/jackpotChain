import PageLayout from "../components/layout/PageLayout";
import JackpotPool from "../components/dashboard/JackpotPool";
import HexPicker from "../components/lotto/HexPicker";
import LottoTierRanking from "../components/lotto/LottoTierRanking";
import { useWalletStore } from "../stores/useWalletStore";

export default function LottoPage() {
  const isConnected = useWalletStore((state) => state.isConnected);
  const entries = useWalletStore((state) => state.entries);
  const commitLotto = useWalletStore((state) => state.commitLotto);
  const claimReward = useWalletStore((state) => state.claimReward);

  return (
    <PageLayout>
      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <JackpotPool className="h-full" />
        <LottoTierRanking />
      </section>
      <HexPicker
        onCommit={commitLotto}
        disabled={!isConnected}
        entries={entries}
        onClaim={claimReward}
      />
    </PageLayout>
  );
}
