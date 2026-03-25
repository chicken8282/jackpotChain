// [학습 프론트엔드 v2] 추가: 3탭 모듈 캔버스 (Concept → Interaction → Verify)

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useLearningStore } from "../../stores/useLearningStore";
import GlassButton from "./ui/GlassButton";
import DecisionModal from "./DecisionModal";
import type { MissionResult } from "../../services/learningService";

// --- Concept 콘텐츠 ---
import { CONCEPT_DATA } from "./concepts/conceptData";
// --- 커스텀 Concept 컴포넌트 ---
import VaultConcept from "./concepts/VaultConcept";
import HashConcept from "./concepts/HashConcept";
import ConsensusConcept from "./concepts/ConsensusConcept";
import KeyConcept from "./concepts/KeyConcept";
import SignatureConcept from "./concepts/SignatureConcept";
import UTXOConcept from "./concepts/UTXOConcept";
import TxConcept from "./concepts/TxConcept";
import MiningConcept from "./concepts/MiningConcept";
import EconomyConcept from "./concepts/EconomyConcept";
import LottoConcept from "./concepts/LottoConcept";
import FairnessConcept from "./concepts/FairnessConcept";
import DecentralizationConcept from "./concepts/DecentralizationConcept";

const CUSTOM_CONCEPT_MAP: Record<string, React.FC<{ onGoInteraction: () => void }>> = {
  "0.1": DecentralizationConcept,
  "1.1": VaultConcept,
  "1.2": HashConcept,
  "1.3": ConsensusConcept,
  "2.1": KeyConcept,
  "2.2": SignatureConcept,
  "3.1": UTXOConcept,
  "3.2": TxConcept,
  "4.1": MiningConcept,
  "4.2": EconomyConcept,
  "5.1": LottoConcept,
  "5.2": FairnessConcept,
};
// --- Interaction 모듈 ---
import TransparentVault from "./modules/TransparentVault";
import HashExperience from "./modules/HashExperience";
import ConsensusDemo from "./modules/ConsensusDemo";
import KeyPairDemo from "./modules/KeyPairDemo";
import SignatureDemo from "./modules/SignatureDemo";
import UTXOFlow from "./modules/UTXOFlow";
import TxBuilder from "./modules/TxBuilder";
import PropagationFlow from "./modules/PropagationFlow";
import MiningPuzzle from "./modules/MiningPuzzle";
import TokenEconomy from "./modules/TokenEconomy";
import LottoSimulation from "./modules/LottoSimulation";
import FairnessDemo from "./modules/FairnessDemo";
import InflationGame from "./modules/InflationGame";
// --- Verify 미션 ---
import VerifyMission from "./verify/VerifyMission";

const INTERACTION_MAP: Record<string, React.FC<{ onGoVerify?: () => void }>> = {
  "0.1": InflationGame,
  "1.1": TransparentVault, "1.2": HashExperience, "1.3": ConsensusDemo,
  "2.1": KeyPairDemo, "2.2": SignatureDemo, "3.1": UTXOFlow, "3.2": TxBuilder, "3.3": PropagationFlow,
  "4.1": MiningPuzzle, "4.2": TokenEconomy, "5.1": LottoSimulation, "5.2": FairnessDemo,
};

const MODULE_ORDER = ["0.1","1.1","1.2","1.3","2.1","2.2","3.1","3.2","3.3","4.1","4.2","5.1","5.2"];

const MODULE_TITLES: Record<string, string> = {
  "0.1": "탈중앙화의 필요성",
  "1.1": "투명한 유리 금고", "1.2": "디지털 봉인 (해시)", "1.3": "합의의 힘",
  "2.1": "나만의 열쇠 만들기", "2.2": "디지털 서명 체험",
  "3.1": "디지털 지폐의 여행", "3.2": "트랜잭션 만들어보기", "3.3": "블록 확정까지의 여정",
  "4.1": "행운의 숫자 찾기", "4.2": "JACK & POT 이코노미",
  "5.1": "로또 참여 시뮬레이션", "5.2": "공정성 증명",
};

const TABS = ["concept", "interaction", "verify"] as const;
const TAB_LABELS = { concept: "개념 학습", interaction: "체험하기", verify: "검증 미션" };

interface Props { stageNumber: number; moduleId: string; }

