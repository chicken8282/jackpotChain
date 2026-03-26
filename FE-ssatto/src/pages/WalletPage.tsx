import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import {
  backupLegacyWalletPayload,
  clearLegacyWalletPayloads,
  extractLegacyWallets,
  restoreLegacyWalletPayloadFromBackup,
  type LegacyWalletRecord,
} from "../services/legacyWalletMigrationService";
import {
  migrateLegacyWallets,
  unlockWalletPrivateKey,
} from "../services/walletSecurityService";
import { restoreWalletSession } from "../services/walletSessionService";
import {
  toWalletAuthErrorMessage,
  toWalletWriteErrorMessage,
} from "../services/walletErrorMapper";
import { registerWalletWithRollback } from "../services/walletRegistrationFlowService";
import { submitExchangeWrite } from "../services/writeFlowService";
import { useWalletActivities } from "../hooks/useWalletActivities";
import { useWalletSummaries } from "../hooks/useWalletSummaries";
import {
  useWalletSessionStore,
  WALLET_IDLE_LOCK_MS,
} from "../stores/useWalletSessionStore";
import { useWalletStore } from "../stores/useWalletStore";

const ActivityList = lazy(() => import("../components/wallet/ActivityList"));
const WalletCreate = lazy(() => import("../components/wallet/WalletCreate"));
const WalletInfo = lazy(() => import("../components/wallet/WalletInfo"));
const WalletMigrationModal = lazy(
  () => import("../components/wallet/WalletMigrationModal")
);
const WalletUnlockModal = lazy(
  () => import("../components/wallet/WalletUnlockModal")
);

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
  const location = useLocation();
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const upsertWallet = useWalletStore((state) => state.upsertWallet);
  const replaceWallets = useWalletStore((state) => state.replaceWallets);
  const setActiveAddress = useWalletStore((state) => state.setActiveAddress);
  const potOptimisticOffsetByAddress = useWalletStore((state) => state.potOptimisticOffsetByAddress);
  const clearPotOptimisticOffset = useWalletStore((state) => state.clearPotOptimisticOffset);

  const accessSessions = useWalletSessionStore((state) => state.accessSessions);
  const unlockedWallets = useWalletSessionStore(
    (state) => state.unlockedWallets
  );
  const setAccessSession = useWalletSessionStore(
    (state) => state.setAccessSession
  );
  const clearAccessSession = useWalletSessionStore(
    (state) => state.clearAccessSession
  );
  const unlockWallet = useWalletSessionStore((state) => state.unlockWallet);
  const lockWallet = useWalletSessionStore((state) => state.lockWallet);
  const touchSession = useWalletSessionStore((state) => state.touchSession);
  const lockExpiredWallets = useWalletSessionStore(
    (state) => state.lockExpiredWallets
  );

  // Initialize to the index of activeAddress to avoid a two-render cycle
  const [activeWalletIndex, setActiveWalletIndex] = useState(() => {
    if (!activeAddress) return 0;
    const idx = wallets.findIndex((w) => w.address === activeAddress);
    return idx >= 0 ? idx : 0;
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockModalSessionExpired, setUnlockModalSessionExpired] = useState(false);
  const [legacyWallets, setLegacyWallets] = useState<LegacyWalletRecord[]>([]);
  const [writeStatus, setWriteStatus] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [potRewardPending, setPotRewardPending] = useState(false);
  const writeStatusTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (writeStatusTimerRef.current !== null) {
        window.clearTimeout(writeStatusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    restoreLegacyWalletPayloadFromBackup(window.localStorage);
    setLegacyWallets(extractLegacyWallets(window.localStorage));
  }, []);

  // Disable individual auto-polling; combined interval below syncs both together
  const { walletSummaries, refetch: refetchWalletSummaries } = useWalletSummaries(wallets, 999_999_999);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (wallets.length === 0) return;
    // Trigger an immediate refetch when wallets are added (mirrors useWalletSummaries internal behavior)
    void refetchWalletSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.map((w) => w.address).join(",")]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const locationState = location.state as { showUnlockModal?: boolean } | null;
    if (locationState?.showUnlockModal) {
      setUnlockModalSessionExpired(false);
      setShowUnlockModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "touchstart",
    ];
    const handleActivity = () => touchSession();

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity)
    );
    const intervalId = window.setInterval(() => {
      const didLock = lockExpiredWallets(WALLET_IDLE_LOCK_MS);
      if (didLock) {
        setUnlockModalSessionExpired(false);
        setShowUnlockModal(true);
      }
    }, 30000);

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity)
      );
      window.clearInterval(intervalId);
    };
  }, [lockExpiredWallets, touchSession]);

  const activeWallet = wallets[activeWalletIndex];
  const activeUnlockedPrivateKey = activeWallet
    ? unlockedWallets[activeWallet.walletId]?.privateKey
    : undefined;
  const activeAccessSession = activeWallet
    ? accessSessions[activeWallet.walletId]
    : undefined;

  // Disable individual auto-polling for activities too; combined interval handles both
  const { activities: currentActivities, refetch: refetchActivities } = useWalletActivities(
    activeWallet?.address,
    activeAccessSession?.accessToken,
    999_999_999
  );

  // Refs for stable access in combined interval callback
  const refetchWalletSummariesRef = useRef(refetchWalletSummaries);
  refetchWalletSummariesRef.current = refetchWalletSummaries;
  const refetchActivitiesRef = useRef(refetchActivities);
  refetchActivitiesRef.current = refetchActivities;

  // Synchronized polling: wallet summaries + activities update on the same interval tick
  useEffect(() => {
    if (wallets.length === 0) return;
    const doRefetch = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void refetchWalletSummariesRef.current();
      void refetchActivitiesRef.current();
    };
    const id = window.setInterval(doRefetch, 10_000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length === 0]);

  // When active address changes, immediately refetch activities for the new wallet
  const prevActiveAddressRef = useRef(activeWallet?.address);
  useEffect(() => {
    if (activeWallet?.address !== prevActiveAddressRef.current) {
      prevActiveAddressRef.current = activeWallet?.address;
      if (activeWallet?.address) {
        void refetchActivitiesRef.current();
      }
    }
  }, [activeWallet?.address]);

  useEffect(() => {
    if (!activeAddress) {
      setActiveWalletIndex(0);
      return;
    }

    const nextIndex = wallets.findIndex(
      (wallet) => wallet.address === activeAddress
    );
    if (nextIndex >= 0) {
      setActiveWalletIndex(nextIndex);
    }
  }, [activeAddress, wallets]);

  // refs so the effect can read the latest values without being a reactive dep
  const activeWalletRef = useRef(activeWallet);
  activeWalletRef.current = activeWallet;
  const activeAccessSessionRef = useRef(activeAccessSession);
  activeAccessSessionRef.current = activeAccessSession;

  useEffect(() => {
    let cancelled = false;
    const wallet = activeWalletRef.current;
    if (!wallet) {
      return;
    }

    const currentToken = activeAccessSessionRef.current?.accessToken ?? null;
    const currentExpiry =
      activeAccessSessionRef.current?.accessTokenExpiresAt ?? null;

    setActiveAddress(wallet.address);
    setIsAuthenticating(true);
    setAuthError(null);
    void restoreWalletSession({
      wallet,
      currentAccessToken: currentToken,
      currentAccessTokenExpiresAt: currentExpiry,
      unlockedPrivateKey: activeUnlockedPrivateKey,
    })
      .then((response) => {
        if (cancelled) return;
        if (!response) {
          clearAccessSession(wallet.walletId);
          setUnlockModalSessionExpired(true);
          setShowUnlockModal(true);
          return;
        }

        setAccessSession(
          wallet.walletId,
          response.accessToken,
          response.accessTokenExpiresAt
        );
        const nextRefreshSessionHandle =
          response.refreshSessionHandle || wallet.refreshSessionHandle;
        if (nextRefreshSessionHandle !== wallet.refreshSessionHandle) {
          upsertWallet({
            ...wallet,
            refreshSessionHandle: nextRefreshSessionHandle,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        clearAccessSession(wallet.walletId);
        setAuthError(toWalletAuthErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsAuthenticating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeWallet?.walletId,
    activeUnlockedPrivateKey,
    clearAccessSession,
    setAccessSession,
    setActiveAddress,
    upsertWallet,
  ]);

  // walletSummaries potBalance 변경 감지 → optimistic offset 초기화
  const prevWalletPotRef = useRef<Record<string, number>>({});
  useEffect(() => {
    for (const summary of walletSummaries) {
      const prev = prevWalletPotRef.current[summary.address];
      if (prev !== undefined && summary.potBalance !== prev) {
        clearPotOptimisticOffset(summary.address);
      }
      prevWalletPotRef.current[summary.address] = summary.potBalance;
    }
  }, [walletSummaries, clearPotOptimisticOffset]);

  // 1 POT 지급 대기 중일 때, 잔액이 1 POT 이상이 되면 메시지 자동 닫기
  useEffect(() => {
    if (!potRewardPending || !activeWallet?.address) return;
    const summary = walletSummaries.find((s) => s.address === activeWallet.address);
    // potBalance is in satoshi units (100_000_000 = 1 POT)
    if ((summary?.potBalance ?? 0) >= 100_000_000) {
      setPotRewardPending(false);
      setWriteStatus(null);
      if (writeStatusTimerRef.current !== null) {
        window.clearTimeout(writeStatusTimerRef.current);
        writeStatusTimerRef.current = null;
      }
    }
  }, [walletSummaries, potRewardPending, activeWallet?.address]);

  const allWallets = useMemo<WalletViewModel[]>(
    () =>
      wallets.map((wallet) => {
        const summary = walletSummaries.find(
          (item) => item.address === wallet.address
        );
        const potOffset = potOptimisticOffsetByAddress[wallet.address] ?? 0;
        return {
          walletId: wallet.walletId,
          keystoreId: wallet.keystoreId,
          nickname: summary?.nickname ?? wallet.nickname,
          address: wallet.address,
          color: wallet.walletColor,
          jackBalance: Math.floor((summary?.jackBalance ?? 0) / 100_000_000),
          potBalance: Math.max(0, Math.floor((summary?.potBalance ?? 0) / 100_000_000) + potOffset),
        };
      }),
    [walletSummaries, wallets, potOptimisticOffsetByAddress]
  );

  const isCurrentWalletLocked = activeWallet
    ? !unlockedWallets[activeWallet.walletId]
    : false;

  const persistWallet = async (
    walletNickname: string,
    type: "create" | "restore",
    payload?: WalletPersistPayload,
    color: WalletThemeId = "gray"
  ) => {
    const address = payload?.address;
    const privateKey = payload?.privateKey;
    const password = payload?.password;
    if (!address || !privateKey || !password) {
      return;
    }

    setWriteError(null);
    setWriteStatus(null);

    try {
      const existingWallet = wallets.find(
        (wallet) => wallet.address === address
      );
      const result = await registerWalletWithRollback({
        walletNickname,
        type,
        color,
        payload: {
          address,
          privateKey,
          password,
        },
        existingWallet,
      });

      upsertWallet({
        ...result.securedWallet.metadata,
        refreshSessionHandle: existingWallet?.refreshSessionHandle ?? null,
      });
      unlockWallet(
        result.securedWallet.metadata.walletId,
        result.securedWallet.privateKey
      );

      if (result.status === "duplicate_restore") {
        setWriteStatus(
          "이미 등록된 지갑입니다. 기존 지갑 정보를 그대로 사용합니다."
        );
        setAuthError(null);
        return;
      }

      if (writeStatusTimerRef.current !== null) {
        window.clearTimeout(writeStatusTimerRef.current);
      }
      if (type === "create") {
        if (result.response?.onboardingRewardGranted) {
          setWriteStatus("1 POT 생성 중입니다. 잔액이 곧 반영됩니다.");
          setPotRewardPending(true);
          writeStatusTimerRef.current = window.setTimeout(() => {
            setWriteStatus(null);
            setPotRewardPending(false);
            writeStatusTimerRef.current = null;
          }, 30_000);
        } else {
          setWriteStatus("지갑이 등록되었습니다.");
        }
      } else {
        setWriteStatus("기존 지갑이 등록되었습니다.");
      }
    } catch (error) {
      setWriteError(toWalletWriteErrorMessage(error));
      return;
    }

    if (type === "restore") {
      setAuthError(null);
    }
  };

  const handleCreateWallet = (
    walletNickname?: string,
    color?: WalletThemeId,
    payload?: WalletPersistPayload
  ) => {
    void persistWallet(
      walletNickname ?? "내 지갑",
      "create",
      payload,
      color ?? "gray"
    );
  };

  const handleRestoreWallet = (
    walletNickname?: string,
    color?: WalletThemeId,
    payload?: WalletPersistPayload
  ) => {
    void persistWallet(
      walletNickname ?? "기존 지갑",
      "restore",
      payload,
      color ?? "gray"
    );
  };

  const handleAddWallet = (
    walletNickname: string,
    type: "create" | "restore",
    payload?: WalletPersistPayload,
    color: WalletThemeId = "gray"
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
    const migratedWallets = await migrateLegacyWallets(
      legacyWallets,
      password,
      wallets
    );
    const mergedWallets = [...wallets];

    migratedWallets.forEach((wallet) => {
      const index = mergedWallets.findIndex(
        (item) => item.address === wallet.metadata.address
      );
      if (index >= 0) {
        mergedWallets[index] = {
          ...wallet.metadata,
          refreshSessionHandle:
            mergedWallets[index]?.refreshSessionHandle ?? null,
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

  const handleExchangeJackToPot = async () => {
    if (!activeWallet) {
      throw new Error("활성 지갑을 찾을 수 없습니다.");
    }
    if (!activeAccessSession?.accessToken) {
      throw new Error("지갑 인증이 필요합니다.");
    }
    if (!activeUnlockedPrivateKey) {
      throw new Error("서명하려면 먼저 지갑 잠금을 해제해야 합니다.");
    }

    const response = await submitExchangeWrite({
      address: activeWallet.address,
      privateKey: activeUnlockedPrivateKey,
      accessToken: activeAccessSession.accessToken,
    });
    setWriteStatus(
      `${(response.burnedJack / 100_000_000).toLocaleString(
        "ko-KR"
      )} JACK 교환 트랜잭션을 제출했습니다.`
    );
    // Immediately refetch both wallet summaries and activities together
    void refetchWalletSummaries();
    void refetchActivities();
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
            sessionExpired={unlockModalSessionExpired}
            onClose={() => {
              setShowUnlockModal(false);
              setUnlockModalSessionExpired(false);
            }}
            onUnlock={handleUnlockWallet}
          />
        </Suspense>
      ) : null}

      {wallets.length === 0 && legacyWallets.length === 0 ? (
        <Suspense
          fallback={
            <WalletSectionFallback label="지갑 생성 화면을 불러오는 중입니다." />
          }
        >
          <WalletCreate
            onCreate={handleCreateWallet}
            onRestore={handleRestoreWallet}
          />
        </Suspense>
      ) : wallets.length === 0 ? (
        <div className="mx-auto flex min-h-[320px] w-full max-w-3xl items-center justify-center px-6 text-center">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-10 text-text-secondary">
            기존 지갑을 암호화 keystore로 업그레이드하는 중입니다. 비밀번호를
            입력하면 지갑 메타데이터와 잠금 해제 흐름이 새 구조로 전환됩니다.
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-5xl px-6 lg:px-2">
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
          {writeError ? (
            <div className="mb-4 rounded-[18px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {writeError}
            </div>
          ) : null}
          {writeStatus ? (
            <div className="mb-4 rounded-[18px] border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
              <p>{writeStatus}</p>
              {potRewardPending ? (
                <p className="mt-1 text-xs text-info/70">
                  1 POT 지급은 블록체인에 트랜잭션이 기록되어야 처리됩니다. 블록이 채굴될 때까지 잠시 기다려 주세요.
                </p>
              ) : null}
            </div>
          ) : null}
          <Suspense
            fallback={
              <WalletSectionFallback label="지갑 정보를 불러오는 중입니다." />
            }
          >
            <WalletInfo
              wallets={allWallets}
              activeIndex={activeWalletIndex}
              onChangeIndex={setActiveWalletIndex}
              onAddWallet={handleAddWallet}
              onExchangeJackToPot={handleExchangeJackToPot}
              isLocked={isCurrentWalletLocked}
              onLockRequest={() => {
                setUnlockModalSessionExpired(false);
                setShowUnlockModal(true);
              }}
            />
          </Suspense>
          <div className="mt-6">
            <Suspense
              fallback={
                <WalletSectionFallback label="활동 기록을 불러오는 중입니다." />
              }
            >
              <ActivityList activities={currentActivities} />
            </Suspense>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
