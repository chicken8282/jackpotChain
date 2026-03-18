import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Card from "../common/Card";

const policies = [
  {
    id: "base",
    title: "기본 블록 보상",
    eyebrow: "확정 보상",
    summary: "확정 블록 기준으로 정산되는 기본 채굴 보상 흐름입니다.",
    paragraphs: [
      "확정된 블록은 채굴 페이지에서 내 채굴 블록 목록과 총 채굴 보상 집계에 반영됩니다. 프론트 기능 명세에서는 이 영역이 현재 지갑 기준의 `wallet_mined_block` 조회와 누적 보상 표시를 담당하도록 정의되어 있습니다.",
      "블록 상세 모달은 높이, 해시, reward, difficulty, nonce, minedAt 같은 헤더성 정보를 함께 보여주도록 정리되어 있어 기본 보상은 단순 숫자 배지가 아니라 블록 메타데이터와 묶인 결과로 이해되어야 합니다.",
      "리뷰 문서 기준으로 채굴 데이터는 블록과 보상 이벤트를 기반으로 한 조회용 프로젝션으로 설계하는 것이 적절하므로, 화면에 보이는 기본 보상도 체인 결과를 요약한 읽기 모델이라는 전제를 유지합니다.",
    ],
    bullets: [
      "표시 데이터: `blockId`, `height`, `hash`, `reward`, `createdAt`",
      "운영 메모: 총 채굴 보상은 기간/통화 단위와 함께 집계 가능해야 함",
      "정산 기준: 확정 블록 반영 후 내 주소 기준으로 필터링",
    ],
  },
  {
    id: "jackpot",
    title: "잭팟 기여",
    eyebrow: "풀 적립 규칙",
    summary: "블록에 포함된 일부 가치가 잭팟 풀 증가로 연결되는 정책입니다.",
    paragraphs: [
      "프론트 도메인 감사 문서에서는 최근 블록의 잭팟 기여분과 최근 N개 블록 기준 집계가 운영 지표로 필요하다고 정리되어 있습니다. 따라서 잭팟 기여는 단일 카드 문구보다 최근 블록 집계와 함께 읽히는 것이 적절합니다.",
      "대시보드 블록 상세와 채굴 블록 상세 모두 `jackpotContribution` 필드를 포함하도록 기능 명세가 작성되어 있어, 잭팟 기여는 블록 단위 보상 구조의 일부로 일관되게 노출되어야 합니다.",
      "이 값은 로또 보상 증가와 연결되는 표시용/운영용 프로젝션이므로, 화면에서는 풀 적립 흐름을 설명하되 체인 정본을 프론트가 재정의하지 않도록 요약 정보로 다루는 편이 안전합니다.",
    ],
    bullets: [
      "표시 데이터: 최근 블록별 `jackpotContribution`",
      "운영 메모: 최근 N개 블록 + 잭팟 기여 합계 집계 필요",
      "사용자 이해 포인트: 잭팟 풀 증가는 다음 추첨 사이클 보상 체감과 연결됨",
    ],
  },
  {
    id: "fee",
    title: "수수료 보상",
    eyebrow: "트랜잭션 정산",
    summary: "블록에 담긴 트랜잭션 처리 수수료가 채굴자 보상에 합산되는 방식입니다.",
    paragraphs: [
      "기능 명세의 블록 상세 영역에는 `feeReward`가 별도 필드로 존재하므로, 수수료 보상은 기본 블록 보상과 분리된 설명이 필요합니다. 사용자는 보상 총액이 어떤 항목으로 구성되는지 카드와 모달에서 함께 확인해야 합니다.",
      "도메인 감사에서는 최근 N개 블록 기준 수수료 집계도 PostgreSQL projection 후보로 명시되어 있어, 수수료 보상은 실시간 체인 원본이 아니라 운영 조회 모델을 통해 안정적으로 제공되는 값으로 보는 편이 맞습니다.",
      "정책 안내에서는 수수료 보상이 블록 포함 트랜잭션 양과 네트워크 활동량에 따라 달라질 수 있음을 설명해야 하며, 따라서 각 블록의 보상 총액은 고정 수치가 아니라 구성 항목의 합으로 읽히게 하는 것이 중요합니다.",
    ],
    bullets: [
      "표시 데이터: `feeReward`, `txCount`, 블록별 헤더 메타데이터",
      "운영 메모: 최근 블록 수수료 합계와 잭팟 기여분은 함께 집계 가능해야 함",
      "사용자 이해 포인트: 보상 총액 = 기본 보상 + 수수료 보상 + 기타 정책 반영 항목",
    ],
  },
];

export default function RewardPolicy() {
  const [selectedId, setSelectedId] = useState(policies[0].id);
  const selectedPolicy = policies.find((policy) => policy.id === selectedId) ?? policies[0];

  return (
    <Card
      eyebrow="정책"
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-3xl font-bold text-white">보상 정책</h3>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
            상세 보기
          </span>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(98,178,254,0.12),rgba(9,14,26,0.92))] p-4">
          <div className="space-y-3">
            {policies.map((policy, index) => {
              const active = policy.id === selectedId;

              return (
                <motion.button
                  key={policy.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  onClick={() => setSelectedId(policy.id)}
                  className={`flex w-full items-center justify-between rounded-full border px-5 py-4 text-left transition-all ${
                    active
                      ? "border-[#9CCBFF]/35 bg-[rgba(255,255,255,0.16)] text-[#CFE5FF] shadow-[0_14px_30px_rgba(99,178,254,0.12)]"
                      : "border-white/18 bg-transparent text-white/64 hover:border-white/36 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                        active ? "border-[#9CCBFF]/30 bg-[#62B2FE]/12 text-[#CFE5FF]" : "border-white/15 bg-white/[0.06] text-white/45"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold tracking-tight">{policy.title}</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-[#62B2FE]" : "bg-white/20"}`} />
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[430px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,11,22,0.98))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPolicy.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.28 }}
              className="flex h-full flex-col"
            >
              <span className="w-fit rounded-full border border-info/20 bg-info/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-info">
                {selectedPolicy.eyebrow}
              </span>
              <h4 className="mt-4 font-display text-[2rem] font-black tracking-[-0.04em] text-white">
                {selectedPolicy.title}
              </h4>
              <p className="mt-3 text-base leading-7 text-text-secondary">{selectedPolicy.summary}</p>

              <div className="mt-6 space-y-4">
                {selectedPolicy.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-text-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-gold">정리 포인트</p>
                <div className="mt-4 space-y-3">
                  {selectedPolicy.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-gold" />
                      <p className="text-sm leading-6 text-text-secondary">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}
