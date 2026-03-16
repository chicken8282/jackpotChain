import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Card from "../common/Card";
import GoldButton from "../common/GoldButton";

interface ExchangeProps {
  jackBalance: number;
  onExchange: (amount: number) => void;
}

export default function Exchange({ jackBalance, onExchange }: ExchangeProps) {
  const [amount, setAmount] = useState(100);
  const [done, setDone] = useState(false);
  const potAmount = Number((amount / 100).toFixed(2));

  return (
    <Card
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white">내부 교환</h3>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-widest text-text-secondary shadow-sm">
            비율: 100 JACK = 1 POT
          </span>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[0.95fr_auto_0.95fr] lg:items-center">
          <div className="rounded-[20px] border border-border bg-surface px-5 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">보낼 JACK</p>
            <input
              type="number"
              min={0}
              max={jackBalance}
              value={amount}
              step={100}
              onChange={(event) => {
                setAmount(Number(event.target.value));
                setDone(false);
              }}
              className="mt-3 w-full border-0 bg-transparent px-0 py-0 font-display text-5xl font-extrabold outline-none"
            />
            <input
              type="range"
              min={0}
              max={jackBalance}
              step={100}
              value={amount}
              onChange={(event) => {
                setAmount(Number(event.target.value));
                setDone(false);
              }}
              className="mt-5 w-full accent-[#E5A000]"
            />
          </div>

          <motion.div
            animate={{ x: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent-gold/20 bg-accent-gold/8 text-accent-gold"
          >
            →
          </motion.div>

          <div className="rounded-[20px] border border-info/30 bg-info/5 px-5 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-info">받을 POT</p>
            <motion.p
              key={potAmount}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 0.24 }}
              className="mt-3 font-display text-5xl font-extrabold"
            >
              {potAmount.toLocaleString("ko-KR")}
            </motion.p>
            <p className="mt-2 text-info">POT</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            사용 가능: {jackBalance.toLocaleString("ko-KR")} JACK
          </p>
          <GoldButton
            disabled={amount <= 0 || amount > jackBalance}
            onClick={() => {
              onExchange(amount);
              setDone(true);
            }}
          >
            교환 확인
          </GoldButton>
        </div>
        <AnimatePresence>
          {done ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-[22px] border border-success/20 bg-success/8 px-4 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-success/14 shadow-[0_0_28px_rgba(16,185,129,0.35)]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-success stroke-[2.5]">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </motion.div>
              <p className="text-sm text-success">교환이 완료되었습니다. 활동 내역 상단에 바로 반영됩니다.</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
}
