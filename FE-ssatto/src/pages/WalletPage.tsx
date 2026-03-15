import PageLayout from "../components/layout/PageLayout";
import ActivityList from "../components/wallet/ActivityList";
import Exchange from "../components/wallet/Exchange";
import WalletCreate from "../components/wallet/WalletCreate";
import WalletInfo from "../components/wallet/WalletInfo";
import { useWalletStore } from "../stores/useWalletStore";

export default function WalletPage() {
  const {
    isConnected,
    nickname,
    address,
    jackBalance,
    potBalance,
    activities,
    createWallet,
    exchangeJackToPot,
  } = useWalletStore();

  return (
    <PageLayout>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-accent-gold uppercase">
            지갑
          </span>
          <span className="rounded-full border border-white/8 px-3 py-1 text-sm text-text-secondary">
            디지털 패스 모드
          </span>
          <span className="rounded-full border border-info/20 bg-info/8 px-3 py-1 text-sm text-info">
            활동 {activities.length}건
          </span>
        </div>
        {isConnected ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-white/8 px-3 py-1 text-text-secondary">
              JACK {jackBalance.toLocaleString("ko-KR")}
            </span>
            <span className="rounded-full border border-accent-gold/20 bg-accent-gold/8 px-3 py-1 text-accent-gold">
              POT {potBalance.toLocaleString("ko-KR")}
            </span>
          </div>
        ) : null}
      </section>
      {!isConnected ? (
        <WalletCreate onCreate={createWallet} />
      ) : (
        <>
          <WalletInfo
            nickname={nickname}
            address={address}
            jackBalance={jackBalance}
            potBalance={potBalance}
          />
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Exchange jackBalance={jackBalance} onExchange={exchangeJackToPot} />
            <ActivityList activities={activities} />
          </section>
        </>
      )}
    </PageLayout>
  );
}
