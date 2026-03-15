import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "motion/react";

const numberFormatter = new Intl.NumberFormat("ko-KR");

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
}

export function useCountUp(
  target: number,
  { duration = 1.2, delay = 0 }: UseCountUpOptions = {},
) {
  const base = useMotionValue(0);
  const spring = useSpring(base, {
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  });
  const rounded = useTransform(spring, (value) => Math.round(value));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      base.set(target);
    }, delay * 1000);

    const controls = rounded.on("change", (latest) => {
      setDisplay(numberFormatter.format(latest));
    });

    return () => {
      window.clearTimeout(timer);
      controls();
      base.jump(0);
    };
  }, [base, delay, duration, rounded, target]);

  return display;
}
