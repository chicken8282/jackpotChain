// [학습 프론트엔드 v2] 추가: 최종 정리 — 네트워크 참여~전파 인터랙티브 시각화
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const glass = "backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl";

/* ── 타입 ── */
type Phase = "idle" | "join" | "discover" | "sync" | "ready" | "mining" | "tx";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "seed" | "peer" | "me";
}

interface Edge {
  from: string;
  to: string;
}

interface Particle {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  type: "block" | "tx" | "sync";
}

/* ── 고정 노드 배치 ── */
const SEED_NODES: Node[] = [
  { id: "seed1", label: "시드 노드 1", x: 340, y: 200, type: "seed" },
  { id: "seed2", label: "시드 노드 2", x: 560, y: 200, type: "seed" },
];

const PEER_NODES: Node[] = [
  { id: "peer1", label: "피어 A", x: 200, y: 100, type: "peer" },
  { id: "peer2", label: "피어 B", x: 700, y: 120, type: "peer" },
  { id: "peer3", label: "피어 C", x: 180, y: 320, type: "peer" },
  { id: "peer4", label: "피어 D", x: 720, y: 310, type: "peer" },
  { id: "peer5", label: "피어 E", x: 450, y: 80, type: "peer" },
];

const MY_NODE: Node = { id: "me", label: "내 노드", x: 450, y: 370, type: "me" };

const EXISTING_EDGES: Edge[] = [
  { from: "seed1", to: "seed2" },
  { from: "seed1", to: "peer1" },
  { from: "seed1", to: "peer3" },
  { from: "seed2", to: "peer2" },
  { from: "seed2", to: "peer4" },
  { from: "seed1", to: "peer5" },
  { from: "seed2", to: "peer5" },
  { from: "peer1", to: "peer5" },
];

const DISCOVER_EDGES: Edge[] = [
  { from: "me", to: "seed1" },
  { from: "me", to: "seed2" },
  { from: "me", to: "peer3" },
];

/* ── 노드 컴포넌트 ── */
function NodeCircle({ node, phase, delay = 0 }: { node: Node; phase: Phase; delay?: number }) {
  const colors = {
    seed: { fill: "#f59e0b", stroke: "#f59e0b", text: "text-amber-400" },
    peer: { fill: "#6366f1", stroke: "#818cf8", text: "text-indigo-300" },
    me: { fill: "#22c55e", stroke: "#22c55e", text: "text-green-400" },
  };
  const c = colors[node.type];

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 15 }}
    >
      {/* 글로우 */}
      {node.type === "me" && (
        <motion.circle
          cx={node.x} cy={node.y} r={28}
          fill="none" stroke={c.stroke} strokeWidth={1.5}
          opacity={0.3}
          animate={{ r: [28, 36, 28], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {node.type === "seed" && (
        <motion.circle
          cx={node.x} cy={node.y} r={26}
          fill="none" stroke={c.stroke} strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.3}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        />
      )}
      {/* 본체 */}
      <circle cx={node.x} cy={node.y} r={20} fill={c.fill} opacity={0.15} stroke={c.stroke} strokeWidth={1.5} />
      <circle cx={node.x} cy={node.y} r={8} fill={c.fill} opacity={0.9} />
      {/* 라벨 */}
      <text x={node.x} y={node.y + 34} textAnchor="middle" className={`${c.text} text-[10px] font-semibold`} fill="currentColor">
        {node.label}
      </text>

      {/* 블록카운터 (동기화 이후) */}
      {node.type === "me" && (phase === "sync" || phase === "ready" || phase === "mining" || phase === "tx") && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <rect x={node.x + 22} y={node.y - 14} width={46} height={18} rx={6} fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.3)" strokeWidth={0.5} />
          <text x={node.x + 45} y={node.y - 2} textAnchor="middle" fill="#22c55e" className="text-[9px] font-mono">
            #1,284
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}

/* ── 연결선 ── */
function EdgeLine({ edge, nodes, delay = 0, dashed = false }: { edge: Edge; nodes: Node[]; delay?: number; dashed?: boolean }) {
  const from = nodes.find((n) => n.id === edge.from)!;
  const to = nodes.find((n) => n.id === edge.to)!;

  return (
    <motion.line
      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
      stroke="rgba(255,255,255,0.08)"
      strokeWidth={1}
      strokeDasharray={dashed ? "6 4" : "none"}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
    />
  );
}

/* ── 데이터 파티클 ── */
function DataParticle({ particle, delay = 0 }: { particle: Particle; delay?: number }) {
  const isBlock = particle.type === "block";

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{
        translateX: [particle.fromX, particle.toX],
        translateY: [particle.fromY, particle.toY],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ delay, duration: 1.2, ease: "easeInOut" }}
    >
      {isBlock ? (
        <rect x={-5} y={-5} width={10} height={10} rx={2} fill={particle.color} />
      ) : (
        <circle r={4} fill={particle.color} />
      )}
    </motion.g>
  );
}

