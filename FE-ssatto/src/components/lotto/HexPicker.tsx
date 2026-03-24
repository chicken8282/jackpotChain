"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import InteractiveHoverButton from "../common/InteractiveHoverButton";
import type { LottoHistoryDetail, LottoHistoryEntry } from "../../services/readModelAdapters";
import { getLottoParticipationState } from "../../services/lottoParticipationGuard";

interface HexPickerProps {
  disabled?: boolean;
  jackBalance: number;
  potBalance: number;
  onExchangeJackToPot?: () => Promise<void> | void;
  onCommit?: (chosenNumbers: number[]) => Promise<void> | void;
  entries?: LottoHistoryEntry[];
  onClaim?: (entryId: string) => Promise<void> | void;
  onLoadResult?: (commitHash: string) => Promise<LottoHistoryDetail>;
  hasWallet?: boolean;
  onRequireWallet?: () => void;
}

const slotThemes = [
  {
    border: "1px solid rgba(251,191,36,0.9)",
    bg: "linear-gradient(180deg, rgba(201,153,29,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(251,191,36,0.25)",
  },
  {
    border: "1px solid rgba(56,189,248,0.9)",
    bg: "linear-gradient(180deg, rgba(45,151,198,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(56,189,248,0.25)",
  },
  {
    border: "1px solid rgba(255,101,95,0.9)",
    bg: "linear-gradient(180deg, rgba(204,81,76,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(255,101,95,0.25)",
  },
  {
    border: "1px solid rgba(148,163,184,0.9)",
    bg: "linear-gradient(180deg, rgba(118,130,147,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(148,163,184,0.25)",
  },
  {
    border: "1px solid rgba(52,211,153,0.9)",
    bg: "linear-gradient(180deg, rgba(42,169,122,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(52,211,153,0.25)",
  },
  {
    border: "1px solid rgba(249,115,22,0.9)",
    bg: "linear-gradient(180deg, rgba(199,92,18,0.60) 0%, rgba(12,40,90,0.18) 100%)",
    glow: "rgba(249,115,22,0.25)",
  },
];

function getNeighborValue(hex: string, delta: number) {
  let value = Number.parseInt(hex, 16);
  value = (value + delta + 16) % 16;
  return value.toString(16);
}

function generateRandomHex() {
  return Math.floor(Math.random() * 16)
    .toString(16)
}

