# Task 계획: 노드 네트워크 연결 / 지갑 + 버튼 / 로또 POT UTXO 분석

> 작성일: 2026-03-26

---

## Task 1: 노드 네트워크 — 서버 노드와 모든 노드 연결

### 영향 파일
- `FE-ssatto/src/components/dashboard/NodeNetwork.tsx`

### 원인
`links` useMemo 내 `centerTargets` 계산 로직이 center → 최대 3개 노드만 연결한다.

```ts
// 현재 (count=4 일 때 → [0, 1, 2] → 노드04(왼쪽) 누락)
const centerTargets = count <= 2
  ? Array.from({ length: count }, (_, i) => i)
  : [0, Math.floor(count / 3), Math.floor((2 * count) / 3)];
```

### 변경 범위
- `centerTargets` 를 모든 인덱스를 포함하도록 변경
- 애니메이션 파티클은 모든 링크에 이미 적용되어 있으므로 별도 변경 불필요

### 실패 가능 지점
- 노드 수가 많을 때(10개) 선이 너무 많아 시각적으로 복잡해질 수 있음. 허용 범위 내.

---

## Task 2: 지갑 + 버튼 — Navbar에 가려지는 문제

### 영향 파일
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`

### 원인 분석
1. `App.tsx`의 `<motion.div className="relative z-10">` 가 stacking context를 생성
2. `Navbar`는 root의 직접 자식으로 `z-50`
3. + 버튼은 `z-10` stacking context 내부에서 `z-20`이므로, Navbar(z-50)보다 항상 낮은 레이어
4. 버튼 위치: `absolute right-0 -top-12` → PageLayout `pt-28`(112px) 기준으로 viewport top 64px 위치
5. Navbar 높이: header py-4(32px) + inner py-3(24px) + content h-10(40px) ≈ 96px
6. 버튼(64px)이 Navbar 영역(0~96px) 안에 위치 → Navbar가 클릭 이벤트를 가로챔

### 변경 범위
- `WalletInfo.tsx`: absolute 외부 배치 → 컴포넌트 내 상단 inline 배치로 변경
- `absolute right-0 -top-12 z-20` → `mb-3 flex items-center justify-end` (normal flow)

### 실패 가능 지점
- 캐러셀 위에 버튼 영역이 추가되어 WalletInfo 전체 높이가 ~40px 증가할 수 있음

---

## Task 3: 로또 POT UTXO 부족 문제 — 분석만 (코드 수정 없음)

### 현재 구현 흐름

1. 지갑 생성 → 온보딩 1 POT 보상 TX 전송
2. `GET /api/v1/lotto?address=...` 응답의 `potBalance`는 unconfirmed UTXO 포함하여 UI에 표시
3. 사용자는 UI에서 1 POT 보유 확인
4. 로또 참여 시 `buildLottoCommitTransaction()` 에서 UTXO 필터링:
   ```ts
   isCoinbaseSpendable(utxo)  // = utxo.confirmations >= 101
   ```
5. 1 POT 보상 TX가 블록에 포함되어도 confirmations < 101 → 에러 발생

### 왜 로또 참여가 안 되는가

- `COINBASE_MATURITY_CONFIRMATIONS = 101` 이 모든 UTXO에 적용됨
- 온보딩 1 POT는 일반 TX(non-coinbase)지만 동일한 101 확인 요구 적용
- 30~60초 블록 생성 주기 기준 101블록 ≈ 50~100분 대기 필요
- 단순 블록 생성 완료(1 confirmation)로는 로또 참여 불가

### 블록 생성 전 클릭 시 이후 동작

- 블록 생성 전: UTXO가 아직 mempool → confirmations = 0 → 에러
- 블록 생성 후: confirmations = 1 → 여전히 101 미만 → 에러
- 이전 클릭 실패가 이후 상태에 영향을 주진 않음 (TX는 immutable, 재시도 가능)
- 따라서 "블록 생성 전에 클릭해서 이후에도 안되는 것"은 아님, 101 확인 요구 때문

### 미확정 UTXO로 로또 참여하면?

- 현재 코드는 이를 차단함 (confirmations < 101 이면 UTXO 선택 안됨)
- 만약 차단을 제거하고 unconfirmed TX를 사용하면:
  - 해당 UTXO가 아직 블록에 없으므로 TX가 invalid 판정될 가능성
  - 블록체인이 이중 지불 방지 규칙으로 거부할 수 있음
  - "어차피 확정될 TX"이지만, 아직 확정되지 않은 상태에서 사용하면 블록 처리 시 충돌 가능
  - 즉, 가능하면 위험하고 단순히 허용하면 안됨

### UX 개선 설계 방안

**문제**: 블록 생성(30~60초)도 오래 걸리는데, 101 블록(50~100분)은 실사용 불가 수준

**방안 A: coinbase 여부 구분** (권장)
- UTXO에 `isCoinbase` 플래그가 있다면 실제 coinbase TX에만 101 확인 요구
- 온보딩 보상, 교환 TX 등 일반 TX는 1~6 확인으로 감소
- 변경 위치: `txBuilder.ts` 의 `isCoinbaseSpendable` 함수 + WalletUtxo 타입

**방안 B: 확인 요구 수 감소**
- `COINBASE_MATURITY_CONFIRMATIONS` 를 전체적으로 낮추거나
- 로또/교환 컨텍스트에서는 `MIN_CONFIRMATIONS_FOR_SPEND = 1` 별도 상수 적용
- 가장 빠른 수정, 데모/교육용 체인에서 현실적

**방안 C: 온보딩 즉시 사용 가능 상태 표시**
- 1 POT가 블록에 포함(1 confirmation)되면 "로또 참여 가능" 상태로 진입
- UI에서 "1 POT 준비 완료 — 로또에 참여해보세요!" 유도 메시지 표시
- 확인 수가 여전히 101이면 근본 해결은 아니지만 사용자 기대 설정 가능

**방안 D: 낙관적 참여 + 백엔드 큐**
- FE: unconfirmed 상태에서도 참여 허용, 대기열에 등록
- BE: UTXO 확정 후 실제 TX 제출
- 구현 복잡도 높음, MVP 단계에서는 과도함

**권장**: 방안 A 또는 B. 특히 방안 A(실제 coinbase만 101 확인 요구)가 블록체인 원칙에 부합하고 온보딩 UX를 크게 개선한다.
