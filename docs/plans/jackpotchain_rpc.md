# Goal

JackpotChain 노드가 수신한 블록/TX 이벤트를 Backend로 안정적으로 전달하고, Backend는 이를 트리거로 사용해 RPC 기반 동기화와 대시보드/활동 내역 적재를 수행할 수 있도록 구현 범위를 정의한다.

# Scope

- JackpotChain 노드의 inbound 블록/TX 감지 지점 확정
- JackpotChain 내부 webhook 전송 모듈 추가 범위 정의
- CLI, entrypoint, compose, `.env.local`까지 포함한 설정 연결
- Backend 내부 webhook 수신 API와 동기화 서비스 초안 정의
- `docs/reviews/api.md`의 `GET /blockchain/dashboard`, `GET /wallet/{address}/activities`, `GET /mining/blocks`, 로또/교환 도메인 적재 요구사항을 만족시키기 위한 이벤트 흐름 정의

제외 범위:

- 공개 REST API 스펙 자체 변경
- WebSocket/SSE 실시간 push 구현
- 다중 노드 재조직(reorg) 완전 대응 로직 구현
- Admin 페이지 추가

# Reference Specs

- `docs/reviews/api.md`
- `docs/reviews/plan.md`
- `docs/plans/initSetting_jackpotModify.md`
- `jackpotchain/network/node.py`
- `jackpotchain/cli/main.py`
- `jackpotchain/entrypoint.sh`
- `jackpotchain/requirements.txt`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`

참고 레퍼런스 해석:

- 팀원 레퍼런스의 핵심 포인트인 `jackpotchain/network/node.py`의 `_handle_block()`, `_handle_tx()` 훅 위치는 맞다.
- 다만 매 이벤트마다 `aiohttp.ClientSession()`을 새로 만들고, 네트워크 호출을 수신 경로에서 직접 수행하는 방식은 가용성과 성능 리스크가 있다.
- 따라서 훅 위치는 유지하되, 실제 전송은 별도 notifier/queue 계층으로 분리하는 방향으로 설계한다.

# Impacted Layers

- JackpotChain `network` 계층
- JackpotChain webhook notifier 계층 신규 추가
- JackpotChain CLI/runtime 설정 계층
- Docker Compose / `.env.local` 설정 계층
- Backend 내부 수신 controller/service 계층
- Backend blockchain/wallet/mining/lotto 인덱싱 계층

# Failure Points

- `_handle_block()` / `_handle_tx()`에서 직접 HTTP 호출 시 node 수신 경로가 지연되거나 멈출 수 있다.
- Backend webhook 실패가 node 본연의 블록/TX 처리 실패로 전파되면 안 된다.
- 중복 이벤트, 재전송, 재기동 복구 상황에서 동일 블록/TX가 여러 번 전달될 수 있다.
- webhook payload만 믿고 DB를 갱신하면 reorg/미반영/중복 수신 시 정합성이 깨질 수 있다.
- 공개 API와 내부 webhook API를 동일 경로로 섞으면 보안 경계가 무너진다.
- 인증 없이 내부 endpoint를 노출하면 임의 이벤트 주입 리스크가 생긴다.
- tx 이벤트만으로 `wallet_activity`를 최종 확정하면 미확정 TX와 확정 블록 상태가 섞일 수 있다.

# Implementation Steps

## 1. 이벤트 계약 정의

webhook은 최종 데이터 원본이 아니라 "동기화 트리거"로 사용한다. 최종 진실 원천은 JackpotChain RPC 응답이다.

권장 이벤트 타입:

- `block.received`
- `tx.received`

권장 payload 예시:

```json
{
  "eventId": "block:0000abcd...",
  "eventType": "block.received",
  "occurredAt": "2026-03-19T16:30:00Z",
  "node": {
    "host": "jc-node-local",
    "rpcPort": 8332,
    "p2pPort": 8333
  },
  "peer": {
    "address": "127.0.0.1:8333",
    "inbound": false
  },
  "data": {
    "blockHash": "0000abcd...",
    "heightHint": 852,
    "txCount": 3
  }
}
```

```json
{
  "eventId": "tx:abcd1234...",
  "eventType": "tx.received",
  "occurredAt": "2026-03-19T16:30:10Z",
  "node": {
    "host": "jc-node-local",
    "rpcPort": 8332,
    "p2pPort": 8333
  },
  "peer": {
    "address": "127.0.0.1:54398",
    "inbound": true
  },
  "data": {
    "txId": "abcd1234...",
    "version": 3,
    "inputCount": 2,
    "outputCount": 4
  }
}
```

설계 원칙:

- `eventId`는 멱등 키로 사용한다.
- payload에는 최소 식별자만 담고, 상세 데이터 적재는 Backend가 RPC로 다시 조회한다.
- `wallet_activity` 최종 적재는 `block.received` 기반 블록 인덱싱이 우선이고, `tx.received`는 실시간 알림/캐시 갱신 보조 신호로 사용한다.

## 2. JackpotChain 쪽 수정 범위

### 2-1. 수정 파일: `jackpotchain/network/node.py`

추가/수정 위치:

- `NodeConfig`
  - `webhook_enabled: bool = False`
  - `webhook_url: Optional[str] = None`
  - `webhook_token: Optional[str] = None`
  - `webhook_timeout_ms: int = 2000`
  - `webhook_queue_size: int = 1000`
- `Node.__init__()`
  - notifier 인스턴스 생성
- `Node.start()`
  - notifier 시작
- `Node.stop()`
  - notifier 종료
- `_handle_block()`
  - 블록 deserialize 후 `block.received` enqueue
- `_handle_tx()`
  - TX deserialize 후 `tx.received` enqueue
- 신규 helper
  - `_enqueue_block_event(...)`
  - `_enqueue_tx_event(...)`

레퍼런스의 `_notify_dashboard()`는 그대로 넣지 않고, 아래 신규 모듈을 통해 우회한다.

### 2-2. 신규 파일: `jackpotchain/integration/webhook.py`

권장 추가 객체:

- `WebhookEvent`
- `WebhookConfig`
- `WebhookNotifier`

권장 책임:

- 단일 `aiohttp.ClientSession` 재사용
- bounded `asyncio.Queue` 기반 비동기 전송
- timeout 적용
- 재시도는 무제한이 아니라 0~1회 정도의 bounded retry만 허용
- 실패 시 node 처리 흐름을 막지 않고 경고 로그만 남김
- queue full 시 drop 하되 drop 개수를 로그/메트릭으로 남김

이유:

- `jackpotchain/requirements.txt`에 이미 `aiohttp`가 포함되어 있어 신규 의존성 부담이 낮다.
- 수신 핫패스에서 직접 HTTP 호출하는 방식보다 성능과 가용성이 낫다.

## 3. JackpotChain CLI / Docker / 환경변수 연결

### 3-1. 수정 파일: `jackpotchain/cli/main.py`

`node` 서브커맨드에 다음 인자를 추가한다.

- `--webhook-url`
- `--webhook-token`
- `--webhook-timeout-ms`

그리고 `NodeConfig(...)` 생성 시 함께 주입한다.

### 3-2. 수정 파일: `jackpotchain/entrypoint.sh`

다음 환경변수를 실제 CLI 인자로 연결한다.

- `NODE_WEBHOOK_URL`
- `NODE_WEBHOOK_TOKEN`
- `NODE_WEBHOOK_TIMEOUT_MS`

### 3-3. 수정 파일: `docker-compose.local.yml`

`jackpotchain-node` 서비스에 다음 값을 주입한다.

- `NODE_WEBHOOK_URL=http://backend:8080/internal/jackpotchain/events`
- `NODE_WEBHOOK_TOKEN=${JACKPOTCHAIN_WEBHOOK_TOKEN}`

