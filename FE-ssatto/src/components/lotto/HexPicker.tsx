import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import GoldButton from "../common/GoldButton";
import Card from "../common/Card";
import { HEX_OPTIONS } from "../../lib/constants";

import { useWalletStore } from "../../stores/useWalletStore";

interface HexPickerProps {
  onCommit: (numbers: string[]) => void;
  disabled?: boolean;
}

export default function HexPicker({ onCommit, disabled }: HexPickerProps) {
  const potBalance = useWalletStore((state) => state.potBalance);

  const [selected, setSelected] = useState<string[]>(["0A", "1F", "2B", "3D", "44", "5E"]);
  const [randomizing, setRandomizing] = useState(false);
  const [slotPulse, setSlotPulse] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (slotPulse === null) {
      return;
    }

    const timer = window.setTimeout(() => setSlotPulse(null), 400);
    return () => window.clearTimeout(timer);
  }, [slotPulse]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const cycleSlot = (slotIndex: number, direction: 1 | -1) => {
    setSelected((current) =>
      current.map((item, index) => {
        if (index !== slotIndex) {
          return item;
        }

        const currentIndex = HEX_OPTIONS.indexOf(item);
        const nextIndex = (currentIndex + direction + HEX_OPTIONS.length) % HEX_OPTIONS.length;
        return HEX_OPTIONS[nextIndex];
      }),
    );
    setSlotPulse(slotIndex);
  };

  const handleRandomize = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setRandomizing(true);

    const nextValues = Array.from({ length: 6 }, () => {
      const randomIndex = Math.floor(Math.random() * HEX_OPTIONS.length);
      return HEX_OPTIONS[randomIndex];
    });

    for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
      for (let tick = 0; tick < 7 + slotIndex; tick += 1) {
        const timer = window.setTimeout(() => {
          setSelected((current) =>
            current.map((item, index) =>
              index === slotIndex
                ? HEX_OPTIONS[(HEX_OPTIONS.indexOf(item) + 1 + slotIndex) % HEX_OPTIONS.length]
                : item,
            ),
          );
        }, 70 * tick + slotIndex * 90);

        timersRef.current.push(timer);
      }

      const stopTimer = window.setTimeout(() => {
        setSelected((current) => current.map((item, index) => (index === slotIndex ? nextValues[slotIndex] : item)));
        setSlotPulse(slotIndex);
        if (slotIndex === 5) {
          setRandomizing(false);
        }
      }, 620 + slotIndex * 110);

      timersRef.current.push(stopTimer);
    }
  };

  const getNeighborValue = (value: string, offset: number) => {
    const currentIndex = HEX_OPTIONS.indexOf(value);
    const nextIndex = (currentIndex + offset + HEX_OPTIONS.length) % HEX_OPTIONS.length;
    return HEX_OPTIONS[nextIndex];
  };

  const handleParticipate = () => {
    if (disabled || randomizing) return;

    if (potBalance >= 1) {
      onCommit(selected);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      alert("잔여 POT이 부족합니다.");
    }
  };

  return (
    <Card
      className="overflow-hidden rounded-[34px]"
      eyebrow="번호 선택"
      title={
        <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent-gold/20 bg-accent-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-accent-gold uppercase">
                회차 진행
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.04em] text-white">
                로또 추첨
              </h2>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-text-secondary shadow-sm">
                6 슬롯
              </div>
              <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-info shadow-sm">
                랜덤 지원
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRandomize}
              disabled={randomizing}
              className="rounded-[16px] border border-info/20 bg-info/8 px-4 py-3 text-sm font-medium text-info transition hover:border-info/40 disabled:opacity-50"
            >
              랜덤 생성
            </button>
            <GoldButton onClick={handleParticipate} disabled={disabled || randomizing}>
              참여하기
            </GoldButton>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pt-2 relative">
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 rounded-[24px] border border-success/40 bg-[rgba(10,16,29,0.92)] px-6 py-4 shadow-[0_12px_40px_rgba(16,185,129,0.2)] backdrop-blur-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success shadow-[inset_0_0_12px_rgba(16,185,129,0.4)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="font-display font-bold text-white text-lg">로또에 참여했습니다</p>
                <p className="text-xs text-text-secondary">POT 잔고가 업데이트 되었습니다.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-3 py-6 sm:px-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_65%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_bottom,rgba(229,160,0,0.12),transparent_72%)]" />
          <div className="subtle-scroll relative overflow-x-auto pb-3">
            <div className="mx-auto flex min-w-max items-stretch justify-center gap-3 sm:gap-4">
              {selected.map((value, index) => (
                <div key={`${index}-${value}`} className="flex w-[118px] shrink-0 flex-col items-center gap-3 sm:w-[136px]">
                  <motion.button
                    type="button"
                    onClick={() => cycleSlot(index, 1)}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-xl text-text-primary transition hover:border-accent-gold/30 hover:text-accent-gold"
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
                    className="relative w-full rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(17,24,39,0.88))] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_34px_rgba(0,0,0,0.25)]"
                  >
                    <div className="pointer-events-none absolute inset-x-3 top-3 h-8 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
                    <div className="text-center">
                      <p className="font-mono text-lg text-text-tertiary drop-shadow-md">{getNeighborValue(value, 1)}</p>
                      <div className="my-2 rounded-[16px] border border-accent-gold/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(59,130,246,0.05))] px-2 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(245,158,11,0.15)]">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={value}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.18 }}
                            className="font-display text-5xl font-extrabold tracking-[0.08em] text-text-primary"
                          >
                            {value}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <p className="font-mono text-lg text-text-tertiary">{getNeighborValue(value, -1)}</p>
                    </div>
                  </motion.div>
                  <motion.button
                    type="button"
                    onClick={() => cycleSlot(index, -1)}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-xl text-text-primary transition hover:border-accent-gold/30 hover:text-accent-gold"
                  >
                    -
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-border bg-surface px-4 py-4 lg:grid-cols-[1.1fr_0.55fr_0.55fr] lg:items-center shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">선택 조합</p>
            <p className="mt-2 font-mono text-2xl tracking-[0.28em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              {selected.join("  ")}
            </p>
          </div>
          <div className="rounded-[18px] border border-border bg-bg-primary px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">참여 비용</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">1 POT</p>
          </div>
          <div className="rounded-[18px] border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 shadow-[0_4px_20px_rgba(245,158,11,0.1)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/90">진행 상태</p>
            <p className="mt-2 font-display text-2xl font-bold text-accent-gold">
              {disabled ? "지갑 연결 필요" : "참여 가능"}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {disabled ? (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-[18px] border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger"
            >
              지갑을 먼저 생성하면 회차 참여가 가능합니다.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
}
