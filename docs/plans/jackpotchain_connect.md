# Goal

`docs/reviews/plan.md`의 3, 4번 체크리스트와 실제 저장소 구현을 다시 대조하고, plan 5 이전 단계에서 필요한 연결 방식과 리스크를 현재 코드 기준으로 확정한다.

# Current Status

기준일: 2026-03-19

실제 확인 결과:

- 3번 `JackpotChain 연동 기반 정리`는 부분 구현 상태다.
- 4번 `JackpotChain Docker 로컬 기동 안정화`는 거의 구현됐지만, 실제 런타임 계약 하나가 빠져 있어 완전 완료 상태는 아니었다.
- FE는 아직 실 API 연동이 아니라 mock/state 중심이다.
- BE는 RPC 클라이언트와 집계 서비스까지만 있고, 공개 REST API와 내부 동기화 API는 없다.

구현 증거 요약:

- BE RPC 범위는 현재 `getblockcount`, `getblockchaininfo`, `getpeerinfo`, `getmempoolinfo`, `sendrawtransaction`까지만 구현돼 있다.
- BE 도메인별 controller/service는 대부분 `.gitkeep` 상태다.
- FE는 `dashboardMockData`, Zustand store, 정적 상수 중심으로 렌더링하고 있고 네트워크 호출 계층이 없다.
- blockchain은 `RPCServer`에 `getlottoinfo`, `getjackpotpool`, `getbalances`, `getblock`, `getblockhash`, `listlottocommits`, `lottocheckresult`가 있다.
- `blockchain/entrypoint.sh`는 이미 `--rpc-host`를 전달하고 있었지만, `blockchain/cli/main.py`의 `node` 파서에는 해당 인자가 빠져 있어 실제 compose 실행 계약과 문서가 어긋나 있었다.

# Plan 3 Checklist Review

## 1. `docs/reviews/api.md` 기준 RPC 매핑 확정

상태: 부분 완료

- 체인 쪽 RPC 메서드는 상당수 존재한다.
- 하지만 BE 클라이언트 인터페이스에는 `getlottoinfo`, `getjackpotpool`, `getbalances`, `getblock`, `getblockhash`, `lottocheckresult`, `listlottocommits`가 아직 없다.
- 따라서 FE 요구 REST를 만들 수 있는 최소 RPC 래핑 범위가 아직 모자라다.

## 2. `JsonRpcRequest`, `JsonRpcResponse<T>` 모델 구현

상태: 미완료

- 현재 BE는 `JackpotChainHttpRpcClient` 내부 `record JsonRpcRequest(...)`와 `JsonNode` 직접 파싱만 사용한다.
- 제네릭 응답 모델은 없다.
- 즉 문서상의 "모델 구현" 요구는 아직 충족되지 않았다.

## 3. `WebClient` 기반 RPC 클라이언트 구현

상태: 미완료

- 실제 구현은 `RestClient` 기반이다.
- 기능적으로는 동작 가능하지만, 계획 문서 체크리스트와는 불일치한다.
- 현재 단계에서는 반드시 `WebClient`여야 할 필요는 없고, timeout/예외변환만 일관되면 된다.

## 4. `getblockchaininfo`, `getlottoinfo`, `getjackpotpool`, `getbalances` 호출 래핑

상태: 부분 완료

- `getblockchaininfo`는 완료
- `getlottoinfo`, `getjackpotpool`, `getbalances`는 미구현

## 5. `POST /lotto/claim` 유지 여부 결정

상태: 미결정

- chain RPC에는 `lottoclaim`이 없다.
- 현재 문서와 체인 구현 사이 계약 정리가 필요하다.
- 추천은 자동 지급 모델 유지, FE 공개 API에서 `POST /lotto/claim` 제거 또는 deprecated 처리다.

## 6. `cli/main.py`의 `--rpc-host` 지원 추가

상태: 이번 작업에서 수정 완료

