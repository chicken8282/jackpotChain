import type { PointerEventHandler } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import BlockDetailModal from "./BlockDetailModal";
import BlockPrism from "./BlockPrism";
import {
  confirmedBlocks,
  dashboardStats,
  type DashboardBlockDetail,
} from "./dashboardMockData";

interface BlockchainVisualizerProps {
  blocks?: DashboardBlockDetail[];
  currentHeight?: number;
  activeNodes?: number;
}

interface DashboardBlockProps {
  block: DashboardBlockDetail;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (block: DashboardBlockDetail) => void;
}

function DashboardBlock({ block, hoveredId, onHover, onSelect }: DashboardBlockProps) {
  const active = hoveredId === block.id;

  return (
    <motion.button
      data-block-button="true"
      type="button"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      onHoverStart={() => onHover(block.id)}
      onHoverEnd={() => onHover(null)}
      onFocus={() => onHover(block.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(block)}
      className="group relative shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      <BlockPrism block={block} active={active} />
    </motion.button>
  );
}

function ChainLink({
  active,
}: {
  active: boolean;
}) {
  return (
    <motion.div
      animate={{
        opacity: active ? [0.48, 1, 0.48] : [0.24, 0.42, 0.24],
        scaleX: active ? [1, 1.08, 1] : 1,
        y: active ? [-1, 1, -1] : 0,
      }}
      transition={{ duration: active ? 1.2 : 2.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      className="relative z-0 h-[3px] w-[50px] shrink-0 overflow-hidden bg-[linear-gradient(90deg,rgba(59,130,246,0.2),rgba(255,214,110,0.92),rgba(59,130,246,0.2))] shadow-[0_0_28px_rgba(59,130,246,0.12)] sm:w-[54px]"
    >
      <span className="absolute inset-y-0 left-2 right-2 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.16),rgba(255,255,255,0.6),rgba(255,255,255,0.16))]" />
      <motion.span
        animate={{ x: ["-10%", "110%"] }}
        transition={{ duration: active ? 1.1 : 1.8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="absolute top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.9),rgba(255,255,255,0))] blur-[1px]"
      />
    </motion.div>
  );
}

export default function BlockchainVisualizer({
  blocks = confirmedBlocks,
  currentHeight = dashboardStats.currentHeight,
  activeNodes = dashboardStats.activeNodes,
}: BlockchainVisualizerProps) {
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.height - b.height),
    [blocks],
  );

  const dynamicCandidates = useMemo<DashboardBlockDetail[]>(
    () =>
      Array.from({ length: activeNodes }, (_, i) => ({
        id: `candidate-${currentHeight + 1 + i}`,
        height: currentHeight + 1 + i,
        hash: `0x${"0".repeat(40)}`,
        reward: 0,
        feeReward: 0,
        jackpotContribution: 0,
        status: "candidate" as const,
        txCount: 0,
        confirmations: 0,
        version: "0x20000000",
        previousHash: "",
        nonce: 0,
        difficulty: "-",
        minedAt: "대기 중",
        miningElapsed: "대기 중",
        isMainChain: true,
        minerLabel: "Pending Queue",
      })),
    [activeNodes, currentHeight],
  );

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<DashboardBlockDetail | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    startLeft: 0,
    moved: false,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const suppressClickUntil = useRef(0);
  const motionState = useRef({
    velocity: 0,
    bounce: 0,
    frame: 0 as number | null,
  });

  const setBounceOffset = (value: number) => {
    if (!contentRef.current) {
      return;
    }

    contentRef.current.style.transform = value === 0 ? "" : `translateX(${value}px)`;
  };

  const stopMotion = () => {
    const { frame } = motionState.current;
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }
    motionState.current.frame = null;
    motionState.current.velocity = 0;
    motionState.current.bounce = 0;
    setBounceOffset(0);
  };

  const runMomentumFrame = () => {
    const rail = railRef.current;
    if (!rail) {
      stopMotion();
      return;
    }

    const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const nextLeft = rail.scrollLeft + motionState.current.velocity;
    const clampedLeft = Math.min(Math.max(nextLeft, 0), maxScroll);
    const overshoot = clampedLeft - nextLeft;
    const bounceTarget = Math.max(-42, Math.min(42, overshoot * 0.34));

    rail.scrollLeft = clampedLeft;
    motionState.current.bounce += (bounceTarget - motionState.current.bounce) * (overshoot !== 0 ? 0.24 : 0.18);
    setBounceOffset(motionState.current.bounce);
    motionState.current.velocity *= overshoot !== 0 ? 0.55 : 0.92;

    if (Math.abs(motionState.current.velocity) < 0.18 && Math.abs(motionState.current.bounce) < 0.3) {
      stopMotion();
      return;
    }

    motionState.current.frame = window.requestAnimationFrame(runMomentumFrame);
  };

  const startMotion = () => {
    if (motionState.current.frame !== null) {
      return;
    }

    motionState.current.frame = window.requestAnimationFrame(runMomentumFrame);
  };

  useEffect(() => {
    const rail = railRef.current;
    const center = centerRef.current;
    if (!rail) {
      return;
    }

    const targetLeft =
      center?.offsetLeft !== undefined
        ? center.offsetLeft - rail.clientWidth / 2 + (center.clientWidth || 0) / 2
        : (rail.scrollWidth - rail.clientWidth) / 2;

    rail.scrollTo({ left: Math.max(targetLeft, 0) });
  }, []);

  useEffect(() => () => stopMotion(), []);

  const handleSelect = (block: DashboardBlockDetail) => {
    if (Date.now() < suppressClickUntil.current) {
      return;
    }
    if (block.status === "candidate") {
      return;
    }

    setSelectedBlock(block);
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const handleWheel = (event: WheelEvent) => {
      // 좌우 이동량이 적고 상하 이동량이 더 많은 경우라도
      // 이 영역 안에 마우스를 두고 휠을 굴리면 세로 스크롤은 막고 좌우 스크롤로 치환
      if (event.deltaY !== 0 || event.deltaX !== 0) {
        event.preventDefault();
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        motionState.current.velocity += delta * 0.16;
        startMotion();
      }
    };

    // passive: false로 등록해야 event.preventDefault() 정상 동작
    rail.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stopMotion();
      rail.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    if ((event.target as HTMLElement).closest("[data-block-button='true']")) {
      return;
    }

    stopMotion();
    dragState.current = {
      active: true,
      startX: event.clientX,
      startLeft: rail.scrollLeft,
      moved: false,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    rail.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const rail = railRef.current;
    if (!rail || !dragState.current.active) {
      return;
    }

    const delta = event.clientX - dragState.current.startX;
    if (Math.abs(delta) > 6) {
      dragState.current.moved = true;
    }

    const rawScrollLeft = dragState.current.startLeft - delta;
    const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const clampedScrollLeft = Math.min(Math.max(rawScrollLeft, 0), maxScroll);
    const overshoot = clampedScrollLeft - rawScrollLeft;

    rail.scrollLeft = clampedScrollLeft;
    motionState.current.bounce += (Math.max(-44, Math.min(44, overshoot * 0.4)) - motionState.current.bounce) * 0.3;
    setBounceOffset(motionState.current.bounce);

    const now = performance.now();
    const elapsed = Math.max(now - dragState.current.lastTime, 16);
    dragState.current.velocity = ((dragState.current.lastX - event.clientX) / elapsed) * 16;
    dragState.current.lastX = event.clientX;
    dragState.current.lastTime = now;
  };

  const endDrag = () => {
    if (dragState.current.moved) {
      suppressClickUntil.current = Date.now() + 140;
    }
    if (!dragState.current.active) {
      return;
    }

    motionState.current.velocity += dragState.current.velocity * 0.9;
    if (
      motionState.current.frame === null &&
      (Math.abs(motionState.current.velocity) >= 0.2 || Math.abs(motionState.current.bounce) >= 0.2)
    ) {
      startMotion();
    }
    dragState.current.active = false;
  };

  return (
    <>
      <section className="relative isolate pt-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_50%_24%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_50%_26%,rgba(229,160,0,0.1),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_78%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-10 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full">
            <span className="rounded-full border border-info/20 bg-info/10 px-3 py-1 text-[11px] tracking-[0.2em] text-info font-bold uppercase">
              라이브 네트워크
            </span>
            <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.04em] text-white">
              블록 체인 흐름
            </h1>
          </div>

          <div className="flex flex-row items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-border bg-surface px-5 py-4 shadow-sm min-w-[140px] text-center">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1">현재 높이</span>
              <span className="font-display text-2xl font-bold text-text-primary">#{currentHeight}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-info/30 bg-info/5 px-5 py-4 shadow-[0_4px_24px_rgba(59,130,246,0.1)] min-w-[140px] text-center">
              <span className="text-[11px] font-bold text-info uppercase tracking-widest mb-1">활성 노드</span>
              <span className="font-display text-2xl font-bold text-text-primary">{activeNodes}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-4 xl:-mx-[100px] xl:px-[100px]">
          <div
            ref={railRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            className="dashboard-rail relative overflow-x-auto overflow-y-visible px-0 pb-10 pt-20 [cursor:grab] active:[cursor:grabbing]"
          >

            <div ref={contentRef} className="flex min-w-max items-center will-change-transform xl:px-[18vw]">
              {sortedBlocks.map((block, index) => (
                <div key={block.id} className="group flex items-center">
                  <DashboardBlock
                    block={block}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    onSelect={handleSelect}
                  />
                  {index < sortedBlocks.length - 1 ? (
                    <div className="-mx-[6px] z-0">
                      <ChainLink
                        active={hoveredId === block.id || hoveredId === sortedBlocks[index + 1].id}
                      />
                    </div>
                  ) : null}
                </div>
              ))}

              <div
                ref={centerRef}
                className="relative mx-[40px] flex h-[350px] w-[140px] shrink-0 flex-col items-center justify-center sm:mx-[60px]"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                  <div className="inline-block rounded-full border border-white/12 bg-[rgba(8,13,24,0.92)] px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] text-text-primary uppercase backdrop-blur-md mb-2">
                    합의 경계
                  </div>
                </div>

                <div className="absolute top-2 -left-[140px] whitespace-nowrap">
                  <div className="rounded-full border border-accent-gold/18 bg-[rgba(10,16,29,0.82)] px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-accent-gold uppercase backdrop-blur-md">
                    확정 블록
                  </div>
                </div>

                <div className="absolute top-2 -right-[140px] whitespace-nowrap">
                  <div className="rounded-full border border-info/18 bg-[rgba(10,16,29,0.82)] px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-info uppercase backdrop-blur-md">
                    후보 블록
                  </div>
                </div>

                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.4),transparent)]" />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4], scaleX: [1, 1.08, 1] }}
                  transition={{ duration: 1.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="relative z-0 h-[18px] w-[92px] rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.8),rgba(255,255,255,0.92),rgba(229,160,0,0.86))] shadow-[0_0_36px_rgba(255,255,255,0.16)]"
                >
                  <span className="absolute inset-y-[4px] inset-x-3 rounded-full bg-white/30" />
                </motion.div>
              </div>

              {dynamicCandidates.map((block, index) => (
                <div key={block.id} className="group flex items-center">
                  {index === 0 ? (
                    <div className="-mx-[6px] z-0">
                      <ChainLink active={hoveredId === block.id} />
                    </div>
                  ) : null}
                  <DashboardBlock
                    block={block}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    onSelect={handleSelect}
                  />
                  {index < dynamicCandidates.length - 1 ? (
                    <div className="-mx-[6px] z-0">
                      <ChainLink
                        active={hoveredId === block.id || hoveredId === dynamicCandidates[index + 1].id}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BlockDetailModal block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    </>
  );
}
