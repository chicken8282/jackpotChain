import PageLayout from "../components/layout/PageLayout";
import MinedBlocks from "../components/mining/MinedBlocks";
import MiningGuide from "../components/mining/MiningGuide";
import RewardPolicy from "../components/mining/RewardPolicy";
import { useMiningBlocks } from "../hooks/useMiningBlocks";
import { useWalletSessionStore } from "../stores/useWalletSessionStore";
import { useWalletStore } from "../stores/useWalletStore";

export default function MiningPage() {
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const accessSessions = useWalletSessionStore((state) => state.accessSessions);
  const activeWallet = wallets.find((wallet) => wallet.address === activeAddress);
  const activeAccessToken = activeWallet ? accessSessions[activeWallet.walletId]?.accessToken : undefined;
  const {
    blocks,
    totalRewardJack,
    appendedBlockCount,
    latestBlockHeight,
    autoAppendCount,
    maxAutoAppendPages,
    isAutoAppendBlocked,
    hasNext,
    isLoadingMore,
    error,
    loadMore,
  } = useMiningBlocks(activeAddress, activeAccessToken);

  return (
    <PageLayout>
      <MinedBlocks
        blocks={blocks}
        totalRewardJack={totalRewardJack}
        appendedBlockCount={appendedBlockCount}
        latestBlockHeight={latestBlockHeight}
        autoAppendCount={autoAppendCount}
        maxAutoAppendPages={maxAutoAppendPages}
        isAutoAppendBlocked={isAutoAppendBlocked}
        hasNext={hasNext}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={(mode) => {
          void loadMore(mode);
        }}
      />
      <MiningGuide />
      <RewardPolicy />
    </PageLayout>
  );
}
