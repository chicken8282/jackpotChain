import { motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import type { PropsWithChildren } from "react";

interface GoldButtonProps extends PropsWithChildren<HTMLMotionProps<"button">> {
  className?: string;
}

export default function GoldButton({ children, className, ...props }: GoldButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16 }}
      className={`shimmer relative overflow-hidden rounded-[18px] border border-[#F3C44C]/35 bg-[linear-gradient(180deg,#F3C44C_0%,#E5A000_45%,#B8860B_100%)] px-5 py-3 font-semibold text-[#1A1200] shadow-[0_18px_40px_rgba(229,160,0,0.22),inset_0_1px_0_rgba(255,247,221,0.5)] disabled:cursor-not-allowed disabled:opacity-45 ${className ?? ""}`}
      {...props}
    >
      <span className="absolute inset-x-5 top-1 h-px bg-[linear-gradient(90deg,transparent,rgba(255,249,231,0.95),transparent)]" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
