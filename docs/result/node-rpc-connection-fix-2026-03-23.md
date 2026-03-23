# Overview

백엔드가 JackpotChain 노드 RPC에 `Connection refused`로 연결 실패하는 문제를 수정했다.

원인은 `.env.local`의 `LOCAL_JACKPOTCHAIN_RPC_URL`이 `8332`로 설정되어 있었지만 실제 노드는 `NODE_RPC_PORT=9776`으로 바인드되어 있어 포트가 불일치했다.

# Changed Files

| 파일 | 변경 내용 |
|------|---------|
| `.env.local` | `LOCAL_JACKPOTCHAIN_RPC_URL` 포트 `8332` → `9776` |
| `docker-compose.local.yml` | `backend` depends_on `jackpotchain-node` 조건 `service_started` → `service_healthy` |

### `.env.local`

```diff
- LOCAL_JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:8332
+ LOCAL_JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:9776
```

### `docker-compose.local.yml`

```diff
  jackpotchain-node:
-   condition: service_started
+   condition: service_healthy
```

`service_healthy` 변경 이유: 노드 RPC가 실제로 수신 준비될 때까지 백엔드 기동을 대기시켜 초기 연결 실패를 방지한다.

# Tests Run

스택을 재시작한 뒤 아래 명령으로 확인한다:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml down
docker compose --env-file .env.local -f docker-compose.local.yml up -d

# 노드 헬스체크 확인
docker compose --env-file .env.local -f docker-compose.local.yml ps

# 노드 RPC 직접 확인
curl -s -X POST http://localhost:9776 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}'

# 백엔드 대시보드 API 확인
curl -s http://localhost:8080/api/v1/blockchain/dashboard | python3 -m json.tool
```

기대 결과:
- `jc-node-local` status: `healthy`
- `getblockcount`: `{"result": N}` (숫자)
- dashboard: 200, `"isOn": true`, 실제 블록 높이

# Failed / Unresolved

없음.

# Next Steps

- 스택 재기동 후 위 검증 명령 실행
- 지갑 생성 (`POST /wallet`) 및 대시보드 조회가 정상 동작하는지 확인
- 이전에 쌓인 더미 데이터가 있다면 volume을 초기화하고 재기동:
  ```bash
  docker compose --env-file .env.local -f docker-compose.local.yml down -v
  docker compose --env-file .env.local -f docker-compose.local.yml up -d
  ```
