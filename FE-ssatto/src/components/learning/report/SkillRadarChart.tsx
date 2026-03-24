// [학습 프론트엔드 v2] 추가: 6대 역량 레이더 차트 컴포넌트
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const MOCK_DATA = [
  { category: "보안", score: 82 },
  { category: "트랜잭션", score: 75 },
  { category: "네트워크", score: 68 },
  { category: "합의", score: 90 },
  { category: "토큰이코노미", score: 63 },
  { category: "공정성", score: 85 },
];

export default function SkillRadarChart() {
  return (
    <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl p-6">
      <h3 className="text-white font-semibold text-lg mb-4">역량 분석</h3>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={MOCK_DATA}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            />
            <Radar
              name="역량"
              dataKey="score"
              stroke="#F3C44C"
              fill="rgba(245,158,11,0.3)"
              fillOpacity={1}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {MOCK_DATA.map((d) => (
          <div
            key={d.category}
            className="text-center py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <p className="text-white/30 text-xs">{d.category}</p>
            <p className="text-white font-semibold text-sm">{d.score}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
