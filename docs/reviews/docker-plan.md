# Docker 계획서
# JackpotChain 실제 구조 기준 컨테이너화 보정안

> 기준 소스: `C:/Users/SSAFY/S14P21E202/jackpotchain/`
> 기준 compose: `docker-compose.local.yml`, `docker-compose.prod.yml`
> 최종 확인일: 2026-03-19

---

## Goal

루트 워크스페이스의 실제 파일 상태를 기준으로 로컬/운영 Docker 구성을 다시 정리한다. 핵심 목표는 다음 네 가지다.

1. `jackpotchain` 노드가 컨테이너 안에서 정상 기동한다.
2. Spring Backend가 JackpotChain RPC에 안정적으로 접근한다.
3. 현재 존재하는 `docker-compose.local.yml`, `docker-compose.prod.yml`를 실제 실행 가능한 형태로 보정한다.
4. 각 단계마다 재현 가능한 검증 절차를 함께 문서화한다.

## Scope

- `jackpotchain` 패키지 실행 방식 검토
- Docker 산출물 부재/불일치 정리
- 로컬/운영 Compose 보정 포인트 정리
- 검증 시나리오 정의

## Reference Specs

- `jackpotchain/cli/main.py`
- `jackpotchain/rpc/server.py`
- `jackpotchain/network/node.py`
- `jackpotchain/README.md`
- 루트 `docker-compose.local.yml`
- 루트 `docker-compose.prod.yml`

## Impacted Layers

- JackpotChain 실행 레이어
- Docker 이미지 빌드 레이어
- 로컬 Compose 오케스트레이션
- 운영 Compose 오케스트레이션
- Backend RPC 연동 레이어

## Failure Points

- `jackpotchain/Dockerfile` 부재
- `jackpotchain/.dockerignore` 부재
- `jackpotchain/entrypoint.sh` 부재
- `node` 커맨드에 `--rpc-host` 미지원
- Compose 환경변수 `NODE_RPC_HOST`, `NODE_WALLET_DIR`가 현재 실행 로직과 연결되지 않음
- 로컬 Compose는 `jackpotchain-miner` 서비스를 정의하지 않았는데, 기존 계획은 이를 전제로 작성됨
- RPC 기본 바인드가 `127.0.0.1`이어서 컨테이너 간 접근이 막힘

---

## 1. 현재 상태 요약

### 1-1. 실제로 존재하는 것

- 루트 `docker-compose.local.yml` 존재
- 루트 `docker-compose.prod.yml` 존재
- `BE-ssatto/Dockerfile`, `BE-ssatto/.dockerignore` 존재
- `FE-ssatto/Dockerfile`, `FE-ssatto/.dockerignore`, `FE-ssatto/nginx.conf` 존재
- `jackpotchain` 패키지의 핵심 모듈들 존재
  - `consensus/difficulty.py`
  - `network/peer.py`
  - `script/standard.py`
  - `tui/app.py`

### 1-2. 실제로 없는 것

- `jackpotchain/Dockerfile`
- `jackpotchain/.dockerignore`
- `jackpotchain/entrypoint.sh`

### 1-3. 기존 문서의 오판 정정

- `jackpotchain` 내부 핵심 모듈이 대거 누락됐다는 전제는 현재 코드 기준으로 틀렸다.
- Docker의 핵심 blocker는 "누락 모듈 복구"가 아니라 **컨테이너 실행 산출물 부재 + CLI 인자 불일치**다.
- 단일 observer/miner 분리 전략도 필수는 아니다.
  - 현재 RPC에 `startmining`, `stopmining`이 있으므로 초기 검증은 단일 노드 컨테이너로 가능하다.

---

## 2. JackpotChain 실행 현실

### 2-1. 실제 기동 경로

`jackpotchain/cli/main.py` 기준 `node` 실행 흐름:

1. `Blockchain(data_dir)`
2. `Mempool()`
3. `Wallet(wallet_file)`
4. `Node(config, blockchain, mempool)`
5. `RPCServer(blockchain, mempool, wallet, node, data_dir, wallet_dir, port)`
6. `await node.start()`
7. `await rpc.start()`

### 2-2. Docker 관점 핵심 제약

- `node`는 `--rpc-port`만 받고 `--rpc-host`는 받지 않는다.
- `RPCServer`는 `host="127.0.0.1"` 기본값을 사용한다.
- 따라서 현재 Compose의 아래 환경변수는 직접 효력이 없다.
  - `NODE_RPC_HOST`
  - `NODE_WALLET_DIR`
  - `NODE_DATA_DIR`

