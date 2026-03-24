// [학습 프론트엔드 v2] 추가: 글래스모피즘 카드 컴포넌트

import type { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  className?: string;
  elevation?: 1 | 2 | 3;
}

const ELEVATION = {
  1: "bg-white/[0.03] border-white/[0.06]",
  2: "bg-white/[0.05] border-white/[0.10]",
  3: "bg-white/[0.08] border-white/[0.15]",
};

export default function GlassCard({ children, className, elevation = 2 }: Props) {
  return (
    <div className={`backdrop-blur-xl ${ELEVATION[elevation]} border rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className ?? ""}`}>
      {children}
    </div>
  );
}