- `node` 파서에 `--rpc-host`를 추가했다.
- `RPCServer(host=args.rpc_host, ...)`로 실제 bind host까지 연결했다.

# Plan 4 Checklist Review

## 1. `jackpotchain/Dockerfile`

상태: 구현됨

## 2. `jackpotchain/.dockerignore`

상태: 저장소에서 확인되지 않음

- 계획 문서에는 완료로 적혀 있지만 실제 파일은 보이지 않았다.
- 빌드 최적화 차원에서 추후 보완이 필요하다.

## 3. `jackpotchain/entrypoint.sh`

상태: 구현됨

## 4. `docker-compose.local.yml`에서 node 환경변수와 실제 CLI 인자 연결

상태: 이번 작업으로 실질 완료

- `entrypoint.sh`가 `NODE_RPC_HOST`를 `--rpc-host`로 넘기고 있었고,
- 이번 수정으로 `cli/main.py`가 그 인자를 실제로 받도록 맞췄다.

## 5. wallet 파일 경로 volume 유지

상태: 구현됨

## 6. 단일 노드 RPC smoke test

상태: 문서상 존재, 이번 작업에서는 정적 검증 기준만 재확인

# FE-BE-Blockchain Connection Options

## 원칙

- FE ↔ BE는 REST 고정
- BE ↔ blockchain은 JSON-RPC가 기본 진실 원천
- blockchain 내부 P2P 핫패스인 `node.py`는 건드리지 않는다
- 기존 네트워크 동작 영향 최소화가 최우선이다

## 옵션 A. FE 요청 때마다 Backend가 RPC 직접 조회

흐름:

- FE `GET /blockchain/dashboard`
- BE가 `getblockchaininfo`, `getpeerinfo`, `getmempoolinfo`, `getblock/getblockhash` 호출
- DB 적재 없이 즉시 응답

장점:

- 구현이 가장 단순하다
- blockchain 코드 수정이 거의 없다
- 정합성 기준이 분명하다

단점:

- 대시보드, 활동 내역, 로또 결과처럼 조회가 잦은 화면은 RPC 부하가 커진다
- 지갑 활동/채굴 기록 같은 읽기 모델을 만들기 어렵다

적합한 API:

- 대시보드 요약
- 블록 상세
- 잔액 조회
- 즉시성보다 정확성이 중요한 단건 조회

## 옵션 B. blockchain 이벤트를 Backend가 직접 push 수신

흐름:

- blockchain 노드가 block/tx 수신 시 Backend 내부 API로 webhook 전송
- Backend는 이를 신호로 RPC 재조회 후 DB를 upsert
- FE는 REST로 DB 또는 집계 결과 조회

장점:

- FE 응답이 빨라지고 읽기 모델 구축이 쉬워진다
- 활동 내역, 채굴 내역, 로또 결과 캐싱에 유리하다

단점:

- `node.py` 핫패스 수정 시 기존 네트워크 동작에 영향이 간다
- webhook 실패/중복/재시도 설계가 필요하다

## 옵션 C. `main.py` callback 활용 + Backend RPC pull

사용자 요청 기준 추천안

흐름:

- `node.py`는 그대로 둔다
- `main.py`에서 `set_block_callback()`, 필요 시 `set_tx_callback()`만 wiring 한다
- callback은 "새 이벤트 감지" 신호만 만들고, 최종 데이터는 Backend가 RPC로 가져간다
- FE는 여전히 REST만 호출한다

장점:

- P2P 수신 핫패스 로직 무수정
- 기존 노드 네트워크 동작 영향 최소화
- 나중에 내부 알림, 로그, 경량 webhook을 붙여도 변경점이 `main.py`에 모인다

단점:

- callback 내부에서 예외/블로킹 I/O를 잘못 넣으면 node 프로세스 사용자 레벨 흐름에 영향이 갈 수 있다
- TX 이벤트만으로 최종 상태를 확정하면 안 되고, 항상 RPC/블록 기준으로 재검증해야 한다

