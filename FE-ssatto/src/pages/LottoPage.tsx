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
import { submitExchangeWrite, submitLottoClaimWrite, submitLottoCommitWrite } from "../services/writeFlowService";
import { useMemo, useEffect, useRef, useState } from "react";
import type { LottoHistoryEntry } from "../services/readModelAdapters";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

function CommitFailedModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[30px] border border-danger/20 bg-[rgba(12,16,28,0.98)] px-6 py-7 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <h3 className="text-xl font-bold text-white">로또 참여 실패</h3>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          로또 추첨을 다시 시도해주세요
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 font-bold text-white transition-colors hover:bg-white/10"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WalletRequiredModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[rgba(12,16,28,0.98)] px-6 py-7 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <h3 className="text-xl font-bold text-white">지갑 생성이 필요합니다</h3>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          로또 추첨에 참여하려면 지갑을 먼저 생성해주세요. 지갑을 만들면 1 POT이 즉시 지급되어 바로 참여할 수 있습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 font-bold text-white transition-colors hover:bg-white/10"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 flex-1 rounded-2xl border border-accent-gold/35 bg-accent-gold/10 font-bold text-accent-gold transition-colors hover:bg-accent-gold/15"
          >
            지갑 생성하러 가기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function LottoPage() {
  const navigate = useNavigate();
  const wallets = useWalletStore((state) => state.wallets);
  const activeAddress = useWalletStore((state) => state.activeAddress);
  const potOptimisticOffsetByAddress = useWalletStore((state) => state.potOptimisticOffsetByAddress);
  const applyPotOptimisticOffset = useWalletStore((state) => state.applyPotOptimisticOffset);
  const clearPotOptimisticOffset = useWalletStore((state) => state.clearPotOptimisticOffset);
  const accessSessions = useWalletSessionStore((state) => state.accessSessions);
  const unlockedWallets = useWalletSessionStore((state) => state.unlockedWallets);
  const activeWallet = wallets.find((wallet) => wallet.address === activeAddress);
  const activeAccessToken = activeWallet ? accessSessions[activeWallet.walletId]?.accessToken : undefined;
  const activePrivateKey = activeWallet ? unlockedWallets[activeWallet.walletId]?.privateKey : undefined;
  const { overview, refetch: refetchLottoOverview } = useLottoOverview(activeAddress, activeAccessToken);
  const { entries } = useLottoEntries(activeAddress, activeAccessToken);
  const [pendingEntries, setPendingEntries] = useState<LottoHistoryEntry[]>([]);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWalletRequiredModal, setShowWalletRequiredModal] = useState(false);
  const [showCommitFailedModal, setShowCommitFailedModal] = useState(false);

  // 현재 address 의 optimistic pot offset (POT 단위, 전역 store)
  const optimisticPotOffset = activeAddress ? (potOptimisticOffsetByAddress[activeAddress] ?? 0) : 0;

  // ── reset optimistic offset whenever server potBalance changes ──────────────
  const prevOverviewPotRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!activeAddress || overview?.potBalance === undefined) return;
    if (
      prevOverviewPotRef.current !== undefined &&
      overview.potBalance !== prevOverviewPotRef.current
    ) {
      clearPotOptimisticOffset(activeAddress);
    }
    prevOverviewPotRef.current = overview.potBalance;
  }, [overview?.potBalance, activeAddress, clearPotOptimisticOffset]);

  // ── S2: failure detection — runs on every entries poll cycle ────────────────
  // Using a ref to read the latest pendingEntries without making it a reactive
  // dep (which would cause an update loop with setPendingEntries inside).
  const pendingEntriesRef = useRef(pendingEntries);
  pendingEntriesRef.current = pendingEntries;

  useEffect(() => {
    const pending = pendingEntriesRef.current;
    if (pending.length === 0) return;

    const now = Date.now();
    const LOTTO_COMMIT_TIMEOUT_MS = 60_000;
    const confirmedNumbers = new Set(entries.map((e) => e.numbers.join("")));

    const timedOutIds: string[] = [];
    const confirmedIds: string[] = [];

    for (const p of pending) {
      const hexKey = p.numbers.join("");
      if (confirmedNumbers.has(hexKey)) {
        confirmedIds.push(p.id);
      } else {
        const ts = Number(p.id.replace("pending-", ""));
        if (!Number.isNaN(ts) && now - ts > LOTTO_COMMIT_TIMEOUT_MS) {
          timedOutIds.push(p.id);
        }
      }
    }

    const toRemove = new Set([...confirmedIds, ...timedOutIds]);
    if (toRemove.size === 0) return;

    setPendingEntries((prev) => prev.filter((p) => !toRemove.has(p.id)));

    if (timedOutIds.length > 0) {
      // Restore optimistic offset for each failed commit
      if (activeAddress) {
        for (let i = 0; i < timedOutIds.length; i++) {
          applyPotOptimisticOffset(activeAddress, 1);
        }
      }
      setShowCommitFailedModal(true);
    }
  // intentionally omitting pendingEntries: reading via ref to avoid update loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // pending 항목과 실제 entries 합치기 — 실제 entries에 있으면 pending 제거
  const mergedEntries = useMemo(() => {
    const confirmedHashes = new Set(entries.map((e) => e.numbers.join("")));
    const activePending = pendingEntries.filter(
      (p) => !confirmedHashes.has(p.numbers.join("")),
    );
    return [...activePending, ...entries];
  }, [entries, pendingEntries]);

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

  const assertWriteReady = () => {
    if (!activeWallet || !activeAddress) {
      throw new Error("활성 지갑을 선택해 주세요.");
    }
    if (!activeAccessToken) {
      throw new Error("지갑 인증이 필요합니다.");
    }
    if (!activePrivateKey) {
      throw new Error("서명하려면 먼저 지갑 잠금을 해제해야 합니다.");
    }

    return {
      activeWallet,
      activeAddress,
      activeAccessToken,
      activePrivateKey,
    };
  };

  const handleExchangeJackToPot = async () => {
    const ready = assertWriteReady();
    setIsSubmitting(true);
    try {
      const response = await submitExchangeWrite({
        address: ready.activeAddress,
        privateKey: ready.activePrivateKey,
        accessToken: ready.activeAccessToken,
      });
      setActionStatus(
        `${(response.burnedJack / 100_000_000).toLocaleString("ko-KR")} JACK 교환 트랜잭션을 제출했습니다.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommit = async (chosenNumbers: number[]) => {
    const ready = assertWriteReady();
    setIsSubmitting(true);
    try {
      await submitLottoCommitWrite({
        address: ready.activeAddress,
        privateKey: ready.activePrivateKey,
        accessToken: ready.activeAccessToken,
        chosenNumbers,
      });

      // optimistic POT decrement — show -1 immediately before block confirm
      if (activeAddress) {
        applyPotOptimisticOffset(activeAddress, -1);
      }

      // 대기중 항목 추가
      const now = new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
      }).format(new Date());
      setPendingEntries((prev) => [
        {
          id: `pending-${Date.now()}`,
          commitHash: "",
          numbers: chosenNumbers.map((n) => n.toString(16)),
          date: now,
          statusLabel: "PENDING",
          matchCount: null,
          claimable: false,
          claimed: false,
        },
        ...prev,
      ]);
      setActionStatus("로또 참여 트랜잭션을 제출했습니다. 약 10분 뒤 결과를 확인해 주세요.");

      // immediate refetch so the server potBalance updates as fast as possible
      void refetchLottoOverview();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async (entryId: string) => {
    const ready = assertWriteReady();
    const entry = entries.find((item) => String(item.id) === entryId);
    if (!entry) {
      throw new Error("참여 내역을 찾을 수 없습니다.");
    }

    setIsSubmitting(true);
    try {
      await submitLottoClaimWrite({
        address: ready.activeAddress,
        privateKey: ready.activePrivateKey,
        accessToken: ready.activeAccessToken,
        commitHash: entry.commitHash,
      });
      setActionStatus("보상 수령 트랜잭션을 제출했습니다. 잠시 후 반영 여부를 확인해 주세요.");
      void refetchLottoOverview();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <WalletRequiredModal
        open={showWalletRequiredModal}
        onClose={() => setShowWalletRequiredModal(false)}
        onConfirm={() => {
          setShowWalletRequiredModal(false);
          navigate("/wallet");
        }}
      />
      <CommitFailedModal
        open={showCommitFailedModal}
        onClose={() => setShowCommitFailedModal(false)}
      />
      {actionStatus ? (
        <div className="mb-4 rounded-[18px] border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
          {actionStatus}
        </div>
      ) : null}
      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <JackpotPool
          className="h-full"
          value={Math.floor((overview?.poolBalanceJack ?? 0) / 100_000_000)}
        />
        <LottoTierRanking entries={overview?.prizeTiers ?? []} />
      </section>
      <HexPicker
        disabled={isSubmitting}
        hasWallet={wallets.length > 0}
        onRequireWallet={() => setShowWalletRequiredModal(true)}
        jackBalance={Math.floor((overview?.jackBalance ?? 0) / 100_000_000)}
        potBalance={Math.max(0, Math.floor((overview?.potBalance ?? 0) / 100_000_000) + optimisticPotOffset)}
        onExchangeJackToPot={handleExchangeJackToPot}
        onCommit={handleCommit}
        entries={mergedEntries}
        onClaim={handleClaim}
        onLoadResult={handleLoadResult}
      />
    </PageLayout>
  );
}
