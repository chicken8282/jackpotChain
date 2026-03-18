import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import AnimatedNumber from "../common/AnimatedNumber";
import GoldButton from "../common/GoldButton";
import { useWalletStore } from "../../stores/useWalletStore";

interface WalletEntry {
  nickname: string;
  address: string;
  jackBalance: number;
  potBalance: number;
}

interface WalletInfoProps {
  wallets: WalletEntry[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onAddWallet?: (nickname: string, type: "create" | "restore", mnemonic?: string) => void;
}

export default function WalletInfo({ wallets, activeIndex, onChangeIndex, onAddWallet }: WalletInfoProps) {
  const exchangeJackToPot = useWalletStore((state) => state.exchangeJackToPot);
  const exchangePotToJack = useWalletStore((state) => state.exchangePotToJack);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "create" | "restore">("choose");
  const [newNickname, setNewNickname] = useState("");
  const [restoreWords, setRestoreWords] = useState(Array(12).fill(""));
  const [showTooltip, setShowTooltip] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const lastNavTime = useRef(0);
  const navCooldown = 350;

  const total = wallets.length;
  const activeWallet = wallets[activeIndex];

  const navigate = useCallback((dir: 1 | -1) => {
    const now = Date.now();
    if (now - lastNavTime.current < navCooldown) return;
    lastNavTime.current = now;
    onChangeIndex((activeIndex + dir + total) % total);
  }, [activeIndex, total, onChangeIndex]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) navigate(1);
    else if (info.offset.x > 60) navigate(-1);
  };

  const handleExchange = (direction: "JACK_TO_POT" | "POT_TO_JACK") => {
    if (activeIndex !== 0) {
      setExchangeError("Mock 지갑에서는 교환할 수 없습니다.");
      setTimeout(() => setExchangeError(null), 2500);
      return;
    }
    if (direction === "JACK_TO_POT") {
      if (activeWallet.jackBalance < 100) {
        setExchangeError("잔여 JACK이 부족합니다. (최소 100 JACK 필요)");
        setTimeout(() => setExchangeError(null), 2500);
        return;
      }
      exchangeJackToPot(100);
    } else {
      if (activeWallet.potBalance < 1) {
        setExchangeError("잔여 POT이 부족합니다. (최소 1 POT 필요)");
        setTimeout(() => setExchangeError(null), 2500);
        return;
      }
      exchangePotToJack(1);
    }
  };

  const handleAdd = () => {
    if (!newNickname.trim()) return;
    onAddWallet?.(newNickname.trim(), addMode === "restore" ? "restore" : "create",
      addMode === "restore" ? restoreWords.join(" ") : undefined);
    setShowAddModal(false);
    setAddMode("choose");
    setNewNickname("");
    setRestoreWords(Array(12).fill(""));
    onChangeIndex(wallets.length);
  };

  const getCardStyle = (index: number) => {
    let diff = index - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    if (diff === 0) return { x: 0, scale: 1, opacity: 1, zIndex: 10, rotateY: 0 };
    if (diff === -1) return { x: -460, scale: 0.84, opacity: 0.45, zIndex: 6, rotateY: 12 };
    if (diff === 1) return { x: 460, scale: 0.84, opacity: 0.45, zIndex: 6, rotateY: -12 };
    if (diff <= -2) return { x: -680, scale: 0.7, opacity: 0.15, zIndex: 3, rotateY: 20 };
    return { x: 680, scale: 0.7, opacity: 0.15, zIndex: 3, rotateY: -20 };
  };

  const isVisible = (index: number) => {
    let diff = index - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return Math.abs(diff) <= 2;
  };

