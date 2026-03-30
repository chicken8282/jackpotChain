# BE-ssatto — Spring Boot REST API 서버

JackpotChain 서비스의 백엔드 서버입니다. 블록체인 노드(JackpotChain)와 프론트엔드 사이에서 비즈니스 로직, 인증, 캐싱, 메시지 처리를 담당합니다.

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Java | 21 |
| Spring Boot | 3.5.11 |
| Spring Security | 6.x |
| JPA / Hibernate | - |
| Flyway | - |
| PostgreSQL | 16 |
| Redis | 7 |
| RabbitMQ | 3 |

---

## 주요 도메인

| 도메인 | 설명 |
|--------|------|
| `auth` | 지갑 주소 기반 챌린지-서명 인증, JWT 발급/갱신/로그아웃 |
| `wallet` | 지갑 등록, 잔액 및 활동 내역 조회 (블록체인 RPC 연동) |
| `blockchain` | 블록/트랜잭션 탐색기 데이터 제공 |
| `exchange` | JACK ↔ POT 교환 트랜잭션 생성 및 제출 |
| `lotto` | 로또 Commit/Claim 처리, 당첨 결과 조회 |
| `mining` | 채굴 통계 및 내 채굴 블록 조회 |
| `learning` | 블록체인 학습 모듈 데이터 제공 |
| `outbox` | Outbox 패턴 기반 RabbitMQ 이벤트 발행 |

---

## 인증 방식

서버에 개인키를 전송하지 않는 **Challenge-Response 서명 인증** 방식을 사용합니다.

```
1. POST /api/v1/auth/challenge  → 서버가 nonce 발급 (Redis에 TTL 저장)
2. 클라이언트가 개인키로 nonce에 서명
3. POST /api/v1/auth/verify     → 서버가 서명 검증, 공개키로 주소 복원 후 일치 확인
4. 검증 성공 시 Access Token (메모리) + Refresh Token (httpOnly Cookie) 발급
```

- Access Token: 단기 유효, 메모리 보관
- Refresh Token: 장기 유효, httpOnly Cookie + DB에 해시만 저장
- 갱신 시 Rotation (매 갱신마다 새 토큰 발급)

---

## 블록체인 연동

백엔드는 블록체인 노드에 직접 JSON-RPC로 접근하지 않고, **Webhook + RabbitMQ Outbox** 패턴으로 이벤트를 수신합니다.

```
JackpotChain Node
  └── 새 블록 생성 시 → HTTP POST /internal/new-block → Spring Backend
        └── Outbox 테이블 기록 → RabbitMQ 발행 → Consumer 처리
```

잔액/UTXO 조회 등 실시간 데이터는 RPC URL을 통해 직접 호출합니다.

---

## 패키지 구조

```
src/main/java/ssatto/BE_ssatto/
├── domain/
│   ├── auth/          (controller, service, repository, dto, entity, exception)
│   ├── wallet/
│   ├── blockchain/
│   ├── exchange/
│   ├── lotto/
│   ├── mining/
│   ├── learning/
│   └── outbox/
└── global/            (config, filter, exception handler, util)
```

---

## 빌드 및 실행

### 로컬 (IDE)

1. 루트에서 `docker compose -f docker-compose.local.yml --env-file .env.local up -d`로 DB/Redis/RabbitMQ/Node 기동
2. IDE에서 `BE_ssattoApplication` 실행 (프로파일: `local`)

### Docker (로컬 전체 스택)

```bash
# 루트 디렉토리에서
docker compose -f docker-compose.local.yml --env-file .env.local up -d
```

### Gradle 빌드

```bash
cd BE-ssatto
./gradlew clean build -x test
```

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `LOCAL_DB_URL` | PostgreSQL JDBC URL |
| `LOCAL_DB_USERNAME` | DB 사용자명 |
| `LOCAL_DB_PASSWORD` | DB 비밀번호 |
| `LOCAL_REDIS_HOST` | Redis 호스트 |
| `LOCAL_REDIS_PORT` | Redis 포트 |
| `LOCAL_RABBITMQ_HOST` | RabbitMQ 호스트 |
| `LOCAL_RABBITMQ_PORT` | RabbitMQ 포트 |
| `LOCAL_RABBITMQ_USERNAME` | RabbitMQ 사용자명 |
| `LOCAL_RABBITMQ_PASSWORD` | RabbitMQ 비밀번호 |
| `LOCAL_JWT_SECRET` | JWT 서명 키 (256비트 이상) |
| `LOCAL_JACKPOTCHAIN_RPC_URL` | 블록체인 노드 RPC 주소 |

전체 포맷은 루트의 [`.env.example`](../.env.example) 참조.

---

## API 문서

서버 기동 후 Swagger UI로 확인합니다.

```
http://localhost:8080/swagger-ui/index.html
```

---

## 모니터링

- Spring Actuator: `GET /actuator/health`
- Prometheus 메트릭: `GET /actuator/prometheus`
- Grafana 대시보드에서 JVM, HTTP 응답시간, DB 커넥션 풀 등 확인 가능
