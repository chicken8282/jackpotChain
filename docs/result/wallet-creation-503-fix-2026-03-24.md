# 결과 보고: 지갑 생성 503 에러 수정 (operator 지갑 JACK 부족)

> 작성일: 2026-03-24
> 관련 계획: `docs/plans/wallet-creation-503-fix-2026-03-24.md`

---

## Overview

**내 코드 변경과 무관한 문제**였다. `.env.local`에 `NODE_BOOTSTRAP_ONBOARDING_REWARD=true`가 없어서 블록체인 노드 operator 지갑에 JACK이 0인 상태였다. 지갑 생성 시 온보딩 보상(1 POT) 지급을 위한 `grantonboardingreward` RPC가 "Insufficient JACK: 0.0 < 100.1 JACK required"로 실패하여 BE가 503을 반환했다.

이전 대화에서 내가 수정한 FE 코드(useWalletStore, walletSessionService, WalletPage)는 이 문제와 무관하다.

**원인 흐름**:
```
POST /wallet → grantOnboardingPotReward RPC 호출
→ operator 지갑 JACK = 0 → "Insufficient JACK" 예외
→ @Transactional 롤백 (wallet DB 등록도 취소)
→ BE 503 반환
→ FE registerWalletWithRollback catch → IndexedDB keystore rollback → throw
→ persistWallet setWriteError → UI 지갑 생성 화면 유지
```

---

## Changed Files

### `.env.local`

```diff
+ NODE_BOOTSTRAP_ONBOARDING_REWARD=true
```

**이유**: `NODE_BOOTSTRAP_ONBOARDING_REWARD=true`가 설정되면 노드 시작 시 `ensure_local_onboarding_reward_bootstrap`을 실행하여 operator 지갑(결정론적 주소 `XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82`)에 합성 UTXO로 10,000 JACK을 주입한다. 이 함수는 멱등(idempotent) — UTXO가 이미 있으면 재생성하지 않음.

---

## Tests Run

### 1. 블록체인 노드 재시작 및 부트스트랩 확인

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up -d jackpotchain-node
docker logs jc-node-local | grep Bootstrap
```

결과:
```
[Bootstrap] Onboarding reward funded: 1000000000000 JACK at XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82 (created=True)
```
✅ 10,000 JACK 합성 UTXO 생성 성공

### 2. operator 지갑 잔액 RPC 확인

```bash
curl -X POST http://localhost:9776 -d '{"method":"getbalances","params":["XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"],...}'
```

결과: `{"jack": 10000.0, ...}` ✅

### 3. 지갑 생성 API (grantOnboardingReward=true)

```bash
curl -X POST http://localhost:8080/api/v1/wallet \
  -d '{"address":"X3HayTWpRRWiDtLnbDos99JmW27i3JDASo","nickname":"test-wallet","grantOnboardingReward":true,...}'
```

결과:
```json
{
  "onboardingRewardGranted": true,
  "onboardingRewardTxId": "81679d08649360e807733c4dd9fcc5d8778ddb2fd747a84b6da7639632f01166",
  "onboardingRewardPotAmount": 100000000
}
```
✅ 1 POT(100,000,000 satoshi) 온보딩 보상 지급 성공

### 4. 수령 지갑 잔액 검증

```bash
curl -X POST http://localhost:9776 -d '{"method":"getbalances","params":["X3HayTWpRRWiDtLnbDos99JmW27i3JDASo"],...}'
```

결과: `{"jack": 0.1, "pot": 1.0, "jack_satoshi": 10000000, "pot_satoshi": 100000000}` ✅

### 5. 전체 스택 상태

| 서비스 | 상태 |
|--------|------|
| jc-postgres-local | healthy ✅ |
| jc-redis-local | healthy ✅ |
| jc-rabbitmq-local | healthy ✅ |
| jc-node-local | healthy ✅ |
| jc-backend-local | healthy ✅ |
| jc-frontend-local | unhealthy (known) ⚠️ |

---

## Failed / Unresolved

### Frontend healthcheck unhealthy

**현상**: `jc-frontend-local`이 `unhealthy` 상태지만 실제 서빙은 정상 (`http://localhost:13000/` → 200 OK)

**원인 추정**: healthcheck 명령 `wget http://localhost:80/`이 nginx:1.27-alpine 컨테이너 내부에서 실패. alpine nginx 이미지에 `wget` 또는 네트워크 설정 문제.

**영향 범위**: 기능 영향 없음. FE는 정상 동작. healthcheck 표시만 unhealthy.

### 브라우저 직접 시나리오 테스트

API 레벨 검증은 완료했으나, 전체 브라우저 시나리오(지갑 생성 → 로또 참여 → 잔액 확인)는 수동 브라우저 테스트가 필요하다. API 레벨에서는 모든 핵심 경로가 통과했다.

---

## Next Steps

1. **브라우저 수동 테스트**: `http://localhost:13000/wallet`에서 지갑 생성 → 1 POT 확인 → 로또 참여 → 잔액 변화 확인
2. **Frontend healthcheck 수정**: `docker-compose.local.yml`의 frontend healthcheck을 `curl`로 변경하거나 wget 설치 추가 (현재 기능 영향 없으나 상태 표시 혼란)
3. **운영 환경**: `NODE_BOOTSTRAP_ONBOARDING_REWARD`는 로컬 전용 플래그다. 운영 환경에서는 절대 사용하지 않고 실제 채굴/교환으로 operator 지갑을 funding해야 한다.
