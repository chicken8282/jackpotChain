import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";

interface WalletUnlockModalProps {
  isOpen: boolean;
  walletName: string;
  walletAddress: string;
  sessionExpired?: boolean;
  onClose: () => void;
  onUnlock: (password: string) => Promise<void>;
}

export default function WalletUnlockModal({
  isOpen,
  walletName,
  walletAddress,
  sessionExpired = false,
  onClose,
  onUnlock,
}: WalletUnlockModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    setPassword("");
    setError(null);
    onClose();
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError("지갑 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUnlock(password.trim());
      setPassword("");
      onClose();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "지갑 잠금 해제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 48, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-md rounded-[30px] border border-white/10 bg-[rgba(12,16,28,0.98)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="mb-6">
            <h3 className="font-display text-2xl font-bold text-white">지갑 잠금 해제</h3>
            {sessionExpired ? (
              <p className="mt-1 text-sm text-text-secondary">
                세션이 만료되었습니다. 계속하려면 <span className="font-semibold text-white">{walletName}</span> 지갑의 비밀번호를 입력해주세요.
              </p>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                {walletName} 지갑으로 서명하려면 비밀번호가 필요합니다.
              </p>
            )}
            <p className="mt-2 break-all font-mono text-xs text-text-tertiary">{walletAddress}</p>
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

          {error ? (
            <p className="mt-4 rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-[16px] border border-white/10 bg-white/5 py-3.5 font-bold text-text-secondary transition-colors hover:bg-white/10"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => void handleUnlock()}
              className="flex-1 rounded-[16px] border border-accent-gold/50 bg-accent-gold/10 py-3.5 font-bold text-accent-gold transition-colors hover:bg-accent-gold/20"
            >
              {isSubmitting ? "잠금 해제 중" : "잠금 해제"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
