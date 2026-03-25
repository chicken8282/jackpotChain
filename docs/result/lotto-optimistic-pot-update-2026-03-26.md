# 로또 참여 시 POT 잔액 즉시 감소 + 실패 복구 모달 + 이중 참여 방지

날짜: 2026-03-26

---

## Overview

### 무엇을 했는가

지갑 생성 후 받은 1 POT로 로또 참여 시:
1. 로또 참여 직후 **지갑 POT 잔액(WalletPage)** 과 **로또 참여 POT 잔액(LottoPage)** 이 즉시 0으로 표시되게 변경
2. TX 커밋이 60초 안에 블록에 포함되지 않아 실패로 판정될 경우, **알림 모달창**으로 '로또 추첨을 다시 시도해주세요'를 표시하고 두 페이지 POT 잔액을 1로 복구
3. 0 POT 상태에서 빠르게 로또 참여 버튼을 두 번 누르는 **이중 제출을 방지**, 메시지는 'POT이 부족합니다'로 통일

### 왜 했는가

- WalletPage의 POT 잔액은 10초 polling에만 의존해 commit 직후에도 1 POT를 표시 → 사용자에게 혼란
- TX 실패 시 기존에는 상단 배너만 표시했고 WalletPage 잔액 복구 안 됨
- React state 배치 업데이트로 인해 동일 tick 이중 클릭 시 두 TX가 제출될 수 있었고, 두 번째 TX는 double spend RPC 오류 발생 → '블록체인 RPC 호출에 실패했습니다.' 표시됨

---

## Changed Files

| 파일 | 변경 이유 |
|---|---|
| `FE-ssatto/src/stores/useWalletStore.ts` | `potOptimisticOffsetByAddress` 전역 상태 추가 (persist 제외). commit 성공/실패 시 LottoPage와 WalletPage 양쪽에서 참조하기 위해 전역화 |
| `FE-ssatto/src/pages/LottoPage.tsx` | 기존 local `optimisticPotOffset` state를 store 기반으로 교체. 실패 시 `CommitFailedModal` 표시. `setActionStatus` 실패 처리 제거 |
| `FE-ssatto/src/pages/WalletPage.tsx` | `allWallets` useMemo에 optimistic offset 반영. walletSummaries POT 변경 감지 시 offset 초기화 effect 추가 |
| `FE-ssatto/src/components/lotto/HexPicker.tsx` | `isSubmittingRef` useRef 추가로 동일 tick 이중 제출 방지. insufficient-pot 메시지 → 'POT이 부족합니다.' |
| `BE-ssatto/.../global/exception/ErrorCode.java` | `LOTTO_INSUFFICIENT_POT(CONFLICT, "POT이 부족합니다.")` 추가 |
| `BE-ssatto/.../blockchain/rpc/JackpotChainHttpRpcClient.java` | `mapRpcError`에 `"double spend"` / `"insufficient funds"` 패턴 → `LOTTO_INSUFFICIENT_POT` 매핑 추가 |

---

## Tests Run

### 빌드 / 타입 체크

```bash
# FE TypeScript 타입 체크
cd FE-ssatto && npx tsc --noEmit
```

결과: **오류 없음 (0 errors)**

### docker-compose 실행

```bash
docker-compose -f docker-compose.local.yml up
```

> 로컬 환경 실행 후 수동 검증 필요 (아래 시나리오)

### 수동 검증 시나리오

1. 지갑 생성 → 1 POT 지급 확인
2. LottoPage 이동 → 번호 선택 → 로또 참여 클릭 → **즉시** POT 잔액 0 표시 확인
3. WalletPage 이동 → POT 잔액 0 표시 확인 (polling 기다리지 않아도)
4. LottoPage에서 0 POT 상태에서 로또 참여 버튼 클릭 → 'POT이 부족합니다.' 표시 확인
5. 로또 참여 버튼 빠르게 두 번 클릭 → 두 번째 클릭 차단 확인
6. TX 블록 포함 후 (약 10분) → POT 잔액이 자동으로 갱신됨 확인
7. (선택) TX가 60초 내 미확인 시 실패 모달 '로또 추첨을 다시 시도해주세요' + 양쪽 POT 잔액 1 복구 확인

---

## Failed / Unresolved

### 미해결 이슈

1. **실패 복구 타이밍 완전 검증 불가**: LottoPage의 60초 timeout 기반 실패 감지는 pending entry가 entries polling에서 발견되지 않는 경우에만 작동. 네트워크 지연으로 polling이 늦게 응답할 경우 false-positive 실패 판정 가능성 있음 (기존 동작 유지).

2. **WalletPage offset 초기화 타이밍**: walletSummaries 변경 감지로 초기화하는 방식은 POT 잔액이 폴링으로 업데이트될 때만 동작. TX 미확인 상태에서 polling 응답이 와도 잔액 변경 없으면 offset 유지됨 → 의도된 동작.

3. **Python 블록체인 RPC 오류 메시지 포맷 의존성**: `mapRpcError`의 `"double spend"` / `"insufficient funds"` 패턴 매칭은 현재 Python 블록체인 코드(`mempool/pool.py`, `validation/transaction.py`)의 메시지 포맷에 의존. 블록체인 오류 메시지가 변경되면 재매핑 필요.

---

## Next Steps

1. **docker-compose.local.yml** 로 시나리오 수동 검증 수행
2. **polling 개선**: `fe-be-api.md`에 명시된 대로 `GET /api/v1/wallet?addresses=...` polling이 아직 commit 성공 직후 즉시 refetch를 하지 않는다면 WalletPage에도 `refetchWalletSummaries()` 호출 추가 고려
3. **LottoPage `actionStatus` 정리**: TX 실패 처리를 모달로 이관했으므로 남아 있는 `actionStatus` 배너의 성공 케이스 문구 재검토
