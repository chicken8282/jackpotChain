# node-network-wallet-button-lotto-utxo — 2026-03-26

---

## Overview

세 가지 작업 중 Task 1, 2는 코드 수정, Task 3는 분석만 수행.

| # | 작업 | 결과 |
|---|------|------|
| 1 | 노드 네트워크: 서버 노드 ↔ 모든 노드 연결 | 완료 |
| 2 | 지갑 + 버튼 미동작 수정 | 완료 |
| 3 | 로또 POT UTXO 부족 문제 분석 | 분석 완료 (코드 수정 없음) |

---

## Changed Files

### Task 1

**`FE-ssatto/src/components/dashboard/NodeNetwork.tsx`**

- 변경 이유: `centerTargets` 가 `[0, count/3, 2*count/3]` 3개 인덱스만 연결하여, 노드 4개일 때 노드04(왼쪽)가 서버 노드와 연결되지 않음
- 변경 내용:
  ```ts
  // 이전
  const centerTargets = count <= 2
    ? Array.from({ length: count }, (_, i) => i)
    : [0, Math.floor(count / 3), Math.floor((2 * count) / 3)];

  // 이후
  const centerTargets = Array.from({ length: count }, (_, i) => i);
  ```
- 효과: 활성 노드 수(최대 10개)에 관계없이 서버 노드 ↔ 모든 노드 연결선 및 파티클 애니메이션 표시

### Task 2

**`FE-ssatto/src/components/wallet/WalletInfo.tsx`**

- 변경 이유:
  - + 버튼이 `absolute right-0 -top-12 z-20` 로 컴포넌트 영역 바깥(-48px)에 위치
  - `App.tsx`의 `<motion.div className="relative z-10">` 이 stacking context를 생성함
  - 그 안의 모든 z-index(버튼 z-20 포함)는 이 context 안에서만 유효
  - Navbar는 root 레벨에서 `z-50` → motion.div(z-10) 전체보다 위에 위치
  - 게다가 PageLayout `pt-28`(112px) 기준으로 버튼 위치(112-48=64px)가 Navbar 높이(≈96px) 내에 들어감
  - 결과: Navbar가 + 버튼 영역을 물리적으로 덮어 클릭 이벤트 차단
- 변경 내용:
  ```tsx
  // 이전: 컴포넌트 바깥 absolute 배치
  <div className="absolute right-0 -top-12 z-20 flex items-center justify-end">

  // 이후: 컴포넌트 내 inline 배치
  <div className="mb-3 flex items-center justify-end">
  ```
- 효과: 버튼이 컴포넌트 정상 flow에 포함되어 Navbar 영역 밖에 위치, 클릭 동작 정상화

---

## Tests Run

```
docker-compose -f docker-compose.local.yml build frontend
```

- 결과: 빌드 성공 (`✓ built in 4.43s`)
- TypeScript/Vite 컴파일 에러 없음
- 변경된 번들:
  - `WalletInfo-*.js` (WalletInfo.tsx 포함)
  - `DashboardPage-*.js` (NodeNetwork.tsx 포함)

---

## Failed / Unresolved

없음. 두 변경 모두 빌드 통과.

---

## Task 3: 로또 POT UTXO 분석 결과

### 왜 로또 참여가 안 되는가

`FE-ssatto/src/services/tx/txBuilder.ts` 의 `buildLottoCommitTransaction()`:

```ts
function isCoinbaseSpendable(utxo: WalletUtxo) {
  return utxo.confirmations >= COINBASE_MATURITY_CONFIRMATIONS;  // 101
}

const spendablePotUtxos = input.utxos.filter(
  (utxo) => (utxo.assets[POT_ASSET_ID] ?? 0) > 0 && isCoinbaseSpendable(utxo),
);
if (potSelection.total < COIN) {
  throw new Error("로또 참여에 필요한 POT UTXO가 부족합니다.");
}
```

- `COINBASE_MATURITY_CONFIRMATIONS = 101` 이 일반 TX(온보딩 POT 지급 포함)에도 적용됨
- 블록 생성 후 1 confirmation → 여전히 101 미달 → 에러
- 블록 생성 전 클릭 실패가 이후 상태를 망가뜨리지는 않음. 매번 독립적으로 UTXO를 조회·검증

### UI 잔액 표시 vs 실제 사용 가능 잔액 불일치

- `GET /api/v1/lotto?address=...` → potBalance = unconfirmed 포함 표시
- `GET /api/v1/wallet?addresses=...` → 모든 UTXO 반환, confirmations 포함
- 프론트엔드에서 표시 시 confirmation 필터 없음 → 1 POT 즉시 표시
- 로또 TX 빌딩 시 confirmation ≥ 101 필터 → 실제로는 사용 불가

### 미확정 UTXO 사용 시 문제

- 현재 코드는 이를 차단 (confirmations < 101)
- 만약 차단을 제거하면: 해당 UTXO가 아직 mempool에 있으므로 블록에 포함될 때 Double-spend 충돌 가능
- 단순히 허용하면 안됨

### UX 문제

- 30~60초 블록 생성도 이탈률 우려 수준인데, 101블록(50~100분)은 온보딩 사실상 불가
- 신규 사용자가 1 POT 받고 로또 시도 → 바로 실패 → 이탈 가능성 매우 높음

### 권장 설계 방안

**방안 A (권장): 실제 coinbase UTXO에만 101 확인 요구**
- UTXO에 `isCoinbase` 플래그 추가 (BE RPC `listunspent` 응답에서 확인 가능)
- 비-coinbase UTXO는 1 confirmation으로 spendable 처리
- 영향 범위: `txBuilder.ts` `isCoinbaseSpendable()`, `WalletUtxo` 타입, BE DTO

**방안 B: 확인 수 하향**
- 로또/교환 컨텍스트에서 `MIN_CONFIRMATIONS_FOR_SPEND = 1` 별도 상수 사용
- 단순하지만 coinbase 보상 TX에도 동일 룰 적용되어 블록체인 원칙과 다소 어긋남

---

## Next Steps

1. **즉시 필요**: Task 3 방안 A 구현 — `listunspent` RPC 응답에 `isCoinbase` 포함 여부 확인 후 txBuilder 수정
2. 로또 페이지에서 POT UTXO 준비 상태 표시 (polling으로 confirmation 수 표시, "N블록 후 사용 가능" 안내)
3. 또는 단기 방안으로 방안 B 적용 (COINBASE_MATURITY_CONFIRMATIONS를 일반 TX 컨텍스트에서 1로 변경)
