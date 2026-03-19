import { useState } from "react";
import { motion } from "motion/react";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";
import { dashboardStats } from "./dashboardMockData";

const nodes = [
  { id: "center", x: 210, y: 148, size: 16, label: "중앙 노드" },
  { id: "n1", x: 128, y: 94, size: 11, label: "노드 01" },
  { id: "n2", x: 212, y: 72, size: 11, label: "노드 02" },
  { id: "n3", x: 294, y: 96, size: 11, label: "노드 03" },
  { id: "n4", x: 98, y: 182, size: 10, label: "노드 04" },
  { id: "n5", x: 320, y: 184, size: 10, label: "노드 05" },
  { id: "n6", x: 146, y: 244, size: 11, label: "노드 06" },
  { id: "n7", x: 274, y: 246, size: 11, label: "노드 07" },
];

const links = [
  ["center", "n1"],
  ["center", "n2"],
  ["center", "n3"],
  ["center", "n4"],
  ["center", "n5"],
  ["center", "n6"],
  ["center", "n7"],
  ["n1", "n2"],
  ["n2", "n3"],
  ["n4", "n6"],
  ["n5", "n7"],
] as const;

interface NodeNetworkProps {
  activeNodes?: number;
}

export default function NodeNetwork({ activeNodes = dashboardStats.activeNodes }: NodeNetworkProps) {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const getCurve = (
    start: (typeof nodes)[number],
    end: (typeof nodes)[number],
    from: string,
    to: string,
  ) => {
    const curveX = (start.x + end.x) / 2;
    const curveY = (start.y + end.y) / 2 - (from === "center" || to === "center" ? 18 : 10);

    return `M ${start.x} ${start.y} Q ${curveX} ${curveY} ${end.x} ${end.y}`;
  };

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative flex h-full min-h-[228px] flex-col overflow-hidden rounded-[24px] border border-border bg-surface px-4 pb-4 pt-4 shadow-sm sm:px-5"
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_70%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-[1.5rem] font-bold text-white">노드 네트워크</h3>
          <span className="rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-info">
            활성 노드 {activeNodes}개
          </span>
        </div>

        <div className="mt-2 flex flex-1 items-stretch justify-center rounded-[22px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-2 py-2 lg:px-3 lg:py-3">
          <div className="flex h-full min-h-[112px] w-full items-center justify-center">
            <div className="flex h-full w-full max-h-[280px] max-w-[392px] items-center justify-center">
              <svg viewBox="0 0 420 300" className="h-full w-full">
            <defs>
              <linearGradient id="node-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.08)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.74)" />
                <stop offset="100%" stopColor="rgba(229,160,0,0.14)" />
              </linearGradient>
            </defs>

            <circle cx="210" cy="148" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 10" />
            <circle cx="210" cy="148" r="66" fill="none" stroke="rgba(59,130,246,0.12)" strokeDasharray="2 8" />

            {links.map(([from, to], index) => {
              const fromId = String(from);
              const toId = String(to);
              const start = nodes.find((node) => node.id === from)!;
              const end = nodes.find((node) => node.id === to)!;
              const highlighted = activeNode
                ? activeNode === fromId || activeNode === toId
                : fromId === "center" || toId === "center";
              const path = getCurve(start, end, fromId, toId);

              return (
                <g key={`${from}-${to}`}>
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={highlighted ? "url(#node-line)" : "rgba(59,130,246,0.18)"}
                    strokeWidth={highlighted ? 2.4 : 1.4}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                  />
                  <motion.circle
                    r={highlighted ? 3 : 2.2}
                    fill={highlighted ? "rgba(255,255,255,0.92)" : "rgba(96,165,250,0.82)"}
                    animate={
                      inView
                        ? {
                          opacity: [0, 1, 0],
                          offsetDistance: ["0%", "100%"],
                        }
                        : {}
                    }
                    style={{ offsetPath: `path("${path}")` }}
                    transition={{
                      duration: highlighted ? 1.7 : 2.6,
                      delay: index * 0.1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                </g>
              );
            })}

            {nodes.map((node) => {
              const highlighted = activeNode ? activeNode === node.id : node.id === "center";
              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 8}
                    fill="rgba(59,130,246,0.08)"
                    animate={highlighted ? { opacity: [0.25, 0.5, 0.25] } : { opacity: 0.18 }}
                    transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill={node.id === "center" ? "rgba(229,160,0,0.95)" : "rgba(12,22,42,0.98)"}
                    stroke={node.id === "center" ? "rgba(255,232,179,0.95)" : "rgba(96,165,250,0.7)"}
                    strokeWidth="2"
                  />
                  <text
                    x={node.x}
                    y={node.y + 24}
                    textAnchor="middle"
                    fill="rgba(226,232,240,0.86)"
                    fontSize="10"
                    fontFamily="Pretendard"
                  >
                    {node.label}
                  </text>
                </motion.g>
              );
            })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
