import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import BlockDetailModal from "../dashboard/BlockDetailModal";
import type { DashboardBlockDetail } from "../dashboard/dashboardMockData";
import type { MinedBlock } from "../../types";

interface MinedBlocksProps {
  blocks: MinedBlock[];
}

function getSingleHexDigit(hash: string) {
  const matches = hash.match(/[0-9a-f]/gi);
  return matches?.at(-1)?.toLowerCase() ?? "0";
}
function toBlockDetail(block: MinedBlock): DashboardBlockDetail {
  return {
    id: block.id,
    status: "confirmed",
    height: block.height,
    hash: `${block.hash}C2E90A51BDA2`,
    isMine: true,
    minerLabel: "My Wallet",
    txCount: 18,
    isMainChain: true,
    confirmations: 100,
    reward: block.reward,
    feeReward: 3.2,
    jackpotContribution: Math.round(block.reward * 0.1),
    difficulty: "7.46T",
    nonce: 712948,
    minedAt: block.createdAt,
    miningElapsed: "00:00:12",
    coinbaseAddress: "0x7FA1B8D2C4E69012",
    version: "0x20000000",
    previousHash: `${block.hash}AA109FF2`,
    merkleRoot: `${block.hash}11302208`,
  };
}

export default function MinedBlocks({ blocks }: MinedBlocksProps) {
  const [selectedBlock, setSelectedBlock] = useState<DashboardBlockDetail | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const totalRewards = blocks.reduce((accumulator, block) => accumulator + block.reward, 0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

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
              <h2 className="font-display text-4xl font-extrabold leading-[1] tracking-[-0.04em] text-white sm:text-5xl">
                내가 채굴한 블록
              </h2>
            </div>
            <span className="mb-2 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-6 py-4 text-xl font-black text-success shadow-[0_4px_24px_rgba(16,185,129,0.15)] sm:text-2xl">
              <span className="mr-1 shrink-0 text-sm font-bold uppercase tracking-widest opacity-80">총 보상</span>
              <AnimatedNumber value={totalRewards} /> JACK
            </span>
          </div>
        }
      >
        <div ref={railRef} className="subtle-scroll overflow-x-auto pb-3">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <p className="font-display text-xl font-bold">채굴한 블록이 아직 없습니다.</p>
              <p className="mt-2 text-sm">대시보드의 블록 흐름에서 새 블록 상태를 확인해보세요.</p>
            </div>
          ) : (
            <div className="flex min-w-max items-center gap-4">
              {blocks.map((block, index) => (
                <motion.button
                  key={block.id}
                  type="button"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedBlock(toBlockDetail(block))}
                  className="h-44 w-[17rem] cursor-pointer overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-accent-gold/40"
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">블록 높이</p>
                        <p className="mt-2 font-display text-[1.7rem] font-black leading-none tracking-[-0.05em] text-white">
                          #{block.height}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-medium text-text-secondary">{block.createdAt}</p>
                    </div>

                    <div className="mt-auto rounded-[16px] border border-accent-gold/30 bg-accent-gold/10 px-4 pt-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(245,158,11,0.1)]">
                      <div className="flex h-[46px] flex-col">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-accent-gold/80">보상</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-accent-gold/80">해시</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                          <p className="font-display text-[1.15rem] font-extrabold leading-none text-accent-gold drop-shadow-sm">
                            <AnimatedNumber value={block.reward} suffix=" JACK" delay={0.2 + index * 0.08} />
                          </p>
                          <span className="font-mono text-base font-black lowercase leading-none text-accent-gold">
                            {getSingleHexDigit(block.hash)}
                          </span>
                        </div>
                        <div className="mt-auto h-px bg-accent-gold/15" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <BlockDetailModal block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    </>
  );
}
