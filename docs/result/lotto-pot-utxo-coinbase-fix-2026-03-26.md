# lotto-pot-utxo-coinbase-fix — 2026-03-26

---

## Overview

온보딩 1 POT를 받은 신규 지갑이 로또에 참여하면 "로또 참여에 필요한 POT UTXO가 부족합니다" 오류가 발생하는 FE 버그를 수정.

**원인**: `isCoinbaseSpendable()`이 coinbase 여부와 관계없이 모든 UTXO에 `confirmations >= 101`을 적용. 온보딩 POT는 일반 TX(비-coinbase)이므로 1 confirmation이면 충분하지만, 블록체인 노드가 `is_coinbase` 필드를 `listunspent` 응답에 포함하지 않아 FE가 항상 `coinbase: false`로 받는데도 101 확인을 강제하고 있었음.

---

## Changed Files

### 1. `blockchain/rpc/server.py`

- 변경 이유: `_listunspent()` 응답에 `is_coinbase` 필드 누락. `UTXO` 객체에는 이미 `is_coinbase: bool` 필드가 있으나 직렬화 시 포함하지 않았음.
- 변경 내용: 두 분기(주소 지정 / 오퍼레이터 지갑) 모두에 `'is_coinbase': utxo.is_coinbase` 추가
- 리스크: LOW — 기존 필드 변경 없이 새 필드 추가만. 합의/검증 로직 무관.

### 2. `FE-ssatto/src/services/tx/txBuilder.ts`

- 변경 이유: `isCoinbaseSpendable()`이 `utxo.coinbase` 플래그를 무시하고 모든 UTXO에 101 확인을 요구.
- 변경 내용:
  ```ts
  // 이전
  function isCoinbaseSpendable(utxo: WalletUtxo) {
    return utxo.confirmations >= COINBASE_MATURITY_CONFIRMATIONS; // 항상 101
  }

  // 이후
  function isCoinbaseSpendable(utxo: WalletUtxo) {
    if (utxo.coinbase) {
      return utxo.confirmations >= COINBASE_MATURITY_CONFIRMATIONS; // 채굴 보상: 101
    }
    return utxo.confirmations >= 1; // 일반 TX: 1 confirmation
  }
  ```

### 변경 없는 레이어 (이미 연결됨)

| 레이어 | 파일 | 상태 |
|---|---|---|
| BE RPC 클라이언트 | `JackpotChainHttpRpcClient.java` | `is_coinbase` → `coinbase` 이미 읽음 |
| BE DTO | `JackpotChainUnspentOutput`, `WalletUtxoItemResponse` | `coinbase: boolean` 이미 존재 |
| FE 타입 | `WalletUtxo` in `walletService.ts` | `coinbase: boolean` 이미 존재 |

---

## Tests Run

```
docker-compose -f docker-compose.local.yml build frontend
→ ✓ built in ~4s (TS 에러 없음)

docker-compose -f docker-compose.local.yml build jackpotchain-node
→ ✓ built (Python 구문 에러 없음)
```

---

## Failed / Unresolved

없음.

---

## Next Steps

1. 통합 테스트: 실제 지갑 생성 → 1 POT 수령 → 블록 1개 채굴 후 로또 참여 성공 여부 확인
2. 로또 페이지 UX 안내: "1 POT 준비 중 (블록 확인 대기)" → "참여 가능" 상태 전환 표시
