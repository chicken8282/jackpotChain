import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createWalletCredentials } from "../../lib/crypto/wallet";
import AnimatedNumber from "../common/AnimatedNumber";
import GoldButton from "../common/GoldButton";
import { getWalletTheme, WALLET_THEME_OPTIONS, type WalletThemeId } from "./walletThemes";
import { prepareWalletAddSubmission } from "../../services/walletAddFormService";

interface WalletEntry {
  nickname: string;
  address: string;
  color: WalletThemeId;
  jackBalance: number;
  potBalance: number;
}

interface WalletInfoProps {
  wallets: WalletEntry[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onAddWallet?: (
    nickname: string,
    type: "create" | "restore",
    payload?: { address?: string; privateKey?: string; password?: string },
    color?: WalletThemeId,
  ) => void;
  onExchangeJackToPot?: (walletAddress: string) => Promise<void> | void;
  isLocked?: boolean;
  onLockRequest?: () => void;
}

export default function WalletInfo({
  wallets,
  activeIndex,
  onChangeIndex,
  onAddWallet,
  onExchangeJackToPot,
  isLocked = false,
  onLockRequest,
}: WalletInfoProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "create" | "restore">("choose");
  const [newNickname, setNewNickname] = useState("");
  const [newColor, setNewColor] = useState<WalletThemeId>("gray");
  const [restorePrivateKey, setRestorePrivateKey] = useState("");
  const [generatedAddress, setGeneratedAddress] = useState("");
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const lastNavTime = useRef(0);
  const navCooldown = 350;

  const total = wallets.length;
  const resolvedActiveIndex = activeIndex >= 0 && activeIndex < total ? activeIndex : 0;
  const activeWallet = wallets[resolvedActiveIndex];
  const activeTheme = getWalletTheme(activeWallet?.color ?? "gray");

  useEffect(() => {
    if (!showAddModal || addMode !== "create") {
      return;
    }

    const credentials = createWalletCredentials();
    setGeneratedAddress(credentials.address);
    setGeneratedPrivateKey(credentials.privateKey);
    setModalError(null);
  }, [addMode, showAddModal]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const now = Date.now();
      if (now - lastNavTime.current < navCooldown) {
        return;
      }

      lastNavTime.current = now;
      onChangeIndex((resolvedActiveIndex + dir + total) % total);
    },
    [resolvedActiveIndex, total, onChangeIndex],
  );

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) {
      navigate(1);
    } else if (info.offset.x > 60) {
      navigate(-1);
    }
  };

  const handleExchangeJackToPot = async () => {
    if (activeWallet.jackBalance < 100) {
      setExchangeError("JACK 잔액이 부족합니다. 최소 100 JACK이 필요합니다.");
      setTimeout(() => setExchangeError(null), 2500);
      return;
    }

    if (!onExchangeJackToPot) {
      return;
    }

    setExchangeError(null);
    setIsExchanging(true);
    try {
      await onExchangeJackToPot(activeWallet.address);
    } catch (error) {
      setExchangeError(error instanceof Error ? error.message : "교환 처리에 실패했습니다.");
    } finally {
      setIsExchanging(false);
    }
  };

  const handleAdd = () => {
    try {
      const submission = prepareWalletAddSubmission({
        mode: addMode === "restore" ? "restore" : "create",
        nickname: newNickname,
        color: newColor,
        password,
        passwordConfirm,
        restorePrivateKey,
        generatedCredentials: {
          address: generatedAddress,
          privateKey: generatedPrivateKey,
        },
      });

      onAddWallet?.(submission.nickname, submission.type, submission.payload, submission.color);
      setShowAddModal(false);
      setAddMode("choose");
      setNewNickname("");
      setNewColor("gray");
      setRestorePrivateKey("");
      setGeneratedAddress("");
      setGeneratedPrivateKey("");
      setPassword("");
      setPasswordConfirm("");
      setModalError(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "지갑 처리에 실패했습니다.");
    }
  };

  const getCardStyle = (index: number) => {
    let diff = index - resolvedActiveIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    if (diff === 0) return { x: 0, scale: 1, opacity: 1, zIndex: 10, rotateY: 0 };
    if (diff === -1) return { x: -460, scale: 0.84, opacity: 0.2, zIndex: 6, rotateY: 12 };
    if (diff === 1) return { x: 460, scale: 0.84, opacity: 0.2, zIndex: 6, rotateY: -12 };
    if (diff <= -2) return { x: -680, scale: 0.7, opacity: 0.05, zIndex: 3, rotateY: 20 };
    return { x: 680, scale: 0.7, opacity: 0.05, zIndex: 3, rotateY: -20 };
  };

  const isVisible = (index: number) => {
    let diff = index - resolvedActiveIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return Math.abs(diff) <= 2;
  };

  return (
    <div className="relative w-full">
      <div className="absolute right-0 -top-12 z-20 flex items-center justify-end">
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => {
              setShowAddModal(true);
              setAddMode("choose");
              setModalError(null);
              setGeneratedAddress("");
              setGeneratedPrivateKey("");
              setPassword("");
              setPasswordConfirm("");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/8 text-xl text-white/60 shadow-sm transition-all hover:scale-110 hover:bg-white/20 hover:text-white"
          >
            +
          </button>
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-bold text-text-secondary shadow-xl"
              >
                지갑 추가하기
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 340, perspective: "1400px" }}>
        {isLocked && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[34px] bg-black/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={onLockRequest}
              className="flex flex-col items-center gap-3 transition-transform hover:scale-105"
              aria-label="지갑 잠금 해제"
            >
              <svg className="h-16 w-16 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="text-sm font-bold text-white/60">탭하여 잠금 해제</span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-0 z-20 flex h-11 w-11 -translate-x-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/15 hover:text-white lg:-translate-x-16"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => navigate(1)}
          className="absolute right-0 z-20 flex h-11 w-11 translate-x-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/15 hover:text-white lg:translate-x-16"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {wallets.map((wallet, index) => {
          if (!isVisible(index)) {
            return null;
          }

          const style = getCardStyle(index);
          const isCurrent = index === resolvedActiveIndex;
          const theme = getWalletTheme(wallet.color);

          return (
            <motion.div
              key={`wallet-card-${index}`}
              className="absolute w-full max-w-2xl"
              animate={{
                x: style.x,
                scale: style.scale,
                opacity: style.opacity,
                rotateY: style.rotateY,
                zIndex: style.zIndex,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              drag={isCurrent ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ transformStyle: "preserve-3d", zIndex: style.zIndex }}
            >
              <div
                className={`relative overflow-hidden rounded-[34px] border-2 ${theme.borderClassName} ${theme.shellClassName} px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)]`}
                style={{
                  boxShadow: isCurrent
                    ? "0 28px 72px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
                    : "0 12px 36px rgba(0,0,0,0.3)",
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[rgba(8,12,22,0.28)]" />
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-36 ${theme.glowClassName}`} />

                <div className="relative mb-6 border-b border-white/6 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white">{wallet.nickname} 지갑</h2>
                      <p className="mt-1.5 break-all font-mono text-xs text-text-tertiary">{wallet.address}</p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${theme.chipClassName}`}>
                        {index + 1} / {total}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col items-center gap-6 sm:flex-row">
                  <div
                    className={`flex flex-1 flex-col items-center rounded-[22px] border px-5 py-5 text-center ${theme.coinPanelBorderClassName} ${theme.coinPanelShellClassName}`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-widest ${theme.accentClassName}`}>JACK 코인</p>
                    <div className="mt-3 flex items-baseline justify-center gap-2 font-display text-3xl font-black text-white">
                      <AnimatedNumber key={`jack-${resolvedActiveIndex}-${wallet.jackBalance}`} value={wallet.jackBalance} />
                      <span className={`text-base font-bold ${theme.accentClassName}`}>JACK</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/40">
                      100 JACK = 1 POT
                    </p>
                    <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1.5 shadow-inner">
                      <button
                        type="button"
                        onClick={handleExchangeJackToPot}
                        title="JACK to POT"
                        disabled={isExchanging}
                        className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/15 hover:text-info"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`flex flex-1 flex-col items-center rounded-[22px] border px-5 py-5 text-center ${theme.coinPanelBorderClassName} ${theme.coinPanelShellClassName}`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-widest ${theme.accentClassName}`}>POT 코인</p>
                    <div className="mt-3 flex items-baseline justify-center gap-2 font-display text-3xl font-black text-white">
                      <AnimatedNumber key={`pot-${resolvedActiveIndex}-${wallet.potBalance}`} value={wallet.potBalance} />
                      <span className={`text-base font-bold ${theme.accentClassName}`}>POT</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {exchangeError && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 text-center text-sm font-bold text-danger"
                    >
                      {exchangeError}
                    </motion.p>
                  )}
                </AnimatePresence>
                {isExchanging ? (
                  <p className="mt-2 text-center text-xs font-bold text-info">교환 트랜잭션을 전송하는 중입니다.</p>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {wallets.map((wallet, index) => (
          <button
            key={wallet.address}
            type="button"
            onClick={() => onChangeIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === resolvedActiveIndex ? "w-6 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`지갑 ${index + 1}`}
          />
        ))}
      </div>

      {showAddModal &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
              onClick={() => {
                setShowAddModal(false);
                setModalError(null);
                setGeneratedAddress("");
                setGeneratedPrivateKey("");
                setPassword("");
                setPasswordConfirm("");
              }}
            >
              <motion.div
                initial={{ y: 80, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 80, opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(event) => event.stopPropagation()}
                className={`relative w-full max-w-md rounded-[32px] border ${activeTheme.borderClassName} bg-[rgba(14,10,26,0.97)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setModalError(null);
                    setGeneratedAddress("");
                    setGeneratedPrivateKey("");
                    setPassword("");
                    setPasswordConfirm("");
                  }}
                  className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-text-secondary transition-colors hover:bg-white/15 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="relative">
                  <h3 className="font-display text-2xl font-bold text-white">지갑 추가</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    새 지갑을 생성하거나 private key로 기존 지갑을 다시 불러올 수 있습니다.
                  </p>

                  {addMode === "choose" && (
                    <div className="mt-6 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode("create");
                          setNewNickname("내 지갑");
                          setModalError(null);
                          setPassword("");
                          setPasswordConfirm("");
                        }}
                        className="rounded-[20px] border border-accent-gold/25 bg-accent-gold/8 px-6 py-5 text-left transition-all hover:border-accent-gold/50 hover:bg-accent-gold/12"
                      >
                        <p className="font-bold text-white">새 지갑 생성하기</p>
                        <p className="mt-0.5 text-xs text-text-secondary">실제 blockchain 주소 규칙으로 지갑을 생성합니다.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode("restore");
                          setNewNickname("기존 지갑");
                          setModalError(null);
                          setPassword("");
                          setPasswordConfirm("");
                        }}
                        className="rounded-[20px] border border-info/25 bg-info/8 px-6 py-5 text-left transition-all hover:border-info/50 hover:bg-info/12"
                      >
                        <p className="font-bold text-white">기존 지갑 등록하기</p>
                        <p className="mt-0.5 text-xs text-text-secondary">private key로 주소를 다시 계산해 지갑을 등록합니다.</p>
                      </button>
                    </div>
                  )}

                  {(addMode === "create" || addMode === "restore") && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                          지갑 이름
                        </label>
                        <input
                          type="text"
                          value={newNickname}
                          onChange={(event) => setNewNickname(event.target.value)}
                          placeholder="지갑 이름을 입력하세요"
                          className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-text-tertiary focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {WALLET_THEME_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setNewColor(option.id)}
                            className={`h-5 w-5 rounded-full border-2 ${option.dotClassName} ${
                              newColor === option.id ? "border-white" : "border-white/30"
                            }`}
                            aria-label={option.label}
                          />
                        ))}
                      </div>

                      {addMode === "create" ? (
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
                        </>
                      ) : null}

                      {addMode === "restore" && (
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
                      )}

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

                      {modalError ? (
                        <p className="rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                          {modalError}
                        </p>
                      ) : null}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddMode("choose");
                            setModalError(null);
                            setGeneratedAddress("");
                            setGeneratedPrivateKey("");
                            setPassword("");
                            setPasswordConfirm("");
                          }}
                          className="flex-1 rounded-[16px] border border-white/10 bg-white/5 py-3.5 font-bold text-text-secondary transition-colors hover:bg-white/10"
                        >
                          이전
                        </button>
                        <GoldButton onClick={handleAdd} className="flex-1 py-3.5">
                          {addMode === "create" ? "지갑 추가" : "지갑 등록"}
                        </GoldButton>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