### 3-4. 수정 파일: `.env.local`

다음 키를 추가한다.

- `JACKPOTCHAIN_WEBHOOK_TOKEN=...`

운영 쪽도 동일한 패턴으로 `docker-compose.prod.yml` / `.env.prod`에 맞춘다. node dev/prod 분리 없이 URL과 토큰만 환경값으로 분기한다.

## 4. Backend 쪽 추가/수정 범위

### 4-1. 신규/수정 대상 파일 초안

- 신규: `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/JackpotChainWebhookProperties.java`
- 신규: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/controller/InternalJackpotChainWebhookController.java`
- 신규: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/dto/JackpotChainWebhookEventRequest.java`
- 신규: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/JackpotChainWebhookService.java`
- 수정: `BE-ssatto/src/main/resources/application-local.yml`
- 수정: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
- 수정: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
- 확장 후보:
  - `domain/blockchain/service`
  - `domain/wallet/service`
  - `domain/mining/service`
  - `domain/lotto/service`

### 4-2. 내부 webhook endpoint 계약

권장 경로:

- `POST /internal/jackpotchain/events`

권장 헤더:

- `X-JackpotChain-Webhook-Token`

응답 원칙:

- 검증 성공 시 `202 Accepted`
- 본문 파싱 실패/토큰 불일치 시 `400` 또는 `401`
- 내부 처리 실패도 가능하면 빠르게 `202` 후 비동기 큐로 넘기고, 실제 실패는 내부 로그/재처리 대상으로 분리

중요:

- 이 endpoint는 공개 FE API인 `/api/v1/...`와 분리한다.
- Swagger 공개 범위에도 넣지 않는 것이 안전하다.

## 5. Backend 동기화 전략

핵심 원칙은 "webhook은 신호, RPC는 진실"이다.

### 5-1. `block.received` 처리

- Backend는 webhook payload의 `blockHash`를 받으면 RPC로 최신 체인 상태를 다시 조회한다.
- 필요한 RPC 확장 후보:
  - `getblock`
  - `getblockhash`
  - `getrawtransaction`
  - 이미 있는 `getblockchaininfo`
- 이후 다음 데이터를 upsert/재계산한다.
  - `domain.blockchain.entity.Block`
  - `domain.blockchain.entity.Transaction`
  - `domain.wallet.entity.WalletActivity`
  - `domain.lotto` 결과/당첨 상태
  - `domain.mining` 블록 보상 집계

### 5-2. `tx.received` 처리

- 실시간 대시보드나 mempool 카운트 갱신용 보조 신호로 사용한다.
- 확정 데이터 적재보다 캐시/임시 상태 갱신에 우선 사용한다.
- 최종 활동 내역 확정은 블록 인덱싱 결과가 덮어쓴다.

이유:

- `docs/reviews/api.md`의 `wallet_activity`는 webhook 블록 인덱싱으로 저장된 데이터를 반환한다고 명시되어 있다.
- 따라서 `tx.received`만으로 활동 내역을 최종 확정하면 API 계약과 어긋난다.

## 6. Node 핫패스 훅 위치 세부안

### 6-1. `jackpotchain/network/node.py::_handle_block()`

적용 지점:

- `Block.deserialize(payload)` 직후, `block_hash` 계산 직후

처리 방향:

- `block.received` 이벤트 enqueue
- enqueue 실패는 로그만 남기고 블록 처리 흐름은 계속

### 6-2. `jackpotchain/network/node.py::_handle_tx()`

적용 지점:

- `Transaction.deserialize(payload)` 직후

처리 방향:

- `tx.received` 이벤트 enqueue
- mempool 추가 실패와 webhook 실패는 분리해서 기록

주의:

- 레퍼런스처럼 함수 시작 부분에 바로 넣을 수는 있지만, 실제 전송 코드는 `_notify_dashboard()` 한 함수로 두지 말고 notifier 계층을 통해 분리한다.

## 7. 보안/운영 정책

- webhook 토큰은 `.env.local`, `.env.prod` 등 외부 환경변수로만 관리한다.
- Backend는 토큰 불일치, JSON 스키마 불일치, 과도한 중복 이벤트를 로그로 식별 가능해야 한다.
- node는 webhook 실패 때문에 종료되거나 재시작 루프에 빠지면 안 된다.
- 다중 노드 환경 전환 시에도 이벤트 중복을 감안한 멱등 처리가 가능해야 한다.

# Test Checklist

- [ ] `jackpotchain/network/node.py`에서 `_handle_block()` / `_handle_tx()` 이벤트 enqueue 단위 테스트
- [ ] notifier queue full / timeout / 5xx 응답 / 연결 실패 테스트
- [ ] webhook 비활성화 상태에서 node 정상 기동 테스트
- [ ] `docker compose` local 환경에서 backend webhook URL 연결 테스트
- [ ] `POST /internal/jackpotchain/events` 토큰 검증 테스트
- [ ] Backend에서 `block.received` 수신 후 RPC pull-sync 호출 테스트
- [ ] `wallet_activity`가 블록 인덱싱 기준으로 적재되는지 통합 테스트
- [ ] 중복 이벤트 재전송 시 멱등 처리 테스트

# Observability Checklist

- [ ] node 로그에 webhook enable 여부, 대상 URL, timeout 정보가 노출됨
- [ ] webhook enqueue/drop/failure 건수가 로그 또는 메트릭으로 식별됨
- [ ] Backend 로그에 `eventType`, `eventId`, `blockHash` 또는 `txId`가 함께 남음
- [ ] RPC 재조회 실패와 webhook 수신 실패가 서로 다른 로그 코드로 구분됨
- [ ] 대시보드 인덱싱 지연 시간을 추적할 수 있음

# Done Criteria

- JackpotChain에서 블록/TX 수신 시 Backend 내부 endpoint로 안정적으로 이벤트를 전달할 수 있다.
- webhook 실패가 node 블록/TX 처리 경로를 막지 않는다.
- Backend는 webhook을 트리거로 사용해 RPC 재조회 후 `blockchain dashboard`, `wallet activity`, `mining`, `lotto` 적재 흐름을 이어갈 수 있다.
- `wallet_activity` 최종 적재 기준이 블록 인덱싱임이 코드와 문서에 일관되게 반영된다.
- 설정은 `.env.local` / 운영 환경변수로 외부화되고, node dev/prod 분리 없이 동일 실행 계약을 유지한다.
