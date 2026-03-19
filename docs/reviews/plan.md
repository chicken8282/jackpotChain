# JackpotChain 구현 계획

> 기준일: 2026-03-19
> 현재 상태: 1단계, 2단계는 진행 완료로 간주하고 이후 단계 계획을 실제 코드 기준으로 보정했다.
> 원칙: 실제 구현과 맞지 않는 가정은 제거하고, 각 단계마다 바로 실행 가능한 검증 절차를 함께 적는다.

---

## Goal

Spring Backend, React Frontend, JackpotChain 노드를 하나의 운영 가능한 서비스로 연결하고, 이후 성능 개선 단계까지 이어지는 구현 순서를 안정적으로 정리한다.

## Scope

- BE 기본 환경
- DB 스키마 및 마이그레이션
- JackpotChain RPC 연동
- 로컬/운영 Docker
- FE-API 연결
- 관측성과 성능 측정
- 배포 자동화

## Reference Specs

- `docs/reviews/api.md`
- `docs/reviews/docker-plan.md`
- `docs/reviews/erd.md`
- `docs/reviews/architecture.md`
- `docs/specs/backend-spec.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/infra-spec.md`
- `jackpotchain/cli/main.py`
- `jackpotchain/rpc/server.py`

## Impacted Layers

- Backend API / RPC client
- DB / Cache / MQ
- Frontend integration
- JackpotChain node runtime
- Docker local/prod deployment
- Monitoring / CI-CD

## Failure Points

- JackpotChain 실제 RPC와 FE 요구 REST 간 불일치
- Docker 문서와 실제 산출물 불일치
- RPC host 바인드 문제로 인한 backend 연동 실패
- 로또 Claim 모델 차이로 인한 기능 정의 충돌
- 읽기 모델 부재로 인한 대시보드/활동 이력 구현 지연

---

## Implementation Steps

### 1. BE 기반 환경 세팅 `[완료]`

#### 범위

- Spring Boot 기본 구조
- PostgreSQL/Redis/RabbitMQ 연결
- 공통 응답/예외 구조
- Actuator health 노출

#### 구현 체크

- [x] 프로파일 분리
- [x] 기본 DataSource 연결
- [x] 공통 예외/응답 구조 초안
- [x] `/actuator/health` 기반 운영 체크 진입점 확보

#### 추천 테스트

```bash
docker compose -f docker-compose.local.yml up -d postgres redis rabbitmq
```

```bash
cd BE-ssatto
./gradlew test
```

```bash
curl http://localhost:8080/actuator/health
```

확인 포인트:

- backend 부팅 실패 없이 프로파일 로딩
- DB/Redis/RabbitMQ connection 오류 없음
- Actuator health 200 응답

### 2. ERD 기반 JPA 엔티티 + Flyway `[완료]`

#### 범위

- 엔티티 정의
- Flyway 마이그레이션
- 인덱스 전략
- Repository 기본 구성

#### 구현 체크

- [x] ERD 기반 엔티티 설계
- [x] 초기 스키마 마이그레이션
- [x] 조회 패턴 기반 인덱스 정의
- [x] Repository 골격 구성

#### 추천 테스트

```bash
cd BE-ssatto
./gradlew test
```

```bash
docker compose -f docker-compose.local.yml up -d postgres
```

```bash
docker compose -f docker-compose.local.yml logs -f backend
```

확인 포인트:

- Flyway migration 성공 로그
- 스키마 검증 실패 없음
- 애플리케이션 재기동 시 migration 재적용 오류 없음

### 3. JackpotChain 연동 기반 정리 `[진행 중]`

#### 범위

- JackpotChain 실제 RPC 기준 인터페이스 정합화
- Spring RPC 클라이언트 구현
- 로또 Claim 모델 결정
- `cli/main.py`의 `--rpc-host` 지원 추가

#### 구현 체크

- [ ] `docs/reviews/api.md` 기준으로 RPC 매핑 확정
- [ ] `JsonRpcRequest`, `JsonRpcResponse<T>` 모델 구현
- [ ] `WebClient` 기반 RPC 클라이언트 구현
- [ ] `getblockchaininfo`, `getlottoinfo`, `getjackpotpool`, `getbalances` 호출 래핑
- [ ] `POST /lotto/claim` 유지 여부 결정
- [x] `jackpotchain/cli/main.py`에 `--rpc-host` 추가

#### 추천 테스트

```bash
python -m jackpotchain.cli.main node --port 18333 --rpc-port 18332 --data-dir tmp/jackpotchain-data
```

```bash
curl -X POST http://127.0.0.1:18332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"help\",\"params\":[],\"id\":1}"
```

