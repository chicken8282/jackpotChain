import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import BlockDetailModal from "../dashboard/BlockDetailModal";
import type { MinedBlock } from "../../types";

interface MinedBlocksProps {
  blocks: MinedBlock[];
}

export default function MinedBlocks({ blocks }: MinedBlocksProps) {
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const totalRewards = blocks.reduce((acc, b) => acc + b.reward, 0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY !== 0) {
        event.preventDefault();
        rail.scrollLeft += event.deltaY;
      }
    };

    rail.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      rail.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <>
      <Card
        className="overflow-hidden rounded-[34px]"
        title={
          <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold leading-[1] tracking-[-0.04em] text-white">
                내가 채굴한 블록
              </h2>
            </div>
            <span className="rounded-xl border border-success/30 bg-success/10 px-6 py-4 text-xl sm:text-2xl font-black text-success shadow-[0_4px_24px_rgba(16,185,129,0.15)] flex items-center gap-2 mb-2">
              <span className="text-sm font-bold uppercase tracking-widest mr-1 opacity-80 shrink-0">총 보상</span>
              <AnimatedNumber value={totalRewards} /> JACK
            </span>
          </div>
        }
      >
        <div ref={railRef} className="subtle-scroll overflow-x-auto pb-3">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <p className="font-display text-xl font-bold">채굴된 블록이 없습니다</p>
              <p className="mt-2 text-sm">네트워크에 참여해 블록을 생성해보세요.</p>
            </div>
          ) : (
            <div className="flex min-w-max items-center gap-4">
              {blocks.map((block, index) => (
                <div key={block.id} className="flex items-center gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedBlock({
                      id: block.id,
                      status: "추가됨",
                      height: block.height,
                      hash: block.hash,
                      isMine: true,
                      minerLabel: "나",
                      txCount: 1,
                      isMainChain: true,
                      confirmations: 100,
                      reward: block.reward,
                      jackpotContribution: block.reward * 0.1,
                      difficulty: "000e3...",
                      nonce: 712948,
                      minedAt: block.createdAt,
                      miningElapsed: "00:00:12",
                      feeReward: 0,
                      coinbaseAddress: "0x...",
                      size: 1024,
                    })}
                    className="w-[300px] cursor-pointer rounded-[24px] border border-border bg-surface px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-accent-gold/40"
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
          )}
        </div>
      </Card>

      <BlockDetailModal block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    </>
  );
}
