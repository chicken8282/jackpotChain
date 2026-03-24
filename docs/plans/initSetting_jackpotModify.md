
# 초기 세팅 계획
# JackpotChain 수정 및 연동 기반 정리

> 작성일: 2026-03-19
> 기준 문서: `docs/reviews/modify.md`, `docs/reviews/plan.md`, `docs/reviews/docker-plan.md`
> 기준 저장소: `BE-ssatto`, `FE-ssatto`, `jackpotchain`

## Feature Overview

현재 작업의 목적은 JackpotChain을 Spring Backend와 안정적으로 연결할 수 있도록 초기 실행 기반을 정리하는 것이다. 범위는 체인 기능 재설계가 아니라, 실제 저장소 기준으로 동작 가능한 RPC 연동 경로와 Docker 기동 경로를 정합화하는 데 둔다.

## User Story Or Business Goal

- 개발자는 로컬 환경에서 JackpotChain 노드, Spring Backend, Frontend를 한 번의 Compose 흐름으로 기동할 수 있어야 한다.
- Backend는 JackpotChain JSON-RPC를 통해 블록체인/로또/지갑 관련 정보를 안정적으로 조회할 수 있어야 한다.
- Frontend는 체인에 직접 붙지 않고 Backend의 `/api/v1/...` 계층만 사용해야 한다.
- 제품 범위상 admin 페이지는 없으므로, 이번 초기 세팅 범위에 admin 전용 화면/엔드포인트는 포함하지 않는다.

## API Or Interface Contract

### 체인 연동 계약

- Frontend → Backend: REST(`/api/v1/...`)
- Backend → JackpotChain: JSON-RPC
- JackpotChain 직접 REST 제공은 범위 밖이다.

### 현재 반드시 확인할 RPC

- `help`
- `getblockchaininfo`
- `getblockcount`
- `getlottoinfo`
- `getjackpotpool`
- `getbalances`
- `startmining`
- `stopmining`

### 로또 계약 주의사항

- 현재 JackpotChain은 `lottocommit`, `lottocheckresult`, `listlottocommits`를 제공한다.
- `lottoclaim` RPC는 없다.
- 따라서 `POST /lotto/claim`는 유지 여부를 먼저 결정해야 하며, 기본 가정은 자동 지급 모델 우선이다.

## Business Rules And Constraints

- 백엔드는 Java 21 기준으로 정리한다.
- 현재 `BE-ssatto/build.gradle`의 toolchain이 Java 17로 보이므로, 초기 세팅 작업에는 Java 21 정렬 여부 확인과 수정 계획이 포함되어야 한다.
- admin 페이지는 없다.
- JackpotChain node는 dev/prod를 코드나 이미지 기준으로 분리하지 않는다.
- local/prod compose가 존재하더라도 node는 단일 Dockerfile, 단일 entrypoint, 단일 실행 계약을 재사용해야 한다.
- Frontend는 JackpotChain에 직접 접근하지 않는다.
- 기존 P2P 합의/동기화 로직을 크게 바꾸지 않는다.
- sync/reorg 보강은 필요 시 후속 안정화 과제로 분리하되, 현재 단계에서 리스크를 문서화한다.

## Dependencies

- `BE-ssatto`
- `FE-ssatto`
- `jackpotchain`
- `docker-compose.local.yml`
- `docker-compose.prod.yml`
- PostgreSQL
- Redis
- RabbitMQ

## Non-Functional Requirements

### Scalability

- node 실행 계약은 환경별로 갈라지지 않도록 단일화한다.
- Backend는 체인 RPC를 직접 래핑하되, 이후 읽기 모델 확장에 방해되지 않도록 인터페이스를 분리한다.

### Availability

- Backend의 RPC 호출에는 timeout, 예외 변환, 장애 구분 로깅이 필요하다.
- node 컨테이너는 healthcheck와 재기동 정책을 통해 bounded failure 형태를 가져야 한다.

### Reliability

- Compose 환경변수와 실제 CLI 인자가 정확히 연결되어야 한다.
- wallet/data 경로는 재기동 후에도 유지되도록 volume 전략을 명확히 해야 한다.
- Java 버전, RPC host 바인딩, wallet path 같은 초기 세팅 불일치를 먼저 제거해야 한다.

