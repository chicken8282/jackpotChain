import type { PropsWithChildren, ReactNode } from "react";

interface CardProps extends PropsWithChildren {
  className?: string;
  eyebrow?: string;
  title?: ReactNode;
}

export default function Card({ children, className, eyebrow, title }: CardProps) {
  return (
    <section
      className={`tech-panel card-hover relative overflow-hidden rounded-[26px] border border-white/8 px-5 py-5 sm:px-6 sm:py-6 ${className ?? ""}`}
    >
      {(eyebrow || title) && (
        <div className="relative z-10 mb-5 flex flex-col gap-2">
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.24em] text-accent-gold/90 uppercase">
              {eyebrow}
            </p>
          ) : null}
          {title ? <div>{title}</div> : null}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
