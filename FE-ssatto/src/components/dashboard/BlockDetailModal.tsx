import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import BlockPrism from "./BlockPrism";
import type { DashboardBlockDetail } from "./dashboardMockData";

interface BlockDetailModalProps {
  block: DashboardBlockDetail | null;
  onClose: () => void;
}

function shortenMiddle(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function InfoRow({
  label,
  value,
  fullValue,
  accent,
  monospace = false,
  onCopy,
  copied = false,
}: {
  label: string;
  value: string;
  fullValue?: string;
  accent?: "gold" | "blue";
  monospace?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 border-b border-white/8 py-3 last:border-b-0">
      <span className="shrink-0 text-[11px] tracking-[0.16em] text-text-secondary uppercase">
        {label}
      </span>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span
          className={`min-w-0 truncate text-sm ${
            monospace ? "font-mono text-[12px]" : "font-medium"
          } ${
            accent === "gold"
              ? "text-accent-gold"
              : accent === "blue"
                ? "text-info"
                : "text-text-primary"
          }`}
          title={fullValue ?? value}
        >
          {value}
        </span>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] tracking-[0.14em] text-text-secondary uppercase transition hover:border-white/20 hover:text-text-primary"
          >
            {copied ? "Done" : "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MetaSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-white/8 bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <p className="mb-1 text-[11px] tracking-[0.18em] text-text-secondary uppercase">{title}</p>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "gold" | "blue";
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-white/8 py-3 last:border-b-0">
      <span className="text-[11px] tracking-[0.16em] text-text-secondary uppercase">{label}</span>
      <span
        className={`truncate text-right font-display text-xl font-bold tracking-[-0.04em] ${
          accent === "gold"
            ? "text-accent-gold"
            : accent === "blue"
              ? "text-info"
              : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BlockDetailModal({ block, onClose }: BlockDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!block) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [block, onClose]);

  useEffect(() => {
    if (!block) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [block]);

  useEffect(() => {
    if (!copiedField) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedField(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [copiedField]);

  const totalReward = useMemo(() => {
    if (!block) {
      return "";
    }

    return `${(block.reward + block.feeReward).toLocaleString("ko-KR")} JACK`;
  }, [block]);

  const copyValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
    } catch {
      setCopiedField(null);
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {block ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(2,6,16,0.62)] px-4 py-6 backdrop-blur-[6px] sm:px-6"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`블록 ${block.height} 상세 정보`}
            initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[min(88vh,860px)] w-full max-w-[1040px] min-w-0 flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,16,31,0.9),rgba(5,9,20,0.96))] shadow-[0_36px_110px_rgba(0,0,0,0.46)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%),radial-gradient(circle_at_20%_0%,rgba(229,160,0,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.14),transparent_42%)]" />

            <div className="relative flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] uppercase ${
                      block.status === "confirmed"
                        ? "border-accent-gold/24 bg-accent-gold/10 text-accent-gold"
                        : "border-info/24 bg-info/10 text-info"
                    }`}
                  >
                    {block.status === "confirmed" ? "확정 블록" : "후보 블록"}
                  </span>
                  {block.isMine ? (
                    <span className="rounded-full border border-accent-gold/24 bg-accent-gold/10 px-3 py-1 text-[10px] tracking-[0.16em] uppercase text-accent-gold">
                      내 블록
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 truncate font-display text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-[-0.05em]">
                  블록 #{block.height}
                </h3>
                <p className="mt-2 max-w-[56ch] truncate font-mono text-[12px] text-text-secondary">
                  {shortenMiddle(block.hash, 14, 10)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-text-secondary transition hover:border-white/20 hover:text-text-primary"
                aria-label="블록 상세 닫기"
              >
                X
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
              <div className="min-w-0 overflow-y-auto pr-1">
                <div className="grid min-w-0 gap-4">
                  <MetaSection title="기본 정보">
                    <InfoRow label="높이" value={`#${block.height}`} />
                    <InfoRow label="상태" value={block.status === "confirmed" ? "확정" : "후보"} />
                    <InfoRow label="확인 수" value={`${block.confirmations}회`} accent="gold" />
                    <InfoRow label="생성 시각" value={block.minedAt} fullValue={block.minedAt} />
                    <InfoRow label="TX 수" value={`${block.txCount}건`} />
                  </MetaSection>

                  <MetaSection title="헤더 정보">
                    <InfoRow label="버전" value={block.version} fullValue={block.version} monospace />
                    <InfoRow
                      label="이전 블록"
                      value={shortenMiddle(block.previousHash)}
                      fullValue={block.previousHash}
                      monospace
                      onCopy={() => copyValue("previousHash", block.previousHash)}
                      copied={copiedField === "previousHash"}
                    />
                    <InfoRow
                      label="머클 루트"
                      value={shortenMiddle(block.merkleRoot)}
                      fullValue={block.merkleRoot}
                      monospace
                      onCopy={() => copyValue("merkleRoot", block.merkleRoot)}
                      copied={copiedField === "merkleRoot"}
                    />
                    <InfoRow label="Nonce" value={block.nonce.toLocaleString("ko-KR")} monospace />
                    <InfoRow label="난이도" value={block.difficulty} accent="blue" monospace />
                  </MetaSection>

                  <MetaSection title="채굴 정보">
                    <InfoRow
                      label="채굴 주소"
                      value={shortenMiddle(block.coinbaseAddress, 8, 4)}
                      fullValue={block.coinbaseAddress}
                      monospace
                      onCopy={() => copyValue("coinbaseAddress", block.coinbaseAddress)}
                      copied={copiedField === "coinbaseAddress"}
                    />
                    <InfoRow label="채굴 태그" value={block.minerLabel} fullValue={block.minerLabel} />
                    <InfoRow label="블록 보상" value={`${block.reward.toLocaleString("ko-KR")} JACK`} accent="gold" />
                    <InfoRow label="수수료" value={`${block.feeReward.toLocaleString("ko-KR")} JACK`} />
                    <InfoRow label="총 보상" value={totalReward} accent="gold" />
                    <InfoRow label="채굴 소요" value={block.miningElapsed} />
                  </MetaSection>

                  <MetaSection title="네트워크 상태">
                    <InfoRow
                      label="블록 해시"
                      value={shortenMiddle(block.hash, 12, 8)}
                      fullValue={block.hash}
                      monospace
                      onCopy={() => copyValue("hash", block.hash)}
                      copied={copiedField === "hash"}
                    />
                    <InfoRow label="짧은 해시" value={block.id} fullValue={block.id} monospace />
                    <InfoRow label="체인 위치" value={block.isMainChain ? "메인 체인" : "분기 체인"} />
                    <InfoRow
                      label="잭팟 기여"
                      value={`${block.jackpotContribution.toLocaleString("ko-KR")} JACK`}
                      accent="blue"
                    />
                    <InfoRow label="활성 시점" value={block.minedAt} fullValue={block.minedAt} />
                  </MetaSection>
                </div>
              </div>

              <aside className="min-w-0 overflow-y-auto">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                  <p className="text-[11px] tracking-[0.18em] text-text-secondary uppercase">블록 요약</p>

                  <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,25,45,0.86),rgba(8,13,24,0.94))] px-4 py-5">
                    <div className="flex justify-center overflow-hidden">
                      <BlockPrism block={block} compact active />
                    </div>

                    <div className="mt-5 min-w-0 border-t border-white/8 pt-2">
                      <SummaryMetric
                        label="상태"
                        value={block.status === "confirmed" ? "확정" : "후보"}
                        accent={block.status === "confirmed" ? "gold" : "blue"}
                      />
                      <SummaryMetric label="총 보상" value={totalReward} accent="gold" />
                      <SummaryMetric label="TX 수" value={`${block.txCount}건`} />
                      <SummaryMetric label="확인 수" value={`${block.confirmations}회`} />
                      <SummaryMetric label="난이도" value={block.difficulty} accent="blue" />
                      <SummaryMetric
                        label="Nonce"
                        value={block.nonce.toLocaleString("ko-KR")}
                      />
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
