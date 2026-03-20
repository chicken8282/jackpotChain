import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import { ApiError } from "../lib/api";
import {
  backupLegacyWalletPayload,
  clearLegacyWalletPayloads,
  extractLegacyWallets,
  restoreLegacyWalletPayloadFromBackup,
  type LegacyWalletRecord,
} from "../services/legacyWalletMigrationService";
import { migrateLegacyWallets, secureWallet, unlockWalletPrivateKey } from "../services/walletSecurityService";
import { restoreWalletSession } from "../services/walletSessionService";
import { registerWallet } from "../services/walletService";
import { useWalletActivities } from "../hooks/useWalletActivities";
import { useWalletSummaries } from "../hooks/useWalletSummaries";
import { useWalletSessionStore, WALLET_IDLE_LOCK_MS } from "../stores/useWalletSessionStore";
import { useWalletStore } from "../stores/useWalletStore";

const ActivityList = lazy(() => import("../components/wallet/ActivityList"));
const WalletCreate = lazy(() => import("../components/wallet/WalletCreate"));
const WalletInfo = lazy(() => import("../components/wallet/WalletInfo"));
const WalletMigrationModal = lazy(() => import("../components/wallet/WalletMigrationModal"));
const WalletUnlockModal = lazy(() => import("../components/wallet/WalletUnlockModal"));

interface WalletViewModel {
  walletId: string;
  keystoreId: string;
  nickname: string;
  address: string;
  color: WalletThemeId;
  jackBalance: number;
  potBalance: number;
}

interface WalletPersistPayload {
  address?: string;
  privateKey?: string;
  password?: string;
}

function WalletSectionFallback({ label }: { label: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-sm font-bold text-text-secondary">
      {label}
    </div>
  );
}

