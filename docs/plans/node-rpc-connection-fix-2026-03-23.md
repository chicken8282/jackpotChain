# 플랜: JackpotChain 노드 RPC 연결 오류 수정

> 작성일: 2026-03-23
> 상태: 구현 예정

---

## 증상

백엔드가 `http://jackpotchain-node:8332/`에 접속 시도 → `Connection refused`

```
JACKPOTCHAIN_RPC_FAILURE - jackpotchain rpc failure:
I/O error on POST request for "http://jackpotchain-node:8332/": Connection refused
```

대시보드 API가 503을 반환하고 FE는 더미/빈 데이터를 표시함.

---

## 원인 분석

### 주요 원인 (포트 불일치)

| 항목 | 값 |
|------|-----|
| `.env.local` `LOCAL_JACKPOTCHAIN_RPC_URL` | `http://jackpotchain-node:8332` |
| `.env.local` `NODE_RPC_PORT` | `9776` |
| `docker-compose.local.yml` healthcheck | `localhost:9776` |
| 실제 노드 RPC 바인드 포트 | `9776` |

→ 백엔드는 8332로 접속하지만 노드는 9776에서 수신 중.

### 부가 원인 (startup race condition)

`docker-compose.local.yml`의 `backend` `depends_on` 설정이 `condition: service_started`여서 노드 healthcheck 통과 전에 백엔드가 먼저 올라와 초기 RPC 호출이 실패함.

---

## 수정 범위

1. `.env.local` — `LOCAL_JACKPOTCHAIN_RPC_URL` 포트 수정 (8332 → 9776)
2. `docker-compose.local.yml` — `backend` depends_on jackpotchain-node 조건을 `service_healthy`로 변경

---

## 변경 계획

### 1. `.env.local`

```diff
- LOCAL_JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:8332
+ LOCAL_JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:9776
```

### 2. `docker-compose.local.yml`

```diff
  backend:
    depends_on:
      ...
      jackpotchain-node:
-       condition: service_started
+       condition: service_healthy
```

---

## 검증 절차

```bash
# 스택 재시작
docker compose --env-file .env.local -f docker-compose.local.yml down
docker compose --env-file .env.local -f docker-compose.local.yml up -d

# 노드 healthcheck 통과 확인
docker compose --env-file .env.local -f docker-compose.local.yml ps

# RPC 직접 확인
curl -s -X POST http://localhost:9776 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}'

# 백엔드 대시보드 API 확인
curl -s http://localhost:18080/api/v1/blockchain/dashboard | jq .
```

기대 결과:
- 노드 healthcheck: `healthy`
- `getblockcount`: `{"result": N, ...}` (숫자 반환)
- dashboard API: 503 아닌 200, `isOn: true`, 실제 블록 높이 반환
