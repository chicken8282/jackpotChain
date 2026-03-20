import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";

interface WalletMigrationModalProps {
  isOpen: boolean;
  walletCount: number;
  onMigrate: (password: string) => Promise<void>;
}

export default function WalletMigrationModal({
  isOpen,
  walletCount,
  onMigrate,
}: WalletMigrationModalProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMigrate = async () => {
    if (password.trim().length < 8) {
      setError("마이그레이션 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onMigrate(password.trim());
    } catch (migrationError) {
      setError(
        migrationError instanceof Error
          ? migrationError.message
          : "지갑 보안 업그레이드에 실패했습니다.",
      );
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
        className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/80 p-4 backdrop-blur-md sm:items-center"
      >
        <motion.div
          initial={{ y: 48, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 48, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[rgba(12,16,28,0.98)] px-6 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="mb-6">
            <h3 className="font-display text-2xl font-bold text-white">지갑 보안 업그레이드</h3>
            <p className="mt-2 text-sm text-text-secondary">
              기존 브라우저 지갑 {walletCount}개를 암호화 keystore로 옮겨야 계속 사용할 수 있습니다.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              업그레이드가 끝나면 평문 private key는 브라우저 저장소에서 제거됩니다.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                마이그레이션 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="모든 기존 지갑에 적용할 비밀번호"
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
          </div>

          {error ? (
            <p className="mt-4 rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleMigrate()}
            className="mt-6 w-full rounded-[16px] border border-accent-gold/50 bg-accent-gold/10 py-3.5 font-bold text-accent-gold transition-colors hover:bg-accent-gold/20"
          >
            {isSubmitting ? "업그레이드 중" : "보안 업그레이드 시작"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
