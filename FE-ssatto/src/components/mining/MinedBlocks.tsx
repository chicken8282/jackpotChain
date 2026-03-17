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
                <div key={block.id} className="flex items-center gap-4">
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedBlock(toBlockDetail(block))}
                    className="w-[300px] cursor-pointer rounded-[24px] border border-border bg-surface px-6 py-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-accent-gold/40"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">블록 높이</p>
                      <p className="font-mono text-sm font-medium text-text-secondary">{block.createdAt}</p>
                    </div>
                    <p className="mt-2 font-display text-4xl font-extrabold text-white">#{block.height}</p>
                    <p className="mt-3 truncate font-mono text-[11px] font-medium tracking-wide text-text-tertiary">
                      {block.hash}
                    </p>
                    <div className="mt-6 flex items-end justify-between rounded-[16px] border border-accent-gold/30 bg-accent-gold/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(245,158,11,0.1)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/80">보상</p>
                        <p className="mt-1 font-display text-3xl font-extrabold text-accent-gold drop-shadow-sm">
                          <AnimatedNumber value={block.reward} suffix="JACK" delay={0.2 + index * 0.08} />
                        </p>
                      </div>
                      <span className="rounded-md border border-accent-gold/20 bg-accent-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                        상세 보기
                      </span>
                    </div>
                  </motion.button>
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
