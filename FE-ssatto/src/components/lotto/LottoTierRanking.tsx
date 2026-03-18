import Card from "../common/Card";
import { LOTTO_TIER_RANKING } from "../../lib/constants";

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

export default function LottoTierRanking() {
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
      <div className="space-y-5">
        {LOTTO_TIER_RANKING.map((entry) => (
          <article
            key={entry.rank}
            className="relative h-[130px] overflow-hidden rounded-[30px] border bg-[#141826] px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_36px_rgba(0,0,0,0.22)]"
            style={{ borderColor: rankStyles[entry.rank].border }}
          >
            <div className="absolute right-[8px] top-[8px] rounded-full border border-white/8 bg-[#222737] px-6 py-[7px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#A9AFBE]">
              Match {entry.matchCount}
            </div>

            <div className="flex h-full items-center gap-8 pr-[340px]">
              <div className="w-[170px] shrink-0">
                <p
                  className="font-display text-[40px] font-black leading-none tracking-[-0.05em]"
                  style={{ color: rankStyles[entry.rank].accent }}
                >
                  {entry.rank}위
                </p>
              </div>

              <p className="min-w-[220px] -translate-x-[84px] font-display text-[25px] font-black leading-none tracking-[-0.04em] text-white">
                {entry.nickname}
              </p>

              <p
                className="absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[25px] font-black leading-none tracking-[-0.04em]"
                style={{ color: rankStyles[entry.rank].accent }}
              >
                {entry.reward.toLocaleString("ko-KR")} JACK
              </p>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
