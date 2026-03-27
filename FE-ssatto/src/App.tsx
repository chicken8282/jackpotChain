import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import PageLayout from "./components/layout/PageLayout";
// [챗봇] 전역 챗봇 컴포넌트 — chatbotConfig.ts에서 ON/OFF 제어
import ChatBot from "./components/chatbot/ChatBot";
import { useHardRefreshHandler } from "./hooks/useHardRefreshHandler";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LottoPage = lazy(() => import("./pages/LottoPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const MiningPage = lazy(() => import("./pages/MiningPage"));
// [학습 프론트엔드 v2] 추가 시작: 학습 페이지 lazy import
const LearnLandingPage = lazy(() => import("./pages/LearnLandingPage"));
const LearnModulePage = lazy(() => import("./pages/LearnModulePage"));
const LearnReportPage = lazy(() => import("./pages/LearnReportPage"));
const LearnNetworkPage = lazy(() => import("./pages/LearnNetworkPage"));
// [학습 프론트엔드 v2] 추가 끝

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
};

export default function App() {
  const location = useLocation();
  useHardRefreshHandler();

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
              {/* [학습 프론트엔드 v2] 추가 시작: 학습 라우트 */}
              <Route path="/learn" element={<LearnLandingPage />} />
              <Route path="/learn/:stage/:module" element={<LearnModulePage />} />
              <Route path="/learn/report" element={<LearnReportPage />} />
              <Route path="/learn/network" element={<LearnNetworkPage />} />
              {/* [학습 프론트엔드 v2] 추가 끝 */}
              <Route
                path="*"
                element={
                  <PageLayout>
                    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
                      <p className="font-display text-6xl font-black text-white">404</p>
                      <p className="text-lg font-bold text-text-secondary">존재하지 않는 페이지입니다.</p>
                    </div>
                  </PageLayout>
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
      {/* [챗봇] 모든 페이지에서 우측 하단에 플로팅 표시 */}
      <ChatBot />
    </div>
  );
}
