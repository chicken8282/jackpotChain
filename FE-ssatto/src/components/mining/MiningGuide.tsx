import Card from "../common/Card";

export default function MiningGuide() {
  return (
    <Card eyebrow="가이드" title={<h3 className="font-display text-3xl font-bold text-white">블록체인 규칙 알아보기</h3>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-border bg-surface px-6 py-5">
          <h4 className="font-display text-xl font-bold text-accent-gold">기본 보상 100 JACK</h4>
          <p className="mt-2 text-sm text-text-secondary">채굴 성공 시 블록당 기본 보상 100 JACK이 지급됩니다.</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface px-6 py-5">
          <h4 className="font-display text-xl font-bold text-info">수수료 합산</h4>
          <p className="mt-2 text-sm text-text-secondary">블록에 포함된 트랜잭션의 수수료가 합산되어 추가 보상으로 지급됩니다.</p>
        </div>
      </div>
    </Card>
  );
}