# Recommendation

현재 저장소와 사용자 우려를 함께 고려한 추천:

1. plan 5 이전에는 `node.py` 수정 없이 간다.
2. BE ↔ blockchain은 JSON-RPC pull을 기본으로 유지한다.
3. FE 공개 API는 먼저 REST로 구현한다.
4. 대시보드, 블록 상세, 잔액, 로또 조회는 우선 RPC 직접 조회 또는 RPC+DB 혼합으로 만든다.
5. 지갑 활동 이력, 채굴 블록 목록, 로또 결과 이력처럼 목록성 API는 Backend DB 읽기 모델을 둔다.
6. blockchain 이벤트 연동이 필요하면 `main.py` callback에서만 후처리하고, callback은 비차단 큐 적재 또는 로깅 수준으로 제한한다.

즉, 현재 단계의 최적해는:

- 사용자 액션형 API: FE -> BE REST -> BE RPC/DB
- 체인 상태 반영형 API: Backend가 주기적 RPC pull로 적재
- 추후 이벤트 최적화가 필요하면 `main.py` callback 후처리를 추가

# Which FE API Should Trigger Direct RPC

BE가 blockchain에 직접 RPC를 호출하는 것이 적절한 FE API:

- `GET /blockchain/dashboard`
- `GET /blockchain/blocks/{height}`
- `GET /wallet`
- `GET /lotto`
- `GET /lotto/entries/{txId}/result`
- `POST /lotto/commit`
- `POST /exchange/jack-to-pot`

이유:

- 사용자가 즉시 최신 상태를 기대한다
- 요청 단위로 필요한 RPC 범위가 명확하다
- 사용자 요청과 체인 호출의 인과관계가 직접적이다

DB 적재 후 FE가 주기적으로 가져오게 하는 것이 적절한 API:

- `GET /wallet/{address}/activities`
- `GET /mining/blocks`
- 로또 참여 이력 목록
- 대시보드의 최근 블록 히스토리, 랭킹, 통계성 데이터

이유:

- 목록/집계형 데이터라 반복 조회 비용이 크다
- 조인, 페이지네이션, 정렬 요구가 생긴다
- 장기적으로는 RPC 직접 조회보다 읽기 모델이 낫다

# REST vs SSE vs WebSocket

현재 추천 순위:

1. REST + 짧은 polling
2. 필요 시 SSE 추가
3. WebSocket은 마지막 선택

## REST + polling 추천 이유

- 이미 FE-BE 통신 방식이 REST로 고정돼 있다
- 구현 복잡도가 가장 낮다
- blockchain 쪽 push 소스가 아직 없다
- dashboard/activity는 3~10초 polling만으로도 MVP 체감은 충분하다

## SSE를 고려할 시점

- backend가 "변경 감지"를 내부적으로 알 수 있게 된 뒤
- 예: polling worker, DB 변경 이벤트, 또는 향후 `main.py` callback 연동

SSE 추천 대상:

- 대시보드 최신 블록 높이
- 잭팟 풀 변화
- 로또 결과 상태 변화

SSE가 WebSocket보다 나은 이유:

- 현재 요구는 서버 -> 클라이언트 단방향 알림에 가깝다
- 연결/인증/프록시 처리 부담이 WebSocket보다 낮다

## WebSocket을 지금 추천하지 않는 이유

- 양방향 실시간 제어 요구가 아직 없다
- 운영 복잡도 대비 이득이 작다
- 현재 단계에서 해결해야 할 핵심은 API/읽기모델 정합화이지 실시간 전송 프로토콜 자체가 아니다

# Impact Minimization For Blockchain Code

추천 구현 원칙:

- `node.py` 무수정
- `main.py` callback만 사용
- callback에서 동기 HTTP 호출 금지
- callback은 큐 적재 또는 로그 남기기만 수행
- Backend는 callback payload를 진실 원천으로 쓰지 않고 RPC 재조회

