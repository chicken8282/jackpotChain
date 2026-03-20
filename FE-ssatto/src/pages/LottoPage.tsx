import PageLayout from "../components/layout/PageLayout";
import JackpotPool from "../components/dashboard/JackpotPool";
import HexPicker from "../components/lotto/HexPicker";
import LottoTierRanking from "../components/lotto/LottoTierRanking";
import { useLottoEntries } from "../hooks/useLottoEntries";
import { useLottoOverview } from "../hooks/useLottoOverview";
import { getLottoEntryResult } from "../services/lottoService";
import { mapLottoResult, type LottoHistoryDetail } from "../services/readModelAdapters";
import { useWalletSessionStore } from "../stores/useWalletSessionStore";
import { useWalletStore } from "../stores/useWalletStore";

export default function LottoPage() {
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const accessSessions = useWalletSessionStore((state) => state.accessSessions);
  const activeWallet = wallets.find((wallet) => wallet.address === activeAddress);
  const activeAccessToken = activeWallet ? accessSessions[activeWallet.walletId]?.accessToken : undefined;
  const { overview } = useLottoOverview(activeAddress, activeAccessToken);
  const { entries } = useLottoEntries(activeAddress, activeAccessToken);

  const handleLoadResult = async (commitHash: string): Promise<LottoHistoryDetail> => {
    if (!activeAccessToken) {
      throw new Error("지갑 인증이 필요합니다.");
    }

    const entry = entries.find((item) => item.commitHash === commitHash);
    if (!entry) {
      throw new Error("참여 내역을 찾을 수 없습니다.");
    }

    const result = await getLottoEntryResult(commitHash, activeAccessToken);
    return mapLottoResult(entry, result);
  };

  return (
    <PageLayout>
      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <JackpotPool
          className="h-full"
          value={Math.floor((overview?.poolBalanceJack ?? 0) / 100_000_000)}
        />
        <LottoTierRanking entries={overview?.prizeTiers ?? []} />
      </section>
      <HexPicker
        disabled={!activeAddress}
        jackBalance={Math.floor((overview?.jackBalance ?? 0) / 100_000_000)}
        potBalance={Math.floor((overview?.potBalance ?? 0) / 100_000_000)}
        onExchangeJackToPot={() => {
          window.alert("서명 기반 교환 기능은 아직 준비 중입니다.");
        }}
        onCommit={() => {
          window.alert("서명 기반 로또 참여 기능은 아직 준비 중입니다.");
        }}
        entries={entries}
        onLoadResult={handleLoadResult}
      />
    </PageLayout>
  );
}
