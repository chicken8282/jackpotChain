"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { createPortal } from "react-dom"
import Card from "../common/Card"
import AnimatedNumber from "../common/AnimatedNumber"

interface LottoEntry {
  id: number
  numbers: string[]
  date: string
  blockHash: string
  isWinner: boolean
  prize?: string
}

const mockHistory: LottoEntry[] = [
  {
    id: 1,
    numbers: ["0A", "1F", "2B", "3D", "44", "5E"],
    date: "2024.03.15 14:30",
    blockHash: "0x8f2a...3e1d",
    isWinner: true,
    prize: "2,500 POT",
  },
  {
    id: 2,
    numbers: ["12", "A3", "45", "78", "BC", "09"],
    date: "2024.03.14 09:15",
    blockHash: "0x1c4e...9a2b",
    isWinner: false,
  },
  {
    id: 3,
    numbers: ["F1", "E2", "D3", "C4", "B5", "A6"],
    date: "2024.03.13 22:45",
    blockHash: "0x7d0a...f8c9",
    isWinner: false,
  },
]

// Slot themes: border color 80% + blue 20% mix as fill, using inline styles
// so Tailwind's JIT doesn't strip them out at build time
const SLOT_THEMES = [
  {
    // Yellow
    twBorder: "1px solid rgba(251,191,36,0.9)",
    bgColor: "linear-gradient(180deg, rgba(201,153,29,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(251,191,36,0.45)",
  },
  {
    // Blue
    twBorder: "1px solid rgba(56,189,248,0.9)",
    bgColor: "linear-gradient(180deg, rgba(45,151,198,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(56,189,248,0.45)",
  },
  {
    // Red
    twBorder: "1px solid rgba(255,101,95,0.9)",
    bgColor: "linear-gradient(180deg, rgba(204,81,76,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(255,101,95,0.45)",
  },
  {
    // Gray
    twBorder: "1px solid rgba(148,163,184,0.9)",
    bgColor: "linear-gradient(180deg, rgba(118,130,147,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(148,163,184,0.45)",
  },
  {
    // Green
    twBorder: "1px solid rgba(52,211,153,0.9)",
    bgColor: "linear-gradient(180deg, rgba(42,169,122,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(52,211,153,0.45)",
  },
  {
    // Orange
    twBorder: "1px solid rgba(249,115,22,0.9)",
    bgColor: "linear-gradient(180deg, rgba(199,92,18,0.60) 0%, rgba(12,40,90,0.60) 100%)",
    boxGlow: "rgba(249,115,22,0.45)",
  },
]

