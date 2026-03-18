import { motion } from "motion/react";
import AnimatedNumber from "../common/AnimatedNumber";
import { useAnimateOnScroll } from "../../hooks/useAnimateOnScroll";
import { dashboardStats } from "./dashboardMockData";

export default function JackpotPool() {
  const { ref, inView } = useAnimateOnScroll<HTMLDivElement>();
  const coins = Array.from({ length: 8 }, (_, index) => ({
    id: index,
    left: 24 + (index % 4) * 13,
    delay: index * 0.26,
    duration: 2.4 + (index % 3) * 0.28,
  }));

  return (
    <section
      ref={ref}
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,16,30,0.72),rgba(7,11,21,0.88))] px-5 py-6 sm:px-7 sm:py-7"
    >
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(229,160,0,0.12),transparent_68%)]" />
      <div className="mb-4">
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold leading-[1] text-white">
          잭팟 풀
        </h2>
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[280px] w-full max-w-[300px]"
        >
          <div className="absolute left-1/2 top-0 h-7 w-24 -translate-x-1/2 rounded-b-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(17,24,39,0.68))]" />
          <div className="absolute left-1/2 top-6 h-6 w-2.5 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
          <div className="absolute inset-x-5 bottom-0 top-9 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_18%,rgba(5,9,19,0.3)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-md">
            <div className="absolute inset-x-4 bottom-4 top-4 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(59,130,246,0.06),rgba(255,255,255,0.01)_24%,rgba(229,160,0,0.05)_100%)]" />
            <div className="absolute inset-x-7 bottom-6 h-16 rounded-[24px] bg-[linear-gradient(180deg,rgba(229,160,0,0.34),rgba(229,160,0,0.12))] blur-sm" />
            <div className="absolute inset-x-7 bottom-7 h-14 rounded-[24px] border border-accent-gold/18 bg-[radial-gradient(circle_at_top,rgba(255,232,179,0.28),rgba(229,160,0,0.06)_62%,transparent_82%)]" />

            {coins.map((coin) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, y: -16 }}
                animate={
                  inView
                    ? {
                      opacity: [0, 1, 1, 0],
                      y: [-6, 60, 160, 240],
                      x: [0, 1, -2, 0],
                      scale: [0.7, 0.9, 0.98, 0.96],
                    }
                    : {}
                }
                transition={{
                  delay: coin.delay,
                  duration: coin.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeIn",
                }}
                className="absolute top-[-8px] h-8 w-8 rounded-full border border-[#F5D57B]/45 bg-[radial-gradient(circle_at_30%_28%,#FFF0BF,#E5A000_58%,#996300_100%)] text-center font-display text-xs font-bold leading-8 text-[#231600] shadow-[0_0_14px_rgba(229,160,0,0.3)]"
                style={{ left: `${coin.left}%` }}
              >
                J
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="mt-4">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-5xl sm:text-[4.5rem] font-black tracking-[-0.04em] text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <AnimatedNumber value={dashboardStats.jackpotPool} delay={0.12} />
            </p>
            <p className="text-2xl font-bold text-accent-gold">JACK</p>
          </div>
        </div>
      </div>
    </section>
  );
}
