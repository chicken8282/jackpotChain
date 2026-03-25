# onboarding-fee-jack-restore-2026-03-25

## Overview

**무엇을 했는가**
`grantonboardingreward` RPC 메서드에서 제거된 `fee_jack` 로직(0.1 JACK = 10 × MIN_TX_FEE)을 복원했다.

**왜 했는가**
이전 작업(`onboarding-reward-mining-based-revert-2026-03-25`)에서 부트스트랩 지갑 방식을 제거하면서 `fee_jack` 출력도 함께 제거됐다.
그 결과 온보딩 보상으로 1 POT만 받은 신규 유저가 JACK이 0인 상태가 되어, 로또 커밋 트랜잭션 수수료를 낼 수 없어 **"로또 참여 수수료를 위한 JACK UTXO가 부족합니다"** 에러가 발생했다.
모든 트랜잭션은 JACK으로 수수료를 내야 하므로, 첫 POT 수령 시 소량의 JACK(0.1 JACK)을 함께 지급해야 유저가 실제로 로또에 참여할 수 있다.

---

## Changed Files

| 파일 | 변경 내용 |
|------|-----------|
| `blockchain/rpc/server.py` | `_grantonboardingreward`에 `fee_jack` 로직 복원. `MIN_TX_FEE`, `address_to_pubkey_hash`, `create_p2pkh_script_pubkey`, `TxOutput` 임포트 추가. `total_needed = jack_satoshi + fee_jack` 기준으로 UTXO 수집. 교환 TX 생성 후 잔돈 출력 앞에 `fee_jack` 출력을 recipient 주소로 삽입. 응답에 `fee_jack` 필드 추가 |

---

## Tests Run

### 1. grantonboardingreward RPC 직접 호출
```bash
docker exec jc-node-local curl -s -X POST http://localhost:9776 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"grantonboardingreward","params":["XB2T67y..."],"id":1}'
```
**결과 (통과 1회):**
```json
{"tx_id": "3d0eb545...", "pot_amount": 1.0, "fee_jack": 0.1}
```

### 2. 블록 확정 후 수신 주소 잔액 검증
```bash
# 블록 채굴 후 (~5초)
getbalance XB2T67y... → 0.1 JACK  ✅
listunspent XB2T67y... →
  - txid 3d0eb5..., vout 3: 0.1 JACK  ✅
  - txid 3d0eb5..., vout 0: 1 POT    ✅
```

**통과: 2건 / 실패: 0건**

### 3. 전체 스택 상태 확인
```
jc-frontend-local   Up (healthy)  ✅
jc-backend-local    Up (healthy)  ✅
jc-rabbitmq-local   Up (healthy)  ✅
jc-postgres-local   Up (healthy)  ✅
jc-node-local       Up (healthy)  ✅
jc-redis-local      Up (healthy)  ✅
```

---

## Failed / Unresolved

없음. 모든 테스트 통과.

---

## Next Steps

1. **BE 응답 DTO 확인**: `JackpotChainOnboardingReward` record는 현재 `txId`, `potSatoshi` 두 필드만 가지고 있다. `fee_jack` 필드가 RPC 응답에 추가됐으나 BE는 이를 무시한다. FE에서 "수수료용 JACK 지급 완료" 메시지를 보여줄 필요가 있으면 BE DTO와 API 응답에도 `feeJack` 필드를 추가해야 한다.
2. **EC2 서버 노드 재배포**: 변경된 `server.py`를 EC2 노드에 반영해야 실제 운영 환경에서도 0.1 JACK이 지급된다.
