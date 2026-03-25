# onboarding-reward-mining-based-revert-2026-03-25

## Overview

**무엇을 했는가**
부트스트랩 지갑(private key = 1, 합성 UTXO) 기반의 온보딩 보상 지급 방식을 제거하고,
`feat/api-enhance` 브랜치 커밋 `2a834ecc` 시점에 구현된 **seed node 채굴 보상 기반** 플로우로 복원했다.

**왜 했는가**
- 기존 `--bootstrap-onboarding-reward` 방식은 공개된 private key(111...1)로 고정된 주소에 합성 UTXO를 강제 주입하는 방식이라 보안 취약점이다.
- 앞으로 RPC 서버에서 부트스트랩 지갑 기반 온보딩을 제한하기로 결정했다.
- seed node는 채굴을 통해 실제 JACK을 축적하므로, 그 보상으로 온보딩 지급하는 것이 올바른 플로우다.

---

## Changed Files

| 파일 | 변경 내용 |
|------|-----------|
| `blockchain/rpc/server.py` | `_grantonboardingreward` 메서드를 2a834ecc 원본으로 복원. `fee_jack` 출력(0.1 JACK 수수료 버퍼)와 `MIN_TX_FEE` 임포트 제거. 순수 100 JACK → 1 POT 교환만 수행 |
| `blockchain/cli/main.py` | `--bootstrap-onboarding-reward` CLI 인자 제거. `run_node`에서 `ensure_local_onboarding_reward_bootstrap` 호출 블록 제거. `--disable-discovery` 인자 추가 및 `NodeConfig`에 전달 |
| `blockchain/network/node.py` | `NodeConfig`에 `disable_discovery: bool = False` 필드 추가. `start()` 에서 `disable_discovery=True`이면 피어 발견·연결·루프 태스크를 모두 건너뜀 |
| `blockchain/entrypoint.sh` | `NODE_BOOTSTRAP_ONBOARDING_REWARD_VALUE` 환경변수 및 `--bootstrap-onboarding-reward` 플래그 처리 블록 제거 |
| `.env.local` | `NODE_BOOTSTRAP_ONBOARDING_REWARD=true` 줄 제거. `NODE_DISABLE_DISCOVERY=true` 추가 (로컬 노드가 EC2 체인에 동기화되지 않고 독립 채굴하도록) |

---

## Tests Run

### 1. 노드 단독 기동 확인
```bash
docker compose -f docker-compose.local.yml up -d jackpotchain-node
docker logs jc-node-local
```
- **결과**: 부트스트랩 관련 로그 없음. 새 지갑 주소 생성 후 genesis block 생성. 정상 채굴 시작.
- 이전 실패: `--disable-discovery` CLI 인자 미구현으로 노드 재시작 루프 → 구현 후 해결.

### 2. EC2 체인 동기화 격리 확인
- `NODE_DISABLE_DISCOVERY=false` (이전): 노드가 EC2 서버(4082블록)에 동기화되어 로컬 채굴 보상 0 JACK
- `NODE_DISABLE_DISCOVERY=true` (변경 후): 독립 체인 채굴, 150+ 블록 후 2500+ JACK 적립 확인

### 3. grantonboardingreward RPC 직접 테스트
```bash
# COINBASE_MATURITY(100블록) 경과 후 (블록 105에서 첫 성숙 UTXO 발생)
docker exec jc-node-local curl -s -X POST http://localhost:9776 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"grantonboardingreward","params":["XB2T67y..."],"id":1}'
# 결과: {"tx_id": "055bd98b...", "pot_amount": 1.0}  ✅

# 두 번째 호출 (잔액 3000 JACK에서)
# 결과: {"tx_id": "79b88265...", "pot_amount": 1.0}  ✅
```
**통과**: 2회 / **실패**: 0회

### 4. 전체 스택 기동 (docker-compose.local.yml)
```
jc-frontend-local   Up (healthy)  ✅
jc-backend-local    Up (healthy)  ✅
jc-rabbitmq-local   Up (healthy)  ✅
jc-postgres-local   Up (healthy)  ✅
jc-node-local       Up (healthy)  ✅
jc-redis-local      Up (healthy)  ✅
```
**전체 6개 컨테이너 healthy 확인**

### 5. BE 헬스체크
```
GET http://localhost:8080/actuator/health → {"status":"UP"}  ✅
```

---

## Failed / Unresolved

### 1. [해결됨] --disable-discovery CLI 인자 미구현
- **원인**: `entrypoint.sh`에 `NODE_DISABLE_DISCOVERY` 처리가 있었으나 CLI 인자(`--disable-discovery`)가 `main.py`에 없고 `NodeConfig`에도 필드가 없었음
- **해결**: `NodeConfig.disable_discovery` 필드 추가, CLI 인자 추가, `node.start()` 에서 조건부로 발견 태스크 건너뜀
- **영향**: 없음 (LOW RISK 변경, 네트워크 로직 비변경)

### 2. [미해결] 로컬 온보딩 보상의 COINBASE_MATURITY 대기 시간
- **현상**: 노드 초기 기동 후 100블록 이상 채굴될 때까지 `grantonboardingreward` 호출 시 `Insufficient JACK` 에러 발생
- **원인**: `COINBASE_MATURITY = 100`이라 100블록이 지나야 채굴 보상 UTXO가 성숙함. 블록 당 50 JACK, 최소 2블록 필요. 실제로는 ~102블록 이후부터 정상 작동
- **영향**: 로컬 개발 환경에서 컨테이너 볼륨을 초기화(clean restart)할 경우 약 1~2분 대기 필요 (로컬 채굴 속도 기준)
- **운영 환경(EC2)**: 이미 수천 블록 채굴된 상태이므로 즉시 사용 가능

### 3. [기존 이슈] bootstrap/ 모듈 파일 잔존
- `blockchain/bootstrap/local_onboarding_reward.py` 및 `__init__.py`는 코드에서 참조되지 않으나 삭제하지 않음
- 향후 정리 필요하나 기능에는 영향 없음

---

## Next Steps

1. **EC2 서버 확인**: EC2의 노드 지갑(`/wallets/default.json`)에 `local-onboarding-bootstrap` 레이블 키가 잔존할 경우, 해당 키를 지갑에서 제거하거나 합성 UTXO를 UTXO set에서 정리해야 함
2. **bootstrap/ 모듈 삭제**: `blockchain/bootstrap/` 디렉토리 전체 및 테스트 파일(`test_local_onboarding_bootstrap.py`, `test_rpc_server_onboarding_reward.py` 일부)을 정리
3. **운영 엔드포인트 제한 추가** (사용자가 언급한 "RPC server에서 제약"): `grantonboardingreward`에서 부트스트랩 주소(`XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82`)가 지급 대상이거나 운영자 지갑에 포함된 경우 예외 처리 추가 권장
4. **로컬 COINBASE_MATURITY 완화 옵션**: 로컬 개발 편의를 위해 `LOCAL_COINBASE_MATURITY=5` 같은 환경변수 기반 단축 옵션 고려 (단, 합의 로직 변경이므로 HIGH RISK)
