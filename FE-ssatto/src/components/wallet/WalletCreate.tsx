import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../common/Card";
import GoldButton from "../common/GoldButton";
import { MNEMONIC_SEED } from "../../lib/constants";
import { getWalletTheme, WALLET_THEME_OPTIONS, type WalletThemeId } from "./walletThemes";

interface WalletCreateProps {
  onCreate: (nickname?: string, color?: WalletThemeId, mnemonic?: string[]) => void;
  onRestore?: (mnemonic: string[], nickname?: string, color?: WalletThemeId) => void;
}

const MOCK_ADDRESS = "0x7FA1B8D2C4E6901234AB56CD78EF9012AC34EF78";

function shuffleMnemonic() {
  return [...MNEMONIC_SEED].sort(() => Math.random() - 0.5);
}

export default function WalletCreate({ onCreate, onRestore }: WalletCreateProps) {
  const [selectedColor, setSelectedColor] = useState<WalletThemeId>("gray");
  const [open, setOpen] = useState<"create" | "restore" | null>(null);
  const [nickname, setNickname] = useState("내 지갑");
  const [restorePhrase, setRestorePhrase] = useState<string[]>(Array(12).fill(""));
  const [mnemonicPreview, setMnemonicPreview] = useState<string[]>(MNEMONIC_SEED);

  const theme = getWalletTheme(selectedColor);

  useEffect(() => {
    if (open === "create") {
      setMnemonicPreview(shuffleMnemonic());
    }
  }, [open]);

  const previewAddress = useMemo(() => MOCK_ADDRESS.slice(0, 22), []);

  const handleCreate = () => {
    onCreate(nickname.trim() || "내 지갑", selectedColor, mnemonicPreview);
    setOpen(null);
  };

  const handleRestore = () => {
    if (onRestore) {
      onRestore(restorePhrase, nickname.trim() || "복구 지갑", selectedColor);
    }
    setOpen(null);
  };

  return (
    <>
      <Card className="mx-auto max-w-6xl overflow-hidden rounded-[34px] px-0 py-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-8 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-10"
        >
          <div className="flex flex-col justify-center gap-6">
            <div>
              <h2 className="font-display text-3xl font-extrabold leading-[1] tracking-[-0.04em] text-white">
                지갑 생성
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                지갑 색상과 이름을 먼저 선택하고, 생성 직후 복구 문구를 반드시 보관하세요.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {WALLET_THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedColor(option.id)}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${option.dotClassName} ${
                    selectedColor === option.id
                      ? "scale-110 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.14)]"
                      : "border-white/35 opacity-80 hover:opacity-100"
                  }`}
                  aria-label={option.label}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <GoldButton
                type="button"
                onClick={() => setOpen("create")}
                className="h-11 flex-1 rounded-[16px] py-0 text-sm"
              >
                지갑 생성하기
              </GoldButton>
              <button
                type="button"
                onClick={() => setOpen("restore")}
                className="h-11 min-w-[220px] rounded-[16px] border border-white/15 bg-white/5 px-7 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                기존 지갑 등록하기
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[300px] items-center justify-center">
            <div
              className={`absolute inset-0 rounded-[30px] border ${theme.borderClassName} ${theme.shellClassName} shadow-[0_28px_72px_rgba(0,0,0,0.35)]`}
            />
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-36 rounded-t-[30px] ${theme.glowClassName}`} />

            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute right-4 top-5 bottom-5 w-[86%] rounded-[24px] border ${theme.borderClassName} bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(5,10,20,0.92))] shadow-lg`}
              style={{ zIndex: 1 }}
            >
              <div className="p-6 text-right">
                <p className={`text-base font-bold ${theme.accentClassName}`}>POT 카드</p>
                <p className="mt-10 font-display text-4xl font-extrabold text-white">184 POT</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute left-4 top-5 bottom-5 w-[86%] rounded-[24px] border-2 ${theme.borderClassName} ${theme.shellClassName} shadow-[0_20px_48px_rgba(0,0,0,0.38)] backdrop-blur-sm`}
              style={{ zIndex: 2 }}
            >
              <div className={`absolute inset-x-4 top-4 h-12 rounded-[18px] bg-gradient-to-r ${theme.highlightClassName}`} />
              <div className="relative p-6">
                <p className={`text-base font-bold ${theme.accentClassName}`}>JACK 카드</p>
                <p className="mt-10 font-display text-5xl font-black text-white drop-shadow-md">
                  10,250 JACK
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Card>

      {open &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
              onClick={() => setOpen(null)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[rgba(12,16,28,0.98)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white">
                      {open === "create" ? "지갑 생성하기" : "기존 지갑 등록하기"}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {open === "create"
                        ? "생성 전에 복구 문구 12개를 확인하고 따로 저장해두세요."
                        : "12개 복구 문구를 입력해 기존 지갑을 다시 연결합니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-text-secondary transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                      Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      placeholder="지갑 이름을 입력하세요"
                      className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
                    />
                    <p className="mt-1.5 text-xs text-text-tertiary">
                      주소 예시: {previewAddress}...
                    </p>
                  </div>

                  {open === "create" ? (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                        Recovery Phrase
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {mnemonicPreview.map((word, index) => (
                          <div
                            key={`${word}-${index}`}
                            className="rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white"
                          >
                            <span className="mr-2 text-xs text-text-tertiary">{index + 1}.</span>
                            {word}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                        Recovery Phrase
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {restorePhrase.map((word, index) => (
                          <input
                            key={index}
                            type="text"
                            value={word}
                            onChange={(event) => {
                              const next = [...restorePhrase];
                              next[index] = event.target.value;
                              setRestorePhrase(next);
                            }}
                            placeholder={`${index + 1}.`}
                            className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-2 text-xs text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <GoldButton
                    type="button"
                    onClick={open === "create" ? handleCreate : handleRestore}
                    className="h-11 w-full rounded-[16px] py-0 text-sm"
                  >
                    {open === "create" ? "지갑 생성하기" : "기존 지갑 등록하기"}
                  </GoldButton>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