function BlockDetailModal({ entry, onClose }: { entry: LottoEntry | null; onClose: () => void }) {
  if (!entry) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg rounded-[30px] border border-white/10 bg-[#0C101C] p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-text-tertiary hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">추첨 결과 상세</h3>
          <p className="text-text-secondary text-sm">{entry.date}</p>
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3 block">선택 번호</span>
            <div className="flex gap-2">
              {entry.numbers.map((n, i) => (
                <div
                  key={i}
                  className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center font-display text-lg font-bold text-white"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1 block">블록 해시</span>
              <p className="font-mono text-sm text-info truncate">{entry.blockHash}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1 block">당첨 여부</span>
              <p className={`font-bold ${entry.isWinner ? "text-accent-gold" : "text-text-tertiary"}`}>
                {entry.isWinner ? `당첨 (${entry.prize})` : "낙첨"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
        >
          확인
        </button>
      </motion.div>
    </div>
  )
}

export default function HexPicker({ disabled = false }: { disabled?: boolean }) {
  const [tab, setTab] = useState<"draw" | "history">("draw")
  const [selected, setSelected] = useState(["0A", "1F", "2B", "3C", "4D", "5E"])
  const [jackBalance, setJackBalance] = useState(10250)
  const [potBalance, setPotBalance] = useState(184)
  const [randomizing, setRandomizing] = useState(false)
  const [history] = useState(mockHistory)
  const [selectedHistory, setSelectedHistory] = useState<LottoEntry | null>(null)
  const [slotPulse, setSlotPulse] = useState<number | null>(null)

  const handleRandomize = useCallback(() => {
    setRandomizing(true)
    let count = 0
    const interval = setInterval(() => {
      setSelected(selected.map(() =>
        Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")
      ))
      count++
      if (count > 12) {
        clearInterval(interval)
        setRandomizing(false)
      }
    }, 80)
  }, [selected])

  const handleExchange = (type: "JACK_TO_POT" | "POT_TO_JACK") => {
    if (type === "JACK_TO_POT") {
      if (jackBalance >= 100) {
        setJackBalance((prev) => prev - 100)
        setPotBalance((prev) => prev + 1)
      }
    } else {
      if (potBalance >= 1) {
        setPotBalance((prev) => prev - 1)
        setJackBalance((prev) => prev + 100)
      }
    }
  }

  const cycleSlot = (index: number, delta: number) => {
    const next = [...selected]
    let val = parseInt(next[index], 16)
    val = (val + delta + 256) % 256
    next[index] = val.toString(16).toUpperCase().padStart(2, "0")
    setSelected(next)
    setSlotPulse(index)
    setTimeout(() => setSlotPulse(null), 300)
  }

  const getNeighborValue = (hex: string, delta: number) => {
    let val = parseInt(hex, 16)
    val = (val + delta + 256) % 256
    return val.toString(16).toUpperCase().padStart(2, "0")
  }

  const handleParticipate = () => {
    alert("참여가 완료되었습니다!")
    setTab("history")
  }

  return (
    <>
      <Card
        className="overflow-hidden rounded-[34px]"
        title={
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <h2
              className={`font-display text-3xl font-bold leading-[1] tracking-[-0.04em] ${tab === "draw" ? "ml-3 lg:ml-7 text-[#DEA03C]" : "text-white"
                }`}
            >
              {tab === "draw" ? "로또 추첨하기" : "참여 내역"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setTab("draw")}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "draw"
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-text-tertiary hover:text-text-secondary"
                    }`}
                >
                  로또 추첨
                </button>
                <button
                  onClick={() => setTab("history")}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "history"
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-text-tertiary hover:text-text-secondary"
                    }`}
                >
                  참여 내역
                </button>
              </div>
            </div>
          </div>
        }
      >
        <div className="py-2">
          {tab === "draw" ? (
            <>
              {/* ── Top row: JACK | exchange | POT  +  참여하기 ── */}
              <div className="flex items-center justify-center gap-6 mb-8 mt-4 px-2 relative min-h-[80px]">
                {/* Coin cards + exchange buttons, centered together */}
                <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6 flex-1">
                  {/* JACK card */}
                  <div className="flex flex-col items-center text-center rounded-[20px] border border-orange-400/50 bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(10,15,30,0.85))] px-5 py-4 shadow-[0_4px_24px_rgba(251,146,60,0.15)] min-w-[200px]">
                    <span className="text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-1.5">JACK 코인</span>
                    <p className="font-display text-3xl font-black text-white leading-none">
                      <AnimatedNumber value={jackBalance} />
                    </p>
                  </div>

                  {/* Exchange buttons */}
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 whitespace-nowrap">
                      비율 100 JACK = 1 POT
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExchange("POT_TO_JACK")}
                        title="POT → JACK"
                        className="p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-400/40 transition-colors text-text-secondary hover:text-orange-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleExchange("JACK_TO_POT")}
                        title="JACK → POT"
                        className="p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-info/40 transition-colors text-text-secondary hover:text-info"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* POT card */}
                  <div className="flex flex-col items-center text-center rounded-[20px] border border-info/40 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(10,15,30,0.85))] px-5 py-4 shadow-[0_4px_20px_rgba(59,130,246,0.1)] min-w-[200px]">
                    <span className="text-[10px] text-info uppercase tracking-widest font-bold mb-1.5">POT 코인</span>
                    <p className="font-display text-3xl font-black text-white leading-none">
                      <AnimatedNumber value={potBalance} delay={0.15} />
                    </p>
                  </div>
                </div>

                {/* 참여하기 button — absolutely placed right */}
                <div className="absolute right-[18px] top-1/2 -translate-y-1/2 hidden xl:block">
                  <button
                    type="button"
                    onClick={handleParticipate}
                    disabled={disabled || randomizing}
                    className="rounded-[14px] border-2 border-[#DEA03C] bg-[linear-gradient(135deg,rgba(222,160,60,0.22),rgba(5,10,20,0.95))] px-8 py-2.5 text-sm font-bold text-white transition hover:border-[#DEA03C] hover:bg-[#DEA03C]/25 active:scale-95 disabled:opacity-50 shadow-[0_4px_20px_rgba(222,160,60,0.2)]"
                  >
                    참여하기
                  </button>
                </div>
              </div>

              {/* ── Draw area ── */}
              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,#0A0D18,#02040A)] px-4 py-10">
                {/* Ambient glow overlays */}
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent)]" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(222,160,60,0.05),transparent)]" />

                {/*
                  Layout goal: the gap between slot 3 (index 2) and slot 4 (index 3)
                  should sit directly below the exchange buttons (<>).

                  The exchange buttons are centered in the parent container.
                  Each slot is 130px wide with ~12px gap → 3 slots = 3×130 + 2×12 = 414px from left edge.
                  To shift the slot grid 65px right (half a slot width), we use marginLeft on the wrapper.
                */}
                <div className="relative flex items-center justify-center">
                  {/* Slot grid wrapper — shifted right by 65px so 3rd/4th slot gap aligns with exchange buttons */}
                  <div
                    className="subtle-scroll overflow-x-auto pb-2"
                    style={{ marginLeft: "98px", marginRight: "140px" }}
                  >
                    <div className="flex min-w-max items-stretch justify-center gap-3 sm:gap-4 px-2">
                      {selected.map((value, index) => {
                        const theme = SLOT_THEMES[index % SLOT_THEMES.length]

                        return (
                          <div
                            key={`${index}-${value}`}
                            className="flex w-[118px] shrink-0 flex-col items-center gap-3 sm:w-[130px]"
                          >
                            {/* Up button */}
                            <motion.button
                              type="button"
                              onClick={() => cycleSlot(index, 1)}
                              whileTap={{ scale: 0.96 }}
                              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-xl text-text-primary transition hover:border-white/30"
                            >
                              +
                            </motion.button>

                            {/* Slot card */}
                            <motion.div
                              animate={
                                randomizing
                                  ? { y: [0, -10, 10, -5, 0] }
                                  : slotPulse === index
                                    ? { scale: [1, 1.04, 1] }
                                    : { y: 0, scale: 1 }
                              }
                              transition={{ duration: randomizing ? 0.6 : 0.32 }}
                              className="relative w-full rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(17,24,39,0.95))] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_40px_rgba(0,0,0,0.3)]"
                            >
                              <div className="pointer-events-none absolute inset-x-3 top-3 h-8 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
                              <div className="text-center">
                                {/* Neighbor value above */}
                                <p className="font-mono text-lg text-text-tertiary drop-shadow-md">
                                  {getNeighborValue(value, 1)}
                                </p>

                                {/* Active value box — inline style so colors actually render */}
                                <div
                                  className="my-2 rounded-[16px] px-2 py-5"
                                  style={{
                                    border: theme.twBorder,
                                    background: theme.bgColor,
                                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px ${theme.boxGlow}`,
                                  }}
                                >
                                  <AnimatePresence mode="wait">
                                    <motion.p
                                      key={value}
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -15 }}
                                      transition={{ duration: 0.15 }}
                                      className="font-display text-5xl font-extrabold tracking-[0.08em] text-white drop-shadow-sm"
                                    >
                                      {value}
                                    </motion.p>
                                  </AnimatePresence>
                                </div>

                                {/* Neighbor value below */}
                                <p className="font-mono text-lg text-text-tertiary">
                                  {getNeighborValue(value, -1)}
                                </p>
                              </div>
                            </motion.div>

                            {/* Down button */}
                            <motion.button
                              type="button"
                              onClick={() => cycleSlot(index, -1)}
                              whileTap={{ scale: 0.96 }}
                              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-xl text-text-primary transition hover:border-white/30"
                            >
                              -
                            </motion.button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Random generate button — right side, vertically centered */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden xl:flex items-center">
                    <button
                      type="button"
                      onClick={handleRandomize}
                      disabled={randomizing}
                      className="rounded-[14px] border border-white/25 bg-white/[0.14] px-6 py-4 text-sm font-bold text-white/90 whitespace-nowrap min-w-[120px] transition hover:bg-white/[0.22] hover:text-white hover:border-white/40 active:scale-95 disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                    >
                      랜덤 생성
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="max-h-[480px] overflow-y-auto subtle-scroll pr-2 space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedHistory(entry)}
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{entry.date}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${entry.isWinner
                          ? "bg-accent-gold/20 text-accent-gold"
                          : "bg-white/10 text-text-tertiary"
                          }`}
                      >
                        {entry.isWinner ? "당첨" : "낙첨"}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {entry.numbers.map((n, i) => (
                        <span key={i} className="font-mono text-xs text-text-secondary">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.isWinner && (
                      <span className="text-sm font-bold text-accent-gold">{entry.prize}</span>
                    )}
                    <svg
                      className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {selectedHistory &&
          createPortal(
            <BlockDetailModal entry={selectedHistory} onClose={() => setSelectedHistory(null)} />,
            document.body
          )}
      </AnimatePresence>
    </>
  )
}
