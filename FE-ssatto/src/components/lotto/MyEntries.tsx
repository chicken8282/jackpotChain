import { motion } from "motion/react";
import GoldButton from "../common/GoldButton";
import Card from "../common/Card";
import Badge from "../common/Badge";
import type { LottoEntry } from "../../types";

interface MyEntriesProps {
  entries: LottoEntry[];
  onClaim: (entryId: string) => void;
}

export default function MyEntries({ entries, onClaim }: MyEntriesProps) {
  return (
    <Card
      eyebrow="My Entries"
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white">Entry Status</h3>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
            Latest First
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const badgeTone =
            entry.status === "당첨" ? "gold" : entry.status === "대기" ? "blue" : "red";
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-[24px] border px-4 py-4 ${entry.status === "당첨"
                  ? "border-accent-gold/35 bg-[linear-gradient(90deg,rgba(229,160,0,0.14),rgba(255,255,255,0.03))] shadow-[0_0_26px_rgba(229,160,0,0.12)]"
                  : "border-white/8 bg-white/[0.03]"
                }`}
            >
              <div className="absolute inset-y-4 left-4 w-px bg-[linear-gradient(180deg,rgba(59,130,246,0.1),rgba(229,160,0,0.45),rgba(59,130,246,0.1))]" />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3 pl-4">
                  <div className="flex items-center gap-3">
                    <Badge tone={badgeTone}>{entry.status}</Badge>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{entry.createdAt}</span>
                  </div>
                  <p className="font-mono text-base font-bold tracking-[0.28em] text-white">
                    {entry.numbers.join(" ")}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                    Snapshot Pool {entry.jackpotSnapshot.toLocaleString("ko-KR")} JACK
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p className="font-display text-2xl font-bold text-white drop-shadow-sm">
                    {entry.reward.toLocaleString("ko-KR")} JACK
                  </p>
                  {entry.status === "당첨" && !entry.claimed ? (
                    <GoldButton onClick={() => onClaim(entry.id)} className="px-4 py-2 text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      Claim Reward
                    </GoldButton>
                  ) : (
                    <p className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                      {entry.claimed ? "Claimed" : "Waiting"}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
