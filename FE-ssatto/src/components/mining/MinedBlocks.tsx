import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import BlockDetailModal from "../dashboard/BlockDetailModal";
import type { DashboardBlockDetail } from "../dashboard/dashboardMockData";
import type { MinedBlock } from "../../types";

interface MinedBlocksProps {
  blocks: MinedBlock[];
  totalRewardJack?: number;
  appendedBlockCount?: number;
  latestBlockHeight?: number | null;
  autoAppendCount?: number;
  maxAutoAppendPages?: number;
  isAutoAppendBlocked?: boolean;
  hasNext?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  onLoadMore?: (mode?: "manual" | "auto") => void;
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

export default function MinedBlocks({
  blocks,
  totalRewardJack,
  appendedBlockCount = 0,
  latestBlockHeight = null,
  autoAppendCount = 0,
  maxAutoAppendPages = 0,
  isAutoAppendBlocked = false,
  hasNext = false,
  isLoadingMore = false,
  error = null,
  onLoadMore,
}: MinedBlocksProps) {
  const [selectedBlock, setSelectedBlock] = useState<DashboardBlockDetail | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const totalRewards = totalRewardJack ?? blocks.reduce((accumulator, block) => accumulator + block.reward, 0);

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

  useEffect(() => {
    const target = loadMoreSentinelRef.current;
    if (!target || !hasNext || isLoadingMore || !onLoadMore || isAutoAppendBlocked) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore("auto");
        }
      },
      {
        rootMargin: "0px 240px 0px 240px",
        threshold: 0.4,
      },
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasNext, isAutoAppendBlocked, isLoadingMore, onLoadMore]);

  const scrollToLatest = () => {
    railRef.current?.scrollTo({
      left: 0,
      behavior: "smooth",
    });
  };

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
        <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent-blue/25 bg-accent-blue/10 px-3 py-1 text-xs font-bold text-accent-blue">
              최신 1페이지 자동 동기화
            </span>
            {latestBlockHeight != null ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-text-secondary">
                최신 높이 #{latestBlockHeight}
              </span>
            ) : null}
            {appendedBlockCount > 0 ? (
              <span className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-3 py-1 text-xs font-bold text-accent-gold">
                이전 블록 {appendedBlockCount}개 이어서 확인 중
              </span>
            ) : null}
            {hasNext ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-text-secondary">
                자동 이어보기 {autoAppendCount}/{maxAutoAppendPages}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span>
              {isAutoAppendBlocked
                ? "자동 이어보기 한도에 도달했습니다. 계속 보려면 버튼으로 직접 불러오세요."
                : "아래 구간이 보이면 이전 블록을 자동으로 이어서 불러옵니다."}
            </span>
            {appendedBlockCount > 0 ? (
              <button
                type="button"
                onClick={scrollToLatest}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold text-white transition-colors hover:bg-white/10"
              >
                최신 블록 위치로 이동
              </button>
            ) : null}
          </div>
        </div>
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
        <div
          ref={loadMoreSentinelRef}
          className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-xs text-text-secondary"
        >
          {hasNext
            ? isLoadingMore
              ? "이전 채굴 블록을 이어서 불러오는 중입니다."
              : isAutoAppendBlocked
                ? "자동 이어보기는 여기까지 진행되었습니다. 아래 버튼으로 계속 확인할 수 있습니다."
                : "이 영역까지 오면 이전 채굴 블록을 자동으로 더 불러옵니다."
            : "지금 보이는 목록이 마지막 채굴 블록입니다."}
        </div>
        {error ? (
          <div className="mt-4 rounded-[18px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            채굴 블록을 불러오는 중 문제가 발생했습니다. {error}
          </div>
        ) : null}
        {blocks.length > 0 ? (
          <div className="mt-5 flex justify-center">
            {hasNext ? (
              <button
                type="button"
                onClick={() => onLoadMore?.("manual")}
                disabled={isLoadingMore}
                className="rounded-[16px] border border-accent-gold/30 bg-accent-gold/10 px-5 py-3 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? "불러오는 중..." : isAutoAppendBlocked ? "이전 채굴 블록 직접 더 보기" : "이전 채굴 블록 더 보기"}
              </button>
            ) : (
              <span className="rounded-[16px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-text-secondary">
                불러올 채굴 블록이 더 없습니다.
              </span>
            )}
          </div>
        ) : null}
      </Card>

      <BlockDetailModal block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    </>
  );
}
