import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";

interface WalletInfoProps {
  nickname: string;
  address: string;
  jackBalance: number;
  potBalance: number;
}

export default function WalletInfo({
  nickname,
  address,
  jackBalance,
  potBalance,
}: WalletInfoProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="overflow-hidden rounded-[34px]"
        eyebrow="연결 완료"
        title={
          <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-success uppercase mb-1">연결 완료</p>
              <h2 className="font-display text-3xl font-bold text-white">{nickname}님의 지갑</h2>
              <p className="mt-1 font-mono text-sm font-medium text-text-secondary">{address}</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
                디지털 패스
              </span>
              <span className="rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-success shadow-sm">
                활성 상태
              </span>
            </div>
          </div>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[320px]">
            <motion.div
              initial={{ rotate: -4, x: 18, y: 16 }}
              animate={{ rotate: -4, x: 18, y: 16 }}
              className="absolute inset-x-10 top-8 h-[220px] rounded-[24px] border border-border bg-surface p-6 shadow-md"
            >
              <p className="font-display text-2xl font-bold text-text-tertiary">POT 패스</p>
              <p className="mt-20 font-display text-4xl font-extrabold text-text-secondary">
                <AnimatedNumber value={potBalance} suffix="POT" delay={0.2} />
              </p>
            </motion.div>
            <motion.div
              whileHover={{ rotate: -1, y: -4, scale: 1.02 }}
              className="absolute inset-x-0 top-0 h-[250px] rounded-[24px] border border-accent-gold/50 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),var(--surface))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-bold text-accent-gold">JACK 패스</p>
                <span className="rounded-md border border-accent-gold/20 bg-accent-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                  준비 완료
                </span>
              </div>
              <p className="mt-24 font-display text-5xl font-black text-white drop-shadow-sm tracking-tight">
                <AnimatedNumber value={jackBalance} suffix="JACK" />
              </p>
              <div className="mt-6 flex items-center justify-between text-sm font-medium">
                <span className="text-text-secondary">소유자 {nickname}</span>
                <span className="font-mono text-text-tertiary">0x7FA1...EF78</span>
              </div>
            </motion.div>
          </div>
          <div className="grid gap-2 self-end">
            <div className="rounded-[16px] border border-border bg-surface px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">주소</p>
              <p className="mt-1 font-mono text-sm text-text-secondary">{address}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-surface px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">최근 상태</p>
              <p className="mt-1 font-display text-lg font-bold text-text-primary">최근 스마트 컨트랙트 동작 정상</p>
            </div>
            <div className="rounded-[16px] border border-accent-gold/30 bg-[linear-gradient(90deg,rgba(245,158,11,0.05),transparent)] px-4 py-3 shadow-[0_4px_20px_rgba(245,158,11,0.08)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/80">보유 자산</p>
              <p className="mt-1 font-display text-xl font-bold text-accent-gold">
                JACK + POT
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