### Performance

- 초기 단계에서는 불필요한 polling/대용량 응답을 피하고 최소 RPC만 래핑한다.
- Docker 빌드 컨텍스트는 `.dockerignore`로 최소화한다.

---

## Goal

JackpotChain 수정 작업의 초기 세팅 범위를 정리하고, Backend Java 21 기준의 연동 준비와 node 컨테이너화 준비를 안정적으로 완료할 수 있는 실행 순서를 정의한다.

## Scope

- JackpotChain RPC/REST 계약 정합화
- Backend Java 21 기준 정렬 포인트 식별
- `jackpotchain` 실행 인자와 Docker 산출물 정리
- local/prod compose에서 공통으로 재사용할 node 실행 계약 정리
- Backend RPC 클라이언트 초기 구현 범위 정의
- smoke test와 운영 전 체크 항목 정의

### Out Of Scope

- admin 페이지 개발
- JackpotChain 합의 알고리즘 대수술
- reorg/sync 로직 전면 수정
- webhook 기반 체인 이벤트 push 구현
- node dev/prod 이원화 설계

## Reference Specs

- `docs/reviews/modify.md`
- `docs/reviews/plan.md`
- `docs/reviews/docker-plan.md`
- `docker-compose.local.yml`
- `docker-compose.prod.yml`
- `jackpotchain/cli/main.py`
- `jackpotchain/rpc/server.py`
- `BE-ssatto/build.gradle`

## Impacted Layers

- Backend build/runtime layer
- Backend RPC client layer
- JackpotChain CLI/runtime layer
- JackpotChain Docker image layer
- Docker Compose orchestration layer
- Frontend API integration contract layer

## Failure Points

- `jackpotchain/cli/main.py`의 `node` 커맨드가 `--rpc-host`를 받지 않아 컨테이너 간 RPC 접근이 실패할 수 있다.
- `jackpotchain/Dockerfile`, `.dockerignore`, `entrypoint.sh` 부재로 Compose가 실제로 동작하지 않을 수 있다.
- `BE-ssatto/build.gradle`이 Java 17 기준이면 사용자 요구 Java 21과 불일치한다.
- `POST /lotto/claim` 계약을 확정하지 않으면 FE/BE/체인 구현이 서로 충돌할 수 있다.
- wallet/data volume 경로가 명확하지 않으면 재기동 후 상태 유실이 발생할 수 있다.
- node를 dev/prod로 분리하는 방향으로 문서가 다시 흘러가면 운영 복잡도와 장애 지점이 증가한다.
- sync/reorg 안정성 문제를 무시하면 초기 연동은 성공해도 다중 노드 환경에서 데이터 일관성 문제가 남을 수 있다.

## Implementation Steps

### 1. 명세 및 제약 정합화

- `modify.md` 기준으로 자동 지급 모델, REST 경계, Docker blocker를 명시한다.
- `plan.md` 3단계 범위를 현재 초기 세팅 작업으로 축약한다.
- admin 미구축, node 미분리, Java 21 기준을 이번 작업의 고정 제약으로 문서화한다.

### 2. Backend Java 21 기준 정렬

- `BE-ssatto/build.gradle`의 Java toolchain을 확인하고 Java 21로 정렬한다.
- Backend Docker/runtime도 Java 21 기준으로 맞출 필요가 있는지 함께 점검한다.
- 이 작업은 기능 추가 전에 선행해야 한다.

### 3. JackpotChain RPC 실행 계약 보정

- `jackpotchain/cli/main.py`의 `node` 서브커맨드에 `--rpc-host`를 추가한다.
- `RPCServer`에 `host=args.rpc_host`가 전달되도록 수정한다.
- 실행 로그에 실제 bind host/port, data dir, wallet 경로가 드러나도록 정리한다.

### 4. JackpotChain Docker 산출물 추가

- `jackpotchain/Dockerfile` 작성
- `jackpotchain/entrypoint.sh` 작성
- `jackpotchain/.dockerignore` 작성
- 환경변수 `NODE_DATA_DIR`, `NODE_RPC_HOST`, `NODE_RPC_PORT`, `NODE_P2P_PORT`, `NODE_WALLET_FILE`을 실제 CLI 인자로 연결한다.
- wallet 파일은 명시 경로 기반으로 유지 전략을 세운다.

