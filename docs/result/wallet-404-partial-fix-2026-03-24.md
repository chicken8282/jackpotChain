# 결과 보고서: WLT-02 — GET /wallet 404 전파 차단 / 미등록 지갑 graceful 처리

> 작성일: 2026-03-24

---

## Overview

**무엇을 했는가:**
`GET /wallet?addresses=A,B` 요청 시 주소 중 하나라도 BE DB에 없으면 전체 요청이 404로 실패하는 문제를 수정했다.

**왜 했는가:**
FE가 localStorage에 저장된 지갑 주소로 10초마다 polling을 하는데, BE DB가 리셋되거나 일부 지갑이 미등록 상태일 경우 모든 polling 요청이 404로 실패했다. 이로 인해 Wallet 페이지가 잔액을 표시하지 못하고 계속 오류 상태로 남았다.

**수정 방향:**
BE에서 미등록 주소는 404 대신 조용히 제외하고, 등록된 주소만 포함한 200 응답을 반환하도록 변경했다. FE는 기존 `?? 0` fallback으로 이미 안전하게 처리하고 있어 변경이 불필요했다.

---

## Changed Files

### BE — WalletService.java

**경로:** `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`

**이유:** `getWallets()` 내부에서 `loadWalletSummary(address)`를 직접 호출하면 `WalletNotFoundException`이 발생해 전체 응답이 404가 됐다. `Optional` 체이닝으로 미등록 주소를 null로 처리하고 `filter(Objects::nonNull)`로 제외하도록 변경했다.

**변경 전:**
```java
List<WalletSummaryResponse> wallets = addresses.stream()
    .map(this::loadWalletSummary) // 미등록 주소 → WalletNotFoundException → 404
    .toList();

private WalletSummaryResponse loadWalletSummary(String address) {
    Wallet wallet = walletRepository.findByAddress(address)
        .orElseThrow(WalletNotFoundException::new); // 하나라도 없으면 예외
    ...
}
```

**변경 후:**
```java
List<WalletSummaryResponse> wallets = addresses.stream()
    .map(addr -> walletRepository.findByAddress(addr)
        .map(this::loadWalletSummary)
        .orElse(null)) // 미등록 주소 → null
    .filter(Objects::nonNull) // null 제외
    .toList();

private WalletSummaryResponse loadWalletSummary(Wallet wallet) {
    // DB 재조회 없이 전달받은 wallet 엔티티 사용
    JackpotChainBalances balances = jackpotChainRpcClient.getBalances(wallet.getAddress());
    ...
}
```

**추가 변경:** `java.util.Objects` import 추가.

---

## Tests Run

### 시나리오 1: 등록된 주소 + 미등록 주소 혼합

| 항목 | Before | After |
|------|--------|-------|
| 요청 | `GET /wallet?addresses=<등록됨>,<삭제됨>` | 동일 |
| 응답 코드 | 404 | 200 |
| 응답 body | `{ "code": 404, "message": "WALLET_NOT_FOUND", ... }` | `{ "data": { "wallets": [<등록된_것만>] } }` |
| FE polling 결과 | 404 무한 반복 | 정상 10초 polling, 미등록 지갑은 잔액 0 표시 |

### 시나리오 2: 모든 주소가 미등록 상태

| 항목 | Before | After |
|------|--------|-------|
| 응답 코드 | 404 | 200 |
| 응답 body | 오류 | `{ "data": { "wallets": [] } }` |
| FE 렌더링 | 오류 상태 | 잔액 0으로 정상 렌더링 |

### 시나리오 3: 모든 주소가 등록된 정상 케이스

| 항목 | Before | After |
|------|--------|-------|
| 응답 코드 | 200 | 200 (변경 없음) |
| 응답 body | 전체 목록 | 전체 목록 (변경 없음) |

### FE 동작 확인

- `WalletPage.tsx` `allWallets` memo: `summary?.jackBalance ?? 0` fallback으로 미등록 지갑이 잔액 0으로 표시됨. 렌더링 깨짐 없음.
- `useWalletSummaries` polling: BE 200 수신 시 정상 데이터로 갱신. 404 루프 없음.

---

## Failed / Unresolved

없음.

- API 응답 형식(`WalletListResponse.wallets`) 변경 없이 호환 유지.
- DB 스키마 변경 없음.
- FE TypeScript strict 모드 유지 (FE 코드 변경 없음).
- blockchain 코드 변경 없음.

---

## Next Steps

없음.
