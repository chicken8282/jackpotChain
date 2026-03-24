// [학습 프론트엔드 v2] 추가: 적응형 스테퍼 (상시 상단 노출, 챕터 점프)

import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useLearningStore } from "../../stores/useLearningStore";

const STAGES = [
  { stage: 1, title: "신뢰", modules: ["1.1", "1.2", "1.3"] },
  { stage: 2, title: "소유권", modules: ["2.1", "2.2"] },
  { stage: 3, title: "흐름", modules: ["3.1", "3.2"] },
  { stage: 4, title: "생태계", modules: ["4.1", "4.2"] },
  { stage: 5, title: "실행", modules: ["5.1", "5.2"] },
];

export default function AdaptiveStepper() {
  const navigate = useNavigate();
  const params = useParams<{ stage?: string; module?: string }>();
  const currentModule = params.module;
  const isCompleted = useLearningStore((s) => s.isModuleCompleted);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-1">
        {STAGES.map((s, idx) => {
          const allDone = s.modules.every((m) => isCompleted(m));
          const anyDone = s.modules.some((m) => isCompleted(m));
          const isCurrent = currentModule && s.modules.includes(currentModule);

          return (
            <div key={s.stage} className="flex flex-1 items-center">
              {/* 단계 버튼 */}
              <button
                onClick={() => navigate(`/learn/${s.stage}/${s.modules[0]}`)}
                className="group relative flex w-full flex-col items-center gap-1"
              >
                <motion.div
                  animate={
                    isCurrent
                      ? { borderColor: "rgba(59,130,246,0.6)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }
                      : allDone
                        ? { borderColor: "rgba(34,197,94,0.6)", boxShadow: "0 0 10px rgba(34,197,94,0.2)" }
                        : {}
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    allDone
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : isCurrent
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                        : anyDone
                          ? "border-accent-gold/30 bg-accent-gold/5 text-accent-gold"
                          : "border-white/10 bg-white/[0.02] text-white/30"
                  }`}
                >
                  {allDone ? "✓" : s.stage}
                </motion.div>
                <span className={`text-[10px] ${isCurrent ? "text-blue-400" : allDone ? "text-green-400" : "text-white/30"}`}>
                  {s.title}
                </span>

                {/* 모듈 도트 */}
                <div className="flex gap-0.5">
                  {s.modules.map((m) => (
                    <div
                      key={m}
                      className={`h-1 w-1 rounded-full ${
                        isCompleted(m) ? "bg-green-400" : m === currentModule ? "bg-blue-400" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </button>

              {/* 연결선 */}
              {idx < STAGES.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${allDone ? "bg-green-500/30" : "bg-white/[0.06]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
