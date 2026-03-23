import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LottoPage = lazy(() => import("./pages/LottoPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const MiningPage = lazy(() => import("./pages/MiningPage"));

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
};

export default function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-primary text-text-primary">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.03),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>
      <Navbar />
      <Suspense
        fallback={
          <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6">
            <div className="rounded-[28px] border border-border bg-surface/80 px-8 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <p className="font-display text-2xl font-black text-white">화면을 불러오는 중입니다.</p>
              <p className="mt-2 text-sm text-text-secondary">잠시만 기다려주세요.</p>
            </div>
          </div>
        }
      >
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageTransition} className="relative z-10">
            <Routes location={location}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/lotto" element={<LottoPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/mining" element={<MiningPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
