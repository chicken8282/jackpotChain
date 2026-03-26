// [학습 프론트엔드 v2] 추가: 적응형 스테퍼 (상시 상단 노출, 챕터 점프)

import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useLearningStore } from "../../stores/useLearningStore";

const STAGES = [
  { stage: 0, title: "프롤로그", modules: ["0.1"], difficulty: 0 },
  { stage: 1, title: "신뢰", modules: ["1.1", "1.2", "1.3"], difficulty: 1 },
  { stage: 2, title: "소유권", modules: ["2.1", "2.2"], difficulty: 2 },
  { stage: 3, title: "흐름", modules: ["3.1", "3.2", "3.3"], difficulty: 3 },
  { stage: 4, title: "생태계", modules: ["4.1", "4.2"], difficulty: 4 },
  { stage: 5, title: "실행", modules: ["5.1", "5.2"], difficulty: 5 },
];

const ALL_MODULES = STAGES.flatMap((s) => s.modules);
const TOTAL = ALL_MODULES.length; // 11

export default function AdaptiveStepper() {
  const navigate = useNavigate();
  const params = useParams<{ stage?: string; module?: string }>();
  const currentModule = params.module;
  const isCompleted = useLearningStore((s) => s.isModuleCompleted);

  const completed = ALL_MODULES.filter((m) => isCompleted(m)).length;
  const percent = Math.round((completed / TOTAL) * 100);

  return (
    <div className="space-y-3">
      {/* 프로그레스 바 */}
      <div className="rounded-2xl border border-white/[0.10] bg-white/[0.05] backdrop-blur-xl px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/65">
            <span className="text-accent-gold font-bold">{completed}</span> / {TOTAL} 모듈 완료
          </span>
          <span className="text-xs font-bold text-accent-gold">{percent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-gold/80 via-accent-gold to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* 스테퍼 */}
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.05] backdrop-blur-xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
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
                      ? "border-green-500/60 bg-green-500/15 text-green-400"
                      : isCurrent
                        ? "border-blue-500/60 bg-blue-500/15 text-blue-400"
                        : anyDone
                          ? "border-accent-gold/50 bg-accent-gold/12 text-accent-gold"
                          : "border-white/20 bg-white/[0.05] text-white/50"
                  }`}
                >
                  {allDone ? "✓" : s.stage}
                </motion.div>
                <span className={`text-xs ${isCurrent ? "text-blue-400" : allDone ? "text-green-400" : "text-white/50"}`}>
                  {s.title}
                </span>

                {/* 챕터 진행도 동그라미 */}
                <div className="flex items-center gap-1" title={`${s.modules.filter((m) => isCompleted(m)).length}/${s.modules.length} 완료`}>
                  {s.modules.map((m) => (
                    <div
                      key={m}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        isCompleted(m)
                          ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                          : "bg-white/25"
                      }`}
                    />
                  ))}
                </div>
              </button>

              {/* 연결선 */}
              {idx < STAGES.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${allDone ? "bg-green-500/40" : "bg-white/[0.12]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
