export const WALLET_THEME_OPTIONS = [
  {
    id: "gray",
    label: "Gray",
    dotClassName: "bg-slate-400",
    borderClassName: "border-slate-300/50",
    accentClassName: "text-slate-200",
    chipClassName: "border-slate-300/30 bg-slate-200/10 text-slate-100",
    shellClassName:
      "bg-[linear-gradient(145deg,rgba(148,163,184,0.16),rgba(12,18,32,0.98)_62%)]",
    glowClassName:
      "bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.22),transparent_64%)]",
    highlightClassName: "from-slate-100/18 via-slate-100/8 to-transparent",
  },
  {
    id: "yellow",
    label: "Yellow",
    dotClassName: "bg-amber-300",
    borderClassName: "border-amber-300/60",
    accentClassName: "text-amber-200",
    chipClassName: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    shellClassName:
      "bg-[linear-gradient(145deg,rgba(251,191,36,0.16),rgba(18,12,3,0.98)_62%)]",
    glowClassName:
      "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.24),transparent_66%)]",
    highlightClassName: "from-amber-100/20 via-amber-200/8 to-transparent",
  },
  {
    id: "blue",
    label: "Blue",
    dotClassName: "bg-sky-400",
    borderClassName: "border-sky-300/60",
    accentClassName: "text-sky-200",
    chipClassName: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    shellClassName:
      "bg-[linear-gradient(145deg,rgba(56,189,248,0.16),rgba(6,18,34,0.98)_62%)]",
    glowClassName:
      "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_66%)]",
    highlightClassName: "from-sky-100/20 via-sky-100/8 to-transparent",
  },
  {
    id: "green",
    label: "Green",
    dotClassName: "bg-emerald-400",
    borderClassName: "border-emerald-300/60",
    accentClassName: "text-emerald-200",
    chipClassName: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    shellClassName:
      "bg-[linear-gradient(145deg,rgba(52,211,153,0.16),rgba(3,22,20,0.98)_62%)]",
    glowClassName:
      "bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.24),transparent_66%)]",
    highlightClassName: "from-emerald-100/20 via-emerald-100/8 to-transparent",
  },
  {
    id: "red",
    label: "Red",
    dotClassName: "bg-rose-400",
    borderClassName: "border-rose-300/60",
    accentClassName: "text-rose-200",
    chipClassName: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    shellClassName:
      "bg-[linear-gradient(145deg,rgba(251,113,133,0.16),rgba(28,8,16,0.98)_62%)]",
    glowClassName:
      "bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.24),transparent_66%)]",
    highlightClassName: "from-rose-100/18 via-rose-100/8 to-transparent",
  },
] as const;

export type WalletThemeId = (typeof WALLET_THEME_OPTIONS)[number]["id"];

export function getWalletTheme(themeId: WalletThemeId) {
  return WALLET_THEME_OPTIONS.find((theme) => theme.id === themeId) ?? WALLET_THEME_OPTIONS[0];
}
