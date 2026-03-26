import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Card from "../common/Card";

const policies = [
  {
    id: "mining",
    title: "블록 채굴 보상",
    eyebrow: "채굴 보상",
    summary: "블록을 성공적으로 채굴하면 채굴자 주소로 JACK이 자동 지급됩니다.",
    paragraphs: [
      "JackpotChain은 Proof-of-Work 방식으로 블록을 생성합니다. 채굴자는 논스값을 탐색해 난이도 조건을 만족하는 해시를 찾으면 해당 블록의 생성자로 기록되며, 코인베이스 트랜잭션을 통해 JACK이 지급됩니다.",
      "블록 보상은 블록 높이와 난이도에 따라 결정되며, 블록이 메인 체인에 확정된 이후 채굴 페이지의 '내가 채굴한 블록' 목록에 반영됩니다. 확정 전 상태의 블록은 집계에 포함되지 않습니다.",
      "블록 채굴 시 포함된 트랜잭션의 수수료 일부도 채굴자에게 합산 지급됩니다. 따라서 블록당 실제 수령 보상은 기본 블록 보상과 수수료 보상의 합산입니다.",
    ],
    bullets: [
      "지급 통화: JACK (블록 확정 후 코인베이스 트랜잭션으로 자동 지급)",
      "확인 위치: 채굴 페이지 → 내가 채굴한 블록 목록 및 총 채굴 보상",
      "정산 기준: 메인 체인 확정 블록만 집계 대상 (포크 블록 제외)",
    ],
  },
  {
    id: "onboarding",
    title: "지갑 생성 보상",
    eyebrow: "온보딩 보상",
    summary: "신규 지갑을 생성하면 로또 참여를 위한 1 POT이 자동으로 지급됩니다.",
    paragraphs: [
      "JackpotChain에서 지갑을 처음 생성하면 온보딩 보상으로 1 POT이 지급됩니다. 이 POT은 바로 사용할 수 있는 것이 아니라, 트랜잭션이 블록에 포함되어 체인에 기록된 후에야 지갑 잔액에 반영됩니다.",
      "블록체인 특성상 트랜잭션은 채굴 주기에 따라 처리됩니다. 블록이 생성되기 전까지는 트랜잭션이 mempool 대기 상태이며, 블록 채굴 후 확정되면 지갑 잔액에 1 POT이 표시됩니다.",
      "온보딩 보상은 지갑 주소당 최초 1회만 지급됩니다. 동일 주소로 재등록하거나 기존 지갑을 등록하는 경우에는 이미 지급된 것으로 간주하여 중복 지급되지 않습니다.",
    ],
    bullets: [
      "지급 통화: 1 POT (최초 지갑 생성 시 1회 한정)",
      "지급 시점: 지갑 생성 직후가 아닌, 블록 채굴 완료 후 체인 확정 시",
      "사용처: POT은 로또 참여권으로 사용되며, JACK ↔ POT 교환으로 추가 획득 가능",
    ],
  },
  {
    id: "lotto",
    title: "로또 보상",
    eyebrow: "잭팟 보상",
    summary: "16진수(0~F) 6자리를 선택해 로또에 참여하고, 일치하는 자리 수에 따라 JACK을 수령합니다.",
    paragraphs: [
      "로또 참여에는 1 POT이 필요합니다. 참여 시 16진수(0~F) 중 하나를 6자리 순서대로 선택합니다. 참여 후 일정 블록이 채굴되면 해당 블록의 해시값을 기반으로 당첨 번호가 결정되며, 선택한 숫자와 자리별로 비교해 일치 개수에 따라 보상이 지급됩니다.",
      "잭팟 풀은 블록이 채굴될 때마다 참여 수수료의 일부가 자동 적립됩니다. 6자리를 모두 맞춘 1등은 당첨 시점 잭팟 풀의 50%를 수령하며, 같은 블록에 복수의 1등이 나올 경우 해당 금액을 균등 분배합니다. 나머지 잔여 풀은 이월되어 계속 누적됩니다.",
      "당첨금은 블록 확정 후 당첨 트랜잭션이 체인에 기록되면 지갑 잔액에 반영됩니다. 참여 내역과 당첨 결과는 로또 페이지의 '참여 내역'에서 확인할 수 있습니다.",
    ],
    bullets: [
      "참여 비용: 1 POT (100 JACK으로 교환 가능, 참여 시 소각)",
      "1등 (6자리 일치) → 잭팟 풀의 50%",
      "2등 (5자리 일치) → 100,000 JACK",
      "3등 (4자리 일치) → 20,000 JACK",
      "4등 (3자리 일치) → 2,000 JACK",
      "5등 (2자리 일치) → 300 JACK",
      "6등 (1자리 일치) → 1 POT 환급",
      "당첨 기준: 블록 해시 기반 난수 결정 (순서 일치, 조작 불가)",
    ],
  },
];

export default function RewardPolicy() {
  const [selectedId, setSelectedId] = useState(policies[0].id);
  const selectedPolicy = policies.find((policy) => policy.id === selectedId) ?? policies[0];

  return (
    <Card
      eyebrow="체인 정책"
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-3xl font-bold text-white">JackpotChain 정책</h3>
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
