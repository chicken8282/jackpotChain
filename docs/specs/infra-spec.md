# Infra Spec - JackpotChain

> Source of truth: `docs/reviews/architecture.md`, `docs/specs/backend-spec.md`

---

## 1. Hard Rules

- 인프라는 IaC 성격의 파일로 관리한다.
- 서버 환경에서는 `jackpotchain-node` 단일 노드만 운영 대상으로 둔다.
- miner 컨테이너는 운영/로컬 compose 기본 구성에 포함하지 않는다.
- 채굴은 외부 TUI 클라이언트 사용자 행위다.
- 백엔드는 `jackpotchain-node`의 RPC만 의존한다.

---

## 2. Local Compose Structure

로컬 기본 스택:

```text
frontend
backend
postgres
redis
rabbitmq
jackpotchain-node
```

제외 대상:

- `jackpotchain-miner`

이유:

- 백엔드와 로컬 스택은 서버 노드 기반 조회/트랜잭션 제출 검증이 목적이다.
- 채굴은 사용자의 별도 TUI 실행 경로로 분리해야 한다.

---

## 3. Network & Ports

로컬 기본 포트:

| 서비스 | 포트 |
|---|---|
| frontend | `3000 -> 80` |
| backend | `8080` |
| jackpotchain-node RPC | `8332` |
| jackpotchain-node P2P | `8333` |
| postgresql | `5432` |
| redis | `6379` |
| rabbitmq | `5672`, `15672` |

원칙:

- backend는 `JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:8332`로 연결한다.
- node RPC와 P2P는 같은 컨테이너에서 제공한다.

---

## 4. Health Check Rules

- `postgres`, `redis`, `rabbitmq`, `backend`, `frontend`, `jackpotchain-node`는 healthcheck를 가진다.
- backend는 node가 unhealthy여도 프로세스 자체는 기동 가능해야 한다.
- node 장애는 백엔드 RPC 호출 시 `BLOCKCHAIN_RPC_FAILED`로 드러난다.

---

## 5. Docker Files

필수 파일:

- `docker-compose.local.yml`
- `docker-compose.prod.yml`
- `BE-ssatto/Dockerfile`
- `FE-ssatto/Dockerfile`
- `jackpotchain/Dockerfile`

보조 파일:

- `FE-ssatto/nginx.conf`
- `BE-ssatto/.dockerignore`
- `FE-ssatto/.dockerignore`
- `jackpotchain/.dockerignore`

---

## 6. Environment Rules

예시:

```text
JACKPOTCHAIN_RPC_URL=http://jackpotchain-node:8332
DB_URL=jdbc:postgresql://postgresql:5432/jackpotchain
REDIS_HOST=redis
RABBITMQ_HOST=rabbitmq
```

규칙:

- `.env.prod`는 Git에 커밋하지 않는다.
- `.env.prod.example`만 추적한다.

---

## 7. Validation

배포 전 최소 검증:

- `docker compose -f docker-compose.local.yml config`
- `docker compose --env-file .env.prod -f docker-compose.prod.yml config`

Docker 엔진이 기동된 환경에서는 추가로:

- `docker build` 3종
- `docker compose up -d`
- backend `/actuator/health`
- node RPC `getblockcount`

---

## 8. Checklist

- [ ] local compose에 miner 컨테이너가 없다
- [ ] backend가 `jackpotchain-node` RPC URL을 사용한다
- [ ] `.env.prod.example`이 존재한다
- [ ] compose 정적 검증이 통과한다
- [ ] 채굴은 외부 TUI 경로라는 문구가 명시되어 있다