```bash
curl -X POST http://127.0.0.1:18332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"getblockchaininfo\",\"params\":[],\"id\":1}"
```

```bash
pytest jackpotchain/tests/test_network.py jackpotchain/tests/test_e2e_lotto.py
```

확인 포인트:

- RPC help 응답에 문서화한 메서드가 실제로 존재
- `getlottoinfo`, `getjackpotpool` 호출 가능
- 네트워크/로또 E2E 테스트가 통과
- `--rpc-host` 추가 후 Docker용 `0.0.0.0` 바인드가 가능

### 4. JackpotChain Docker 로컬 기동 안정화 `[완료]`

#### 범위

- `jackpotchain`용 Dockerfile/entrypoint 작성
- 로컬 Compose 보정
- wallet/data persistence 연결

#### 구현 체크

- [x] `jackpotchain/Dockerfile` 작성
- [x] `jackpotchain/.dockerignore` 작성
- [x] `jackpotchain/entrypoint.sh` 작성
- [x] `docker-compose.local.yml`에서 node 환경변수와 실제 CLI 인자 연결
- [x] wallet 파일 저장 경로를 volume으로 유지
- [x] 필요 시 단일 노드 RPC `startmining` 기반 smoke test로 1차 검증

#### 2026-03-19 재검증 메모

- `docker compose -f docker-compose.local.yml up -d jackpotchain-node backend` 재기동 확인
- `getblockcount` RPC 응답 확인
- `startmining` / `stopmining` RPC smoke test 확인
- backend 컨테이너 Java 21 기동 로그 확인

#### 추천 테스트

```bash
docker compose -f docker-compose.local.yml config
```

```bash
docker compose -f docker-compose.local.yml up -d jackpotchain-node
```

```bash
docker compose -f docker-compose.local.yml logs -f jackpotchain-node
```

```bash
curl -X POST http://localhost:8332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"getblockcount\",\"params\":[],\"id\":1}"
```

```bash
curl -X POST http://localhost:8332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"startmining\",\"params\":[],\"id\":1}"
```

확인 포인트:

- Compose 파싱 오류 없음
- node 컨테이너가 healthcheck 통과
- 로그에 RPC 시작/포트 바인드 정보 출력
- `getblockcount` 정상 응답
- `startmining` 후 `getmininginfo` 변화 확인

### 5. 핵심 REST API 구현 `[완료]`

#### 범위

- FE 요구 REST 엔드포인트 구현
- JackpotChain RPC + DB 읽기 모델 조합
- 로또/지갑/대시보드/교환 API 완성

#### 구현 체크

- [x] `GET /blockchain/dashboard`
- [x] `GET /blockchain/blocks/{height}`
- [x] `GET /wallet`
- [x] `GET /wallet/{address}/activities`
- [x] `GET /exchange/info`
- [x] `POST /exchange/jack-to-pot`
- [x] `GET /lotto`
- [x] `POST /lotto/commit`
- [x] `GET /lotto/entries`
- [x] `GET /lotto/entries/{txId}/result`
- [x] 인증/메타데이터용 API (`POST /auth/token`, `POST /wallet`)

#### 추천 테스트

```bash
cd BE-ssatto
./gradlew test
```

```bash
curl http://localhost:8080/actuator/health
```

```bash
curl -X GET "http://localhost:8080/api/v1/blockchain/dashboard"
```

```bash
curl -X GET "http://localhost:8080/api/v1/lotto?address=<address>"
```

확인 포인트:

- RPC timeout/예외가 REST 오류 코드로 일관되게 변환됨
- 대시보드/로또 API가 실제 RPC 값을 조합해 반환
- `lotto/claim`가 남는다면 계약과 구현이 일치함

### 6. FE-API 연동 `[대기]`

#### 범위

- FE 서비스 계층 연결
- mock 데이터 제거
- 전체 사용자 플로우 검증

#### 구현 체크

- [ ] FE 서비스 레이어 정리
- [ ] JWT 저장/재발급 흐름 반영
- [ ] 지갑 생성/선택/조회 연결
- [ ] 로또 참여/조회 연결
- [ ] 교환 화면 연결

#### 추천 테스트

```bash
cd FE-ssatto
npm run build
```

```bash
docker compose -f docker-compose.local.yml up -d frontend backend jackpotchain-node
```

수동 확인 시나리오:

1. 프론트 접속
2. 지갑 생성 또는 선택
3. 대시보드 진입
4. 로또 화면 조회
5. 교환/참여 버튼 동작 확인

확인 포인트:

- 브라우저 콘솔 에러 없음
- API 401/500 처리 UI가 무한 루프 없이 동작
- mock 상수가 아닌 실제 API 응답 기반 렌더링

