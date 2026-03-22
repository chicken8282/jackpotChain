// [학습 프론트엔드 v2] 추가: 학습 API 서비스 레이어

import { getJson, postJson } from "../lib/api";

// --- 타입 ---

export interface LearningOverview {
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  totalRewardJack: number;
  stages: StageOverview[];
  badges: BadgeItem[];
}
export interface StageOverview {
  stage: number;
  title: string;
  totalModules: number;
  completedModules: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}
export interface BadgeItem { badgeType: string; earnedAt: string; }

export interface StageProgress {
  stage: number;
  title: string;
  modules: ModuleProgressItem[];
}
export interface ModuleProgressItem {
  module: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  score: number;
  totalAttempts: number;
  correctCount: number;
  completedAt: string | null;
}

export interface MissionCompleteRequest {
  walletAddress: string;
  totalAttempts: number;
  correctCount: number;
  wrongCategories: string;
  timeSpentMs: number;
}
export interface MissionResult {
  module: string;
  success: boolean;
  accuracyPercent: number;
  totalAttempts: number;
  correctCount: number;
  wrongCategories: string;
  timeSpentMs: number;
  rewardJack: number;
  newBadges: string[];
  nextModule: string | null;
  weakModule: string | null;
}

export interface LearningReport {
  securityScore: number;
  transactionScore: number;
  networkScore: number;
  consensusScore: number;
  tokenEconomyScore: number;
  fairnessScore: number;
  overallGrade: "GOLD" | "SILVER" | "BRONZE";
  totalTimeMs: number;
  welcomeJack: number;
  certificateIssuedAt: string | null;
}

// --- API 함수 ---

export function getLearningOverview(address: string) {
  return getJson<LearningOverview>(`/v1/learning/overview?address=${encodeURIComponent(address)}`);
}
export function getStageProgress(stage: number, address: string) {
  return getJson<StageProgress>(`/v1/learning/stages/${stage}?address=${encodeURIComponent(address)}`);
}
export function completeMission(moduleId: string, req: MissionCompleteRequest) {
  return postJson<MissionResult, MissionCompleteRequest>(`/v1/learning/modules/${encodeURIComponent(moduleId)}/complete`, req);
}
export function getLearningReport(address: string) {
  return getJson<LearningReport>(`/v1/learning/report?address=${encodeURIComponent(address)}`);
}
export function generateLearningReport(address: string) {
  return postJson<LearningReport, {}>(`/v1/learning/report/generate?address=${encodeURIComponent(address)}`, {});
}