export default function ModuleCanvas({ stageNumber, moduleId }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof TABS[number]>("concept");
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);
  const markComplete = useLearningStore((s) => s.markLocalComplete);

  const InteractionComponent = INTERACTION_MAP[moduleId];
  const concept = CONCEPT_DATA[moduleId];

  const handleMissionComplete = useCallback((result: MissionResult) => {
    markComplete(moduleId);
    setMissionResult(result);
  }, [moduleId, markComplete]);

  const idx = MODULE_ORDER.indexOf(moduleId);
  const prevMod = idx > 0 ? MODULE_ORDER[idx - 1] : null;
  const nextMod = idx < MODULE_ORDER.length - 1 ? MODULE_ORDER[idx + 1] : null;

  if (!InteractionComponent) {
    return <div className="py-20 text-center text-white/40">존재하지 않는 모듈입니다.</div>;
  }

  return (
    <>
      <div className="space-y-5">
        {/* 브레드크럼 */}
        <nav className="flex items-center gap-2 text-xs text-white/30">
          <button onClick={() => navigate("/learn")} className="hover:text-accent-gold transition-colors">학습</button>
          <span>/</span>
          <span className="text-white/50">{stageNumber}단계</span>
          <span>/</span>
          <span className="text-accent-gold">{MODULE_TITLES[moduleId]}</span>
        </nav>

        {/* 모듈 제목 */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.24em] text-accent-gold/70 uppercase">모듈 {moduleId}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">{MODULE_TITLES[moduleId]}</h1>
        </div>

        {/* 3탭 네비게이션 */}
        <div className="flex gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "text-white" : "text-white/30 hover:text-white/60"}`}>
              {tab === t && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.06]" />
              )}
              <span className="relative z-10">{TAB_LABELS[t]}</span>
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              {tab === "concept" && (() => {
                const CustomConcept = CUSTOM_CONCEPT_MAP[moduleId];
                if (CustomConcept) {
                  return <CustomConcept onGoInteraction={() => setTab("interaction")} />;
                }
                if (!concept) return null;
                return (
                  <div className="space-y-6">
                    {/* 핵심 개념 설명 */}
                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-blue-600/[0.02] p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 text-lg">💡</span>
                        <div>
                          <p className="font-bold text-blue-300 text-base">{concept.analogy}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-[1.8] text-white/80 pl-11">{concept.description}</p>
                    </div>

                    {/* 핵심 포인트 카드 */}
                    <div>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">핵심 포인트</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {concept.points.map((pt, i) => (
                          <div key={i} className="group rounded-xl border border-accent-gold/10 bg-gradient-to-b from-accent-gold/[0.06] to-transparent p-4 hover:border-accent-gold/25 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold/20 text-[10px] font-bold text-accent-gold">{i + 1}</span>
                              <p className="text-sm font-bold text-accent-gold">{pt.title}</p>
                            </div>
                            <p className="text-[12px] text-white/70 leading-relaxed">{pt.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 text-center">
                      <GlassButton onClick={() => setTab("interaction")}>직접 체험해보기 →</GlassButton>
                    </div>
                  </div>
                );
              })()}
              {tab === "interaction" && (
                <div>
                  <InteractionComponent onGoVerify={() => setTab("verify")} />
                  <div className="mt-6 text-center">
                    <GlassButton onClick={() => setTab("verify")}>검증 미션 도전 →</GlassButton>
                  </div>
                </div>
              )}
              {tab === "verify" && (
                <VerifyMission moduleId={moduleId} onComplete={handleMissionComplete} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 이전/다음 */}
        <div className="flex justify-between">
          {prevMod ? (
            <GlassButton variant="secondary" onClick={() => { setTab("concept"); navigate(`/learn/${prevMod.split(".")[0]}/${prevMod}`); }}>
              ← {MODULE_TITLES[prevMod]}
            </GlassButton>
          ) : <div />}
          {nextMod ? (
            <GlassButton onClick={() => { setTab("concept"); navigate(`/learn/${nextMod.split(".")[0]}/${nextMod}`); }}>
              {MODULE_TITLES[nextMod]} →
            </GlassButton>
          ) : (
            <GlassButton onClick={() => navigate("/learn/report")}>리포트 보기 →</GlassButton>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      <DecisionModal result={missionResult} onClose={() => setMissionResult(null)} />
    </>
  );
}