### 7. 로컬 관측성 스택 통합 `[대기]`

#### 범위

- Prometheus, Grafana, Loki, Promtail, cAdvisor
- backend 메트릭 노출
- 로그 수집 경로 정리

#### 구현 체크

- [ ] monitoring 설정 파일 작성
- [ ] backend Prometheus endpoint 활성화
- [ ] Grafana datasource/dashboard 연결
- [ ] Loki/Promtail 로그 수집 연결
- [ ] 핵심 메트릭 정의

#### 추천 테스트

```bash
docker compose -f docker-compose.local.yml up -d
```

접속 확인:

- `http://localhost:9090/targets`
- `http://localhost:3001`
- `http://localhost:8080/actuator/prometheus`

확인 포인트:

- Prometheus target이 `UP`
- Grafana 접속 가능
- backend 메트릭 수집 가능
- Loki에서 컨테이너 로그 조회 가능

### 8. 운영 Docker/Blue-Green 구성 `[대기]`

#### 범위

- `docker-compose.prod.yml` 보정
- blue/green 전환 스크립트
- 운영 healthcheck와 rollback 절차

#### 구현 체크

- [ ] prod compose 정적 검증
- [ ] `jackpotchain-node-prod` 이미지 경로 확정
- [ ] spring-blue / spring-green 운영 절차 정리
- [ ] Nginx upstream 전환 방식 확정
- [ ] rollback 스크립트 작성

#### 추천 테스트

```bash
docker compose -f docker-compose.prod.yml config
```

```bash
docker compose -f docker-compose.prod.yml up -d jackpotchain-node-prod spring-blue
```

```bash
docker compose -f docker-compose.prod.yml ps
```

확인 포인트:

- prod compose 파싱 성공
- `jackpotchain-node-prod` health check 통과
- `spring-blue` health check 통과
- node RPC가 host에 불필요하게 노출되지 않음

### 9. CI/CD 연결 `[대기]`

#### 범위

- Jenkins pipeline
- 이미지 빌드/푸시
- 원격 배포
- smoke test 자동화

#### 구현 체크

- [ ] `Jenkinsfile` 작성
- [ ] Build/Test/Image Push 단계 연결
- [ ] SSH 배포 단계 연결
- [ ] inactive color health check
- [ ] 전환 실패 시 rollback

#### 추천 테스트

- Jenkins pipeline dry-run
- feature 브랜치에서 build/test만 수행
- 개발 환경 배포 후 smoke test 자동 실행

확인 포인트:

- 실패 단계가 로그로 즉시 드러남
- 배포 후 health check 미통과 시 자동 전환 차단

### 10. Baseline 측정 + 성능 개선 P1~P4 `[대기]`

#### 범위

- Baseline 측정
- HikariCP
- Redis Cache-Aside
- Outbox 비동기화
- Outbox Dispatcher 배치화

#### 구현 체크

- [ ] Baseline 시나리오 기록
- [ ] P1 Before/After
- [ ] P2 Before/After
- [ ] P3 Before/After
- [ ] P4 Before/After
- [ ] 성능 결과 문서화

#### 추천 테스트

Baseline:

- `GET /blockchain/dashboard`
- `GET /lotto/entries?address=X`
- `GET /lotto?address=X`
- `POST /lotto/commit`

추천 부하 툴:

- nGrinder 또는 JMeter

확인 포인트:

- avg / p95 / p99 latency
- TPS
- Hikari pending connection
- RPC latency
- cache hit ratio
- outbox pending count

---

## Test Checklist

- [ ] 단위 테스트
- [ ] 통합 테스트
- [x] RPC smoke test
- [x] Docker local smoke test
- [ ] 운영 compose 정적 검증
- [ ] FE 수동 사용자 흐름 점검
- [ ] 성능 baseline 캡처

## Observability Checklist

- [ ] backend health / metrics 노출
- [ ] JackpotChain RPC 연결 실패 로그 식별 가능
- [ ] Docker healthcheck 실패 시 원인 로그 확인 가능
- [ ] 핵심 지표 수집
  - [ ] RPC latency
  - [ ] cache hit ratio
  - [ ] outbox pending count
  - [ ] queue depth
  - [ ] claim/commit 요청 수

## Done Criteria

- 1, 2단계 결과가 실제 런타임에서 재검증 가능하다.
- JackpotChain 연동 계약이 문서와 코드에서 일치한다.
- 로컬 Docker 스택이 정상 기동한다.
- FE 주요 흐름이 실제 API 기반으로 동작한다.
- 운영 Compose와 배포 절차가 롤백 가능 상태로 문서화된다.
- 성능 개선 단계 진입 전 baseline과 관측 체계가 준비된다.