즉, **entrypoint 또는 CLI 수정 없이 현재 Compose만으로는 의도한 형태로 동작하지 않는다.**

### 2-3. 로또/채굴 검증에 유리한 실제 RPC

- `help`
- `getblockchaininfo`
- `getblockcount`
- `getnetworkinfo`
- `getpeerinfo`
- `getmininginfo`
- `startmining`
- `stopmining`
- `getlottoinfo`
- `getjackpotpool`

이 메서드들만으로도 로컬 smoke test 대부분을 수행할 수 있다.

---

## 3. 구현 방향

### 3-1. 최소 수정 원칙

우선순위는 다음 순서가 맞다.

1. `jackpotchain` 이미지 빌드 가능 상태 만들기
2. RPC 외부 접근 가능하게 만들기
3. 로컬 Compose 기동 검증하기
4. 운영 Compose 정적 검증과 health check 경로 확정하기

### 3-2. 권장 수정안

#### A. `jackpotchain/cli/main.py`

필수 수정:

- `node` 서브커맨드에 `--rpc-host` 추가
- `RPCServer(..., host=args.rpc_host, port=args.rpc_port)`로 전달
- 실행 로그를 `http://{args.rpc_host}:{args.rpc_port}` 기준으로 출력

이유:

- Docker와 로컬 데스크톱 실행성을 동시에 만족시키는 가장 작은 수정이다.
- 별도 래퍼 스크립트보다 장애 지점이 적다.

#### B. `jackpotchain/Dockerfile`

필수 포함 항목:

- `python:3.11-slim` 또는 동급 베이스 이미지
- `requirements.txt` 설치
- healthcheck용 `curl` 설치
- 비루트 사용자
- `PYTHONUNBUFFERED=1`
- `ENTRYPOINT` 또는 `CMD`에서 `python -m jackpotchain.cli.main node ...`

#### C. `jackpotchain/entrypoint.sh`

역할:

- 환경변수를 CLI 인자로 변환
- `NODE_DATA_DIR`, `NODE_RPC_HOST`, `NODE_RPC_PORT`, `NODE_P2P_PORT`, `NODE_WALLET_FILE`, `NODE_SEED`
- 기본 지갑 파일 경로를 `/wallets/default.json`으로 강제 가능하게 구성

#### D. `jackpotchain/.dockerignore`

제외 권장:

- `.venv`
- `__pycache__`
- `.pytest_cache`
- `data`
- `dist`
- `build`

### 3-3. miner 서비스 전략

초기 단계:

- 별도 `jackpotchain-miner` 서비스를 당장 강제하지 않는다.
- 단일 `jackpotchain-node`에서 RPC `startmining`으로 smoke test를 수행한다.

후속 단계:

- 멀티노드/P2P 검증이 필요할 때만 `jackpotchain-miner` 서비스를 추가한다.
- 이때는 `--seed jackpotchain-node:8333` 연결과 분리 data volume이 필요하다.

---

## 4. 로컬 Compose 보정 계획

### 4-1. 현재 로컬 Compose의 핵심 문제

- `jackpotchain-node`는 존재하지만 빌드할 `jackpotchain/Dockerfile`이 없다.
- wallet 저장 경로가 실제 실행 경로와 연결되지 않는다.
- monitoring 스택이 아직 포함되지 않았다.
- miner 서비스가 정의돼 있지 않다.

### 4-2. 권장 보정 사항

#### 필수

- `jackpotchain/Dockerfile` 추가
- `jackpotchain/entrypoint.sh` 추가
- `jackpotchain/.dockerignore` 추가
- `jackpotchain-node`에 wallet volume 추가
- `NODE_WALLET_FILE=/wallets/default.json` 형태로 명시

#### 선택

- `jackpotchain-miner` 서비스 추가
- monitoring stack 추가

### 4-3. 로컬 검증 절차

#### Step A. 정적 검증

```bash
docker compose -f docker-compose.local.yml config
```

확인 포인트:

- 파싱 오류 없음
- `jackpotchain-node` build 경로 정상
- env 치환 누락 없음

#### Step B. 노드 단독 기동

```bash
docker compose -f docker-compose.local.yml up -d jackpotchain-node
docker compose -f docker-compose.local.yml logs -f jackpotchain-node
```

