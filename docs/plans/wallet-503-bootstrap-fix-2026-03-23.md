# Plan: 지갑 페이지 오류 수정 (2026-03-23)

## 현상

지갑 페이지에서 다음 오류 발생:

| 요청 | 상태 | 증상 |
|------|------|------|
| `POST /api/v1/wallet` | 503 | 지갑 생성 실패 |
| `GET /api/v1/wallet?addresses=...` | 404 | 지갑 없음 |
| `GET /api/v1/wallet/{address}/activities` | 500 | 17.68초 후 실패 |
| `POST /auth/refresh` | 401 | 세션 없음 |

---

## 근본 원인

### 1차 원인 — `NODE_BOOTSTRAP_ONBOARDING_REWARD` 미설정 → 503

`POST /api/v1/wallet` 요청 흐름:

```
WalletService.createWallet()           [TX: @Transactional]
  └─ registerWalletMetadata()          ← DB 저장
  └─ jackpotChainRpcClient             ← RPC: grantonboardingreward
       .grantOnboardingPotReward()
       → blockchain node: "Insufficient JACK in operator wallet"
         (NODE_BOOTSTRAP_ONBOARDING_REWARD 미설정 → operator wallet 잔액 0)
         → BusinessException(BLOCKCHAIN_RPC_FAILED) → 503
         → @Transactional rollback → wallet DB 저장도 취소됨
```

`.env.local`에 `NODE_BOOTSTRAP_ONBOARDING_REWARD` 항목이 없음
→ `entrypoint.sh`에서 `${NODE_BOOTSTRAP_ONBOARDING_REWARD:-false}` 기본값 적용
→ `--bootstrap-onboarding-reward` 플래그 미전달
→ `blockchain/bootstrap/local_onboarding_reward.py`에서 synthetic UTXO 생성 스킵
→ operator wallet에 JACK 없음
→ `grantonboardingreward` RPC 호출 시 "Insufficient JACK" 예외

### 2차 원인 — wallet DB 미저장 → 404

1차 원인으로 인한 TX 롤백으로 wallet 레코드가 저장되지 않음.
`GET /api/v1/wallet?addresses=...` → `WalletNotFoundException` → 404

### 3차 원인 — refresh session 없음 → 401

wallet 등록이 실패했으므로 auth 흐름이 완료되지 않음.
refresh session이 DB에 없음 → `POST /auth/refresh` → 401

### 4차 원인 — activities 500 (17.68초)

`GET /api/v1/wallet/{address}/activities` 흐름:

```
WalletService.getActivities()                [TX: readOnly=true]
  └─ blockchainReadModelSyncService          [TX: REQUIRES_NEW]
       .syncToTip()
       ├─ jackpotChainRpcClient.getBlockCount()    ← 5s timeout
       ├─ jackpotChainRpcClient.getBlockHash()     ← 5s timeout
       └─ jackpotChainRpcClient.getIndexedBlock()  ← 5s timeout
         → ~17초 후 RPC 실패 → 예외 전파 → 500
```

blockchain node가 완전히 기동되지 않았거나 operator wallet 이슈로
RPC가 다중 타임아웃을 소비한 후 실패. 총 17.68초는 5s timeout × 3 RPC calls 에 부합.

`syncToTip()` 내부에서 던진 예외가 `REQUIRES_NEW` 경계를 넘어 전파될 때
`GlobalExceptionHandler`가 `BusinessException`이 아닌 타입으로 인식하거나
Spring 트랜잭션 인프라가 `TransactionSystemException`으로 wrap 하는 경우 500 발생 가능.

---

## 영향 범위

| 레이어 | 파일 | 변경 내용 |
|--------|------|-----------|
| 환경설정 | `.env.local` | `NODE_BOOTSTRAP_ONBOARDING_REWARD=true` 추가 |

코드 변경 없음. 설정값 추가만으로 1~3차 원인 해결.
4차 원인(activities 500)은 bootstrap 적용 후 재확인 후 필요 시 별도 수정.

---

## 구현 계획

1. `.env.local`에 `NODE_BOOTSTRAP_ONBOARDING_REWARD=true` 추가
2. `docker compose --env-file .env.local -f docker-compose.local.yml up --build` 실행
3. 지갑 생성 → GET wallet → activities 순서로 재검증
4. 결과 문서 작성

---

## 리스크

- LOW: `.env.local`만 수정. 기존 코드 로직 무변경.
- 주의: bootstrap 활성화 시 컨테이너 첫 기동 때 synthetic UTXO가 생성됨 (멱등 처리됨).
  이미 생성된 경우 중복 생성 없이 스킵됨 (`ensure_local_onboarding_reward_bootstrap` 구현).
