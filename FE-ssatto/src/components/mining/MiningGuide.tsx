import { motion } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import AnimatedNumber from "../common/AnimatedNumber";
import Card from "../common/Card";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";

const steps = [
  {
    id: 1,
    title: "블록 후보",
    description: "TX 배치",
    code: "jackpotchain mine --collect --limit 128",
  },
  {
    id: 2,
    title: "논스 계산",
    description: "해시 목표",
    code: "jackpotchain mine --solve --target 0000",
  },
  {
    id: 3,
    title: "보상 정산",
    description: "지갑 입금",
    code: "",
  },
];

function TypingLine({ text, active }: { text: string; active: boolean }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!active) {
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplay(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [active, text]);

  return <code className="font-mono text-sm text-accent-gold">{display}</code>;
}

export default function MiningGuide() {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();

  return (
    <div ref={ref}>
      <Card
        eyebrow="보상 파이프"
        title={
          <div className="flex items-end justify-between gap-4">
            <h3 className="font-display text-3xl font-bold text-white">3단계 보상 파이프</h3>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
              순차 진행
            </span>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {steps.map((step, index) => (
            <Fragment key={step.id}>
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.12 }}
                className="relative overflow-hidden rounded-[24px] border border-border bg-surface px-6 py-6 shadow-sm"
              >
                <div className="absolute -right-4 -top-4 text-9xl font-black text-white/[0.02] mix-blend-overlay">
                  {step.id}
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: index * 0.12 }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-gold/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.02))] font-display text-lg font-black text-accent-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  {step.id}
                </motion.div>
                <h4 className="mt-5 font-display text-2xl font-bold text-white">{step.title}</h4>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-text-secondary">{step.description}</p>
                {step.code ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.3 + index * 0.12 }}
                    className="mt-5 rounded-[18px] border border-white/8 bg-bg-primary px-4 py-4"
                  >
                    <TypingLine text={step.code} active={inView} />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={
                      inView
                        ? {
                          boxShadow: [
                            "0 0 18px rgba(245,158,11,0.06)",
                            "0 0 36px rgba(245,158,11,0.18)",
                            "0 0 18px rgba(245,158,11,0.06)",
                          ],
                        }
                        : {}
                    }
                    transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
                    className="relative z-10 mt-5 rounded-[18px] border border-accent-gold/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(245,158,11,0.02))] px-4 py-4 backdrop-blur-sm"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold/80">기본 보상</p>
                    <p className="mt-1 font-display text-4xl font-extrabold text-accent-gold drop-shadow-sm">
                      <AnimatedNumber value={50} suffix="JACK" />
                    </p>
                  </motion.div>
                )}
              </motion.div>
              {index < steps.length - 1 ? (
                <div className="hidden w-14 items-center justify-center lg:flex">
                  <div className="h-2 w-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.2),rgba(229,160,0,0.8),rgba(59,130,246,0.2))]" />
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      </Card>
    </div>
  );
}
