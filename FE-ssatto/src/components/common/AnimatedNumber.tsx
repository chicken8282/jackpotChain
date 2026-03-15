import { motion } from "motion/react";
import { useCountUp } from "../../hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
  delay?: number;
}

export default function AnimatedNumber({
  value,
  className,
  suffix,
  delay,
}: AnimatedNumberProps) {
  const display = useCountUp(value, { delay });

  return (
    <motion.span className={className}>
      {display}
      {suffix ? ` ${suffix}` : ""}
    </motion.span>
  );
}