/* ── 단계 정보 ── */
const PHASE_INFO: Record<Phase, { title: string; desc: string }> = {
  idle: { title: "네트워크 미참여", desc: "시드 노드와 기존 피어들이 연결되어 있는 네트워크입니다" },
  join: { title: "1. 네트워크 참여", desc: "내 노드가 네트워크에 등장했습니다. 아직 어떤 노드와도 연결되지 않았습니다." },
  discover: { title: "2. 피어 찾기", desc: "시드 노드에 접속하여 피어 목록을 받고, 주변 노드들과 연결합니다." },
  sync: { title: "3. 동기화", desc: "연결된 피어로부터 블록 데이터를 받아 최신 상태로 동기화합니다." },
  ready: { title: "동기화 완료!", desc: "최신 블록까지 동기화 완료. 이제 채굴하거나 트랜잭션을 전파할 수 있습니다." },
  mining: { title: "4-A. 채굴 & 블록 전파", desc: "멤풀에서 TX를 모아 블록을 생성하고, 연결된 피어에게 전파합니다." },
  tx: { title: "4-B. 트랜잭션 전파", desc: "새 트랜잭션을 생성하여 연결된 피어에게 전파합니다." },
};

/* ── 메인 컴포넌트 ── */
export default function NetworkDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const allNodes = [...SEED_NODES, ...PEER_NODES];
  const allNodesWithMe = [...allNodes, MY_NODE];

  const showMe = phase !== "idle";
  const showDiscoverEdges = phase !== "idle" && phase !== "join";

  // BFS flood 전파 유틸
  const floodPropagate = useCallback((
    senderId: string,
    color: string,
    type: "block" | "tx",
    edges: Edge[],
    nodesPool: Node[],
  ) => {
    const visited = new Set<string>([senderId]);
    // BFS 큐: [nodeId, hopDelay]
    const queue: [string, number][] = [[senderId, 0]];

    while (queue.length > 0) {
      const [currentId, hopDelay] = queue.shift()!;
      const currentNode = nodesPool.find((n) => n.id === currentId)!;

      const connectedEdges = edges.filter(
        (e) => e.from === currentId || e.to === currentId,
      );

      connectedEdges.forEach((edge, i) => {
        const neighborId = edge.from === currentId ? edge.to : edge.from;
        if (visited.has(neighborId)) return;
        visited.add(neighborId);

        const neighbor = nodesPool.find((n) => n.id === neighborId);
        if (!neighbor) return;

        const delay = hopDelay + i * 150;
        setTimeout(() => {
          const id = `flood-${particleIdRef.current++}`;
          setParticles((prev) => [...prev, {
            id,
            fromX: currentNode.x, fromY: currentNode.y,
            toX: neighbor.x, toY: neighbor.y,
            color, type,
          }]);
          setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== id)), 1500);
        }, delay);

        queue.push([neighborId, delay + 800]);
      });
    }
  }, []);

  // 배경 활동: 기존 피어들의 블록/TX 전파
  useEffect(() => {
    const getEdges = () => showDiscoverEdges ? [...EXISTING_EDGES, ...DISCOVER_EDGES] : EXISTING_EDGES;
    const getNodes = () => showDiscoverEdges ? allNodesWithMe : allNodes;

    const emitBackground = () => {
      const candidates = [...SEED_NODES, ...PEER_NODES];
      const sender = candidates[Math.floor(Math.random() * candidates.length)];
      const isBlock = Math.random() < 0.35;
      const color = isBlock ? "#22c55e" : "#f59e0b";
      const type: "block" | "tx" = isBlock ? "block" : "tx";

      floodPropagate(sender.id, color, type, getEdges(), getNodes());
    };

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 2500 + Math.random() * 2500;
      timer = setTimeout(() => {
        emitBackground();
        schedule();
      }, delay);
    };
    const initial = setTimeout(() => {
      emitBackground();
      schedule();
    }, 1000);

    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
    };
  }, [phase, showDiscoverEdges, floodPropagate]);

  // 동기화 파티클
  useEffect(() => {
    if (phase !== "sync") return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    DISCOVER_EDGES.forEach((edge, i) => {
      const from = allNodesWithMe.find((n) => n.id === edge.from)!;
      const to = allNodesWithMe.find((n) => n.id === edge.to)!;
      // 피어 → 내 노드 방향으로 데이터 흐름
      const srcNode = from.id === "me" ? to : from;
      const dstNode = from.id === "me" ? from : to;

      for (let j = 0; j < 3; j++) {
        timers.push(setTimeout(() => {
          const id = `sync-${particleIdRef.current++}`;
          setParticles((prev) => [...prev, {
            id, fromX: srcNode.x, fromY: srcNode.y,
            toX: dstNode.x, toY: dstNode.y,
            color: "#6366f1", type: "sync",
          }]);
          setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== id)), 1500);
        }, i * 400 + j * 500));
      }
    });

    const readyTimer = setTimeout(() => setPhase("ready"), 3500);
    timers.push(readyTimer);

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // 채굴/TX 전파 파티클 (BFS flood)
  const emitPropagation = useCallback((type: "block" | "tx") => {
    const color = type === "block" ? "#22c55e" : "#f59e0b";
    const allEdges = [...EXISTING_EDGES, ...DISCOVER_EDGES];
    floodPropagate("me", color, type, allEdges, allNodesWithMe);
  }, [floodPropagate]);

  const handleMining = useCallback(() => {
    setPhase("mining");
    emitPropagation("block");
  }, [emitPropagation]);

  const handleTx = useCallback(() => {
    setPhase("tx");
    emitPropagation("tx");
  }, [emitPropagation]);

  const reset = useCallback(() => {
    setPhase("idle");
    setParticles([]);
  }, []);

  const info = PHASE_INFO[phase];

  return (
    <div className="flex flex-col items-center gap-5">
      {/* 상태 메시지 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-center"
        >
          <p className={`font-bold text-sm ${
            phase === "ready" ? "text-green-400"
            : phase === "mining" ? "text-green-400"
            : phase === "tx" ? "text-orange-400"
            : phase === "discover" || phase === "sync" ? "text-blue-400"
            : "text-white/60"
          }`}>
            {info.title}
          </p>
          <p className="text-white/40 text-xs mt-1 max-w-md">{info.desc}</p>
        </motion.div>
      </AnimatePresence>

      {/* SVG 네트워크 */}
      <div className={`${glass} p-2 w-full max-w-3xl overflow-hidden`}>
        <svg viewBox="0 0 900 440" className="w-full h-auto">
          {/* 기존 연결선 */}
          {EXISTING_EDGES.map((edge, i) => (
            <EdgeLine key={`e-${i}`} edge={edge} nodes={allNodes} delay={i * 0.05} />
          ))}

          {/* 내 노드 연결선 */}
          {showDiscoverEdges && DISCOVER_EDGES.map((edge, i) => (
            <EdgeLine key={`d-${i}`} edge={edge} nodes={allNodesWithMe} delay={i * 0.5} dashed={phase === "discover"} />
          ))}

          {/* 파티클 */}
          <AnimatePresence>
            {particles.map((p) => (
              <DataParticle key={p.id} particle={p} />
            ))}
          </AnimatePresence>

          {/* 기존 노드 */}
          {SEED_NODES.map((n, i) => (
            <NodeCircle key={n.id} node={n} phase={phase} delay={i * 0.1} />
          ))}
          {PEER_NODES.map((n, i) => (
            <NodeCircle key={n.id} node={n} phase={phase} delay={0.2 + i * 0.08} />
          ))}

          {/* 내 노드 */}
          {showMe && <NodeCircle node={MY_NODE} phase={phase} delay={0} />}
        </svg>
      </div>

      {/* 버튼 바 */}
      <div className="flex flex-wrap gap-3 justify-center">
        {phase === "idle" && (
          <StepButton onClick={() => setPhase("join")} color="text-green-400">
            네트워크 참여
          </StepButton>
        )}
        {phase === "join" && (
          <StepButton onClick={() => setPhase("discover")} color="text-blue-400">
            피어 찾기
          </StepButton>
        )}
        {phase === "discover" && (
          <StepButton onClick={() => setPhase("sync")} color="text-indigo-400">
            동기화 시작
          </StepButton>
        )}
        {phase === "ready" && (
          <>
            <StepButton onClick={handleMining} color="text-green-400">
              채굴 (블록 전파)
            </StepButton>
            <StepButton onClick={handleTx} color="text-orange-400">
              TX 생성 (전파)
            </StepButton>
          </>
        )}
        {(phase === "mining" || phase === "tx") && (
          <StepButton onClick={() => setPhase("ready")} color="text-white/60">
            돌아가기
          </StepButton>
        )}
        {phase !== "idle" && (
          <StepButton onClick={reset} color="text-white/30">
            초기화
          </StepButton>
        )}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-white/30 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" /> 시드 노드
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 inline-block" /> 피어 노드
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" /> 내 노드
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500/80 inline-block" /> 블록
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" /> TX
        </span>
      </div>
    </div>
  );
}

function StepButton({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${glass} px-5 py-2.5 ${color} font-semibold text-sm cursor-pointer`}
    >
      {children}
    </motion.button>
  );
}
