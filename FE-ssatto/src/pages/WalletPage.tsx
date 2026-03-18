import { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import ActivityList from "../components/wallet/ActivityList";
import WalletCreate from "../components/wallet/WalletCreate";
import WalletInfo from "../components/wallet/WalletInfo";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import { useWalletStore } from "../stores/useWalletStore";

interface WalletViewModel {
  nickname: string;
  address: string;
  color: WalletThemeId;
  jackBalance: number;
  potBalance: number;
  activities: ReturnType<typeof useWalletStore.getState>["activities"];
}

export default function WalletPage() {
  const {
    isConnected,
    nickname,
    address,
    walletColor,
    jackBalance,
    potBalance,
    activities,
    createWallet,
    restoreWallet,
  } = useWalletStore();

  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [extraWallets, setExtraWallets] = useState<WalletViewModel[]>([
    {
      nickname: "서브 지갑 (Mock)",
      address: "0x1A2B3C4D5E6F7A8B9C0D11112222333344445555",
      color: "blue",
      jackBalance: 2500,
      potBalance: 12,
      activities: [],
    },
    {
      nickname: "콜드 지갑 (Mock)",
      address: "0x9A0B1C2D3E4F5A6B7C8D11112222333344445555",
      color: "green",
      jackBalance: 8000,
      potBalance: 5,
      activities: [],
    },
  ]);

  const baseWallet: WalletViewModel = {
    nickname,
    address,
    color: walletColor,
    jackBalance,
    potBalance,
    activities,
  };

  const allWallets = [baseWallet, ...extraWallets];
  const currentWallet = allWallets[activeWalletIndex];

  const handleAddWallet = (
    walletNickname: string,
    type: "create" | "restore",
    payload?: { address?: string; privateKey?: string },
    color: WalletThemeId = "gray",
  ) => {
    const newWallet: WalletViewModel = {
      nickname: walletNickname,
      address:
        payload?.address ??
        `0x${Math.random().toString(16).slice(2).toUpperCase().padEnd(40, "0").slice(0, 40)}`,
      color,
      jackBalance: type === "restore" ? 220 : 0,
      potBalance: type === "restore" ? 3 : 0,
      activities:
        type === "restore"
          ? [
              {
                id: `act-${Math.random().toString(16).slice(2, 8)}`,
                type: "지갑 등록",
                description: "기존 지갑을 주소와 private key로 추가했습니다.",
                createdAt: "03.17 12:00",
              },
            ]
          : [],
    };

    setExtraWallets((prev) => [...prev, newWallet]);
  };

  return (
    <PageLayout>
      {!isConnected ? (
        <WalletCreate onCreate={createWallet} onRestore={restoreWallet} />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-6 lg:px-2">
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
