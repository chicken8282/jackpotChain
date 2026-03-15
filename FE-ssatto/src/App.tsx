import { AnimatePresence, motion } from "motion/react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import DashboardPage from "./pages/DashboardPage";
import LottoPage from "./pages/LottoPage";
import MiningPage from "./pages/MiningPage";
import WalletPage from "./pages/WalletPage";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
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
    </div>
  );
}