export default function WalletPage() {
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const upsertWallet = useWalletStore((state) => state.upsertWallet);
  const replaceWallets = useWalletStore((state) => state.replaceWallets);
  const setActiveAddress = useWalletStore((state) => state.setActiveAddress);

  const accessSessions = useWalletSessionStore((state) => state.accessSessions);
  const unlockedWallets = useWalletSessionStore((state) => state.unlockedWallets);
  const setAccessSession = useWalletSessionStore((state) => state.setAccessSession);
  const clearAccessSession = useWalletSessionStore((state) => state.clearAccessSession);
  const unlockWallet = useWalletSessionStore((state) => state.unlockWallet);
  const lockWallet = useWalletSessionStore((state) => state.lockWallet);
  const touchSession = useWalletSessionStore((state) => state.touchSession);
  const lockExpiredWallets = useWalletSessionStore((state) => state.lockExpiredWallets);

  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [legacyWallets, setLegacyWallets] = useState<LegacyWalletRecord[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    restoreLegacyWalletPayloadFromBackup(window.localStorage);
    setLegacyWallets(extractLegacyWallets(window.localStorage));
  }, []);

  const { walletSummaries } = useWalletSummaries(wallets);

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
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "mousemove", "touchstart"];
    const handleActivity = () => touchSession();

    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity));
    const intervalId = window.setInterval(() => {
      const didLock = lockExpiredWallets(WALLET_IDLE_LOCK_MS);
      if (didLock) {
        setAuthError("장시간 사용이 없어 지갑 잠금이 해제되었습니다.");
      }
    }, 30000);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.clearInterval(intervalId);
    };
  }, [lockExpiredWallets, touchSession]);

  const activeWallet = wallets[activeWalletIndex];
  const activeUnlockedPrivateKey = activeWallet ? unlockedWallets[activeWallet.walletId]?.privateKey : undefined;
  const activeAccessSession = activeWallet ? accessSessions[activeWallet.walletId] : undefined;
  const { activities: currentActivities } = useWalletActivities(
    activeWallet?.address,
    activeAccessSession?.accessToken,
  );

  useEffect(() => {
    if (!activeWallet) {
      return;
    }

    setActiveAddress(activeWallet.address);
    setIsAuthenticating(true);
    setAuthError(null);
    void restoreWalletSession({
      wallet: activeWallet,
      currentAccessToken: activeAccessSession?.accessToken ?? null,
      currentAccessTokenExpiresAt: activeAccessSession?.accessTokenExpiresAt ?? null,
      unlockedPrivateKey: activeUnlockedPrivateKey,
    })
      .then((response) => {
        if (!response) {
          clearAccessSession(activeWallet.walletId);
          return;
        }

        setAccessSession(activeWallet.walletId, response.accessToken, response.accessTokenExpiresAt);
        upsertWallet({
          ...activeWallet,
          refreshSessionHandle: response.refreshSessionHandle || activeWallet.refreshSessionHandle,
        });
      })
      .catch((error) => {
        clearAccessSession(activeWallet.walletId);
        setAuthError(error instanceof Error ? error.message : "지갑 인증에 실패했습니다.");
      })
      .finally(() => setIsAuthenticating(false));
  }, [
    activeAccessSession?.accessToken,
    activeAccessSession?.accessTokenExpiresAt,
    activeUnlockedPrivateKey,
    activeWallet,
    clearAccessSession,
    setAccessSession,
    setActiveAddress,
    upsertWallet,
  ]);

  const allWallets = useMemo<WalletViewModel[]>(
    () =>
      wallets.map((wallet) => {
        const summary = walletSummaries.find((item) => item.address === wallet.address);
        return {
          walletId: wallet.walletId,
          keystoreId: wallet.keystoreId,
          nickname: summary?.nickname ?? wallet.nickname,
          address: wallet.address,
          color: wallet.walletColor,
          jackBalance: Math.floor((summary?.jackBalance ?? 0) / 100_000_000),
          potBalance: Math.floor((summary?.potBalance ?? 0) / 100_000_000),
        };
      }),
    [walletSummaries, wallets],
  );

  const isCurrentWalletLocked = activeWallet ? !unlockedWallets[activeWallet.walletId] : false;

  const persistWallet = async (
    walletNickname: string,
    type: "create" | "restore",
    payload?: WalletPersistPayload,
    color: WalletThemeId = "gray",
  ) => {
    const address = payload?.address;
    const privateKey = payload?.privateKey;
    const password = payload?.password;
    if (!address || !privateKey || !password) {
      return;
    }

    const existingWallet = wallets.find((wallet) => wallet.address === address);
    const securedWallet = await secureWallet({
      walletId: existingWallet?.walletId,
      keystoreId: existingWallet?.keystoreId,
      nickname: walletNickname,
      walletColor: color,
      privateKey,
      address,
      password,
    });

    upsertWallet({
      ...securedWallet.metadata,
      refreshSessionHandle: existingWallet?.refreshSessionHandle ?? null,
    });
    unlockWallet(securedWallet.metadata.walletId, securedWallet.privateKey);

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

    if (type === "restore") {
      setAuthError(null);
    }
  };

  const handleCreateWallet = (
    walletNickname?: string,
    color?: WalletThemeId,
    payload?: WalletPersistPayload,
  ) => {
    void persistWallet(walletNickname ?? "내 지갑", "create", payload, color ?? "gray");
  };

  const handleRestoreWallet = (
    walletNickname?: string,
    color?: WalletThemeId,
    payload?: WalletPersistPayload,
  ) => {
    void persistWallet(walletNickname ?? "기존 지갑", "restore", payload, color ?? "gray");
  };

  const handleAddWallet = (
    walletNickname: string,
    type: "create" | "restore",
    payload?: WalletPersistPayload,
    color: WalletThemeId = "gray",
  ) => {
    void persistWallet(walletNickname, type, payload, color);
  };

  const handleUnlockWallet = async (password: string) => {
    if (!activeWallet) {
      return;
    }

    const privateKey = await unlockWalletPrivateKey(activeWallet, password);
    unlockWallet(activeWallet.walletId, privateKey);
    setAuthError(null);
  };

  const handleMigrateLegacyWallets = async (password: string) => {
    if (typeof window === "undefined") {
      return;
    }

    backupLegacyWalletPayload(window.localStorage);
    const migratedWallets = await migrateLegacyWallets(legacyWallets, password, wallets);
    const mergedWallets = [...wallets];

    migratedWallets.forEach((wallet) => {
      const index = mergedWallets.findIndex((item) => item.address === wallet.metadata.address);
      if (index >= 0) {
        mergedWallets[index] = {
          ...wallet.metadata,
          refreshSessionHandle: mergedWallets[index]?.refreshSessionHandle ?? null,
        };
      } else {
        mergedWallets.push(wallet.metadata);
      }
      unlockWallet(wallet.metadata.walletId, wallet.privateKey);
    });

    replaceWallets(mergedWallets);
    clearLegacyWalletPayloads(window.localStorage);
    setLegacyWallets([]);
    setAuthError(null);
  };

  return (
    <PageLayout>
      {legacyWallets.length > 0 ? (
        <Suspense fallback={null}>
          <WalletMigrationModal
            isOpen={legacyWallets.length > 0}
            walletCount={legacyWallets.length}
            onMigrate={handleMigrateLegacyWallets}
          />
        </Suspense>
      ) : null}
      {showUnlockModal && activeWallet ? (
        <Suspense fallback={null}>
          <WalletUnlockModal
            isOpen={showUnlockModal && !!activeWallet}
            walletName={activeWallet?.nickname ?? "지갑"}
            walletAddress={activeWallet?.address ?? ""}
            onClose={() => setShowUnlockModal(false)}
            onUnlock={handleUnlockWallet}
          />
        </Suspense>
      ) : null}

      {wallets.length === 0 && legacyWallets.length === 0 ? (
        <Suspense fallback={<WalletSectionFallback label="지갑 생성 화면을 불러오는 중입니다." />}>
          <WalletCreate onCreate={handleCreateWallet} onRestore={handleRestoreWallet} />
        </Suspense>
      ) : wallets.length === 0 ? (
        <div className="mx-auto flex min-h-[320px] w-full max-w-3xl items-center justify-center px-6 text-center">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-10 text-text-secondary">
            기존 지갑을 암호화 keystore로 업그레이드하는 중입니다. 비밀번호를 입력하면 지갑 메타데이터와
            잠금 해제 흐름이 새 구조로 전환됩니다.
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-5xl px-6 lg:px-2">
          {legacyWallets.length === 0 ? (
            <div className="mb-4 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-secondary">
              {isCurrentWalletLocked ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>현재 지갑은 잠금 상태입니다. 서명 전 비밀번호로 잠금 해제가 필요합니다.</span>
                  <button
                    type="button"
                    onClick={() => setShowUnlockModal(true)}
                    className="rounded-[14px] border border-accent-gold/40 bg-accent-gold/10 px-4 py-2 font-bold text-accent-gold transition-colors hover:bg-accent-gold/20"
                  >
                    잠금 해제
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>현재 지갑은 메모리에서 잠금 해제된 상태입니다. 5분 동안 활동이 없으면 자동으로 잠깁니다.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeWallet) {
                        lockWallet(activeWallet.walletId);
                      }
                    }}
                    className="rounded-[14px] border border-white/15 bg-white/5 px-4 py-2 font-bold text-white transition-colors hover:bg-white/10"
                  >
                    지금 잠그기
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {isAuthenticating ? (
            <div className="mb-4 rounded-[18px] border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
              지갑 소유권을 확인하는 중입니다.
            </div>
          ) : null}
          {authError ? (
            <div className="mb-4 rounded-[18px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {authError}
            </div>
          ) : null}
          {activeAccessSession?.accessToken ? (
            <div className="mb-4 rounded-[18px] border border-accent-gold/20 bg-accent-gold/10 px-4 py-3 text-sm text-accent-gold">
              현재 활성 지갑이 인증된 상태입니다.
            </div>
          ) : null}
          <Suspense fallback={<WalletSectionFallback label="지갑 정보를 불러오는 중입니다." />}>
            <WalletInfo
              wallets={allWallets}
              activeIndex={activeWalletIndex}
              onChangeIndex={setActiveWalletIndex}
              onAddWallet={handleAddWallet}
              onExchangeJackToPot={() => {
                window.alert("서명 기반 교환 기능은 아직 준비 중입니다.");
              }}
            />
          </Suspense>
          <div className="mt-6">
            <Suspense fallback={<WalletSectionFallback label="활동 기록을 불러오는 중입니다." />}>
              <ActivityList activities={currentActivities} />
            </Suspense>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
