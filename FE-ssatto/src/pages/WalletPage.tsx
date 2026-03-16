import { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import ActivityList from "../components/wallet/ActivityList";
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
    restoreWallet,
  } = useWalletStore();

  const [activeWalletIndex, setActiveWalletIndex] = useState(0);

  const baseWallet = { nickname, address, jackBalance, potBalance, activities };

  const [extraWallets, setExtraWallets] = useState([
    {
      nickname: "서브 지갑 (Mock)",
      address: "0x1A2B3C4D5E6F7G8H9I0J",
      jackBalance: 2500,
      potBalance: 12,
      activities: [],
    },
    {
      nickname: "저축용 (Mock)",
      address: "0x9I0J1A2B3C4D5E6F7G8H",
      jackBalance: 8000,
      potBalance: 5,
      activities: [],
    },
  ]);

  const allWallets = [baseWallet, ...extraWallets];
  const currentWallet = allWallets[activeWalletIndex];

  const handleAddWallet = (walletNickname: string) => {
    const newWallet = {
      nickname: walletNickname,
      address: `0x${Math.random().toString(16).slice(2, 18).toUpperCase()}`,
      jackBalance: 0,
      potBalance: 0,
      activities: [],
    };
    setExtraWallets((prev) => [...prev, newWallet]);
  };

  return (
    <PageLayout>
      {!isConnected ? (
        <WalletCreate onCreate={createWallet} onRestore={restoreWallet} />
      ) : (
        <div className="mx-auto w-full max-w-4xl px-6 lg:px-2">
          <WalletInfo
            wallets={allWallets}
            activeIndex={activeWalletIndex}
            onChangeIndex={setActiveWalletIndex}
            onAddWallet={handleAddWallet}
          />
          <div className="mt-6">
            <ActivityList activities={currentWallet.activities} />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
