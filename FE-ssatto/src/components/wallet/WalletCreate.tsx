import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import Card from "../common/Card";

interface WalletCreateProps {
  onCreate: (nickname?: string) => void;
  onRestore?: (mnemonic: string[]) => void;
}

const COLOR_OPTIONS = [
  { id: "gray", dot: "bg-slate-500", cardBg: "from-slate-700/30 to-bg-primary" },
  { id: "yellow", dot: "bg-amber-400", cardBg: "from-amber-500/25 to-bg-primary" },
  { id: "blue", dot: "bg-blue-500", cardBg: "from-blue-600/25 to-bg-primary" },
  { id: "green", dot: "bg-emerald-500", cardBg: "from-emerald-500/25 to-bg-primary" },
  { id: "red", dot: "bg-rose-500", cardBg: "from-rose-600/25 to-bg-primary" },
] as const;

const MOCK_ADDRESS = "0x7FA1B8D2C4E6901234AB56CD78EF9012AC34EF78";

export default function WalletCreate({ onCreate, onRestore }: WalletCreateProps) {
  const [selectedColor, setSelectedColor] = useState<typeof COLOR_OPTIONS[number]["id"]>("gray");
  const [open, setOpen] = useState<"create" | "restore" | null>(null);
  const [nickname, setNickname] = useState("행운 채굴자");
  const [restorePhrase, setRestorePhrase] = useState<string[]>(Array(12).fill(""));

  const color = COLOR_OPTIONS.find((c) => c.id === selectedColor)!;

  const handleCreate = () => {
    onCreate(nickname);
    setOpen(null);
  };

  const handleRestore = () => {
    if (onRestore) onRestore(restorePhrase);
    setOpen(null);
  };

  const buttonClass =
    "flex-1 rounded-[18px] border border-white/15 bg-white/5 px-6 py-4 text-base font-bold text-white transition hover:bg-white/10 hover:border-white/30 active:scale-[0.97]";

  return (
    <>
      <Card className="mx-auto max-w-5xl overflow-hidden rounded-[34px] px-0 py-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-8 px-6 py-8 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-10"
        >
          {/* Left: controls */}
          <div className="flex flex-col justify-center gap-6">
            <div>
              <h2 className="font-display text-3xl font-extrabold leading-[1] tracking-[-0.04em] text-white">
                지갑 생성
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                새 지갑을 만들거나 기존 지갑을 불러오세요.
              </p>
            </div>

            {/* Color picker */}
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`h-8 w-8 rounded-full ${c.dot} transition-all ${selectedColor === c.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                      : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  aria-label={c.id}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setOpen("create")}
                className={buttonClass}
              >
                지갑 생성하기
              </button>
              <button
                type="button"
                onClick={() => setOpen("restore")}
                className={buttonClass}
              >
                기존 지갑 등록하기
              </button>
            </div>
          </div>

          {/* Right: card preview */}
          <div className="relative min-h-[280px] flex items-center justify-center">
            <div className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${color.cardBg}`} />

            {/* POT card (behind) */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-4 top-4 bottom-4 w-[88%] rounded-[22px] border border-info/25 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(10,15,30,0.9))] shadow-lg"
              style={{ zIndex: 1 }}
            >
              <div className="p-6">
                <p className="font-display text-xl font-bold text-info">Pot 코인</p>
                <p className="mt-10 font-display text-4xl font-extrabold text-white">0 POT</p>
              </div>
            </motion.div>

            {/* JACK card (front) */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-4 top-4 bottom-4 w-[88%] rounded-[22px] border border-accent-gold/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(10,15,30,0.95))] shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-sm"
              style={{ zIndex: 2 }}
            >
              <div className="p-6">
                <p className="font-display text-xl font-bold text-accent-gold">Jack 코인</p>
                <p className="mt-10 font-display text-5xl font-black text-white drop-shadow-md">
                  10,000 JACK
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Card>

      {/* Modal */}
      {open && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[rgba(12,16,28,0.98)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {open === "create" ? "새 지갑 생성" : "기존 지갑 등록"}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {open === "create"
                      ? "지갑 이름을 입력하고 생성하세요."
                      : "12단어 복구 문구를 순서대로 입력하세요."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-text-secondary hover:bg-white/15 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">닉네임</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="지갑 닉네임 입력"
                    className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-text-tertiary outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-text-tertiary">주소 (자동): {MOCK_ADDRESS.slice(0, 22)}...</p>
                </div>

                {open === "restore" && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">12단어 복구 문구</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {restorePhrase.map((word, i) => (
                        <input
                          key={i}
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const next = [...restorePhrase];
                            next[i] = e.target.value;
                            setRestorePhrase(next);
                          }}
                          placeholder={`${i + 1}.`}
                          className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-2 text-xs text-white placeholder-text-tertiary outline-none focus:border-info/40 transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={open === "create" ? handleCreate : handleRestore}
                  className="w-full rounded-[16px] bg-accent-gold px-6 py-4 font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
                >
                  {open === "create" ? "지갑 생성하기" : "등록하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
