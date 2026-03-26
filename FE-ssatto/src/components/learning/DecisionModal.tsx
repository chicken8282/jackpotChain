// [학습 프론트엔드 v2] 추가: Decision Modal (미션 완료 피드백)

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import GlassButton from "./ui/GlassButton";
import type { MissionResult } from "../../services/learningService";

interface Props {
  result: MissionResult | null;
  onClose: () => void;
}

const CHEERS = ["완벽해요!", "블록체인 마스터!", "대단합니다!", "천재적이에요!"];
const ENCOURAGE = ["거의 다 맞았어요!", "다시 도전해봐요!", "포기하지 마세요!"];

export default function DecisionModal({ result, onClose }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (result?.success) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }, [result]);

  if (!result) return null;

  const msg = result.success
    ? CHEERS[Math.floor(Math.random() * CHEERS.length)]
    : ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl border border-white/18 bg-white/[0.08] backdrop-blur-xl p-6 shadow-[0_16px_64px_rgba(0,0,0,0.4)]"
        >
          {/* 헤더 */}
          <div className="text-center">
            <p className="text-3xl">{result.success ? "🎉" : "💪"}</p>
            <h2 className="mt-2 font-display text-xl font-bold text-white">{msg}</h2>
          </div>

          {/* 통계 */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatBox label="정답률" value={`${result.accuracyPercent}%`}
              color={result.accuracyPercent >= 80 ? "text-green-400" : result.accuracyPercent >= 50 ? "text-accent-gold" : "text-red-400"} />
            <StatBox label="시도 횟수" value={`${result.totalAttempts}회`} color="text-white" />
            <StatBox label="정답 수" value={`${result.correctCount}개`} color="text-green-400" />
            <StatBox label="소요 시간" value={`${(result.timeSpentMs / 1000).toFixed(1)}초`} color="text-blue-400" />
          </div>

          {/* 오답 분석 */}
          {result.wrongCategories && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-xs text-red-300">
              <span className="font-semibold">취약 영역:</span> {result.wrongCategories}
            </div>
          )}

          {/* 경로 선택 */}
          <div className="mt-5 flex flex-col gap-2">
            {result.nextModule && (
              <GlassButton onClick={() => { onClose(); navigate(`/learn/${result.nextModule!.split(".")[0]}/${result.nextModule}`); }}>
                다음 챕터 학습 →
              </GlassButton>
            )}
            {result.weakModule && (
              <GlassButton variant="secondary" onClick={() => { onClose(); navigate(`/learn/${result.weakModule!.split(".")[0]}/${result.weakModule}`); }}>
                취약 구간 복습
              </GlassButton>
            )}
            <GlassButton variant="secondary" onClick={() => { onClose(); navigate("/learn"); }}>
              로드맵으로
            </GlassButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.14] bg-white/[0.06] p-3 text-center">
      <p className="text-xs text-white/60 uppercase">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
