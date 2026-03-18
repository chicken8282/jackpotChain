import { useInView } from "motion/react";
import { useRef } from "react";

export function useAnimateOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return { ref, inView };
}
