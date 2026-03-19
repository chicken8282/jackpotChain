import { useEffect, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import JackpotPool from "../components/dashboard/JackpotPool";
import HexPicker from "../components/lotto/HexPicker";
import LottoTierRanking from "../components/lotto/LottoTierRanking";
import { getLottoOverview, type LottoOverview } from "../services/lottoService";
import { useWalletStore } from "../stores/useWalletStore";

export default function LottoPage() {
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const [overview, setOverview] = useState<LottoOverview | null>(null);

  useEffect(() => {
    if (!activeAddress) {
      setOverview(null);
      return;
    }

    let cancelled = false;
    void getLottoOverview(activeAddress)
      .then((response) => {
        if (!cancelled) {
          setOverview(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeAddress]);

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
        entries={[]}
      />
    </PageLayout>
  );
}