이 방식의 장점:

- 네트워크 프로토콜 처리, peer 관리, block/tx relay, sync 경로에 직접 손대지 않는다
- 기존 노드 네트워크 및 합의 동작에 영향이 가장 적다

남는 영향:

- `main.py` callback 내부 예외가 누락되면 노드 프로세스 운영 로그를 어지럽히거나 태스크 흐름에 간접 영향을 줄 수 있다
- callback에서 과한 작업을 하면 블록 수신 후처리 지연이 생길 수 있다

그래서 최소화된 추가 규칙:

- callback 내부는 `try/except`로 감싼다
- 네트워크 I/O는 별도 큐/백그라운드 태스크에서 수행한다
- 실패 시 재시도보다 drop + warning 로그를 우선한다

# `.env.local` Recovery Guide

현재 루트에는 `.env.local`이 없었다. `docker-compose.local.yml`은 `env_file: .env.local`을 직접 참조하므로, 파일이 없으면 로컬 compose 기동이 바로 막힌다.

이번 작업에서:

- `.env.local.example`을 추가했다
- 로컬 실행용 `.env.local`은 이 예시를 복사해서 새로 만들면 된다

중요한 판단 기준:

- 로컬 개발용 `.env.local` 값은 이전 컴퓨터 값과 완전히 같을 필요가 없다
- 단, 같은 compose 안에서 서로 맞물리는 값은 서로 일관돼야 한다

예시:

- `POSTGRES_DB`, `LOCAL_DB_URL`의 DB 이름은 일치해야 한다
- `POSTGRES_USER`, `LOCAL_DB_USERNAME`은 일치해야 한다
- `POSTGRES_PASSWORD`, `LOCAL_DB_PASSWORD`는 일치해야 한다
- `LOCAL_JACKPOTCHAIN_RPC_URL`은 compose 네트워크 기준 주소여야 한다

값이 달라도 상관없는 항목:

- 로컬 JWT secret
- 로컬 DB 비밀번호
- 로컬 RabbitMQ 비밀번호
- node wallet 파일 경로

단, 이미 생성된 Docker volume 데이터를 계속 사용할 경우 영향이 있는 항목:

- Postgres 계정/DB 이름을 바꾸면 기존 volume과 충돌할 수 있다
- node wallet/data 경로를 바꾸면 기존 volume에서 다른 경로를 보게 될 수 있다

정리:

- `.env.local`은 언제든 바꿀 수 있다
- 다만 기존 volume을 유지한 채 계정/경로/DB 이름을 바꾸면 재초기화나 volume 정리가 필요할 수 있다
- 새 로컬 환경을 올리는 목적이라면 새 `.env.local`을 만들어도 된다

# Immediate Next Work Before Plan 5

1. BE RPC 클라이언트에 `getlottoinfo`, `getjackpotpool`, `getbalances`, `getblock`, `getblockhash`, `listlottocommits`, `lottocheckresult` 추가
2. `GET /blockchain/dashboard`, `GET /blockchain/blocks/{height}` REST 구현
3. `GET /wallet`, `GET /wallet/{address}/activities` 중 최소 조회 API 우선 구현
4. `POST /lotto/claim` 계약 제거 또는 deprecated 결정
5. FE mock 제거 전 서비스 계층부터 추가
6. dashboard/activities는 우선 polling 기반으로 연결

# Test Notes

이번 작업에서 확인한 점:

- 기존 `blockchain/tests/test_network.py` 등은 현재 로컬 경로에서 `jackpotchain` 패키지 import 불일치로 바로 실행되지 않는다
- 따라서 blockchain 테스트 체계 자체는 별도 정리가 필요하다
- 이번에는 `cli/main.py`의 `--rpc-host` 파서 수용 여부를 최소 단위로 검증한다
