import PageLayout from "../components/layout/PageLayout";
import JackpotPool from "../components/dashboard/JackpotPool";
import HexPicker from "../components/lotto/HexPicker";
import { useWalletStore } from "../stores/useWalletStore";

export default function LottoPage() {
  const isConnected = useWalletStore((state) => state.isConnected);
  const entries = useWalletStore((state) => state.entries);
  const commitLotto = useWalletStore((state) => state.commitLotto);
  const claimReward = useWalletStore((state) => state.claimReward);
  const jackBalance = useWalletStore((state) => state.jackBalance);
  const potBalance = useWalletStore((state) => state.potBalance);

  return (
    <PageLayout>
      <JackpotPool />
      <HexPicker
        onCommit={commitLotto}
        disabled={!isConnected}
        entries={entries}
        onClaim={claimReward}
      />
    </PageLayout>
  );
}
