import Card from "../common/Card";
import type { LottoRankingItem } from "../../services/lottoService";

const rankStyles = {
  1: { border: "#FFD700", accent: "#FFD700", label: "🥇" },
  2: { border: "#C0C0C0", accent: "#C0C0C0", label: "🥈" },
  3: { border: "#CD7F32", accent: "#CD7F32", label: "🥉" },
} as const;

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatClaimedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(iso));
  } catch {
    return "-";
  }
}

interface LottoTierRankingProps {
  winners: LottoRankingItem[];
}

export default function LottoTierRanking({ winners }: LottoTierRankingProps) {
  return (
    <Card
      className="h-full rounded-[32px] border-white/8 bg-[linear-gradient(180deg,rgba(8,14,28,0.88),rgba(5,9,19,0.96))]"
      title={
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-none tracking-[-0.04em] text-white">
            Tier
          </h2>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-text-secondary">
            Top 3 당첨자
          </p>
        </div>
      }
    >
      {winners.length === 0 ? (
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.02] px-6 text-center text-sm font-bold text-text-secondary">
          아직 당첨자가 없습니다.
        </div>
      ) : (
        <div className="space-y-5">
          {winners.map((winner) => {
            const style = rankStyles[winner.rank as 1 | 2 | 3] ?? rankStyles[3];

            return (
              <article
                key={winner.rank}
                className="relative overflow-hidden rounded-[30px] border bg-[#141826] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_36px_rgba(0,0,0,0.22)]"
                style={{ borderColor: style.border }}
              >
                <div className="flex items-center gap-5">
                  {/* 순위 */}
                  <div className="w-16 shrink-0 text-center">
                    <p
                      className="font-display text-[36px] font-black leading-none tracking-[-0.05em]"
                      style={{ color: style.accent }}
                    >
                      {winner.rank}위
                    </p>
                  </div>

                  {/* 지갑 + 수령일 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] font-bold text-white">
                      {truncateAddress(winner.walletAddress)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-tertiary">
                      Match {winner.matchCount} · {formatClaimedAt(winner.claimedAt)}
                    </p>
                  </div>

                  {/* 보상 */}
                  <div className="shrink-0 text-right">
                    <p
                      className="whitespace-nowrap font-display text-[18px] font-black leading-none tracking-[-0.04em]"
                      style={{ color: style.accent }}
                    >
                      {(winner.rewardJack / 100_000_000).toLocaleString("ko-KR")}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                      JACK
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
