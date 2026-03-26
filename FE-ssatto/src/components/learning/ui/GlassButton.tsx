// [학습 프론트엔드 v2] 추가: 글래스모피즘 버튼 컴포넌트

import { motion } from "motion/react";
import type { PropsWithChildren, ComponentProps } from "react";

interface Props extends PropsWithChildren<ComponentProps<typeof motion.button>> {
  variant?: "primary" | "secondary" | "danger";
}

const VARIANTS = {
  primary: "border-accent-gold/30 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25",
  secondary: "border-white/10 bg-white/10 text-white/70 hover:text-white hover:bg-white/15",
  danger: "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25",
};

export default function GlassButton({ children, variant = "primary", className, ...props }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`backdrop-blur-md border rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors ${VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
