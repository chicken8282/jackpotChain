/**
 * 모듈 0.1 — 체험하기 탭: 초인플레이션 시뮬레이션 게임
 *
 * 구조:
 *   1) 좌우 2열 — 왼쪽: 내 지갑 + 돈벌기 / 오른쪽: 빵 이미지 + 현재 가격
 *   2) 격차 경고 텍스트 (빵 가격 > 자산 × 10 이상)
 *   3) 실시간 이중 라인 그래프 (recharts: 내 자산 vs 빵 가격)
 *   4) 게임 종료 오버레이 (빵 가격 > 자산 × 300)
 *
 * 핵심 체험:
 *   - 사용자가 아무리 빠르게 클릭해도 인플레이션을 이길 수 없음을 체감
 *   - 그래프에서 자산(파란선)과 빵 가격(빨간선)의 격차가 극적으로 벌어짐
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ================================================================
   게임 상수
   ================================================================ */

const INITIAL_BREAD_PRICE = 100;   // 빵 초기 가격 (Z$)
const EARN_AMOUNT = 1000;          // 클릭당 획득 금액 (Z$)
const PRICE_MULTIPLIER = 1.5;      // 매 tick마다 빵 가격 곱셈 계수
const GAME_OVER_RATIO = 300;       // 게임 종료 조건: 빵 가격 > 자산 × 이 값
const TICK_INTERVAL = 1000;        // 가격 상승 주기 (ms)

/* ================================================================
   유틸리티 함수
   ================================================================ */

/**
 * 빵 가격 구간에 따른 이모지·라벨·크기 반환
 * 가격이 올라갈수록 빵이 작아지는 연출
 */
function getBreadInfo(price: number) {
  if (price < 1_000)        return { emoji: "🍞", label: "빵 한 덩이",    size: "text-7xl" };
  if (price < 100_000)      return { emoji: "🥖", label: "빵 반 덩이",    size: "text-6xl" };
  if (price < 10_000_000)   return { emoji: "🫓", label: "빵 한 조각",    size: "text-5xl" };
  return                           { emoji: "💨", label: "빵 부스러기...", size: "text-4xl" };
}

