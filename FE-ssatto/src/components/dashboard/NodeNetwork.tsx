import { useState } from "react";
import { motion } from "motion/react";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";
import { dashboardStats } from "./dashboardMockData";

const nodes = [
  { id: "center", x: 210, y: 158, size: 20, label: "중앙 노드" },
  { id: "n1", x: 112, y: 82, size: 13, label: "노드 01" },
  { id: "n2", x: 214, y: 52, size: 13, label: "노드 02" },
  { id: "n3", x: 326, y: 86, size: 13, label: "노드 03" },
  { id: "n4", x: 78, y: 190, size: 12, label: "노드 04" },
  { id: "n5", x: 340, y: 194, size: 12, label: "노드 05" },
  { id: "n6", x: 132, y: 282, size: 13, label: "노드 06" },
  { id: "n7", x: 288, y: 288, size: 13, label: "노드 07" },
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

export default function NodeNetwork() {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const getCurve = (
    start: (typeof nodes)[number],
    end: (typeof nodes)[number],
    from: string,
    to: string,
  ) => {
    const curveX = (start.x + end.x) / 2;
    const curveY = (start.y + end.y) / 2 - (from === "center" || to === "center" ? 24 : 12);

    return `M ${start.x} ${start.y} Q ${curveX} ${curveY} ${end.x} ${end.y}`;
  };

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-[24px] border border-border bg-surface px-5 py-6 sm:px-6 shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_70%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white">노드 네트워크</h3>
          <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-info">
            활성 노드 {dashboardStats.activeNodes}개
          </span>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-2 py-3">
          <svg viewBox="0 0 420 340" className="h-[350px] w-full">
            <defs>
              <linearGradient id="node-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.08)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.74)" />
                <stop offset="100%" stopColor="rgba(229,160,0,0.14)" />
              </linearGradient>
            </defs>

            <circle cx="210" cy="160" r="118" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 10" />
            <circle cx="210" cy="160" r="78" fill="none" stroke="rgba(59,130,246,0.12)" strokeDasharray="2 8" />

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
                    strokeWidth={highlighted ? 2.8 : 1.6}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                  />
                  <motion.circle
                    r={highlighted ? 3.5 : 2.5}
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
                      duration: highlighted ? 1.8 : 2.8,
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
                    r={node.size + 10}
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
                    strokeWidth="2.2"
                  />
                  <text
                    x={node.x}
                    y={node.y + 32}
                    textAnchor="middle"
                    fill="rgba(226,232,240,0.86)"
                    fontSize="11"
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
    </motion.section>
  );
}
