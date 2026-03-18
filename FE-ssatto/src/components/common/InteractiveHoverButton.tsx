import type { ButtonHTMLAttributes } from "react";

interface InteractiveHoverButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  hoverText?: string;
  className?: string;
}

export default function InteractiveHoverButton({
  text = "Button",
  hoverText,
  className = "",
  ...props
}: InteractiveHoverButtonProps) {
  const hoverLabel = hoverText ?? text;

  return (
    <button
      className={`group relative inline-flex h-11 min-w-[148px] cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border-2 border-[#DEA03C] bg-[linear-gradient(135deg,rgba(222,160,60,0.22),rgba(5,10,20,0.95))] px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,160,60,0.2)] transition active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      <span className="relative z-10 inline-flex translate-x-1 items-center transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        {text}
      </span>

      <span className="absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-x-[5px] group-hover:opacity-100">
        <span>{hoverLabel}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </span>

      <span className="absolute left-[22%] top-[38%] h-2 w-2 rounded-lg bg-[#DEA03C] transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
    </button>
  );
}