/** Z$ 금액을 읽기 쉬운 한국어 단위로 포맷 */
function formatZ(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조`;
  if (n >= 100_000_000)       return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000)            return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString();
}

/* ================================================================
   파티클 컴포넌트 — 돈벌기 클릭 시 "+1,000 Z$" 텍스트 애니메이션
   ================================================================ */

interface Particle {
  id: number;
  x: number;
  y: number;
}

function EarnParticle({ particle, onDone }: { particle: Particle; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(particle.id), 800);
    return () => clearTimeout(t);
  }, [particle.id, onDone]);

  return (
    <motion.span
      className="absolute text-green-400 font-bold text-sm pointer-events-none select-none"
      style={{ left: particle.x, top: particle.y }}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8 }}
    >
      +1,000 Z$
    </motion.span>
  );
}

/* ================================================================
   메인 컴포넌트
   ================================================================ */

interface InflationGameProps {
  /** 검증 미션 탭으로 전환하는 콜백 (ModuleCanvas에서 주입) */
  onGoVerify?: () => void;
}

export default function InflationGame({ onGoVerify }: InflationGameProps) {
  /* ── 상태 ────────────────────────────────────────── */
  const [money, setMoney] = useState(0);
  const [breadPrice, setBreadPrice] = useState(INITIAL_BREAD_PRICE);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [chartData, setChartData] = useState<{ t: number; asset: number; price: number }[]>([]);

  const particleId = useRef(0);
  const moneyRef = useRef(0); // setInterval 콜백에서 최신 money 참조용

  /* ── money → ref 동기화 ──────────────────────────── */
  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  /* ── 매 tick 빵 가격 상승 + 차트 데이터 추가 ────── */
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setBreadPrice((prev) => {
        const next = Math.round(prev * PRICE_MULTIPLIER);

        // 게임 종료 조건 체크
        if (next > moneyRef.current * GAME_OVER_RATIO && moneyRef.current > 0) {
          setGameOver(true);
        }

        // 차트 데이터 포인트 추가 (asset은 최소 1 — 로그 스케일 안전)
        setElapsed((e) => {
          const newE = e + 1;
          setChartData((cd) => [
            ...cd,
            { t: newE, asset: Math.max(moneyRef.current, 1), price: next },
          ]);
          return newE;
        });

        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [gameOver]);

  /* ── 돈벌기 클릭 핸들러 ──────────────────────────── */
  const handleEarn = useCallback(
    (e: React.MouseEvent) => {
      if (gameOver) return;
      setMoney((m) => m + EARN_AMOUNT);

      // 클릭 위치 기준으로 파티클 생성
      const id = particleId.current++;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const parentRect = (e.target as HTMLElement).closest(".relative")?.getBoundingClientRect();
      setParticles((prev) => [
        ...prev,
        {
          id,
          x: rect.left - (parentRect?.left ?? 0) + rect.width / 2 - 30,
          y: rect.top - (parentRect?.top ?? 0) - 10,
        },
      ]);
    },
    [gameOver]
  );

  /** 파티클 애니메이션 완료 시 제거 */
  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ── 게임 재시작 ─────────────────────────────────── */
  const handleRestart = () => {
    setMoney(0);
    setBreadPrice(INITIAL_BREAD_PRICE);
    setElapsed(0);
    setGameOver(false);
    setParticles([]);
    setChartData([]);
    moneyRef.current = 0;
  };

  /* ── 파생 값 ─────────────────────────────────────── */
  const bread = getBreadInfo(breadPrice);
  const canBuy = money >= breadPrice;
  const gap = breadPrice > 0 ? breadPrice / Math.max(money, 1) : 0;

  /* ── 렌더 ────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── 설명 헤더 ─────────────────────────────────── */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">초인플레이션 체험</h3>
        <p className="text-sm text-white/50 mt-1">
          돈을 벌어서 빵을 사보세요. 과연 인플레이션을 이길 수 있을까요?
        </p>
      </div>

      {/* ── 좌우 2열: 지갑 / 빵 가격 ──────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* 왼쪽: 내 지갑 */}
        <div className="relative rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/[0.06] to-blue-600/[0.02] p-6 flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">내 지갑</p>
          <motion.p
            className="text-3xl font-bold text-white font-mono"
            key={money}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            Z$ {formatZ(money)}
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleEarn}
            disabled={gameOver}
            className="px-6 py-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500/30 transition-colors"
          >
            💰 돈 벌기
          </motion.button>
          {/* "+1,000 Z$" 파티클 애니메이션 */}
          <AnimatePresence>
            {particles.map((p) => (
              <EarnParticle key={p.id} particle={p} onDone={removeParticle} />
            ))}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 빵 한 덩이 */}
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.06] to-orange-600/[0.02] p-6 flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">빵 한 덩이</p>
          {/* 빵 이모지 — 가격 구간에 따라 크기·종류 변화 */}
          <motion.span
            className={bread.size}
            key={bread.emoji}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {bread.emoji}
          </motion.span>
          <p className="text-[11px] text-white/40">{bread.label}</p>
          {/* 현재 빵 가격 */}
          <motion.p
            className="text-2xl font-bold text-orange-300 font-mono"
            key={breadPrice}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            Z$ {formatZ(breadPrice)}
          </motion.p>
          {/* 구매 가능 여부 표시 */}
          <p className={`text-xs font-semibold ${canBuy ? "text-green-400" : "text-red-400"}`}>
            {canBuy ? "✅ 구매 가능" : "돈이 부족합니다 😢"}
          </p>
        </div>
      </div>

      {/* ── 격차 경고 텍스트 ──────────────────────────── */}
      {gap > 10 && !gameOver && (
        <motion.p
          className="text-center text-sm font-semibold text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          📈 격차가 커지고 있어요! 빵 가격이 자산의 {Math.round(gap)}배입니다
        </motion.p>
      )}

      {/* ── 실시간 이중 라인 그래프 ───────────────────── */}
      {/* recharts LineChart: 파란선(내 자산) vs 빨간선(빵 가격) */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 text-center">
            실시간 자산 vs 빵 가격
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="t"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                label={{ value: "초", position: "insideBottomRight", fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              />
              {/* Y축: 0부터 시작, 최대값의 110%까지 표시 */}
              <YAxis
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v: number) => formatZ(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                formatter={(value, name) => [
                  `Z$ ${formatZ(typeof value === "number" ? value : 0)}`,
                  String(name) === "asset" ? "내 자산" : "빵 가격",
                ]}
              />
              <Legend
                formatter={(value: string) => (value === "asset" ? "내 자산" : "빵 가격")}
                wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
              />
              {/* 파란선: 내 누적 자산 */}
              <Line type="monotone" dataKey="asset" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              {/* 빨간선: 빵 한 덩이 가격 */}
              <Line type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 게임 종료 오버레이 ────────────────────────── */}
      {/* 빵 가격 > 자산 × GAME_OVER_RATIO 도달 시 표시 */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-3xl border border-red-500/30 bg-gradient-to-b from-red-500/[0.12] to-red-600/[0.04] bg-bg-primary backdrop-blur-2xl p-10 max-w-md w-full mx-4 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <p className="text-4xl mb-4">💀</p>
              <h3 className="text-xl font-bold text-red-400 mb-3">
                당신의 돈은 이제 아무 가치가 없습니다
              </h3>
              <p className="text-sm text-white/50 mb-2">
                {elapsed}초 동안 Z$ {formatZ(money)}를 벌었지만
              </p>
              <p className="text-sm text-white/50 mb-6">
                빵 가격은 Z$ {formatZ(breadPrice)}가 되었습니다
              </p>
              <div className="flex gap-3 justify-center">
                {/* 다시 도전: 게임 리셋 */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 font-semibold text-sm"
                >
                  다시 도전
                </motion.button>
                {/* 검증 미션 도전: 오버레이 닫고 검증 미션 탭으로 전환 */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setGameOver(false); onGoVerify?.(); }}
                  className="px-6 py-3 rounded-2xl bg-accent-gold/20 border border-accent-gold/40 text-accent-gold font-semibold text-sm"
                >
                  검증 미션 도전 →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
