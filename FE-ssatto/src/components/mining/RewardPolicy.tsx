import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Card from "../common/Card";

const policies = [
  {
    title: "기본 블록 보상",
    body: "확정된 블록당 100 JACK이 생성되며 지갑 잔고에 즉시 지급됩니다.",
  },
  {
    title: "잭팟 기여",
    body: "트랜잭션 수수료의 일부가 잭팟 풀로 적립되어 다음 사이클의 로또 보상을 증가시킵니다.",
  },
  {
    title: "수수료 보상",
    body: "해당 블록에 담긴 트랜잭션의 처리 수수료도 추가 보상으로 채굴자에게 지급됩니다.",
  },
];

export default function RewardPolicy() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
      <div className="space-y-3">
        {policies.map((policy, index) => {
          const open = openIndex === index;
          return (
            <div
              key={policy.title}
              className={`rounded-xl border transition-colors ${open ? "border-info/30 bg-[linear-gradient(90deg,rgba(59,130,246,0.06),var(--surface))] shadow-[0_4px_20px_rgba(59,130,246,0.05)]" : "border-border bg-surface shadow-sm hover:border-text-tertiary/40"
                }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between px-5 py-5 text-left"
              >
                <span className={`font-display text-[1.1rem] font-bold ${open ? "text-info drop-shadow-sm" : "text-text-primary"}`}>{policy.title}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-text-secondary stroke-[2]">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm leading-6 text-text-secondary">{policy.body}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