### 5. node 단일 실행 계약 고정

- local/prod 모두 같은 node 실행 방식과 같은 이미지 산출물을 재사용한다.
- 서비스명은 compose마다 다를 수 있어도 코드, Dockerfile, entrypoint는 분리하지 않는다.
- node 전용 dev/prod 분기 로직은 추가하지 않는다.

### 6. Backend RPC 클라이언트 초기 범위 정리

- `JsonRpcRequest`, `JsonRpcResponse<T>` 모델 정의
- `WebClient` 또는 동등한 비동기/논블로킹 클라이언트 도입 검토
- 최소 래핑 메서드: `getblockchaininfo`, `getlottoinfo`, `getjackpotpool`, `getbalances`
- timeout, 장애 구분 로깅, 예외 변환 정책 정의

### 7. FE 연동 전 계약 확정

- FE는 `/api/v1/...`만 사용하도록 경계를 유지한다.
- `POST /lotto/claim`는 제거, 유지, 또는 체인 확장 중 하나로 결정한다.
- admin 관련 라우트/화면/API는 이번 범위에서 제외한다.

### 8. 검증 및 리뷰

- RPC smoke test
- Docker local smoke test
- Backend 기동 및 health check 확인
- wallet persistence 확인
- sync/reorg 관련 잔여 리스크를 리뷰 문서로 남긴다.

## Test Checklist

- [ ] `BE-ssatto` Java 버전이 21 기준으로 정렬되었는지 확인
- [ ] `python -m jackpotchain.cli.main node ... --rpc-host ...` 실행 확인
- [ ] `help` RPC 응답 확인
- [ ] `getblockchaininfo` RPC 응답 확인
- [ ] `getlottoinfo` RPC 응답 확인
- [ ] `getjackpotpool` RPC 응답 확인
- [ ] `docker compose -f docker-compose.local.yml config` 성공
- [ ] `docker compose -f docker-compose.local.yml up -d jackpotchain-node` 성공
- [ ] node healthcheck 통과
- [ ] Backend healthcheck 통과
- [ ] 재기동 후 wallet/data 유지 확인
- [ ] `pytest jackpotchain/tests/test_network.py jackpotchain/tests/test_peer_discovery.py jackpotchain/tests/test_e2e_lotto.py` 재검증
- [ ] 필요 시 `pytest jackpotchain/tests/test_reorg.py -v -s`로 reorg 리스크 확인

## Observability Checklist

- [ ] node 시작 시 bind host/port 로그 확인 가능
- [ ] node 시작 시 wallet path, data dir 로그 확인 가능
- [ ] Backend에서 RPC timeout, connection refused, JSON-RPC 오류를 구분해 기록
- [ ] Docker healthcheck 실패 시 원인 로그를 즉시 확인 가능
- [ ] local/prod 모두 동일한 node 실행 계약이 로그와 문서에 반영됨

## Done Criteria

- 현재 작업 범위가 체인 기능 재설계가 아니라 초기 세팅과 연동 정합화임이 문서에 명확히 반영된다.
- Backend Java 21 기준이 계획에 포함되고, 현재 저장소와의 차이도 명시된다.
- admin 페이지 미포함 조건이 범위에서 명확히 제외된다.
- node dev/prod 미분리 원칙이 Docker 및 운영 계획에 반영된다.
- JackpotChain node를 위한 필수 수정 파일과 순서가 명확하다.
- FE/BE/체인 간 인터페이스 경계와 로또 claim 정책 결정 지점이 명확하다.
- 테스트와 관측 체크리스트가 초기 세팅 단계에 맞게 준비된다.

## Assumptions

- 사용자 요구사항인 Java 21을 우선 진실로 간주하고 계획을 수립한다.
- 현재 저장소의 Java 17 설정은 미반영 상태 또는 구버전 흔적으로 본다.
- 운영 compose는 존재하지만, node 자체는 환경별로 다른 구현체를 두지 않는다.
