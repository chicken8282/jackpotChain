import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import { PRIZE_ROWS } from "../../lib/constants";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";

export default function PrizeTable() {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45 }}
    >
      <Card
        eyebrow="Prize Table"
        title={
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">Reward Tiers</h3>
            </div>
            <div className="rounded-[16px] border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-right shadow-[0_4px_20px_rgba(245,158,11,0.1)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/90">Current Jackpot Pool</p>
              <p className="mt-1 font-display text-3xl font-bold text-accent-gold drop-shadow-sm">
                <AnimatedNumber value={1241500} />
                <span className="ml-2 font-black">JACK</span>
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {PRIZE_ROWS.map((row, index) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className={`relative overflow-hidden rounded-[20px] border px-4 py-4 ${index === 0
                  ? "border-accent-gold/40 bg-[linear-gradient(90deg,rgba(245,158,11,0.15),var(--surface))] shadow-[0_4px_15px_rgba(245,158,11,0.1)]"
                  : "border-border bg-surface shadow-sm"
                }`}
            >
              {index === 0 ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,#F59E0B,#B45309)] shadow-[0_0_8px_#F59E0B]" />
              ) : null}
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{row.label}</p>
              <p className="mt-1 font-display text-lg font-bold text-white tracking-wide">{row.reward}</p>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
