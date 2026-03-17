"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import Card from "../common/Card";
import AnimatedNumber from "../common/AnimatedNumber";
import type { LottoEntry as StoreLottoEntry } from "../../types";

interface HistoryEntry {
  id: string;
  numbers: string[];
  resultNumbers: string[];
  date: string;
  blockHash: string;
  isWinner: boolean;
  prize?: string;
}

interface HexPickerProps {
  disabled?: boolean;
  onCommit?: (hexNumbers: string[]) => void;
  entries?: StoreLottoEntry[];
  onClaim?: (entryId: string) => void;
}

const mockHistory: HistoryEntry[] = [
  {
    id: "history-1",
    numbers: ["0A", "1F", "2B", "3D", "44", "5E"],
    resultNumbers: ["0A", "10", "2B", "4C", "44", "EF"],
    date: "2026.03.15 14:30",
    blockHash: "0x8f2a...3e1d",
    isWinner: true,
    prize: "2,500 POT",
  },
  {
    id: "history-2",
    numbers: ["12", "A3", "45", "78", "BC", "09"],
    resultNumbers: ["11", "A3", "40", "79", "BC", "08"],
    date: "2026.03.14 09:15",
    blockHash: "0x1c4e...9a2b",
    isWinner: false,
  },
];

const SLOT_THEMES = [
  { border: "1px solid rgba(251,191,36,0.9)", bg: "linear-gradient(180deg, rgba(201,153,29,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(251,191,36,0.25)" },
  { border: "1px solid rgba(56,189,248,0.9)", bg: "linear-gradient(180deg, rgba(45,151,198,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(56,189,248,0.25)" },
  { border: "1px solid rgba(255,101,95,0.9)", bg: "linear-gradient(180deg, rgba(204,81,76,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(255,101,95,0.25)" },
  { border: "1px solid rgba(148,163,184,0.9)", bg: "linear-gradient(180deg, rgba(118,130,147,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(148,163,184,0.25)" },
  { border: "1px solid rgba(52,211,153,0.9)", bg: "linear-gradient(180deg, rgba(42,169,122,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(52,211,153,0.25)" },
  { border: "1px solid rgba(249,115,22,0.9)", bg: "linear-gradient(180deg, rgba(199,92,18,0.60) 0%, rgba(12,40,90,0.18) 100%)", glow: "rgba(249,115,22,0.25)" },
];

function buildResultNumbers(numbers: string[], seed: string) {
  return numbers.map((value, index) => {
    const numeric = parseInt(value, 16);
    const offset = (seed.charCodeAt(index % seed.length) + index * 7) % 16;
    return ((numeric + offset) % 256).toString(16).toUpperCase().padStart(2, "0");
  });
}

function countMatches(numbers: string[], resultNumbers: string[]) {
  return numbers.filter((value, index) => value === resultNumbers[index]).length;
}

