# Result: jc-node-local 기동 실패 수정 — `--address required when --mine is enabled`

- **작업일**: 2026-03-24
- **환경**: docker-compose.local.yml 로컬 스택
- **상태**: 완료 (PASS)

---

## Overview

### 무엇을 했는가

`blockchain/entrypoint.sh`에 `else` 분기를 추가하여, 볼륨 삭제 후 재기동 시 지갑 파일이 없는 경우 채굴 지갑을 자동 생성하도록 수정했다.

### 왜 했는가

`.env.local`에서 `NODE_MINE=true`이고 `NODE_MINING_ADDRESS`가 빈 값인 상태에서 볼륨을 삭제하고 재기동하면, `entrypoint.sh`가 채굴 주소를 결정할 수 없어 `cli/main.py`가 `Error: --address required when --mine is enabled`로 exit(1)했다.

`jc-node-local`이 unhealthy → `jc-backend-local`이 의존 컨테이너 대기 실패 → 스택 전체 기동 불가.

---

## Changed Files

| 파일 | 변경 이유 |
|------|---------|-|
| `blockchain/entrypoint.sh` | `if/elif`에서 처리 못하는 세 번째 경로(`NODE_MINING_ADDRESS` 빈값 + 지갑 파일 미존재) 처리: `python -m jackpotchain.cli.main wallet create`로 지갑 자동 생성 후 주소 추출 |
| `docs/plans/node-mine-address-missing-2026-03-24.md` | 계획 문서 |

---

## Tests Run

### 1. Node 이미지 리빌드

```bash
docker compose -f docker-compose.local.yml build jackpotchain-node
```

**결과**: Built

### 2. 볼륨 삭제 후 전체 스택 재기동

```bash
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d
```

**결과**: 전 서비스 Healthy

```
jc-postgres-local  Healthy
jc-redis-local     Healthy
jc-rabbitmq-local  Healthy
jc-node-local      Healthy   ← 수정 전에는 exit(1) → unhealthy
jc-backend-local   Healthy
jc-frontend-local  Started
```

### 3. 노드 정상 동작 확인

```
jc-node-local | [CHAIN] 블록 추가 성공: height=3185, hash=00000047bd06a1f0...
jc-node-local | [05:50:50][SYNC] 동기화 완료! 현재 높이: 3185
```

노드가 블록 동기화 및 채굴을 정상적으로 수행 중.

---

## Failed / Unresolved

없음.

---

## Next Steps

1. **`NODE_MINING_ADDRESS` 설정 권장**: 장기 운영 시 자동 생성 지갑이 아닌 사전 지정 주소를 `.env.local`에 설정하면 볼륨 삭제 후에도 동일 주소로 채굴 보상이 쌓인다.
2. **Flyway V4/V5 충돌 해결 확인**: `V4__add_learning_tables.sql` / `V5__add_wallet_onboarding_reward_columns.sql` — 현재 정상 기동 확인됨.
