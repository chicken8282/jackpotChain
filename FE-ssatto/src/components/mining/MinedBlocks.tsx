import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import type { MinedBlock } from "../../types";

interface MinedBlocksProps {
  blocks: MinedBlock[];
}

export default function MinedBlocks({ blocks }: MinedBlocksProps) {
  return (
    <Card
      className="overflow-hidden rounded-[34px]"
      eyebrow="채굴 현황"
      title={
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.04em] text-white">
              내가 채굴한 블록
            </h2>
          </div>
          <span className="rounded-md border border-success/30 bg-success/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-success shadow-sm">
            블록당 50 JACK
          </span>
        </div>
      }
    >
      <div className="subtle-scroll overflow-x-auto pb-3">
        <div className="flex min-w-max items-center gap-4">
          {blocks.map((block, index) => (
            <div key={block.id} className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-[300px] rounded-[24px] border border-border bg-surface px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-accent-gold/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">블록 높이</p>
                  <p className="font-mono text-sm font-medium text-text-secondary">{block.createdAt}</p>
                </div>
                <p className="mt-2 font-display text-4xl font-extrabold text-white">#{block.height}</p>
                <p className="mt-3 truncate font-mono text-[11px] font-medium tracking-wide text-text-tertiary">{block.hash}</p>
                <div className="mt-6 flex items-end justify-between rounded-[16px] border border-accent-gold/30 bg-accent-gold/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(245,158,11,0.1)]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/80">보상</p>
                    <p className="mt-1 font-display text-3xl font-extrabold text-accent-gold drop-shadow-sm">
                      <AnimatedNumber value={block.reward} suffix="JACK" delay={0.2 + index * 0.08} />
                    </p>
                  </div>
                  <span className="rounded-md border border-accent-gold/20 bg-accent-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                    지급 완료
                  </span>
                </div>
              </motion.div>
              {index < blocks.length - 1 ? (
                <div className="flex w-20 shrink-0 items-center justify-center">
                  <div className="h-2 w-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.2),rgba(229,160,0,0.8),rgba(59,130,246,0.2))]" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
