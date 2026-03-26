// [학습 프론트엔드 v2] 추가: 학습 랜딩 히어로 (글래스모피즘)

import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import GlassButton from "./ui/GlassButton";

export default function LearnHero() {
  const navigate = useNavigate();
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-8 py-14 text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-gold/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />
      </div>
      <div className="relative z-10">
        <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent-gold uppercase">
          JACKPOTCHAIN ACADEMY
        </p>
        <h1 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl">
          신뢰의 기술을
          <br />
          <span className="bg-[linear-gradient(90deg,#F3C44C,#E5A000)] bg-clip-text text-transparent">
            직접 체험하세요
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/75">
          직접 설계하고, 즉시 증명하는 블록체인
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <GlassButton onClick={() => navigate("/learn/0/0.1")} className="px-8 py-3.5 text-base">
            학습 시작하기
          </GlassButton>
        </div>
      </div>
    </motion.section>
  );
}
