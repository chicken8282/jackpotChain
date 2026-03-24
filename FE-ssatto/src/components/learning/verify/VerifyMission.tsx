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
      text: "앞에서 배운 '마을 광장의 공동 일기장' 비유에서, 블록체인의 핵심 특징은 무엇이었나요?",
      choices: [
        "한 명의 관리자만 일기장을 수정할 수 있다",
        "모든 참여자가 동일한 복사본을 가진다",
        "일기장은 비밀리에 보관된다",
        "한 곳에만 저장되어 효율적이다",
      ],
      answer: 1,
      category: "투명성/분산저장",
    },
    {
      text: "개념 학습에서 '조작 불가'의 원리는 무엇이었나요?",
      choices: [
        "중앙 관리자가 24시간 감시한다",
        "한 곳을 바꿔도 나머지와 일치하지 않아 발각된다",
        "데이터를 암호화하여 아무도 볼 수 없다",
        "수정 자체가 기술적으로 불가능하다",
      ],
      answer: 1,
      category: "조작불가",
    },
    {
      text: "체험에서 확인한 블록체인의 '투명성'이란?",
      choices: [
        "관리자만 거래 기록을 확인할 수 있다",
        "모든 거래 기록이 공개되어 누구나 확인 가능하다",
        "거래 기록이 암호화되어 해독이 필요하다",
        "일정 기간이 지나면 기록이 삭제된다",
      ],
      answer: 1,
      category: "투명성/분산저장",
    },
  ],
  "1.2": [
    {
      text: "개념 학습의 '디지털 지문' 비유에서, 해시 함수의 핵심 특성은?",
      choices: [
        "입력 길이에 따라 출력 길이가 달라진다",
        "같은 입력이면 항상 같은 해시(지문)가 나온다",
        "해시에서 원본 데이터를 쉽게 복원할 수 있다",
        "두 개의 다른 입력이 항상 같은 해시를 만든다",
      ],
      answer: 1,
      category: "해시함수",
    },
    {
      text: "체험에서 글자 하나만 바꿔도 해시가 완전히 달라지는 현상을 뭐라고 했나요?",
      choices: ["단방향성", "결정성", "눈사태 효과", "충돌 저항성"],
      answer: 2,
      category: "해시함수",
    },
    {
      text: "개념 학습에서 배운 해시의 '단방향성'이란?",
      choices: [
        "해시값을 다시 입력하면 같은 해시가 나온다",
        "해시에서 원본 데이터를 역추적할 수 없다",
        "해시 함수는 한 방향으로만 전송된다",
        "한 번만 해시할 수 있다",
      ],
      answer: 1,
      category: "해시함수",
    },
  ],
  "1.3": [
    {
      text: "'마을 회의' 비유에서, 기록이 인정되려면 어떤 조건이 필요했나요?",
      choices: [
        "마을 이장의 승인",
        "과반수 이상의 참여자가 동의",
        "전원 일치",
        "외부 기관의 감사",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
    {
      text: "개념 학습에서 '비잔틴 내결함'이란 어떤 의미였나요?",
      choices: [
        "네트워크가 절대 장애를 일으키지 않는다",
        "일부 참여자가 악의적이어도 시스템이 동작한다",
        "비잔틴 제국의 암호 기술을 사용한다",
        "모든 참여자가 반드시 정직해야 한다",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
    {
      text: "합의 알고리즘의 '탈중앙화'란 무엇을 의미하나요?",
      choices: [
        "한 명의 관리자가 최종 결정을 내린다",
        "특정 기관이 아닌 네트워크 전체가 검증한다",
        "중앙 서버가 여러 개로 분산된다",
        "데이터를 중앙에 모아 처리한다",
      ],
      answer: 1,
      category: "합의알고리즘",
    },
  ],
  "2.1": [
    {
      text: "'우편함과 마스터키' 비유에서, 개인키는 어떤 역할이었나요?",
      choices: [
        "누구에게나 알려줄 수 있는 우편함 주소",
        "금고를 여는 유일한 열쇠",
        "서명을 검증하는 신분증",
        "코인을 받는 공개 주소",
      ],
      answer: 1,
      category: "키쌍",
    },
    {
      text: "개념 학습에서 개인키를 분실하면 어떻게 된다고 했나요?",
      choices: [
        "고객센터에서 재발급 받을 수 있다",
        "영원히 자산에 접근할 수 없다",
        "공개키로 복구할 수 있다",
        "다른 사람이 대신 열어줄 수 있다",
      ],
      answer: 1,
      category: "키쌍",
    },
    {
      text: "체험에서 만든 '주소'는 어떤 비유로 설명됐나요?",
      choices: [
        "금고를 여는 열쇠",
        "신원을 확인하는 신분증",
        "코인을 받을 수 있는 우편함",
        "서명을 생성하는 도장",
      ],
      answer: 2,
      category: "키쌍",
    },
  ],
  "2.2": [
    {
      text: "'디지털 도장' 비유에서, 서명이 증명하는 것은?",
      choices: [
        "데이터가 암호화되었다는 것",
        "'이 거래를 내가 승인했다'는 것",
        "트랜잭션 속도가 빠르다는 것",
        "블록이 생성되었다는 것",
      ],
      answer: 1,
      category: "전자서명",
    },
    {
      text: "개념 학습에서, 서명을 만들 때 사용하는 키는?",
      choices: ["공개키", "해시키", "개인키", "세션키"],
      answer: 2,
      category: "전자서명",
    },
    {
      text: "개념 학습에서 '부인 방지'란 어떤 의미였나요?",
      choices: [
        "서명을 취소할 수 있다",
        "서명한 사실을 나중에 부인할 수 없다",
        "서명을 여러 번 할 수 있다",
        "다른 사람이 대신 서명할 수 있다",
      ],
      answer: 1,
      category: "전자서명",
    },
  ],
  "3.1": [
    {
      text: "'만원짜리와 거스름돈' 비유에서, 100 JACK으로 30 JACK을 보내면 어떻게 되나요?",
      choices: [
        "잔액에서 30이 차감된다",
        "100짜리가 사라지고 30 + 70 두 조각이 새로 생긴다",
        "30짜리만 새로 생긴다",
        "100짜리가 70짜리로 바뀐다",
      ],
      answer: 1,
      category: "UTXO",
    },
    {
      text: "개념 학습에서 '잔액은 숫자가 아니라 ___의 합'이라고 했는데, 빈칸은?",
      choices: [
        "계좌 기록",
        "코인 조각들(UTXO)",
        "블록 보상",
        "트랜잭션 해시",
      ],
      answer: 1,
      category: "UTXO",
    },
    {
      text: "UTXO의 '추적 가능' 특성이란?",
      choices: [
        "사용자의 실명을 추적할 수 있다",
        "모든 코인의 출처를 역추적할 수 있다",
        "트랜잭션 속도를 추적할 수 있다",
        "블록 크기를 추적할 수 있다",
      ],
      answer: 1,
      category: "UTXO",
    },
  ],
  "3.2": [
    {
      text: "'송금 전표' 비유에서, 트랜잭션이 기록하는 것은?",
      choices: [
        "블록의 크기와 생성 시간",
        "누가, 누구에게, 얼마를 보내는지",
        "채굴자의 신원 정보",
        "네트워크의 속도",
      ],
      answer: 1,
      category: "트랜잭션",
    },
    {
      text: "개념 학습에서 트랜잭션의 '입력(Input)'이란?",
      choices: [
        "받는 사람의 주소",
        "사용할 기존 UTXO를 지정하는 것",
        "채굴자에게 주는 수수료",
        "트랜잭션의 해시값",
      ],
      answer: 1,
      category: "트랜잭션",
    },
    {
      text: "개념 학습에서, 입력과 출력의 차이는 무엇이 되나요?",
      choices: [
        "블록 보상",
        "거스름돈",
        "채굴자 수수료",
        "새로운 코인",
      ],
      answer: 2,
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
      text: "'자물쇠 암호 맞추기' 비유에서, 채굴이란 무엇을 찾는 것이었나요?",
      choices: [
        "개인키의 원본 값",
        "해시값 앞자리가 특정 개수의 0으로 시작하는 nonce",
        "다른 사용자의 공개키",
        "블록의 최적 크기",
      ],
      answer: 1,
      category: "채굴/PoW",
    },
    {
      text: "개념 학습에서, JackpotChain의 블록 생성 주기와 보상은?",
      choices: [
        "10분마다, 50 JACK",
        "1분마다, 10 JACK",
        "30초마다, 100 JACK",
        "1시간마다, 1000 JACK",
      ],
      answer: 2,
      category: "채굴/PoW",
    },
    {
      text: "개념 학습에서 '난이도 조정'이란?",
      choices: [
        "채굴자 수에 따라 보상이 변한다",
        "목표 시간에 맞춰 블록 생성 난이도가 자동 조절된다",
        "사용자가 직접 난이도를 설정한다",
        "블록 크기가 자동으로 커진다",
      ],
      answer: 1,
      category: "채굴/PoW",
    },
  ],
  "4.2": [
    {
      text: "'포인트 교환소' 비유에서, JACK과 POT의 교환 비율은?",
      choices: [
        "1 JACK = 1 POT",
        "10 JACK = 1 POT",
        "100 JACK = 1 POT",
        "1000 JACK = 1 POT",
      ],
      answer: 2,
      category: "토큰이코노미",
    },
    {
      text: "개념 학습에서 POT의 용도는 무엇이었나요?",
      choices: [
        "채굴 보상으로 사용되는 기본 코인",
        "로또 참여에 필요한 전용 토큰",
        "수수료 결제 전용 코인",
        "거래소 상장용 토큰",
      ],
      answer: 1,
      category: "토큰이코노미",
    },
    {
      text: "개념 학습에서, 참가비의 19%가 소각되면 어떤 효과가 있다고 했나요?",
      choices: [
        "네트워크 속도가 빨라진다",
        "디플레이션 효과 (희소성 증가)",
        "새로운 토큰이 생성된다",
        "채굴 보상이 증가한다",
      ],
      answer: 1,
      category: "토큰이코노미",
    },
  ],
  "5.1": [
    {
      text: "'공정한 뽑기' 비유에서, 로또 당첨 번호는 어떻게 결정되나요?",
      choices: [
        "관리자가 직접 선택한다",
        "미래 블록 해시의 마지막 자리로 결정된다",
        "참가자들의 투표로 결정된다",
        "외부 난수 생성기가 결정한다",
      ],
      answer: 1,
      category: "로또프로세스",
    },
    {
      text: "개념 학습에서, 번호 선택 범위는?",
      choices: [
        "1~45 중 6개",
        "0x0~0xF 중 6개",
        "0~9 중 3개",
        "A~Z 중 6개",
      ],
      answer: 1,
      category: "로또프로세스",
    },
    {
      text: "개념 학습에서, 당첨금 수령 가능 기간은?",
      choices: [
        "즉시 수령",
        "N+18 ~ N+68 블록 사이",
        "7일 이내",
        "다음 추첨 전까지",
      ],
      answer: 1,
      category: "로또프로세스",
    },
  ],
  "5.2": [
    {
      text: "'수학적 증명' 비유에서, 로또가 공정한 이유는?",
      choices: [
        "정부가 감독하기 때문",
        "블록 데이터를 바꾸면 해시가 완전히 달라져 조작이 불가능하다",
        "참가자 수가 제한되어 있기 때문",
        "오프라인으로 추첨하기 때문",
      ],
      answer: 1,
      category: "공정성",
    },
    {
      text: "개념 학습에서 '예측 불가'란 어떤 의미였나요?",
      choices: [
        "당첨 확률을 계산할 수 없다",
        "미래 블록 해시는 아무도 미리 알 수 없다",
        "참가비를 예측할 수 없다",
        "참가자 수를 예측할 수 없다",
      ],
      answer: 1,
      category: "공정성",
    },
    {
      text: "개념 학습에서 '검증 가능'이란?",
      choices: [
        "관리자만 결과를 확인할 수 있다",
        "누구나 블록 해시를 확인하여 결과를 검증할 수 있다",
        "외부 감사 기관이 검증한다",
        "당첨자만 결과를 확인할 수 있다",
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