function HistoryModal({
  entry,
  onClose,
  onClaim,
}: {
  entry: LottoHistoryDetail;
  onClose: () => void;
  onClaim?: (entryId: string) => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="닫기"
      />
      <div className="relative w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#0C101C] p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-text-tertiary transition-colors hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-8">
          <h3 className="mb-2 text-2xl font-bold text-white">참여 내역 상세 비교</h3>
          <p className="text-sm text-text-secondary">{entry.date}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-accent-gold/15 bg-accent-gold/5 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-accent-gold">내 선택 번호</p>
            <div className="grid grid-cols-3 gap-3">
              {entry.numbers.map((number, index) => (
                <div
                  key={`picked-${index}`}
                  className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-display text-xl font-bold text-white"
                >
                  {number}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-info/20 bg-info/5 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-info">블록 결과 번호</p>
            <div className="grid grid-cols-3 gap-3">
              {(entry.resultNumbers ?? ["-", "-", "-", "-", "-", "-"]).map((number, index) => {
                const matched = entry.numbers[index] === number;

                return (
                  <div
                    key={`result-${index}`}
                    className={`flex h-14 items-center justify-center rounded-xl border font-display text-xl font-bold ${
                      matched
                        ? "border-accent-gold/40 bg-accent-gold/12 text-accent-gold"
                        : "border-white/10 bg-white/5 text-white"
                    }`}
                  >
                    {number}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              비교 결과
            </span>
            <p className="font-bold text-white">
              {(entry.matchCount ?? 0)}/6일치 · {entry.statusLabel === "WINNING" ? "당첨" : entry.statusLabel === "DRAWING" ? "추첨중" : entry.statusLabel === "EXPIRED" ? "만료" : "미당첨"}
            </p>
            {entry.rewardLabel ? (
              <p className="mt-1 text-sm font-bold text-accent-gold">{entry.rewardLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            disabled={!entry.claimable}
            onClick={() => {
              if (entry.claimable && onClaim) {
                onClaim(entry.id);
              }
              onClose();
            }}
            className={`h-14 flex-1 rounded-2xl border font-bold transition-colors ${
              entry.claimable
                ? "border-accent-gold/35 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/15"
                : "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
            }`}
          >
            수령
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 font-bold text-white transition-colors hover:bg-white/10"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SuccessModal({ open }: { open: boolean }) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/25 bg-white/[0.14] px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.56)] backdrop-blur-md">
        <p className="text-lg font-bold text-white">로또추첨이되었슴니다.</p>
        <p className="mt-1 text-base font-bold text-white">
          로또 결과 확인까지 약 <span className="text-accent-gold">10분</span>이 소요됩니다.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export default function HexPicker({
  disabled = false,
  jackBalance,
  potBalance,
  onExchangeJackToPot,
  onCommit,
  entries,
  onClaim,
  onLoadResult,
  hasWallet = true,
  onRequireWallet,
}: HexPickerProps) {
  const [tab, setTab] = useState<"draw" | "history">("draw");
  const [selected, setSelected] = useState(["a", "f", "b", "c", "d", "e"]);
  const [randomizing, setRandomizing] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<LottoHistoryDetail | null>(null);
  const [slotPulse, setSlotPulse] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [claimedEntryIds, setClaimedEntryIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedSlotCount, setLockedSlotCount] = useState(selected.length);
  const [historyLoadingCommitHash, setHistoryLoadingCommitHash] = useState<string | null>(null);
  const randomizeSpinIntervalRef = useRef<number | null>(null);
  const randomizeRevealIntervalRef = useRef<number | null>(null);
  const randomizeFinalValuesRef = useRef<string[]>(selected);
  const lockedSlotCountRef = useRef(selected.length);
  const pulseTimeoutRef = useRef<number | null>(null);

  const clearPulseTimeout = () => {
    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
  };

  const triggerSlotPulse = (index: number) => {
    clearPulseTimeout();
    setSlotPulse(index);
    pulseTimeoutRef.current = window.setTimeout(() => {
      setSlotPulse(null);
      pulseTimeoutRef.current = null;
    }, 300);
  };

  const clearRandomizeTimers = () => {
    if (randomizeSpinIntervalRef.current !== null) {
      window.clearInterval(randomizeSpinIntervalRef.current);
      randomizeSpinIntervalRef.current = null;
    }

    if (randomizeRevealIntervalRef.current !== null) {
      window.clearInterval(randomizeRevealIntervalRef.current);
      randomizeRevealIntervalRef.current = null;
    }
  };

  useEffect(() => {
    lockedSlotCountRef.current = lockedSlotCount;
  }, [lockedSlotCount]);

  useEffect(() => {
    if (!showSuccessModal) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowSuccessModal(false);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [showSuccessModal]);

  useEffect(
    () => () => {
      clearRandomizeTimers();
      clearPulseTimeout();
    },
    [],
  );

  const mergedHistory = useMemo(() => entries ?? [], [entries]);

  const handleSelectHistory = async (entry: LottoHistoryEntry) => {
    if (!onLoadResult) {
      setSelectedHistory({
        ...entry,
        resultNumbers: null,
      });
      return;
    }

    setHistoryLoadingCommitHash(entry.commitHash);
    try {
      const detail = await onLoadResult(entry.commitHash);
      setSelectedHistory(detail);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "로또 결과를 불러오지 못했습니다.");
    } finally {
      setHistoryLoadingCommitHash(null);
    }
  };

  const handleRandomize = () => {
    if (randomizing) {
      return;
    }

    clearRandomizeTimers();
    clearPulseTimeout();

    const finalValues = selected.map(() => generateRandomHex());
    randomizeFinalValuesRef.current = finalValues;
    lockedSlotCountRef.current = 0;
    setLockedSlotCount(0);
    setSlotPulse(null);
    setRandomizing(true);

    randomizeSpinIntervalRef.current = window.setInterval(() => {
      setSelected((current) =>
        current.map((value, index) => (index < lockedSlotCountRef.current ? randomizeFinalValuesRef.current[index] : generateRandomHex())),
      );
    }, 80);

    randomizeRevealIntervalRef.current = window.setInterval(() => {
      const nextLockedCount = lockedSlotCountRef.current + 1;
      lockedSlotCountRef.current = nextLockedCount;
      setLockedSlotCount(nextLockedCount);
      setSelected((current) =>
        current.map((value, index) => (index < nextLockedCount ? randomizeFinalValuesRef.current[index] : value)),
      );
      triggerSlotPulse(nextLockedCount - 1);

      if (nextLockedCount >= finalValues.length) {
        clearRandomizeTimers();
        setSelected(finalValues);
        setRandomizing(false);
      }
    }, 500);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2000);
  };

  const handleExchangeJackToPot = async () => {
    if (jackBalance < 100) {
      showNotice("교환하려면 최소 100 JACK이 필요합니다.");
      return;
    }

    if (!onExchangeJackToPot) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onExchangeJackToPot();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "교환 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cycleSlot = (index: number, delta: number) => {
    if (randomizing) {
      return;
    }

    setSelected((current) => {
      const next = [...current];
      let value = Number.parseInt(next[index], 16);
      value = (value + delta + 16) % 16;
      next[index] = value.toString(16);
      return next;
    });
    triggerSlotPulse(index);
  };

  const handleParticipate = async () => {
    const state = getLottoParticipationState({
      hasWallet,
      disabled,
      randomizing,
      isSubmitting,
      potBalance,
    });

    if (state === "blocked") {
      return;
    }

    if (state === "require-wallet") {
      onRequireWallet?.();
      return;
    }

    if (state === "insufficient-pot") {
      showNotice("로또 참여에는 최소 1 POT가 필요합니다.");
      return;
    }

    if (!onCommit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCommit(selected.map((value) => Number.parseInt(value, 16)));
      setShowSuccessModal(true);
      setTab("history");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "로또 참여 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async (entryId: string) => {
    if (!onClaim) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onClaim(entryId);
      setClaimedEntryIds((prev) => new Set([...prev, entryId]));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "수령 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden rounded-[34px]"
        title={
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <h2
              className="ml-3 font-display text-[35px] font-black leading-[1] tracking-[-0.04em] text-white lg:ml-7"
            >
              {tab === "draw" ? "로또 추첨 참여" : "참여 내역"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex rounded-xl bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setTab("draw")}
                  className={`rounded-lg px-5 py-2 text-sm font-extrabold transition-all ${
                    tab === "draw"
                      ? "bg-white/10 text-white shadow-lg"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  로또 추첨 참여
                </button>
                <button
                  type="button"
                  onClick={() => setTab("history")}
                  className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                    tab === "history"
                      ? "bg-white/10 text-white shadow-lg"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  참여 내역
                </button>
              </div>
            </div>
          </div>
        }
      >
        <div className="py-2">
          {tab === "draw" ? (
            <>
              <div className="relative mb-8 mt-4 flex min-h-[80px] items-center justify-center gap-6 px-2">
                <div className="flex flex-1 flex-wrap items-center justify-center gap-3 lg:gap-6">
                  <div className="flex min-w-[200px] flex-col items-center rounded-[20px] border border-orange-400/50 bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(10,15,30,0.85))] px-5 py-4 text-center shadow-[0_4px_24px_rgba(251,146,60,0.15)]">
                    <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-400">
                      JACK 밸런스
                    </span>
                    <p className="font-display text-3xl font-black leading-none text-white">
                      <AnimatedNumber value={jackBalance} />
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/35">
                      JACK &gt; POT
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void handleExchangeJackToPot();
                      }}
                      title="JACK to POT"
                      disabled={isSubmitting}
                      className="rounded-full border border-white/10 bg-white/5 p-3 text-text-secondary transition-colors hover:border-info/40 hover:bg-white/10 hover:text-info"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex min-w-[200px] flex-col items-center rounded-[20px] border border-info/40 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(10,15,30,0.85))] px-5 py-4 text-center shadow-[0_4px_20px_rgba(59,130,246,0.1)]">
                    <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-info">POT 밸런스</span>
                    <p className="font-display text-3xl font-black leading-none text-white">
                      <AnimatedNumber value={potBalance} delay={0.15} />
                    </p>
                  </div>
                </div>

                <div className="absolute right-[18px] top-1/2 hidden -translate-y-1/2 xl:block">
                  <InteractiveHoverButton
                    type="button"
                    onClick={() => {
                      void handleParticipate();
                    }}
                    disabled={randomizing || isSubmitting}
                    text="로또 추첨"
                    hoverText="참여하기"
                  />
                </div>
              </div>

              {notice ? <p className="mb-4 text-center text-sm font-bold text-accent-gold">{notice}</p> : null}

              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,#0A0D18,#02040A)] px-4 py-10">
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(222,160,60,0.05),transparent)]" />

                <div className="relative flex items-center justify-center">
                  <div className="subtle-scroll overflow-x-auto pb-2" style={{ marginLeft: "98px", marginRight: "140px" }}>
                    <div className="flex min-w-max items-stretch justify-center gap-3 px-2 sm:gap-4">
                      {selected.map((value, index) => {
                        const theme = slotThemes[index % slotThemes.length];

                        return (
                          <div key={`${index}-${value}`} className="flex w-[118px] shrink-0 flex-col items-center gap-3 sm:w-[130px]">
                            <motion.button
                              type="button"
                              onClick={() => cycleSlot(index, 1)}
                              whileTap={{ scale: 0.96 }}
                              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-xl text-text-primary transition hover:border-white/30"
                            >
                              +
                            </motion.button>

                            <motion.div
                              animate={
                                randomizing && index >= lockedSlotCount
                                  ? { y: [0, -10, 10, -5, 0] }
                                  : slotPulse === index
                                    ? { scale: [1, 1.04, 1] }
                                    : { y: 0, scale: 1 }
                              }
                              transition={{ duration: randomizing ? 0.6 : 0.32 }}
                              className="relative w-full rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(17,24,39,0.95))] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_40px_rgba(0,0,0,0.3)]"
                            >
                              <div className="pointer-events-none absolute inset-x-3 top-3 h-8 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
                              <div className="text-center">
                                <p className="font-mono text-lg text-text-tertiary drop-shadow-md">
                                  {getNeighborValue(value, 1)}
                                </p>

                                <div
                                  className="my-2 rounded-[16px] px-2 py-5"
                                  style={{
                                    border: theme.border,
                                    background: theme.bg,
                                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px ${theme.glow}`,
                                  }}
                                >
                                  <p className="font-display text-5xl font-extrabold tracking-[0.08em] text-white drop-shadow-sm">
                                    {value}
                                  </p>
                                </div>

                                <p className="font-mono text-lg text-text-tertiary">
                                  {getNeighborValue(value, -1)}
                                </p>
                              </div>
                            </motion.div>

                            <motion.button
                              type="button"
                              onClick={() => cycleSlot(index, -1)}
                              whileTap={{ scale: 0.96 }}
                              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-xl text-text-primary transition hover:border-white/30"
                            >
                              -
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center xl:flex">
                    <button
                      type="button"
                      onClick={handleRandomize}
                      disabled={randomizing}
                      className="min-w-[120px] whitespace-nowrap rounded-[14px] border border-white/25 bg-white/[0.14] px-6 py-4 text-sm font-bold text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition hover:border-white/40 hover:bg-white/[0.22] hover:text-white active:scale-95 disabled:opacity-50"
                    >
                      랜덤 생성
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="subtle-scroll max-h-[480px] space-y-3 overflow-y-auto pr-2">
              {mergedHistory.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-10 text-sm font-bold text-text-secondary">
                  참여 내역이 아직 없습니다.
                </div>
              ) : mergedHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    if (entry.statusLabel !== "PENDING") {
                      void handleSelectHistory(entry);
                    }
                  }}
                  className={`group relative flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all ${entry.statusLabel === "PENDING" ? "cursor-default opacity-70" : "hover:border-white/15 hover:bg-white/[0.04]"}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{entry.date}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          entry.statusLabel === "PENDING"
                            ? "bg-accent-gold/15 text-accent-gold animate-pulse"
                            : entry.statusLabel === "WINNING"
                              ? "bg-accent-gold/20 text-accent-gold"
                              : entry.statusLabel === "DRAWING"
                                ? "bg-info/15 text-info"
                                : entry.statusLabel === "EXPIRED"
                                  ? "bg-danger/15 text-danger"
                                  : "bg-white/10 text-text-tertiary"
                        }`}
                      >
                        {entry.statusLabel === "PENDING" ? "대기중" : entry.statusLabel === "WINNING" ? "당첨" : entry.statusLabel === "DRAWING" ? "추첨중" : entry.statusLabel === "EXPIRED" ? "만료" : "미당첨"}
                      </span>
                      {entry.statusLabel === "WINNING" && entry.rewardLabel ? (
                        <span className="text-[10px] font-bold text-accent-gold">{entry.rewardLabel}</span>
                      ) : null}
                    </div>
                    <div className="flex gap-1.5">
                      {entry.numbers.map((number, index) => (
                        <span key={`${entry.id}-${index}`} className="font-mono text-xs text-text-secondary">
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.claimable && !claimedEntryIds.has(entry.id) && onClaim ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleClaim(entry.id);
                        }}
                        className="rounded-full border border-accent-gold/35 bg-accent-gold/10 px-3 py-1 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/15"
                      >
                        수령
                      </button>
                    ) : null}
                    <span className="text-xs font-bold text-text-secondary">
                      {entry.statusLabel === "PENDING"
                        ? "블록 확정 대기"
                        : historyLoadingCommitHash === entry.commitHash
                          ? "결과 조회 중"
                          : entry.matchCount == null
                            ? "추첨 대기"
                            : `${entry.matchCount}/6일치`}
                    </span>
                    <svg
                      className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <SuccessModal open={showSuccessModal} />
      {selectedHistory ? (
        <HistoryModal
          entry={selectedHistory}
          onClose={() => setSelectedHistory(null)}
          onClaim={(entryId) => {
            void handleClaim(entryId);
          }}
        />
      ) : null}
    </>
  );
}