정상 로그 기준:

- P2P 포트 바인딩 완료
- RPC 시작 로그 출력
- 예외 trace 없이 대기 상태 진입

#### Step C. RPC 응답 검증

```bash
curl -X POST http://localhost:8332/ ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"getblockcount\",\"params\":[],\"id\":1}"
```

기대 결과:

- HTTP 200
- `result` 필드 존재

#### Step D. 채굴 smoke test

```bash
curl -X POST http://localhost:8332/ ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"startmining\",\"params\":[],\"id\":1}"
```

이후:

```bash
curl -X POST http://localhost:8332/ ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"getmininginfo\",\"params\":[],\"id\":1}"
```

확인 포인트:

- `mining=true`
- `blocks_mined` 증가 또는 `hashrate` 값 확인

#### Step E. 전체 로컬 스택

```bash
docker compose -f docker-compose.local.yml up -d
docker compose -f docker-compose.local.yml ps
```

추가 확인:

- `http://localhost:8080/actuator/health`
- `http://localhost:3000`
- backend 로그에 JackpotChain RPC 연결 실패가 없는지 확인

---

## 5. 운영 Compose 보정 계획

### 5-1. 현재 운영 Compose의 특징

- `jackpotchain-node-prod`는 이미지 기반으로 정의되어 있다.
- Spring blue/green 구조는 이미 반영돼 있다.
- prod compose는 정적 구조는 있으나, 실제 이미지와 secrets 준비 여부는 별도 검증이 필요하다.

### 5-2. 운영 관점 보완 포인트

- JackpotChain 이미지 빌드/배포 경로 명확화
- node wallet/data 볼륨 백업 정책 명시
- 외부 미노출 포트 정책 검증
- `curl` 기반 healthcheck가 실제 런타임 이미지에서 동작하는지 확인

### 5-3. 운영 검증 절차

#### Step A. 정적 검증

```bash
docker compose -f docker-compose.prod.yml config
```

#### Step B. 핵심 서비스 기동 검증

```bash
docker compose -f docker-compose.prod.yml up -d jackpotchain-node-prod spring-blue
```

확인 포인트:

- `jackpotchain-node-prod` healthcheck 통과
- `spring-blue` healthcheck 통과
- `spring-blue`에서 `JACKPOTCHAIN_RPC_URL`로 node 접근 가능

#### Step C. 보안/운영 체크

- node RPC, P2P가 불필요하게 host에 직접 publish되지 않았는지 확인
- `node-data-prod` 볼륨이 유지되는지 확인
- `.env.prod` 없이 올라가지 않도록 검증

---

## 6. 테스트 체크리스트

### 로컬

- [ ] `docker compose -f docker-compose.local.yml config` 성공
- [ ] `docker compose -f docker-compose.local.yml up -d jackpotchain-node` 성공
- [ ] `docker compose -f docker-compose.local.yml logs jackpotchain-node`에서 예외 trace 없음
- [ ] `getblockcount` RPC 응답 확인
- [ ] `help` RPC 응답 확인
- [ ] `startmining` 후 `getmininginfo` 값 변화 확인
- [ ] `backend` health check 통과
- [ ] `frontend` HTTP 200 응답 확인

### 운영

- [ ] `docker compose -f docker-compose.prod.yml config` 성공
- [ ] `jackpotchain-node-prod` health check 통과
- [ ] `spring-blue` health check 통과
- [ ] 내부 RPC URL로 연동 성공
- [ ] 데이터 볼륨 재기동 후 유지 확인

---

## 7. Observability Checklist

- JackpotChain 기동 시 bind host/port 로그가 남아야 한다.
- Docker healthcheck 실패 시 즉시 로그에서 원인 파악 가능해야 한다.
- backend 로그에서 RPC timeout, connection refused, JSON-RPC parse 실패를 구분 가능해야 한다.
- 운영에서는 node 재기동, wallet 경로, data volume 경로가 로그/런북에 남아야 한다.

---

## 8. Done Criteria

- `jackpotchain` 이미지가 루트 기준으로 빌드된다.
- 로컬 Compose에서 node, backend, frontend가 함께 뜬다.
- backend가 JackpotChain RPC에 실제로 연결된다.
- 운영 Compose가 정적 검증과 핵심 health check를 통과한다.
- 문서상 가정이 아니라 실제 파일/실행 경로 기준으로 계획이 유지된다.
