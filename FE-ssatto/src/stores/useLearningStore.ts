// [학습 프론트엔드 v2] 추가: 학습 상태 관리 스토어

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MissionResult } from "../services/learningService";

interface LearningState {
  /** 현재 탭: concept / interaction / verify */
  currentTab: "concept" | "interaction" | "verify";
  /** 로컬 완료 모듈 (게스트/오프라인 캐시) */
  localCompletedModules: string[];
  /** 마지막 Decision Modal 결과 */
  lastMissionResult: MissionResult | null;

  setCurrentTab: (tab: "concept" | "interaction" | "verify") => void;
  markLocalComplete: (moduleId: string) => void;
  isModuleCompleted: (moduleId: string) => boolean;
  setMissionResult: (result: MissionResult | null) => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      currentTab: "concept",
      localCompletedModules: [],
      lastMissionResult: null,

      setCurrentTab: (tab) => set({ currentTab: tab }),

      markLocalComplete: (moduleId) => {
        const s = get();
        if (!s.localCompletedModules.includes(moduleId)) {
          set({ localCompletedModules: [...s.localCompletedModules, moduleId] });
        }
      },

      isModuleCompleted: (moduleId) => get().localCompletedModules.includes(moduleId),

      setMissionResult: (result) => set({ lastMissionResult: result }),
    }),
    {
      name: "ssatto-learning-v2",
      partialize: (s) => ({ localCompletedModules: s.localCompletedModules }),
    },
  ),
);
