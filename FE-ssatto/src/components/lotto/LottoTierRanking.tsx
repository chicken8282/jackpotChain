import Card from "../common/Card";

interface LottoTierRankingEntry {
  rank: number;
  matches: number;
  rewardJack: number;
}

const rankStyles = {
  1: {
    border: "#FFD700",
    accent: "#FFD700",
  },
  2: {
    border: "#C0C0C0",
    accent: "#C0C0C0",
  },
  3: {
    border: "#CD7F32",
    accent: "#CD7F32",
  },
} as const;

interface LottoTierRankingProps {
  entries: LottoTierRankingEntry[];
}

export default function LottoTierRanking({ entries }: LottoTierRankingProps) {
  return (
    <Card
      className="h-full rounded-[32px] border-white/8 bg-[linear-gradient(180deg,rgba(8,14,28,0.88),rgba(5,9,19,0.96))]"
      title={
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-none tracking-[-0.04em] text-white">
            Tier
          </h2>
        </div>
      }
    >
      {entries.length === 0 ? (
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.02] px-6 text-center text-sm font-bold text-text-secondary">
          랭킹 read-model은 아직 적재되지 않았습니다.
        </div>
      ) : (
        <div className="space-y-5">
          {entries.map((entry) => {
            const style = rankStyles[entry.rank as 1 | 2 | 3] ?? rankStyles[3];

            return (
              <article
                key={entry.rank}
                className="relative h-[130px] overflow-hidden rounded-[30px] border bg-[#141826] px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_36px_rgba(0,0,0,0.22)]"
                style={{ borderColor: style.border }}
              >
                <div className="absolute right-[8px] top-[8px] rounded-full border border-white/8 bg-[#222737] px-6 py-[7px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#A9AFBE]">
                  Match {entry.matches}
                </div>

                <div className="flex h-full items-center gap-8 pr-[340px]">
                  <div className="w-[170px] shrink-0">
                    <p
                      className="font-display text-[40px] font-black leading-none tracking-[-0.05em]"
                      style={{ color: style.accent }}
                    >
                      {entry.rank}위
                    </p>
                  </div>

                  <p className="min-w-[220px] -translate-x-[84px] font-display text-[25px] font-black leading-none tracking-[-0.04em] text-white">
                    상위 보상
                  </p>

                  <p
                    className="absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[25px] font-black leading-none tracking-[-0.04em]"
                    style={{ color: style.accent }}
                  >
                    {(entry.rewardJack / 100_000_000).toLocaleString("ko-KR")} JACK
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
