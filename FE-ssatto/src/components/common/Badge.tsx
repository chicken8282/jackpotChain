import type { PropsWithChildren } from "react";

interface BadgeProps extends PropsWithChildren {
  tone?: "gold" | "blue" | "green" | "red";
}

const toneMap = {
  gold: "border-accent-gold/30 bg-accent-gold/10 text-accent-gold",
  blue: "border-info/30 bg-info/10 text-info",
  green: "border-success/30 bg-success/10 text-success",
  red: "border-danger/30 bg-danger/10 text-danger",
};

export default function Badge({ children, tone = "gold" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.16em] uppercase ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
