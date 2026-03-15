import PageLayout from "../components/layout/PageLayout";
import HexPicker from "../components/lotto/HexPicker";
import MyEntries from "../components/lotto/MyEntries";
import PrizeTable from "../components/lotto/PrizeTable";
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-gold/20 bg-accent-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-accent-gold uppercase drop-shadow-sm">
            로또
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold tracking-[0.05em] text-text-secondary shadow-sm">
            참여 비용 30 JACK
          </span>
          <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[11px] font-bold tracking-[0.05em] text-info shadow-sm">
            현재 내 조합 {entries.length}개
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold tracking-wide">
          <span className="rounded-md border border-border bg-surface px-3 py-1 text-text-secondary shadow-sm">
            JACK {jackBalance.toLocaleString("ko-KR")}
          </span>
          <span className="rounded-md border border-accent-gold/30 bg-accent-gold/10 px-3 py-1 text-accent-gold shadow-sm">
            POT {potBalance.toLocaleString("ko-KR")}
          </span>
        </div>
      </section>
      <HexPicker onCommit={commitLotto} disabled={!isConnected} />
      <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <PrizeTable />
        <MyEntries entries={entries} onClaim={claimReward} />
      </section>
    </PageLayout>
  );
}
