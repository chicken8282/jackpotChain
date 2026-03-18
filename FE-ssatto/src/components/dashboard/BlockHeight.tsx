import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";
import { dashboardStats } from "./dashboardMockData";

const stackLayers = [712, 780, 835, 881, 915, 928];

export default function BlockHeight() {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="relative flex h-full min-h-[228px] flex-col overflow-hidden rounded-[24px] border border-border bg-surface px-4 pb-4 pt-4 shadow-sm sm:px-5"
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_70%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-[1.5rem] font-bold">블록 높이</h3>
        </div>

        <div className="mt-2 grid flex-1 gap-2 lg:items-center">
          <div className="text-center">
            <p className="text-[10px] tracking-[0.2em] font-bold uppercase text-text-secondary">현재 높이</p>
            <p className="mt-1 font-display text-[clamp(2.2rem,4.8vw,3.1rem)] font-black tracking-tight text-white">
              <AnimatedNumber value={dashboardStats.currentHeight} />
            </p>
          </div>

          <div className="relative mx-auto mt-2 flex h-[82px] w-full max-w-[360px] flex-col justify-center overflow-visible">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 1.42 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1.68 } : {}}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="relative mx-auto h-[56px] w-full max-w-[290px] origin-top"
            >
              <div className="absolute bottom-1 left-1/2 h-5 w-[176px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(229,160,0,0.22),rgba(59,130,246,0.08)_70%,transparent_84%)] blur-md" />

              {stackLayers.map((layer, index) => {
                const width = 124 + index * 14;
                const bottom = index * 6;
                const leftOffset = index * 6;
                const isCurrent = layer === dashboardStats.currentHeight;

                return (
                  <motion.div
                    key={layer}
                    initial={{ opacity: 0, y: 28 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: index * 0.08, duration: 0.36 }}
                    className="absolute left-1/2"
                    style={{ width, bottom, marginLeft: `-${width / 2 - leftOffset}px` }}
                  >
                    <div
                      className={`relative h-[26px] rounded-[13px] border ${isCurrent
                        ? "border-accent-gold/30 bg-[linear-gradient(180deg,rgba(39,31,11,0.92),rgba(16,12,4,0.96))] shadow-[0_14px_28px_rgba(229,160,0,0.14)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(24,41,70,0.96),rgba(10,18,35,0.96))] shadow-[0_10px_18px_rgba(0,0,0,0.2)]"
                        }`}
                    >
                      <div className="absolute inset-x-3 top-1.5 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]" />
                      <div className="flex h-full items-center justify-between px-3">
                        <span className={`text-[10px] ${isCurrent ? "text-accent-gold" : "text-text-secondary"}`}>
                          #{layer}
                        </span>
                        {isCurrent ? (
                          <div className="flex-1 flex justify-center">
                            <span className="rounded-full border border-accent-gold/22 bg-accent-gold/10 px-2 py-0.5 text-[8px] tracking-[0.16em] text-accent-gold uppercase whitespace-nowrap">
                              현재 레이어
                            </span>
                          </div>
                        ) : (
                          <span className="text-[8px] text-text-tertiary">과거 블록</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
