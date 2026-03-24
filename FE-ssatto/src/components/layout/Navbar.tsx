import { motion } from "motion/react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "대시보드" },
  { to: "/lotto", label: "로또" },
  { to: "/wallet", label: "지갑" },
  { to: "/mining", label: "채굴" },
  { to: "/learn", label: "학습" },  // [학습 프론트엔드 v2] 추가: 학습 메뉴
];

export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-10">
      <div className="tech-panel mx-auto flex max-w-4xl items-center justify-between rounded-[20px] border border-white/20 bg-[rgba(15,20,35,0.85)] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-accent-gold/40 bg-accent-gold/10 font-display text-sm font-bold text-accent-gold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            JC
          </div>
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold tracking-[0.24em] text-accent-gold">
              JACKPOTCHAIN
            </p>
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-info shadow-[0_0_10px_rgba(59,130,246,0.9)]" />
              체험 네트워크 온라인
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-1 rounded-[18px] border border-white/8 bg-white/[0.03] p-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {({ isActive }) => (
                <div className="relative px-4 py-2 text-sm font-semibold text-text-tertiary transition-colors hover:text-text-primary">
                  {isActive ? (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-[12px] border border-accent-gold/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(245,158,11,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    />
                  ) : null}
                  <span className={`relative z-10 tracking-widest ${isActive ? "text-accent-gold" : ""}`}>
                    {item.label}
                  </span>
                  {isActive ? (
                    <motion.div
                      layoutId="nav-light"
                      className="absolute inset-x-4 -bottom-[1px] h-[2px] bg-accent-gold rounded-t-sm shadow-[0_-2px_6px_rgba(245,158,11,0.6)]"
                    />
                  ) : null}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