  return (
    <div className="relative w-full">
      {/* + button top-right */}
      <div className="absolute right-0 -top-12 z-20 flex items-center justify-end">
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => { setShowAddModal(true); setAddMode("choose"); }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/8 text-xl text-white/60 shadow-sm transition-all hover:bg-white/20 hover:text-white hover:scale-110"
          >
            +
          </button>
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="absolute right-11 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-surface-elevated border border-border px-3 py-1.5 text-xs font-bold text-text-secondary shadow-xl pointer-events-none"
              >
                추가 등록하기
                <span className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-surface-elevated" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Carousel area */}
      <div className="relative flex items-center justify-center" style={{ height: 340, perspective: "1400px" }}>
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 shadow-lg backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white hover:scale-110 -translate-x-12 lg:-translate-x-16"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => navigate(1)}
          className="absolute right-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 shadow-lg backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white hover:scale-110 translate-x-12 lg:translate-x-16"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Cards */}
        {wallets.map((wallet, index) => {
          if (!isVisible(index)) return null;
          const style = getCardStyle(index);
          const isCurrent = index === activeIndex;

          return (
            <motion.div
              key={`wallet-card-${index}`}
              className="absolute w-full max-w-2xl"
              animate={{ x: style.x, scale: style.scale, opacity: style.opacity, rotateY: style.rotateY, zIndex: style.zIndex }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              drag={isCurrent ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ transformStyle: "preserve-3d", zIndex: style.zIndex }}
            >
              <div
                className="relative overflow-hidden rounded-[34px] border border-purple-500/20 bg-[linear-gradient(135deg,rgba(40,15,55,0.9),rgba(20,10,30,0.97))] px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
                style={{ boxShadow: isCurrent ? "0 28px 72px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.15)" : "0 12px 36px rgba(0,0,0,0.3)" }}
              >
                {/* Glow */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.25),transparent_65%)]" />

                {/* Header */}
                <div className="relative flex items-start justify-between border-b border-white/6 pb-5 mb-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">{wallet.nickname}님의 지갑</h2>
                    <p className="mt-1.5 font-mono text-xs text-text-tertiary break-all">{wallet.address}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-300">
                      {index + 1} / {total}
                    </span>
                  </div>
                </div>

                {/* Balances + exchange */}
                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  {/* JACK card */}
                  <div className="flex-1 w-full rounded-[22px] border border-orange-400/30 bg-[linear-gradient(135deg,rgba(251,146,60,0.12),rgba(20,10,5,0.7))] px-5 py-5 shadow-[0_8px_32px_rgba(251,146,60,0.1)]">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Jack 코인</p>
                    <div className="mt-3 font-display text-3xl font-black text-white">
                      <AnimatedNumber key={`jack-${activeIndex}-${wallet.jackBalance}`} value={wallet.jackBalance} />
                    </div>
                    <p className="mt-1 text-sm font-bold text-orange-400 opacity-80">JACK</p>
                  </div>

                  {/* Exchange center */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap">100 JACK = 1 POT</p>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-inner">
                      <button
                        onClick={() => handleExchange("POT_TO_JACK")}
                        title="POT → JACK"
                        className="p-2 rounded-full hover:bg-white/15 hover:text-orange-400 text-white/40 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleExchange("JACK_TO_POT")}
                        title="JACK → POT"
                        className="p-2 rounded-full hover:bg-white/15 hover:text-info text-white/40 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* POT card */}
                  <div className="flex-1 w-full rounded-[22px] border border-info/30 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(10,15,30,0.7))] px-5 py-5 shadow-[0_8px_32px_rgba(59,130,246,0.1)]">
                    <p className="text-xs font-bold uppercase tracking-widest text-info">Pot 코인</p>
                    <div className="mt-3 font-display text-3xl font-black text-white">
                      <AnimatedNumber key={`pot-${activeIndex}-${wallet.potBalance}`} value={wallet.potBalance} />
                    </div>
                    <p className="mt-1 text-sm font-bold text-info opacity-80">POT</p>
                  </div>
                </div>

                {/* Exchange error */}
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
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {wallets.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChangeIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-purple-400" : "w-2 bg-white/20 hover:bg-white/40"}`}
            aria-label={`지갑 ${i + 1}`}
          />
        ))}
      </div>

      {/* Mini Add Modal via portal */}
      {showAddModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[32px] border border-white/10 bg-[rgba(14,10,26,0.97)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="absolute inset-x-0 top-0 h-36 rounded-t-[32px] bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.22),transparent_60%)]" />

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-text-secondary hover:bg-white/15 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative">
                <h3 className="font-display text-2xl font-bold text-white">지갑 추가</h3>
                <p className="mt-1 text-sm text-text-secondary">새 지갑을 생성하거나 기존 지갑을 등록하세요</p>

                {addMode === "choose" && (
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setAddMode("create")}
                      className="flex items-center gap-4 rounded-[20px] border border-accent-gold/25 bg-accent-gold/8 px-6 py-5 text-left transition-all hover:border-accent-gold/50 hover:bg-accent-gold/12"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/20 text-accent-gold text-xl">✦</span>
                      <div>
                        <p className="font-bold text-white">새 지갑 생성하기</p>
                        <p className="text-xs text-text-secondary mt-0.5">새로운 키페어를 자동으로 생성합니다</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("restore")}
                      className="flex items-center gap-4 rounded-[20px] border border-info/25 bg-info/8 px-6 py-5 text-left transition-all hover:border-info/50 hover:bg-info/12"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/20 text-info text-xl">↩</span>
                      <div>
                        <p className="font-bold text-white">기존 지갑 등록하기</p>
                        <p className="text-xs text-text-secondary mt-0.5">12단어 복구 문구로 불러옵니다</p>
                      </div>
                    </button>
                  </div>
                )}

                {(addMode === "create" || addMode === "restore") && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">닉네임</label>
                      <input
                        type="text"
                        value={newNickname}
                        onChange={(e) => setNewNickname(e.target.value)}
                        placeholder="지갑 닉네임 입력"
                        className="mt-2 w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-text-tertiary outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-colors"
                      />
                    </div>

                    {addMode === "restore" && (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">12단어 복구 문구</label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {restoreWords.map((word, i) => (
                            <input
                              key={i}
                              type="text"
                              value={word}
                              onChange={(e) => {
                                const next = [...restoreWords];
                                next[i] = e.target.value;
                                setRestoreWords(next);
                              }}
                              placeholder={`${i + 1}.`}
                              className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-2 text-xs text-white placeholder-text-tertiary outline-none focus:border-info/40 focus:ring-1 focus:ring-info/20 transition-colors"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setAddMode("choose")}
                        className="flex-1 rounded-[16px] border border-white/10 bg-white/5 py-3.5 font-bold text-text-secondary hover:bg-white/10 transition-colors"
                      >
                        이전
                      </button>
                      <GoldButton onClick={handleAdd} className="flex-1 py-3.5">
                        {addMode === "create" ? "생성하기" : "등록하기"}
                      </GoldButton>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
