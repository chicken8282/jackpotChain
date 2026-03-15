import { motion } from "motion/react";
import type { DashboardBlockDetail } from "./dashboardMockData";
import { GlowCard } from "../common/GlowCard";

interface BlockPrismProps {
  block: DashboardBlockDetail;
  active?: boolean;
  compact?: boolean;
  className?: string;
}

function getStatusLabel(block: DashboardBlockDetail) {
  return block.status === "confirmed" ? "확정" : "후보";
}

function getShortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function getPalette(block: DashboardBlockDetail) {
  if (block.status === "confirmed") {
    return {
      chip: "border-white/10 bg-white/[0.04] text-text-secondary",
      orb: "bg-accent-gold shadow-[0_0_18px_rgba(229,160,0,0.72)]",
      track:
        "bg-[linear-gradient(90deg,rgba(229,160,0,0.12),rgba(255,214,110,0.9),rgba(229,160,0,0.12))]",
      metric: "text-accent-gold",
      glowColor: block.isMine ? "orange" : "blue",
    };
  }

  return {
    chip: "border-info/24 bg-info/10 text-info",
    orb: "bg-info shadow-[0_0_18px_rgba(59,130,246,0.74)]",
    track:
      "bg-[linear-gradient(90deg,rgba(59,130,246,0.1),rgba(157,216,255,0.92),rgba(59,130,246,0.1))]",
    metric: "text-info",
    glowColor: "purple",
  };
}

export default function BlockPrism({
  block,
  active = false,
  compact = false,
  className = "",
}: BlockPrismProps) {
  const palette = getPalette(block);
  const size = compact
    ? {
      root: "h-[160px] min-w-[230px] w-full max-w-[260px]",
      height: "text-[1.8rem]",
      footerValue: "text-[1.1rem]",
      footerLabel: "text-[10px]",
    }
    : {
      root: "h-[180px] min-w-[260px] w-full max-w-[300px]",
      height: "text-[2rem]",
      footerValue: "text-[1.2rem]",
      footerLabel: "text-[11px]",
    };

  return (
    <motion.div
      animate={{
        y: active ? -8 : 0,
        scale: active ? 1.02 : 1,
      }}
      transition={{ type: "spring", stiffness: 210, damping: 20, mass: 0.9 }}
      className={`relative ${className}`}
    >
      <GlowCard
        customSize
        className={`${size.root} !p-5 ${block.status === "confirmed" ? "bg-[#0b1222]" : "bg-[#071120]"}`}
        glowColor={palette.glowColor as any}
      >
        <div className="absolute inset-x-4 top-4 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)]" />
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2], x: ["-12%", "12%", "-12%"] }}
          transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className={`absolute inset-x-5 top-[80px] h-[2px] rounded-full ${palette.track}`}
        />

        <div className="relative flex h-full min-w-0 flex-col overflow-hidden z-20">
          <div className="flex items-start justify-between gap-2 overflow-hidden">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] text-text-secondary uppercase">블록</p>
              <p
                className={`mt-1 whitespace-nowrap font-display font-bold leading-none tracking-[-0.05em] ${size.height} text-white`}
              >
                #{block.height}
              </p>
            </div>

            <div className="flex shrink-0 items-start gap-1">
              <span
                className={`shrink-0 rounded-md border px-1.5 py-1 text-[9px] font-bold leading-none tracking-widest whitespace-nowrap uppercase ${palette.chip}`}
              >
                {getStatusLabel(block)}
              </span>
              {block.isMine ? (
                <span className="shrink-0 rounded-md border border-accent-gold/28 bg-accent-gold/10 px-1.5 py-1 text-[9px] font-bold leading-none tracking-widest whitespace-nowrap uppercase text-accent-gold">
                  내 블록
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 min-w-0 overflow-hidden">
            <p className="text-[10px] font-bold tracking-[0.2em] text-text-secondary uppercase">해시</p>
            <div className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${palette.orb}`} />
              <p
                className="min-w-0 flex-1 truncate whitespace-nowrap font-mono text-[12px] leading-none text-text-primary"
                title={block.hash}
              >
                {getShortHash(block.hash)}
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="flex items-end justify-between gap-3 overflow-hidden">
              <div className="min-w-0">
                <p className={`${size.footerLabel} font-bold tracking-widest text-text-secondary uppercase`}>
                  보상
                </p>
                <p
                  className={`mt-1 whitespace-nowrap font-display font-bold leading-none tracking-[-0.04em] ${size.footerValue} ${palette.metric}`}
                >
                  {block.reward} JACK
                </p>
              </div>

              <div className="min-w-0 text-right">
                <p className={`${size.footerLabel} font-bold tracking-widest text-text-secondary uppercase`}>
                  TX
                </p>
                <p className={`mt-1 whitespace-nowrap font-mono font-bold leading-none ${size.footerValue} text-white`}>
                  {block.txCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}
