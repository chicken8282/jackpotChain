import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Card from "../common/Card";
import GoldButton from "../common/GoldButton";
import { MNEMONIC_SEED } from "../../lib/constants";

interface WalletCreateProps {
  onCreate: (nickname?: string) => void;
}

export default function WalletCreate({ onCreate }: WalletCreateProps) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("행운 채굴자");

  return (
    <>
      <Card className="mx-auto max-w-5xl overflow-hidden rounded-[34px] px-0 py-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-8 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-10"
        >
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent-gold/20 bg-accent-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-accent-gold uppercase">
                Wallet Issue
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-1">
              <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.04em] text-white">
                Initialize Pass
              </h2>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-text-secondary">
                12-Word Seed
              </div>
              <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-info">
                Local Memory Only
              </div>
            </div>
            <GoldButton onClick={() => setOpen(true)} className="mt-8 w-fit px-6 py-4">
              지갑 생성하기
            </GoldButton>
          </div>

          <div className="relative min-h-[320px]">
            <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_46%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.1),transparent_44%)]" />
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [-2, 0, -2] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              className="absolute right-4 top-8 h-[220px] w-[340px] rounded-[24px] border border-border bg-surface p-6 shadow-xl"
            >
              <p className="font-display text-2xl font-bold text-white/50">POT PASS</p>
              <p className="mt-20 font-display text-4xl font-extrabold text-white/50">184 POT</p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0], rotate: [2, 0, 2] }}
              transition={{ duration: 4.4, repeat: Number.POSITIVE_INFINITY }}
              className="absolute left-0 top-14 h-[240px] w-[360px] rounded-[24px] border border-accent-gold/40 bg-[linear-gradient(135deg,rgba(245,158,11,0.15),var(--surface))] p-6 shadow-[0_20px_60px_rgba(245,158,11,0.15)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-bold text-accent-gold">JACK PASS</p>
                <span className="rounded-md border border-accent-gold/20 bg-accent-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                  Pending
                </span>
              </div>
              <p className="mt-24 font-display text-5xl font-black text-white drop-shadow-md">10,250 JACK</p>
              <p className="mt-4 font-mono text-sm font-medium text-text-secondary">0x7FA1...EF78</p>
            </motion.div>
          </div>
        </motion.div>
      </Card>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-5"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="tech-panel w-full max-w-4xl rounded-[32px] border border-white/8 px-6 py-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-accent-gold uppercase">
                      니모닉 확인
                    </p>
                    <h3 className="mt-2 font-display text-3xl font-bold">12단어 복구 구문</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/8 px-3 py-1 text-sm text-text-secondary"
                  >
                    닫기
                  </button>
                </div>
                <label className="space-y-2">
                  <span className="text-sm text-text-secondary">닉네임</span>
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-accent-gold/45"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {MNEMONIC_SEED.map((word, index) => (
                    <motion.div
                      key={word}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-xs text-text-secondary">{index + 1}</p>
                      <p className="mt-2 font-mono text-sm text-text-primary">{word}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-text-secondary">
                    이 체험에서는 메모리 상태만 사용하므로 새로고침하면 초기화됩니다.
                  </p>
                  <GoldButton
                    onClick={() => {
                      onCreate(nickname);
                      setOpen(false);
                    }}
                  >
                    이 구문으로 지갑 열기
                  </GoldButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
