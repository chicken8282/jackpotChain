import { useState } from "react";
import Card from "../common/Card";

const INSTALLER_PATH = "/downloads/JackpotChain-Setup-1.1.0.exe";

const STEPS = [
  {
    number: "01",
    title: "프로그램 다운로드",
    description: "채굴 프로그램 설치 파일을 다운로드하세요.",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          아래 버튼을 눌러 JackpotChain 채굴 프로그램 설치 파일을 다운로드합니다.
          Windows 환경에서 실행되는 설치 프로그램입니다.
        </p>
        <a
          href={INSTALLER_PATH}
          download
          className="self-start rounded-xl bg-accent-gold px-6 py-3 text-sm font-bold text-black hover:opacity-90 transition-opacity"
        >
          JackpotChain-Setup-1.1.0.exe 다운로드
        </a>
      </div>
    ),
  },
  {
    number: "02",
    title: "설치 및 실행",
    description: "설치 후 명령 프롬프트(CMD)로 채굴 프로그램을 실행합니다.",
    content: (
      <ol className="flex flex-col gap-3 text-sm text-text-secondary">
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">1</span>
          <span>다운로드한 설치 파일(<code className="text-accent-gold">JackpotChain-Setup-1.1.0.exe</code>)을 실행하고 설치 마법사의 안내에 따라 설치를 완료합니다.</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">2</span>
          <span>
            키보드에서 <kbd className="rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-white">Win</kbd> + <kbd className="rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-white">R</kbd> 을 누르고,
            열린 창에 <code className="text-accent-gold">cmd</code> 를 입력한 뒤 Enter를 누릅니다.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">3</span>
          <span>
            검은 창(명령 프롬프트)이 열리면 아래 명령어를 입력하고 Enter를 누릅니다.
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-bg border border-border px-4 py-2 font-mono text-sm text-accent-gold">
              jackpotchain tui
            </div>
          </span>
        </li>
      </ol>
    ),
  },
  {
    number: "03",
    title: "지갑 주소 등록",
    description: "채굴 보상을 받을 지갑 주소를 입력합니다.",
    content: (
      <ol className="flex flex-col gap-3 text-sm text-text-secondary">
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">1</span>
          <span>이 웹사이트의 지갑 페이지에서 내 지갑 주소를 복사합니다.</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">2</span>
          <span>채굴 프로그램에 복사한 지갑 주소를 입력합니다.</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">3</span>
          <span>채굴 성공 시 보상이 이 주소로 자동 지급됩니다.</span>
        </li>
      </ol>
    ),
  },
  {
    number: "04",
    title: "채굴 시작",
    description: "서버에 연결하고 채굴을 시작합니다.",
    content: (
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-3 text-sm text-text-secondary">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">1</span>
            <span>채굴 프로그램에서 서버에 P2P 연결합니다 (포트 8333).</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">2</span>
            <span>연결 완료 후 채굴 시작을 누르면 자동으로 PoW 채굴이 진행됩니다.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary">3</span>
            <span>채굴 성공 시 블록당 <span className="text-accent-gold font-bold">50 JACK</span> + 트랜잭션 수수료가 지급됩니다.</span>
          </li>
        </ol>
        <p className="text-xs text-text-secondary opacity-60">
          채굴 결과는 이 페이지의 채굴 내역에서 확인할 수 있습니다.
        </p>
      </div>
    ),
  },
];

export default function MiningGuide() {
  const [current, setCurrent] = useState(0);
  const step = STEPS[current];

  return (
    <Card eyebrow="가이드" title={<h3 className="font-display text-3xl font-bold text-white">채굴 프로그램 시작하기</h3>}>
      {/* 단계 인디케이터 */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={s.number}
            onClick={() => setCurrent(i)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono transition-all ${
              i === current
                ? "bg-accent-gold text-black font-bold"
                : "border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold"
            }`}
          >
            {s.number}
          </button>
        ))}
        <span className="ml-2 text-xs text-text-secondary opacity-60">
          {current + 1} / {STEPS.length}
        </span>
      </div>

      {/* 슬라이드 본문 */}
      <div className="rounded-[24px] border border-border bg-surface px-8 py-7 min-h-[180px]">
        <p className="text-xs text-text-secondary opacity-60 mb-1 font-mono">{step.number}</p>
        <h4 className="font-display text-2xl font-bold text-white mb-1">{step.title}</h4>
        <p className="text-sm text-text-secondary mb-5 opacity-80">{step.description}</p>
        {step.content}
      </div>

      {/* 이전 / 다음 버튼 */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="rounded-xl border border-border px-5 py-2 text-sm text-text-secondary transition-all hover:border-accent-gold hover:text-accent-gold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← 이전
        </button>
        <button
          onClick={() => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))}
          disabled={current === STEPS.length - 1}
          className="rounded-xl border border-border px-5 py-2 text-sm text-text-secondary transition-all hover:border-accent-gold hover:text-accent-gold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음 →
        </button>
      </div>
    </Card>
  );
}
