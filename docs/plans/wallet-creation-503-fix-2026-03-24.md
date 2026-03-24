# 수정 계획: 지갑 생성 503 에러 (operator 지갑 JACK 부족)

> 작성일: 2026-03-24

---

## 원인

`.env.local`에 `NODE_BOOTSTRAP_ONBOARDING_REWARD=true`가 없다.

블록체인 노드가 `--bootstrap-onboarding-reward` 플래그 없이 시작되면:
- operator 지갑(bootstrap 결정론적 주소 `XB2T67y...`)에 JACK UTXO가 없음
- `grantonboardingreward` RPC 호출 시 "Insufficient JACK: 0.0 < 100.1 JACK required" 오류
- BE가 503 Business Exception 반환
- FE `registerWalletWithRollback`이 catch → IndexedDB keystore rollback → throw
- `persistWallet` catch → `setWriteError` → UI 지갑 생성 화면 유지

## 영향 레이어

| 레이어 | 파일 | 영향 |
|--------|------|------|
| Infra / Env | `.env.local` | 누락 환경변수 |
| Blockchain | `blockchain/bootstrap/local_onboarding_reward.py` | 부트스트랩 미실행 |
| BE | `WalletService.createWallet` | RPC 실패 → 트랜잭션 롤백 |
| FE | `walletRegistrationFlowService.ts` | catch → keystoreId rollback |

## 변경 범위

### `.env.local` 추가
```
NODE_BOOTSTRAP_ONBOARDING_REWARD=true
```

- `ensure_local_onboarding_reward_bootstrap`은 **멱등**: 이미 UTXO가 있으면 재생성하지 않음
- 10,000 JACK 합성 UTXO 생성 → 약 99회 온보딩 보상 가능

## 실패 가능 지점

| 지점 | 위험 | 대응 |
|------|------|------|
| 노드 재시작 후 bootstrap 실행 | 기존 blockchain 볼륨에 이미 UTXO가 있으면 created=false, 아니면 created=true | 멱등 보장 |
| 동일 컨테이너 재시작(restart) vs 재생성(recreate) | 환경변수 변경 시 재생성 필요 | `docker compose up --build` |
