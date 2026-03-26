// [학습 프론트엔드 v2] 추가: 5단계 학습 로드맵

import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useLearningStore } from "../../stores/useLearningStore";
import GlassCard from "./ui/GlassCard";

const STAGES = [
  { stage: 0, title: "프롤로그", subtitle: "왜 탈중앙화인가", modules: [
    { id: "0.1", title: "탈중앙화의 필요성" }] },
  { stage: 1, title: "신뢰의 근원", subtitle: "분산 원장과 투명성", modules: [
    { id: "1.1", title: "투명한 유리 금고" }, { id: "1.2", title: "디지털 봉인 (해시)" }, { id: "1.3", title: "합의의 힘" }] },
  { stage: 2, title: "디지털 소유권", subtitle: "지갑과 열쇠", modules: [
    { id: "2.1", title: "나만의 열쇠 만들기" }, { id: "2.2", title: "디지털 서명 체험" }] },
  { stage: 3, title: "가치 흐름의 이해", subtitle: "UTXO와 잔돈", modules: [
    { id: "3.1", title: "디지털 지폐의 여행" }, { id: "3.2", title: "트랜잭션 만들어보기" }, { id: "3.3", title: "블록 확정까지의 여정" }] },
  { stage: 4, title: "생태계의 유지", subtitle: "채굴과 보상", modules: [
    { id: "4.1", title: "행운의 숫자 찾기 (채굴)" }, { id: "4.2", title: "JACK & POT 이코노미" }] },
  { stage: 5, title: "최종 실행", subtitle: "로또 참여와 공정성", modules: [
    { id: "5.1", title: "로또 참여 시뮬레이션" }, { id: "5.2", title: "공정성 증명" }] },
];

export default function LearnRoadmap() {
  const navigate = useNavigate();
  const isCompleted = useLearningStore((s) => s.isModuleCompleted);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold tracking-[0.24em] text-accent-gold uppercase">학습 로드맵</h2>
      <div className="relative space-y-5">
        <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-accent-gold/20 via-white/5 to-transparent" />
        {STAGES.map((s, i) => {
          const allDone = s.modules.every((m) => isCompleted(m.id));
          const anyDone = s.modules.some((m) => isCompleted(m.id));
          return (
            <motion.div key={s.stage} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative pl-14">
              <div className={`absolute left-3 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                allDone ? "border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                : anyDone ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                : "border-white/20 bg-white/[0.05] text-white/50"}`}>
                {allDone ? "✓" : s.stage}
              </div>
              <GlassCard elevation={1} className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                  <span className="text-xs text-white/60">{s.subtitle}</span>
                </div>
                <div className="space-y-2">
                  {s.modules.map((m) => {
                    const done = isCompleted(m.id);
                    return (
                      <button key={m.id} onClick={() => navigate(`/learn/${s.stage}/${m.id}`)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all hover:border-accent-gold/20 hover:bg-white/[0.03] ${
                          done ? "border-green-500/30 bg-green-500/[0.08] text-green-400" : "border-white/[0.10] text-white/70 hover:text-white"}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${done ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/50"}`}>
                          {done ? "✓" : m.id}
                        </span>
                        <span className="font-medium">{m.title}</span>
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {/* 최종 정리 */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="relative pl-14">
          <div className="absolute left-3 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10 text-accent-gold text-xs font-bold">
            ★
          </div>
          <GlassCard elevation={1} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-display text-lg font-bold text-white">최종 정리</h3>
              <span className="text-xs text-white/40">네트워크 전체 흐름</span>
            </div>
            <button onClick={() => navigate("/learn/network")}
              className="flex w-full items-center gap-3 rounded-xl border border-accent-gold/20 bg-accent-gold/[0.08] px-4 py-2.5 text-left text-sm text-accent-gold transition-all hover:border-accent-gold/35 hover:bg-accent-gold/[0.12]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold/15 text-accent-gold text-[10px]">
                ★
              </span>
              <span className="font-medium">블록체인 네트워크의 모든 것</span>
            </button>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