function LottoHistoryModal({ entry, onClose }: { entry: HistoryEntry | null; onClose: () => void }) {
  if (!entry) {
    return null;
  }

  const matches = countMatches(entry.numbers, entry.resultNumbers);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#0C101C] p-8 shadow-2xl"
      >
        <button
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
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-accent-gold">내가 선택한 번호</p>
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
              {entry.resultNumbers.map((number, index) => {
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

        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              비교 기준 블록
            </span>
            <p className="font-mono text-sm text-info">{entry.blockHash}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              비교 결과
            </span>
            <p className={`font-bold ${entry.isWinner ? "text-accent-gold" : "text-text-primary"}`}>
              {matches} / 6 일치 {entry.prize ? `(${entry.prize})` : ""}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 h-14 w-full rounded-2xl border border-white/10 bg-white/5 font-bold text-white transition-colors hover:bg-white/10"
        >
          닫기
        </button>
      </motion.div>
    </div>
  );
}

function LottoSuccessModal({ open }: { open: boolean }) {
  if (!open) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="w-full max-w-md rounded-[28px] border border-accent-gold/25 bg-[linear-gradient(180deg,rgba(11,18,30,0.98),rgba(7,11,20,0.98))] px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <p className="text-lg font-bold text-white">
            로또 추첨이 등록되었습니다. 로또 결과 확인까지 약 10분이 소요됩니다.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default function HexPicker({ disabled = false, onCommit, entries }: HexPickerProps) {
  const [tab, setTab] = useState<"draw" | "history">("draw");
  const [selected, setSelected] = useState(["0A", "1F", "2B", "3C", "4D", "5E"]);
  const [jackBalance, setJackBalance] = useState(10250);
  const [potBalance, setPotBalance] = useState(184);
  const [randomizing, setRandomizing] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [slotPulse, setSlotPulse] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);

  useEffect(() => {
    if (!showSuccessModal) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowSuccessModal(false);
      setTab("history");
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [showSuccessModal]);

  const mergedHistory = useMemo(() => {
    if (!entries?.length) {
      return history;
    }

    const storeEntries: HistoryEntry[] = entries.map((entry) => {
      const resultNumbers = buildResultNumbers(entry.numbers, entry.id);
      return {
        id: entry.id,
        numbers: entry.numbers,
        resultNumbers,
        date: entry.createdAt,
        blockHash: `0x${entry.id.slice(-4).padStart(4, "0")}...${entry.numbers[0]}`,
        isWinner: entry.status === "당첨",
        prize: entry.reward > 0 ? `${entry.reward.toLocaleString("ko-KR")} JACK` : undefined,
      };
    });

    const seen = new Set<string>();
    return [...storeEntries, ...history].filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    });
  }, [entries, history]);

  const handleRandomize = useCallback(() => {
    setRandomizing(true);
    let count = 0;
    const interval = window.setInterval(() => {
      setSelected((current) =>
        current.map(() => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")),
      );
      count += 1;
      if (count > 12) {
        window.clearInterval(interval);
        setRandomizing(false);
      }
    }, 80);
  }, []);

  const handleExchange = (type: "JACK_TO_POT" | "POT_TO_JACK") => {
    if (type === "JACK_TO_POT") {
      if (jackBalance >= 100) {
        setJackBalance((prev) => prev - 100);
        setPotBalance((prev) => prev + 1);
      }
      return;
    }

    if (potBalance >= 1) {
      setPotBalance((prev) => prev - 1);
      setJackBalance((prev) => prev + 100);
    }
  };

  const cycleSlot = (index: number, delta: number) => {
    const next = [...selected];
    let value = parseInt(next[index], 16);
    value = (value + delta + 256) % 256;
    next[index] = value.toString(16).toUpperCase().padStart(2, "0");
    setSelected(next);
    setSlotPulse(index);
    window.setTimeout(() => setSlotPulse(null), 300);
  };

  const getNeighborValue = (hex: string, delta: number) => {
    let value = parseInt(hex, 16);
    value = (value + delta + 256) % 256;
    return value.toString(16).toUpperCase().padStart(2, "0");
  };

  const handleParticipate = () => {
    if (disabled || randomizing || potBalance < 1) {
      return;
    }

    onCommit?.(selected);
    setPotBalance((prev) => Math.max(prev - 1, 0));

    const entryId = `local-${Date.now()}`;
    const newEntry: HistoryEntry = {
      id: entryId,
      numbers: selected,
      resultNumbers: buildResultNumbers(selected, entryId),
      date: new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
      blockHash: `0x${selected.join("").slice(0, 4).toLowerCase()}...${selected[5].toLowerCase()}`,
      isWinner: false,
    };

    setHistory((prev) => [newEntry, ...prev]);
    setShowSuccessModal(true);
  };

  return (
    <>
      <Card
        className="overflow-hidden rounded-[34px]"
        title={
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <h2
              className={`font-display text-3xl font-bold leading-[1] tracking-[-0.04em] ${
                tab === "draw" ? "ml-3 text-[#DEA03C] lg:ml-7" : "text-white"
              }`}
            >
              {tab === "draw" ? "로또 추첨 참여" : "참여 내역"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex rounded-xl bg-white/5 p-1">
                <button
                  onClick={() => setTab("draw")}
                  className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                    tab === "draw" ? "bg-white/10 text-white shadow-lg" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  추첨 참여
                </button>
                <button
                  onClick={() => setTab("history")}
                  className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                    tab === "history" ? "bg-white/10 text-white shadow-lg" : "text-text-tertiary hover:text-text-secondary"
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
                      JACK 잔액
                    </span>
                    <p className="font-display text-3xl font-black leading-none text-white">
                      <AnimatedNumber value={jackBalance} />
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-white/35">
                      100 JACK = 1 POT
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExchange("POT_TO_JACK")}
                        title="POT to JACK"
                        className="rounded-full border border-white/10 bg-white/5 p-2.5 text-text-secondary transition-colors hover:border-orange-400/40 hover:bg-white/10 hover:text-orange-400"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleExchange("JACK_TO_POT")}
                        title="JACK to POT"
                        className="rounded-full border border-white/10 bg-white/5 p-2.5 text-text-secondary transition-colors hover:border-info/40 hover:bg-white/10 hover:text-info"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex min-w-[200px] flex-col items-center rounded-[20px] border border-info/40 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(10,15,30,0.85))] px-5 py-4 text-center shadow-[0_4px_20px_rgba(59,130,246,0.1)]">
                    <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-info">POT 잔액</span>
                    <p className="font-display text-3xl font-black leading-none text-white">
                      <AnimatedNumber value={potBalance} delay={0.15} />
                    </p>
                  </div>
                </div>

                <div className="absolute right-[18px] top-1/2 hidden -translate-y-1/2 xl:block">
                  <button
                    type="button"
                    onClick={handleParticipate}
                    disabled={disabled || randomizing}
                    className="h-11 rounded-[14px] border-2 border-[#DEA03C] bg-[linear-gradient(135deg,rgba(222,160,60,0.22),rgba(5,10,20,0.95))] px-8 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,160,60,0.2)] transition hover:bg-[#DEA03C]/25 active:scale-95 disabled:opacity-50"
                  >
                    로또 추첨 참여하기
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,#0A0D18,#02040A)] px-4 py-10">
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(222,160,60,0.05),transparent)]" />

                <div className="relative flex items-center justify-center">
                  <div className="subtle-scroll overflow-x-auto pb-2" style={{ marginLeft: "98px", marginRight: "140px" }}>
                    <div className="flex min-w-max items-stretch justify-center gap-3 px-2 sm:gap-4">
                      {selected.map((value, index) => {
                        const theme = SLOT_THEMES[index % SLOT_THEMES.length];

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
                                randomizing
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
                                  <AnimatePresence mode="wait">
                                    <motion.p
                                      key={value}
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -15 }}
                                      transition={{ duration: 0.15 }}
                                      className="font-display text-5xl font-extrabold tracking-[0.08em] text-white drop-shadow-sm"
                                    >
                                      {value}
                                    </motion.p>
                                  </AnimatePresence>
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
              {mergedHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedHistory(entry)}
                  className="group relative flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{entry.date}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          entry.isWinner ? "bg-accent-gold/20 text-accent-gold" : "bg-white/10 text-text-tertiary"
                        }`}
                      >
                        {entry.isWinner ? "당첨" : "진행중"}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {entry.numbers.map((number, index) => (
                        <span key={`${entry.id}-${index}`} className="font-mono text-xs text-text-secondary">
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-text-secondary">
                      {countMatches(entry.numbers, entry.resultNumbers)} / 6 일치
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

      <LottoSuccessModal open={showSuccessModal} />

      <AnimatePresence>
        {selectedHistory &&
          createPortal(
            <LottoHistoryModal entry={selectedHistory} onClose={() => setSelectedHistory(null)} />,
            document.body,
          )}
      </AnimatePresence>
    </>
  );
}
