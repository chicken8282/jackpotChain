import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../common/Card";
import GoldButton from "../common/GoldButton";
import { getWalletTheme, WALLET_THEME_OPTIONS, type WalletThemeId } from "./walletThemes";

interface WalletCreateProps {
  onCreate: (
    nickname?: string,
    color?: WalletThemeId,
    credentials?: { address?: string; privateKey?: string },
  ) => void;
  onRestore?: (
    privateKey: string,
    address: string,
    nickname?: string,
    color?: WalletThemeId,
  ) => void;
}

function makeAddress() {
  return `0x${Math.random().toString(16).slice(2).toUpperCase().padEnd(40, "0").slice(0, 40)}`;
}

function makePrivateKey() {
  return `0x${Math.random().toString(16).slice(2).toUpperCase().padEnd(64, "A").slice(0, 64)}`;
}

export default function WalletCreate({ onCreate, onRestore }: WalletCreateProps) {
  const [selectedColor, setSelectedColor] = useState<WalletThemeId>("gray");
  const [open, setOpen] = useState<"create" | "restore" | null>(null);
  const [nickname, setNickname] = useState("내 지갑");
  const [restoreAddress, setRestoreAddress] = useState("");
  const [restorePrivateKey, setRestorePrivateKey] = useState("");
  const [generatedAddress, setGeneratedAddress] = useState(makeAddress());
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState(makePrivateKey());

  const theme = getWalletTheme(selectedColor);

  useEffect(() => {
    if (open === "create") {
      setGeneratedAddress(makeAddress());
      setGeneratedPrivateKey(makePrivateKey());
    }
  }, [open]);

  const handleClose = () => {
    setOpen(null);
    setRestoreAddress("");
    setRestorePrivateKey("");
  };

  const handleCreate = () => {
    onCreate(nickname.trim() || "내 지갑", selectedColor, {
      address: generatedAddress,
      privateKey: generatedPrivateKey,
    });
    handleClose();
  };

  const handleRestore = () => {
    if (!onRestore || !restoreAddress.trim() || !restorePrivateKey.trim()) {
      return;
    }

    onRestore(
      restorePrivateKey.trim(),
      restoreAddress.trim(),
      nickname.trim() || "기존 지갑",
      selectedColor,
    );
    handleClose();
  };

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
              onClick={handleClose}
            >
              <motion.div
                initial={{ y: 56, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 56, opacity: 0, scale: 0.97 }}
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
                        ? "생성된 지갑 주소와 private key를 TUI에서 바로 사용할 수 있도록 표시합니다."
                        : "기존 지갑의 private key와 지갑 주소를 입력해 등록합니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
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
                  </div>

                  {open === "create" ? (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                          Wallet Address
                        </label>
                        <div className="mt-2 break-all rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white">
                          {generatedAddress}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                          Private Key
                        </label>
                        <div className="mt-2 break-all rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white">
                          {generatedPrivateKey}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                          Wallet Address
                        </label>
                        <input
                          type="text"
                          value={restoreAddress}
                          onChange={(event) => setRestoreAddress(event.target.value)}
                          placeholder="0x..."
                          className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40 focus:ring-1 focus:ring-info/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                          Private Key
                        </label>
                        <input
                          type="text"
                          value={restorePrivateKey}
                          onChange={(event) => setRestorePrivateKey(event.target.value)}
                          placeholder="0x..."
                          className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40 focus:ring-1 focus:ring-info/20"
                        />
                      </div>
                    </>
                  )}

                  <GoldButton
                    type="button"
                    onClick={open === "create" ? handleCreate : handleRestore}
                    className="h-11 w-full rounded-[16px] py-0 text-sm"
                  >
                    {open === "create" ? "지갑 생성 완료" : "지갑 등록 완료"}
                  </GoldButton>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

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
                개발 중인 TUI에서 바로 사용할 수 있도록 생성한 지갑의 주소 해시값과 private key를
                함께 제공합니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {WALLET_THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedColor(option.id)}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${option.dotClassName} ${
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
              className={`absolute right-4 bottom-5 top-5 w-[86%] rounded-[24px] border ${theme.borderClassName} bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(5,10,20,0.92))] shadow-lg`}
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
              className={`absolute left-4 bottom-5 top-5 w-[86%] rounded-[24px] border-2 ${theme.borderClassName} ${theme.shellClassName} shadow-[0_20px_48px_rgba(0,0,0,0.38)] backdrop-blur-sm`}
              style={{ zIndex: 2 }}
            >
              <div className={`absolute inset-x-4 top-4 h-12 rounded-[18px] bg-gradient-to-r ${theme.highlightClassName}`} />
              <div className="relative p-6">
                <p className={`text-base font-bold ${theme.accentClassName}`}>JACK 카드</p>
                <p className="mt-10 font-display text-5xl font-black text-white drop-shadow-md">
                  10,250 JACK
                </p>
                <p className="mt-5 break-all font-mono text-xs text-text-secondary">
                  생성 예정 주소: {generatedAddress}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Card>

      {modal}
    </>
  );
}
