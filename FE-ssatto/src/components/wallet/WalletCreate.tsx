import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createWalletCredentials, deriveWalletCredentials } from "../../lib/crypto/wallet";
import Card from "../common/Card";
import { getWalletTheme, WALLET_THEME_OPTIONS, type WalletThemeId } from "./walletThemes";

interface WalletCreateProps {
  onCreate: (
    nickname?: string,
    color?: WalletThemeId,
    credentials?: { address?: string; privateKey?: string; password?: string },
  ) => void;
  onRestore?: (
    nickname?: string,
    color?: WalletThemeId,
    credentials?: { address?: string; privateKey?: string; password?: string },
  ) => void;
}

export default function WalletCreate({ onCreate, onRestore }: WalletCreateProps) {
  const [selectedColor, setSelectedColor] = useState<WalletThemeId>("gray");
  const [open, setOpen] = useState<"create" | "restore" | null>(null);
  const [nickname, setNickname] = useState("내 지갑");
  const [restorePrivateKey, setRestorePrivateKey] = useState("");
  const [generatedAddress, setGeneratedAddress] = useState("");
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const theme = getWalletTheme(selectedColor);
  const createActionButtonClassName =
    "inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-[16px] border border-[#DEA03C]/70 bg-white/5 px-5 text-sm font-bold text-[#DEA03C] transition hover:border-[#DEA03C] hover:bg-[#DEA03C]/10";

  useEffect(() => {
    if (open === "create") {
      const credentials = createWalletCredentials();
      setGeneratedAddress(credentials.address);
      setGeneratedPrivateKey(credentials.privateKey);
      setFormError(null);
    }
  }, [open]);

  const handleClose = () => {
    setOpen(null);
    setRestorePrivateKey("");
    setPassword("");
    setPasswordConfirm("");
    setFormError(null);
  };

  const validatePassword = () => {
    if (password.trim().length < 8) {
      return "지갑 비밀번호는 8자 이상이어야 합니다.";
    }
    if (password !== passwordConfirm) {
      return "비밀번호 확인이 일치하지 않습니다.";
    }
    return null;
  };

  const handleCreate = () => {
    const passwordError = validatePassword();
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    onCreate(nickname.trim() || "내 지갑", selectedColor, {
      address: generatedAddress,
      privateKey: generatedPrivateKey,
      password: password.trim(),
    });
    handleClose();
  };

  const handleRestore = () => {
    if (!onRestore || !restorePrivateKey.trim()) {
      return;
    }

    try {
      const passwordError = validatePassword();
      if (passwordError) {
        setFormError(passwordError);
        return;
      }

      const credentials = deriveWalletCredentials(restorePrivateKey.trim());
      onRestore(nickname.trim() || "기존 지갑", selectedColor, {
        address: credentials.address,
        privateKey: credentials.privateKey,
        password: password.trim(),
      });
      setGeneratedAddress(credentials.address);
      handleClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "지갑 복구에 실패했습니다.");
    }
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
                        ? "blockchain과 동일한 secp256k1 주소 규칙으로 지갑을 생성합니다."
                        : "private key를 입력하면 주소를 다시 계산해 기존 지갑을 등록합니다."}
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

                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                        지갑 이름
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
                            지갑 주소
                          </label>
                          <div className="mt-2 break-all rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white">
                            {generatedAddress}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            개인 키
                          </label>
                          <div className="mt-2 break-all rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white">
                            {generatedPrivateKey}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            지갑 비밀번호
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="지갑 비밀번호를 입력하세요"
                            className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            비밀번호 확인
                          </label>
                          <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(event) => setPasswordConfirm(event.target.value)}
                            placeholder="비밀번호를 한 번 더 입력하세요"
                            className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            개인 키
                          </label>
                          <input
                            type="text"
                            value={restorePrivateKey}
                            onChange={(event) => setRestorePrivateKey(event.target.value)}
                            placeholder="0x..."
                            className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40 focus:ring-1 focus:ring-info/20"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            지갑 비밀번호
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="지갑 잠금 해제에 사용할 비밀번호"
                            className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40 focus:ring-1 focus:ring-info/20"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                            비밀번호 확인
                          </label>
                          <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(event) => setPasswordConfirm(event.target.value)}
                            placeholder="비밀번호를 한 번 더 입력하세요"
                            className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-info/40 focus:ring-1 focus:ring-info/20"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {formError ? (
                    <p className="mt-4 rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex justify-center pt-8">
                    <button
                      type="button"
                      onClick={open === "create" ? handleCreate : handleRestore}
                      className={createActionButtonClassName}
                    >
                      {open === "create" ? "지갑 생성 완료" : "지갑 등록 완료"}
                    </button>
                  </div>
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
              <h2 className="font-display text-[2.8rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-white">
                지갑 생성
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                실제 blockchain 주소 규칙과 동일한 공개키 해시 주소를 생성하고, private key로
                로그인 서명까지 이어집니다.
              </p>
            </div>

            <div className="mt-[10px] flex items-center gap-3">
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

            <div className="flex flex-col gap-3 pt-[90px] sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setOpen("create")}
                className={createActionButtonClassName}
              >
                지갑 생성하기
              </button>
              <button
                type="button"
                onClick={() => setOpen("restore")}
                className="inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-[16px] border border-white/15 bg-white/5 px-5 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
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
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute bottom-5 left-5 right-5 top-5 rounded-[24px] border-2 ${theme.borderClassName} ${theme.shellClassName} shadow-[0_20px_48px_rgba(0,0,0,0.38)] backdrop-blur-sm`}
              style={{ zIndex: 2 }}
            >
              <div className={`absolute inset-x-4 top-4 h-12 rounded-[18px] bg-gradient-to-r ${theme.highlightClassName}`} />
              <div className="relative h-full px-6 pb-6 pt-6">
                <p className={`translate-x-[10px] translate-y-[5px] text-base font-bold ${theme.accentClassName}`}>
                  JACK 코인
                </p>
                <p className="absolute bottom-5 left-6 font-display text-5xl font-black text-white drop-shadow-md">
                  10,250 JACK
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
