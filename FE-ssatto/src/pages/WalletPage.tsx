import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import ActivityList from "../components/wallet/ActivityList";
import WalletCreate from "../components/wallet/WalletCreate";
import WalletInfo from "../components/wallet/WalletInfo";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import { issueAuthToken } from "../services/authService";
import { getWallets, registerWallet, type WalletSummary } from "../services/walletService";
import { ApiError } from "../lib/api";
import { useWalletStore } from "../stores/useWalletStore";

interface WalletViewModel {
  nickname: string;
  address: string;
  color: WalletThemeId;
  jackBalance: number;
  potBalance: number;
  activities: [];
}

export default function WalletPage() {
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const createWallet = useWalletStore((state) => state.createWallet);
  const restoreWallet = useWalletStore((state) => state.restoreWallet);
  const setActiveAddress = useWalletStore((state) => state.setActiveAddress);
  const setToken = useWalletStore((state) => state.setToken);

  const [walletSummaries, setWalletSummaries] = useState<WalletSummary[]>([]);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);

  useEffect(() => {
    if (wallets.length === 0) {
      setWalletSummaries([]);
      return;
    }

    let cancelled = false;
    void getWallets(wallets.map((wallet) => wallet.address))
      .then((response) => {
        if (!cancelled) {
          setWalletSummaries(response.wallets);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletSummaries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wallets]);

  useEffect(() => {
    if (!activeAddress) {
      setActiveWalletIndex(0);
      return;
    }

    const nextIndex = wallets.findIndex((wallet) => wallet.address === activeAddress);
    if (nextIndex >= 0) {
      setActiveWalletIndex(nextIndex);
    }
  }, [activeAddress, wallets]);

  useEffect(() => {
    const currentWallet = wallets[activeWalletIndex];
    if (!currentWallet) {
      return;
    }

    setActiveAddress(currentWallet.address);
    void issueAuthToken({ address: currentWallet.address })
      .then((response) => setToken(response.token))
      .catch(() => setToken(null));
  }, [activeWalletIndex, setActiveAddress, setToken, wallets]);

  const allWallets = useMemo<WalletViewModel[]>(
    () =>
      wallets.map((wallet) => {
        const summary = walletSummaries.find((item) => item.address === wallet.address);
        return {
          nickname: summary?.nickname ?? wallet.nickname,
          address: wallet.address,
          color: wallet.walletColor,
          jackBalance: Math.floor((summary?.jackBalance ?? 0) / 100_000_000),
          potBalance: Math.floor((summary?.potBalance ?? 0) / 100_000_000),
          activities: [],
        };
      }),
    [walletSummaries, wallets],
  );

  const currentWallet = allWallets[activeWalletIndex];

  const persistWallet = async (
    walletNickname: string,
    type: "create" | "restore",
    payload?: { address?: string; privateKey?: string },
    color: WalletThemeId = "gray",
  ) => {
    const address = payload?.address;
    if (!address) {
      return;
    }

    if (type === "create") {
      createWallet(walletNickname, color, payload);
    } else if (payload.privateKey) {
      restoreWallet(payload.privateKey, address, walletNickname, color);
    }

    try {
      await registerWallet({
        address,
        nickname: walletNickname,
        walletColor: color.toUpperCase(),
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) {
        throw error;
      }
    }

    const tokenResponse = await issueAuthToken({ address });
    setToken(tokenResponse.token);
  };

  const handleCreateWallet = (
    walletNickname?: string,
    color?: WalletThemeId,
    payload?: { address?: string; privateKey?: string },
  ) => {
    void persistWallet(walletNickname ?? "내 지갑", "create", payload, color ?? "gray");
  };

  const handleRestoreWallet = (
    privateKey: string,
    address: string,
    walletNickname?: string,
    color?: WalletThemeId,
  ) => {
    void persistWallet(
      walletNickname ?? "기존 지갑",
      "restore",
      { address, privateKey },
      color ?? "gray",
    );
  };

  const handleAddWallet = (
    walletNickname: string,
    type: "create" | "restore",
    payload?: { address?: string; privateKey?: string },
    color: WalletThemeId = "gray",
  ) => {
    void persistWallet(walletNickname, type, payload, color);
  };

  return (
    <PageLayout>
      {wallets.length === 0 ? (
        <WalletCreate onCreate={handleCreateWallet} onRestore={handleRestoreWallet} />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-6 lg:px-2">
          <WalletInfo
            wallets={allWallets}
            activeIndex={activeWalletIndex}
            onChangeIndex={setActiveWalletIndex}
            onAddWallet={handleAddWallet}
            onExchangeJackToPot={() => {
              window.alert("서명 기반 교환 기능은 아직 준비 중입니다.");
            }}
          />
          <div className="mt-6">
            <ActivityList activities={currentWallet?.activities ?? []} />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
