// [학습 프론트엔드 v2] 추가: 모듈별 검증 미니게임 래퍼 컴포넌트
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { MissionResult } from "../../../services/learningService";

interface VerifyMissionProps {
  moduleId: string;
  onComplete: (result: MissionResult) => void;
}

interface Question {
  text: string;
  choices: string[];
  answer: number; // 0-based index
  category: string;
}

const MODULE_QUESTIONS: Record<string, Question[]> = {
  "1.1": [
    {
      text: "분산 원장(Distributed Ledger)의 핵심 특징은 무엇인가?",
      choices: [
        "중앙 서버에 데이터를 집중 저장한다",
        "모든 참여 노드가 동일한 원장 사본을 보유한다",
        "한 명의 관리자만 원장을 수정할 수 있다",
        "인터넷 연결 없이만 동작한다",
      ],
      answer: 1,
      category: "분산원장",
    },
    {
      text: "분산 원장에서 데이터 무결성을 보장하는 방법은?",
      choices: [
        "관리자의 수동 검증",
        "합의 알고리즘을 통한 자동 검증",
        "외부 감사 기관의 정기 점검",
        "단일 노드의 승인",
      ],
      answer: 1,
      category: "분산원장",
    },
    {
      text: "분산 원장 기술의 장점이 아닌 것은?",
      choices: [
        "단일 장애점 제거",
        "투명성 향상",
        "무한한 처리 속도",
        "검열 저항성",
      ],
      answer: 2,
      category: "분산원장",
    },
  ],
  "1.2": [
    {
      text: "해시 함수의 특성으로 올바른 것은?",
      choices: [
        "입력 길이에 따라 출력 길이가 변한다",
        "동일 입력에 대해 항상 동일한 출력을 생성한다",
        "출력값으로부터 입력값을 쉽게 추론할 수 있다",
        "두 개의 다른 입력이 항상 같은 출력을 만든다",
      ],
      answer: 1,
      category: "해시함수",
    },
    {
      text: "SHA-256 해시 함수의 출력 길이는?",
      choices: ["128비트", "192비트", "256비트", "512비트"],
      answer: 2,
      category: "해시함수",
    },
    {
      text: "블록체인에서 해시 함수의 역할이 아닌 것은?",
      choices: [
        "블록 간 연결 보장",
        "데이터 위변조 탐지",
        "트랜잭션 암호화 처리",
        "작업 증명 난이도 조절",
      ],
      answer: 2,
      category: "해시함수",
    },
  ],
  "1.3": [
    {
      text: "합의 알고리즘의 주요 목적은?",
      choices: [
        "블록 크기를 줄이는 것",
        "네트워크 참여자 간 데이터 일치를 보장하는 것",
        "트랜잭션 수수료를 결정하는 것",
        "지갑 주소를 생성하는 것",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
    {
      text: "비잔틴 장군 문제가 의미하는 것은?",
      choices: [
        "네트워크 속도 저하 문제",
        "신뢰할 수 없는 참여자들 사이에서 합의를 이루는 문제",
        "블록 저장 공간 부족 문제",
        "개인키 분실 문제",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
    {
      text: "PoS(지분 증명)에서 블록 생성 권한은 무엇에 기반하는가?",
      choices: [
        "연산 능력",
        "보유한 코인의 양과 기간",
        "네트워크 가입 순서",
        "노드의 물리적 위치",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
  ],
  "2.1": [
    {
      text: "공개키 암호화에서 키 쌍(Key Pair)의 구성 요소는?",
      choices: [
        "암호키와 복호키",
        "공개키와 개인키",
        "주소키와 서명키",
        "해시키와 블록키",
      ],
      answer: 1,
      category: "키쌍",
    },
    {
      text: "개인키(Private Key)에 대한 설명으로 올바른 것은?",
      choices: [
        "누구에게나 공개해야 한다",
        "블록체인에 저장된다",
        "절대로 타인에게 노출되어서는 안 된다",
        "언제든 재발급 받을 수 있다",
      ],
      answer: 2,
      category: "키쌍",
    },
    {
      text: "블록체인 지갑 주소는 어떻게 생성되는가?",
      choices: [
        "이메일 주소에서 변환된다",
        "공개키를 해시 연산하여 생성된다",
        "개인키를 그대로 사용한다",
        "중앙 서버에서 발급 받는다",
      ],
      answer: 1,
      category: "키쌍",
    },
  ],
  "2.2": [
    {
      text: "전자 서명(Digital Signature)의 주요 목적은?",
      choices: [
        "데이터 압축",
        "송신자의 신원 확인 및 데이터 무결성 검증",
        "트랜잭션 속도 향상",
        "블록 크기 감소",
      ],
      answer: 1,
      category: "전자서명",
    },
    {
      text: "전자 서명 생성에 사용되는 키는?",
      choices: ["공개키", "해시키", "개인키", "세션키"],
      answer: 2,
      category: "전자서명",
    },
    {
      text: "전자 서명 검증에 사용되는 키는?",
      choices: ["개인키", "공개키", "대칭키", "마스터키"],
      answer: 1,
      category: "전자서명",
    },
  ],
  "3.1": [
    {
      text: "UTXO(미사용 트랜잭션 출력) 모델의 특징은?",
      choices: [
        "계좌 잔액을 직접 저장한다",
        "사용되지 않은 출력값의 합으로 잔액을 계산한다",
        "하나의 전역 상태를 관리한다",
        "스마트 컨트랙트 실행에 최적화되어 있다",
      ],
      answer: 1,
      category: "UTXO",
    },
    {
      text: "UTXO 모델에서 거스름돈(Change)이란?",
      choices: [
        "수수료의 다른 이름",
        "입력 UTXO에서 송금액을 뺀 나머지를 자신에게 돌려주는 출력",
        "블록 보상의 일부",
        "이전 트랜잭션의 해시값",
      ],
      answer: 1,
      category: "UTXO",
    },
    {
      text: "UTXO 모델의 장점은?",
      choices: [
        "복잡한 스마트 컨트랙트 지원",
        "병렬 트랜잭션 검증 가능",
        "계좌 기반보다 단순한 구조",
        "무한한 트랜잭션 처리 속도",
      ],
      answer: 1,
      category: "UTXO",
    },
  ],
  "3.2": [
    {
      text: "블록체인 트랜잭션에 반드시 포함되는 요소가 아닌 것은?",
      choices: [
        "송신자 주소",
        "수신자 주소",
        "전송 금액",
        "송신자의 실명",
      ],
      answer: 3,
      category: "트랜잭션",
    },
    {
      text: "트랜잭션이 블록에 포함되기 전 대기하는 곳은?",
      choices: ["블록 헤더", "머클 트리", "멤풀(Mempool)", "제네시스 블록"],
      answer: 2,
      category: "트랜잭션",
    },
    {
      text: "트랜잭션 수수료의 역할은?",
      choices: [
        "블록 크기를 줄이는 것",
        "채굴자에게 트랜잭션 처리 인센티브를 제공하는 것",
        "개인키를 보호하는 것",
        "네트워크 참여를 제한하는 것",
      ],
      answer: 1,
      category: "트랜잭션",
    },
  ],
  "3.3": [
    {
      text: "멤풀(Mempool)의 역할은?",
      choices: [
        "확정된 트랜잭션을 저장하는 공간",
        "블록에 포함되기 전 미확정 트랜잭션이 대기하는 공간",
        "채굴 보상을 분배하는 시스템",
        "블록 헤더를 생성하는 모듈",
      ],
      answer: 1,
      category: "멤풀/전파",
    },
    {
      text: "채굴자가 멤풀에서 트랜잭션을 선택하는 기준은?",
      choices: [
        "트랜잭션 생성 시간 순서",
        "송금 금액이 큰 순서",
        "수수료가 높은 순서",
        "랜덤 선택",
      ],
      answer: 2,
      category: "멤풀/전파",
    },
    {
      text: "트랜잭션이 '확정(confirmed)' 상태가 되려면?",
      choices: [
        "멤풀에 10분 이상 대기하면 자동 확정",
        "채굴자가 블록에 포함시키고 해당 블록이 체인에 연결되어야 함",
        "송신자와 수신자 모두 승인해야 함",
        "중앙 서버가 검증해야 함",
      ],
      answer: 1,
      category: "멤풀/전파",
    },
  ],
  "4.1": [
    {
      text: "작업 증명(PoW)에서 채굴자가 수행하는 작업은?",
      choices: [
        "트랜잭션 금액 검증",
        "특정 조건을 만족하는 논스(Nonce) 값 탐색",
        "공개키 생성",
        "블록 크기 조절",
      ],
      answer: 1,
      category: "채굴/PoW",
    },
    {
      text: "채굴 난이도는 무엇에 의해 조절되는가?",
      choices: [
        "채굴자의 수",
        "목표 블록 생성 시간을 유지하기 위한 프로토콜",
        "트랜잭션 수수료",
        "블록 크기",
      ],
      answer: 1,
      category: "채굴/PoW",
    },
    {
      text: "PoW의 가장 큰 단점으로 지적되는 것은?",
      choices: [
        "보안성 부족",
        "높은 에너지 소비",
        "합의 불가능",
        "트랜잭션 추적 불가",
      ],
      answer: 1,
      category: "채굴/PoW",
    },
  ],
  "4.2": [
    {
      text: "토큰 이코노미의 핵심 목적은?",
      choices: [
        "토큰 가격을 최대화하는 것",
        "참여자 간 인센티브 구조를 설계하여 생태계를 유지하는 것",
        "가능한 많은 토큰을 발행하는 것",
        "중앙 기관의 통제를 강화하는 것",
      ],
      answer: 1,
      category: "토큰이코노미",
    },
    {
      text: "토큰 소각(Burn)의 목적은?",
      choices: [
        "토큰 발행량 증가",
        "유통량을 줄여 희소성을 높이는 것",
        "새로운 토큰 종류 생성",
        "트랜잭션 속도 향상",
      ],
      answer: 1,
      category: "토큰이코노미",
    },
    {
      text: "블록 보상이 반감기(Halving)를 갖는 이유는?",
      choices: [
        "채굴자를 줄이기 위해",
        "인플레이션을 억제하고 총 공급량을 제한하기 위해",
        "네트워크 속도를 높이기 위해",
        "보안을 강화하기 위해",
      ],
      answer: 1,
      category: "토큰이코노미",
    },
  ],
  "5.1": [
    {
      text: "블록체인 기반 로또에서 당첨 번호 생성에 사용되는 것은?",
      choices: [
        "관리자의 수동 입력",
        "블록 해시 등 온체인 데이터 기반 난수 생성",
        "외부 난수 생성기(하드웨어)",
        "참가자 투표 결과",
      ],
      answer: 1,
      category: "로또프로세스",
    },
    {
      text: "블록체인 로또의 투명성이 보장되는 이유는?",
      choices: [
        "정부 기관이 감독하기 때문",
        "모든 추첨 과정이 온체인에 기록되어 누구나 검증 가능하기 때문",
        "참가자 수가 제한되기 때문",
        "오프라인에서 추첨이 진행되기 때문",
      ],
      answer: 1,
      category: "로또프로세스",
    },
    {
      text: "스마트 컨트랙트 기반 로또의 장점은?",
      choices: [
        "당첨금 수동 지급 가능",
        "조건 충족 시 자동으로 당첨금이 분배됨",
        "관리자가 당첨자를 선택할 수 있음",
        "참가비가 무료임",
      ],
      answer: 1,
      category: "로또프로세스",
    },
  ],
  "5.2": [
    {
      text: "블록체인 로또에서 공정성을 보장하는 핵심 메커니즘은?",
      choices: [
        "중앙 서버의 감시",
        "검증 가능한 랜덤 함수(VRF)와 투명한 온체인 기록",
        "참가자 신원 확인",
        "오프라인 추첨 병행",
      ],
      answer: 1,
      category: "공정성",
    },
    {
      text: "기존 로또 대비 블록체인 로또의 공정성 장점은?",
      choices: [
        "당첨 확률이 더 높다",
        "추첨 과정의 조작이 구조적으로 불가능하다",
        "참가비가 더 저렴하다",
        "당첨금이 더 크다",
      ],
      answer: 1,
      category: "공정성",
    },
    {
      text: "Commit-Reveal 방식이 로또에서 사용되는 이유는?",
      choices: [
        "트랜잭션 속도를 높이기 위해",
        "참가자나 운영자가 결과를 미리 알거나 조작하는 것을 방지하기 위해",
        "수수료를 줄이기 위해",
        "블록 크기를 줄이기 위해",
      ],
      answer: 1,
      category: "공정성",
    },
  ],
};

// moduleId -> nextModule mapping
const NEXT_MODULE_MAP: Record<string, string | null> = {
  "1.1": "1.2",
  "1.2": "1.3",
  "1.3": "2.1",
  "2.1": "2.2",
  "2.2": "3.1",
  "3.1": "3.2",
  "3.2": "4.1",
  "4.1": "4.2",
  "4.2": "5.1",
  "5.1": "5.2",
  "5.2": null,
};

export default function VerifyMission({ moduleId, onComplete }: VerifyMissionProps) {
  const startTime = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCategories, setWrongCategories] = useState<string[]>([]);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);

  const questions = MODULE_QUESTIONS[moduleId] ?? MODULE_QUESTIONS["1.1"];
  const total = questions.length;
  const current = questions[currentIndex];

  const handleAnswer = useCallback(
    (choiceIndex: number) => {
      if (flash) return; // prevent double-click during animation

      const isCorrect = choiceIndex === current.answer;
      setAttempts((a) => a + 1);

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setFlash("correct");
      } else {
        setWrongCategories((prev) =>
          prev.includes(current.category) ? prev : [...prev, current.category]
        );
        setFlash("wrong");
      }

      setTimeout(() => {
        setFlash(null);
        if (currentIndex + 1 < total) {
          setCurrentIndex((i) => i + 1);
        } else {
          setFinished(true);
        }
      }, 700);
    },
    [flash, current, currentIndex, total]
  );

  // Build result when finished
  const buildResult = useCallback((): MissionResult => {
    const finalCorrect = correctCount;
    const finalAttempts = attempts;
    const accuracy = Math.round((finalCorrect / total) * 100);
    const timeSpent = Date.now() - startTime.current;

    return {
      module: moduleId,
      success: accuracy >= 50,
      accuracyPercent: accuracy,
      totalAttempts: finalAttempts,
      correctCount: finalCorrect,
      wrongCategories: wrongCategories.join(", "),
      timeSpentMs: timeSpent,
      rewardJack: accuracy * 1000000,
      newBadges: [],
      nextModule: NEXT_MODULE_MAP[moduleId] ?? null,
      weakModule: null,
    };
  }, [correctCount, attempts, total, moduleId, wrongCategories]);

  if (finished) {
    const result = buildResult();
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.10] rounded-3xl p-8 max-w-lg mx-auto text-center"
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          {result.success ? "검증 완료" : "재도전 필요"}
        </h2>

        <div className="space-y-3 mb-6">
          <p className="text-white/60">
            정확도:{" "}
            <span
              className={
                result.success ? "text-green-400 font-bold" : "text-red-400 font-bold"
              }
            >
              {result.accuracyPercent}%
            </span>
          </p>
          <p className="text-white/60">
            맞은 문제:{" "}
            <span className="text-white">{result.correctCount}/{total}</span>
          </p>
          <p className="text-white/60">
            소요 시간:{" "}
            <span className="text-white">
              {Math.round(result.timeSpentMs / 1000)}초
            </span>
          </p>
          {result.success && (
            <p className="text-accent-gold font-semibold">
              +{result.rewardJack.toLocaleString()} JACK 획득
            </p>
          )}
          {wrongCategories.length > 0 && (
            <p className="text-white/30 text-sm">
              취약 분야: {wrongCategories.join(", ")}
            </p>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onComplete(result)}
          className="px-8 py-3 rounded-2xl bg-accent-gold/20 border border-accent-gold/40 text-accent-gold font-semibold"
        >
          {result.success ? "계속 진행" : "다시 도전"}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-white/60 text-sm font-medium">
          문제 {currentIndex + 1}/{total}
        </span>
        <div className="flex-1 mx-4 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-gold"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-green-400 text-sm font-medium">{correctCount}</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className={`backdrop-blur-xl bg-white/[0.05] border rounded-3xl p-8 transition-colors duration-300 ${
            flash === "correct"
              ? "border-green-400/60 shadow-[0_0_30px_rgba(74,222,128,0.15)]"
              : flash === "wrong"
              ? "border-red-400/60 shadow-[0_0_30px_rgba(248,113,113,0.15)]"
              : "border-white/[0.10]"
          }`}
        >
          <h3 className="text-white text-lg font-semibold mb-6 leading-relaxed">
            {current.text}
          </h3>

          <div className="space-y-3">
            {current.choices.map((choice, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(idx)}
                disabled={flash !== null}
                className="w-full text-left px-5 py-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-accent-gold/60 mr-3 font-mono text-sm">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {choice}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
