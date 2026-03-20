# API 명세서

> JackpotChain 블록체인 기반 로또 시스템 REST API

---

## 공통 사항

- Base URL: `http://{host}:{port}/api/v1`
- Content-Type: `application/json`
- 인증: Bearer Token (일부 API)
- 응답 형식:
```json
{
  "code": 200,
  "message": "요청 설명",
  "data": { ... }
}
```

### 공통 응답 코드

| 코드 | 의미 |
|------|------|
| 200 | 요청 정상처리 |
| 400 | 클라이언트 오류 (잘못된 파라미터 등) |
| 401 | 유효하지 않은 토큰 |
| 404 | 리소스를 찾을 수 없음 |
| 429 | 짧은 시간 내 과도한 API 호출 |
| 500 | 서버 오류 |
| 503 | 서비스 불가 (서버 과부하 / 유지보수 중) |

---

## 인증 (Auth)

> Login is wallet-based. The server never receives a private key.
> The authentication flow is `challenge -> sign -> verify -> refresh`.
> `POST /auth/token` is removed from the active contract.

### Auth Model

- Access token: JWT, short-lived, sent as `Authorization: Bearer ...`
- Refresh token: opaque random token, stored only in an `HttpOnly` cookie
- Refresh session handle: wallet-scoped handle persisted by FE metadata
- Protected APIs compare `JWT subject == request wallet address`

### `POST /auth/challenge`

Issues a one-time canonical message for wallet signing.

Request:

```json
{
  "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"
}
```

Response:

```json
{
  "code": 200,
  "message": "인증 챌린지가 발급되었습니다.",
  "data": {
    "challengeId": "challenge-001",
    "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    "nonce": "nonce-001",
    "message": "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82\nchallengeId=challenge-001\nnonce=nonce-001\nissuedAt=2026-03-20T10:00:00\nexpiresAt=2026-03-20T10:05:00\npurpose=wallet-auth",
    "expiresAt": "2026-03-20T10:05:00"
  }
}
```

Notes:

- Challenge TTL: 5 minutes
- Single-use only
- The wallet must already be registered in `wallet`

### `POST /auth/verify`

Verifies the signed challenge and starts a wallet session.

Request:

```json
{
  "challengeId": "challenge-001",
  "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
  "publicKey": "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
  "signature": "304402204787ca19d3d8c713eb3ae9b6fb6c7d943fb2e0b61f8eb9c3db78911b87a2c20102205e925f9aae2caa3025714c047faa8c8a3bbf7986a37b2814a49f36d1b695e38f"
}
```

Response:

```json
{
  "code": 200,
  "message": "인증이 완료되었습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "walletAddress": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    "accessTokenExpiresAt": "2026-03-20T10:15:00",
    "refreshSessionHandle": "session-handle-001",
    "refreshToken": "opaque-refresh-token"
  }
}
```

Cookie:

- `Set-Cookie: ssatto_refresh_{sessionHandle}=...; HttpOnly; Path=/api/v1/auth`

### `POST /auth/refresh`

Rotates the refresh token and reissues the access token.

Request:

```json
{
  "sessionHandle": "session-handle-001"
}
```

Response:

```json
{
  "code": 200,
  "message": "세션이 복구되었습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "walletAddress": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    "accessTokenExpiresAt": "2026-03-20T10:30:00",
    "refreshSessionHandle": "session-handle-001",
    "refreshToken": "rotated-refresh-token"
  }
}
```

Rules:

- FE sends only `sessionHandle`
- BE reads the raw refresh token from cookie
- BE stores only the refresh token hash
- Rotation happens on every successful refresh

### `POST /auth/logout`

Revokes the wallet refresh session and expires the refresh cookie.

Request:

```json
{
  "sessionHandle": "session-handle-001"
}
```

Response:

```json
{
  "code": 200,
  "message": "로그아웃이 완료되었습니다.",
  "data": null
}
```

### Protected API Rule

These endpoints require a valid access token:

- `GET /wallet/{address}/activities`
- `GET /lotto?address=...`
- `GET /lotto/entries?address=...`
- `POST /lotto/commit`
- `GET /exchange/info?address=...`
- `POST /exchange/jack-to-pot`

Authorization rule:

- `JWT subject` must equal the request wallet address
- mismatch returns `403`
- missing or invalid token returns `401`

---

## 1. 블록체인 (Blockchain)

### 1-1. 대시보드 통합 조회

> 현재 블록체인 상태, 최근 블록 목록, 연결된 피어 노드 ID 목록을 단일 API로 제공한다.

```
GET /blockchain/dashboard
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| limit | 블록 목록 조회 수 | Integer | 선택 | 기본값: 10, 최대: 50 |

- BearerToken: 불필요

**Response** 응답 코드: 200 / 400 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| isOn | 노드 운영 상태 | Boolean | 필수 |
| height | 현재 블록 높이 | Long | 필수 |
| bestBlockHash | 최신 블록 해시 | String | 필수 |
| difficulty | 현재 난이도 | Long | 필수 |
| networkHashps | 네트워크 해시율 (H/s) | Long | 선택 |
| connections | 연결된 노드 수 | Integer | 필수 |
| pooledTxCount | 멤풀 대기 트랜잭션 수 | Integer | 필수 |
| blocks[] | 최근 확정 블록 목록 | Array | 필수 |
| blocks[].height | 블록 높이 | Long | 필수 |
| blocks[].hash | 블록 해시 | String | 필수 |
| blocks[].txCount | 포함된 트랜잭션 수 | Integer | 필수 |
| blocks[].minedAt | 채굴 일시 | DateTime | 필수 |
| blocks[].minerLabel | 채굴자 닉네임 | String | 선택 |
| blocks[].rewardJack | 채굴 보상 (JACK satoshi) | Long | 필수 |
| blocks[].confirmations | 확인 수 | Integer | 필수 |
| nodes[] | 연결된 피어 노드 ID 목록 | Array\<Integer\> | 필수 |

```json
{
  "code": 200,
  "message": "대시보드 조회가 완료되었습니다.",
  "data": {
    "isOn": true,
    "height": 1042,
    "bestBlockHash": "0000a3f...c9b2",
    "difficulty": 65536,
    "networkHashps": 12450,
    "connections": 3,
    "pooledTxCount": 5,
    "blocks": [
      {
        "height": 1042,
        "hash": "0000a3f...c9b2",
        "txCount": 3,
        "minedAt": "2026-03-17T10:23:44",
        "minerLabel": "Validator-03",
        "rewardJack": 10000000000,
        "confirmations": 15
      }
    ],
    "nodes": [1, 2, 3]
  }
}
```

---

### 1-2. 블록 상세 조회

> 블록 높이로 확정된 블록의 상세 정보를 조회한다.
> DashboardPage 블록 상세 모달과 MiningPage 블록 상세 모달에서 공통으로 사용한다.

```
GET /blockchain/blocks/{height}
```

**Request**
- PathVariable:
  - `height` (확정 블록 높이)
- BearerToken: 불필요

**Response** 응답 코드: 200 / 404 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| height | 블록 높이 | Long | 필수 |
| hash | 블록 해시 | String | 필수 |
| reward | 기본 채굴 보상 (JACK satoshi) | Long | 필수 |
| feeReward | 수수료 보상 (JACK satoshi) | Long | 필수 |
| txCount | 트랜잭션 수 | Integer | 필수 |
| confirmations | 확인 수 | Integer | 필수 |
| minedAt | 채굴 일시 | DateTime | 필수 |
| miningElapsed | 채굴 소요 시간 (초, 이전 블록과의 타임스탬프 차이) | Integer | 필수 |
| version | 블록 버전 (hex) | String | 필수 |
| previousHash | 이전 블록 해시 | String | 필수 |
| nonce | 논스 | Long | 필수 |
| difficulty | 난이도 (Human-readable, 예: "7.42T") | String | 필수 |
| minerName | 채굴자 닉네임 (wallet 테이블 address lookup, 없으면 null) | String | 선택 |
| isMainChain | 메인체인 여부 | Boolean | 필수 |

```json
{
  "code": 200,
  "message": "블록 상세 조회가 완료되었습니다.",
  "data": {
    "height": 1042,
    "hash": "0000a3f1b2c3d4e5f6...",
    "reward": 10000000000,
    "feeReward": 320000000,
    "txCount": 3,
    "confirmations": 15,
    "minedAt": "2026-03-17T10:23:44",
    "miningElapsed": 12,
    "version": "0x20000000",
    "previousHash": "0000b4f2c3d4...",
    "nonce": 183402,
    "difficulty": "7.42T",
    "minerName": "Validator-03",
    "isMainChain": true
  }
}
```

---

## 2. 지갑 (Wallet)

### 2-1. 지갑 생성 (메타데이터 등록)

> 클라이언트에서 키페어를 생성한 후, 지갑 주소와 UI 메타데이터(닉네임, 테마)만 서버에 등록한다.
> private key는 서버에 전송하지 않으며 브라우저 IndexedDB에만 보관한다.

```
POST /wallet
```

**Request Body:**

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 클라이언트에서 생성한 지갑 주소 | String | 필수 | |
| nickname | 지갑 닉네임 | String | 선택 | 최대 50자 |
| walletColor | 지갑 테마 색상 ID | String | 선택 | 기본값: `"DEFAULT"` |

```json
{
  "address": "JackpotAC34EF78B2D1...",
  "nickname": "내 지갑",
  "walletColor": "BLUE"
}
```

**Response** 응답 코드: 200 / 400 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| address | 등록된 지갑 주소 | String | 필수 |
| nickname | 닉네임 | String | 선택 |
| walletColor | 테마 색상 ID | String | 필수 |
| createdAt | 생성 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "지갑이 등록되었습니다.",
  "data": {
    "address": "JackpotAC34EF78B2D1...",
    "nickname": "내 지갑",
    "walletColor": "BLUE",
    "createdAt": "2026-03-17T10:23:44"
  }
}
```

---

### 2-2. 지갑 목록 조회

> 여러 지갑 주소를 한 번에 조회한다. 각 지갑의 JACK/POT 잔액은 on-chain UTXO 기준으로 반환한다.

```
GET /wallet
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| addresses | 조회할 지갑 주소 목록 (쉼표 구분) | String | 필수 | 예: `addr1,addr2,addr3` |

- BearerToken: 불필요

**Response** 응답 코드: 200 / 400 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| wallets[].address | 지갑 주소 | String | 필수 |
| wallets[].nickname | 닉네임 | String | 선택 |
| wallets[].walletColor | 테마 색상 ID | String | 필수 |
| wallets[].jackBalance | JACK 잔액 (satoshi) | Long | 필수 |
| wallets[].potBalance | POT 잔액 (satoshi) | Long | 필수 |
| wallets[].createdAt | 생성 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "지갑 목록 조회가 완료되었습니다.",
  "data": {
    "wallets": [
      {
        "address": "JackpotAC34EF78B2D1...",
        "nickname": "내 지갑",
        "walletColor": "BLUE",
        "jackBalance": 1025000000000,
        "potBalance": 18400000000,
        "createdAt": "2026-03-17T10:23:44"
      }
    ]
  }
}
```

---

### 2-3. 활동 내역 조회

> 특정 지갑 주소의 활동 내역을 커서 기반 페이지네이션으로 조회한다.
> Webhook 블록 인덱싱으로 `wallet_activity` 테이블에 저장된 데이터를 반환한다.
> `description` 필드는 BE에서 `type`에 따라 자동 생성하여 반환한다.

```
GET /wallet/{address}/activities
```

**Request**
- PathVariable: `address`
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| lastActivityId | 마지막 활동 ID (커서) | Long | 선택 | 무한 스크롤용, 첫 조회 시 생략 |
| size | 페이지 당 개수 | Integer | 선택 | 기본값: 20 |
| type | 활동 유형 필터 | String | 선택 | 아래 type 목록 참고, 생략 시 전체 조회 |

- BearerToken: 필수

**활동 유형 (type) 및 description 생성 규칙**

| type | description 형식 | 예시 |
|------|-----------------|------|
| `WALLET_CREATED` | `"지갑 생성"` | `"지갑 생성"` |
| `EXCHANGE` | `"{N} JACK → {M} POT 교환"` | `"100 JACK → 1 POT 교환"` |
| `LOTTO_COMMIT` | `"로또 참여 (1 POT)"` | `"로또 참여 (1 POT)"` |
| `LOTTO_CLAIM` | `"로또 보상 수령 ({N} JACK)"` / `"로또 1 POT 환불"` | `"로또 보상 수령 (20,000 JACK)"` |
| `MINING` | `"채굴 보상 수령 ({N} JACK)"` | `"채굴 보상 수령 (100 JACK)"` |
| `TRANSFER` | `"{N} JACK 수신"` / `"{N} JACK 전송"` | `"50 JACK 수신"` |

> `{N}`, `{M}` 값은 satoshi를 JACK/POT 단위로 변환하여 사람이 읽기 쉬운 형태로 표시한다. (예: 10,000,000,000 satoshi → 100 JACK)

**Response** 응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| hasNext | 다음 페이지 존재 여부 | Boolean | 필수 |
| nextCursor | 다음 커서 ID | Long | 선택 |
| activities[].activityId | 활동 PK | Long | 필수 |
| activities[].type | 활동 유형 | String | 필수 |
| activities[].description | 활동 설명 (BE 자동 생성) | String | 필수 |
| activities[].txId | 연관 트랜잭션 해시 | String | 선택 |
| activities[].createdAt | 발생 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "활동 내역 조회가 완료되었습니다.",
  "data": {
    "hasNext": true,
    "nextCursor": 15,
    "activities": [
      {
        "activityId": 20,
        "type": "LOTTO_COMMIT",
        "description": "로또 참여 (1 POT)",
        "txId": "a1b2c3d4...",
        "createdAt": "2026-03-17T10:23:44"
      },
      {
        "activityId": 19,
        "type": "EXCHANGE",
        "description": "100 JACK → 1 POT 교환",
        "txId": "e5f6g7h8...",
        "createdAt": "2026-03-17T09:11:22"
      },
      {
        "activityId": 18,
        "type": "MINING",
        "description": "채굴 보상 수령 (100 JACK)",
        "txId": "c3d4e5f6...",
        "createdAt": "2026-03-17T08:55:00"
      },
      {
        "activityId": 17,
        "type": "WALLET_CREATED",
        "description": "지갑 생성",
        "txId": null,
        "createdAt": "2026-03-17T08:00:00"
      }
    ]
  }
}
```

---

## 3. 교환 (Exchange)

> JACK → POT 단방향 교환만 지원한다. (100 JACK = 1 POT 고정 비율)
> 교환 TX는 클라이언트에서 서명(version=2)하여 `signedTxHex`로 전달한다.

### 3-1. JACK → POT 교환

> 클라이언트 서명 완료 TX를 서버로 전달하여 교환을 실행한다.

```
POST /exchange/jack-to-pot
```

**Request**
- BearerToken: 필수
- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 교환 요청 지갑 주소 | String | 필수 | |
| jackAmount | 교환할 JACK 금액 (satoshi) | Long | 필수 | 최소 100 JACK = 10,000,000,000 satoshi |
| signedTxHex | 클라이언트 서명 완료 TX (hex) | String | 필수 | version=2 TX |

```json
{
  "fromAddress": "JackpotAC34EF78B2D1...",
  "jackAmount": 10000000000,
  "signedTxHex": "0200000001..."
}
```

**Response** 응답 코드: 200 / 400 / 401 / 429 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| txId | 교환 트랜잭션 해시 | String | 필수 |
| burnedJack | 소각된 JACK (satoshi) | Long | 필수 |
| receivedPot | 수령한 POT (satoshi) | Long | 필수 |
| exchangeRate | 적용된 교환 비율 (JACK per POT) | Integer | 필수 |

```json
{
  "code": 200,
  "message": "교환이 완료되었습니다.",
  "data": {
    "txId": "a1b2c3d4e5f6...",
    "burnedJack": 10000000000,
    "receivedPot": 100000000,
    "exchangeRate": 100
  }
}
```

---

### 3-2. 교환 정보 조회

> 교환 화면 진입 시 사용자의 현재 JACK/POT 잔액을 조회한다.

```
GET /exchange/info
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| address | 지갑 주소 | String | 필수 |

- BearerToken: 불필요

**Response** 응답 코드: 200 / 400 / 404 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| jackBalance | 사용자 JACK 잔액 (satoshi) | Long | 필수 |
| potBalance | 사용자 POT 잔액 (satoshi) | Long | 필수 |

```json
{
  "code": 200,
  "message": "교환 정보 조회가 완료되었습니다.",
  "data": {
    "jackBalance": 1025000000000,
    "potBalance": 18400000000
  }
}
```

---

## 4. 로또 (Lotto)

### 4-1. 로또 페이지 통합 조회

> 로또 페이지 진입 시 필요한 정보를 단일 API로 제공한다.
> 잭팟 풀 잔액, 통계, 역대 Top 3 수상자 랭킹, 사용자 잔액을 포함한다.
> `prizeTiers`는 역대 최고 보상 수령자 Top 3 순위를 나타낸다.

```
GET /lotto
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 사용자 지갑 주소 | String | 필수 | 잔액 조회용 |

- BearerToken: 불필요

**Response** 응답 코드: 200 / 400 / 404 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| jackBalance | 사용자 JACK 잔액 (satoshi) | Long | 필수 |
| potBalance | 사용자 POT 잔액 (satoshi) | Long | 필수 |
| poolBalanceJack | 현재 잭팟 풀 잔액 (JACK satoshi) | Long | 필수 |
| totalEntries | 누적 총 참여 횟수 | Long | 필수 |
| totalWinners | 누적 당첨자 수 | Long | 필수 |
| prizeTiers[] | 역대 Top 3 수상자 랭킹 | Array | 필수 |
| prizeTiers[].rank | 순위 (1~3) | Integer | 필수 |
| prizeTiers[].matches | 일치 개수 | Integer | 필수 |
| prizeTiers[].rewardJack | 수령한 JACK 보상 (satoshi) | Long | 필수 |

```json
{
  "code": 200,
  "message": "로또 정보 조회가 완료되었습니다.",
  "data": {
    "jackBalance": 1025000000000,
    "potBalance": 18400000000,
    "poolBalanceJack": 450000000000,
    "totalEntries": 1240,
    "totalWinners": 3,
    "prizeTiers": [
      { "rank": 1, "matches": 6, "rewardJack": 10000000000000 },
      { "rank": 2, "matches": 5, "rewardJack": 1000000000 },
      { "rank": 3, "matches": 4, "rewardJack": 100000 }
    ]
  }
}
```

---

### 4-2. 로또 참여 (커밋)

> 선택한 6자리 숫자와 클라이언트 서명 TX를 제출하여 로또에 참여한다.
> 참여 비용: 1 POT (고정). TX는 클라이언트에서 version=3으로 서명하여 전달한다.
> 성공 시 `data: null`을 반환하며, 참여 결과는 `GET /lotto/entries`로 폴링하여 확인한다.

```
POST /lotto/commit
```

**Request**
- BearerToken: 필수
- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 참여 지갑 주소 | String | 필수 | |
| chosenNumbers | 선택한 6자리 숫자 배열 | Array\<Integer\> | 필수 | 각 값 0~15 (0x0~0xF) |
| signedTxHex | 클라이언트 서명 완료 TX (hex) | String | 필수 | version=3 TX |

```json
{
  "fromAddress": "JackpotAC34EF78B2D1...",
  "chosenNumbers": [10, 1, 15, 3, 4, 14],
  "signedTxHex": "0300000001..."
}
```

**Response** 응답 코드: 200 / 400 / 401 / 429 / 500 / 503

```json
{
  "code": 200,
  "message": "로또 참여가 완료되었습니다.",
  "data": null
}
```

---

### 4-3. 로또 결과 조회

> 특정 커밋 해시의 로또 결과를 조회한다.
> 커밋 블록(N) 이후 N+18 블록이 확정되면 결과가 산출된다.
> 클레임 가능 여부(`isClaimable`)는 status가 `WINNING`이고 미수령이며 N+18~N+68 범위 내일 때 `true`를 반환한다.

```
GET /lotto/entries/{commitHash}/result
```

**Request**
- PathVariable: `commitHash`
- BearerToken: 필수

**Response** 응답 코드: 200 / 400 / 401 / 404 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| commitHash | 커밋 TX 해시 | String | 필수 |
| chosenNumbers | 선택 숫자 배열 (0~15) | Array\<Integer\> | 필수 |
| resultNumbers | 결과 숫자 배열 (null=추첨 중) | Array\<Integer\> | 선택 |
| matchCount | 일치 개수 | Integer | 선택 |
| isClaimable | 현재 클레임 가능 여부 | Boolean | 필수 |
| status | 상태 | String | 필수 |
| rewardJack | JACK 보상 (satoshi) | Long | 선택 |

> **1매치 환불**: `matchCount == 1`일 경우 `rewardJack`은 null이며, BE에서 1 POT(= 100,000,000 satoshi)을 on-chain 지급합니다. 별도 응답 필드 없이 `matchCount`로 구분합니다.

**status 값**

| 값 | 설명 |
|----|------|
| `DRAWING` | 결과 블록 미확정 (commit+18 미도달) |
| `WINNING` | 1개 이상 일치 (보상 존재) |
| `LOSING` | 0개 일치 (보상 없음) |
| `EXPIRED` | 클레임 기한 만료 (commit+68 초과) |

```json
{
  "code": 200,
  "message": "로또 결과 조회가 완료되었습니다.",
  "data": {
    "commitHash": "a1b2c3d4e5f6...",
    "chosenNumbers": [10, 1, 15, 3, 4, 14],
    "resultNumbers": [10, 5, 15, 3, 9, 14],
    "matchCount": 4,
    "isClaimable": true,
    "status": "WINNING",
    "rewardJack": 2000000000000
  }
}
```

---

### 4-4. 로또 보상 수령 (클레임)

> 당첨된 로또의 보상을 수령한다.
> TX는 클라이언트에서 version=5로 서명하여 전달한다.
> `isClaimable=true`인 항목에 대해서만 호출 가능하다.

```
POST /lotto/claim
```

**Request**
- BearerToken: 필수
- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 수령 지갑 주소 | String | 필수 | |
| commitHash | 커밋 트랜잭션 해시 | String | 필수 | |
| signedTxHex | 클라이언트 서명 완료 TX (hex) | String | 필수 | version=5 TX |

```json
{
  "fromAddress": "JackpotAC34EF78B2D1...",
  "commitHash": "a1b2c3d4e5f6...",
  "signedTxHex": "0500000001..."
}
```

**Response** 응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| claimTxId | 클레임 트랜잭션 해시 | String | 필수 |
| matchCount | 일치 개수 | Integer | 필수 |
| rewardJack | 수령한 JACK (satoshi) | Long | 선택 |
| claimedAt | 수령 일시 | DateTime | 필수 |

> **1매치 환불**: `matchCount == 1`일 경우 BE에서 1 POT(= 100,000,000 satoshi)을 on-chain 지급합니다. `rewardJack`은 null이며 `matchCount`로 구분합니다.

```json
{
  "code": 200,
  "message": "보상 수령이 완료되었습니다.",
  "data": {
    "claimTxId": "z9y8x7w6...",
    "matchCount": 4,
    "rewardJack": 2000000000000,
    "claimedAt": "2026-03-17T11:05:00"
  }
}
```

---

### 4-5. 로또 참여 내역 조회

> 특정 지갑 주소의 전체 로또 참여 내역을 조회한다.
> status 필터로 특정 상태의 항목만 조회할 수 있다.
> `isClaimable=true`인 항목에 한해 클레임(보상 수령) 버튼을 활성화한다.

```
GET /lotto/entries
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 조회 대상 지갑 주소 | String | 필수 | |
| status | 상태 필터 | String | 선택 | `ALL` / `DRAWING` / `WINNING` / `LOSING` / `EXPIRED`, 기본값: `ALL` |

- BearerToken: 필수

**Response** 응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| entries[].entryId | 참여 PK | Long | 필수 |
| entries[].commitHash | 커밋 트랜잭션 해시 | String | 필수 |
| entries[].chosenNumbers | 선택 숫자 배열 (0~15) | Array\<Integer\> | 필수 |
| entries[].status | 상태 (`DRAWING`/`WINNING`/`LOSING`/`EXPIRED`) | String | 필수 |
| entries[].matchCount | 일치 개수 (추첨 중이면 null) | Integer | 선택 |
| entries[].rewardJack | 보상 JACK (satoshi, 해당 없으면 null) | Long | 선택 |
| entries[].claimed | 보상 수령 여부 | Boolean | 필수 |
| entries[].isClaimable | 현재 클레임 가능 여부 | Boolean | 필수 |
| entries[].createdAt | 참여 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "로또 참여 내역 조회가 완료되었습니다.",
  "data": {
    "entries": [
      {
        "entryId": 42,
        "commitHash": "a1b2c3d4...",
        "chosenNumbers": [10, 1, 15, 3, 4, 14],
        "status": "WINNING",
        "matchCount": 4,
        "rewardJack": 2000000000000,
        "claimed": false,
        "isClaimable": true,
        "createdAt": "2026-03-17T10:23:44"
      },
      {
        "entryId": 41,
        "commitHash": "b2c3d4e5...",
        "chosenNumbers": [1, 2, 3, 4, 5, 6],
        "status": "DRAWING",
        "matchCount": null,
        "rewardJack": null,
        "claimed": false,
        "isClaimable": false,
        "createdAt": "2026-03-17T09:00:00"
      }
    ]
  }
}
```

---

## 5. 채굴 (Mining)

### 5-1. 채굴 블록 내역 조회 (주소별)

> 특정 지갑 주소가 채굴한 블록 목록을 커서 기반 페이지네이션으로 조회한다.
> 블록 상세는 `GET /blockchain/blocks/{height}`를 공통으로 사용한다.

```
GET /mining/blocks
```

**Request**
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 채굴자 지갑 주소 | String | 필수 | |
| lastBlockId | 마지막 블록 DB ID (커서) | Long | 선택 | 무한 스크롤용, 첫 조회 시 생략 |
| size | 페이지 당 개수 | Integer | 선택 | 기본값: 10 |

- BearerToken: 필수

**Response** 응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| hasNext | 다음 페이지 존재 여부 | Boolean | 필수 |
| nextCursor | 다음 커서 ID | Long | 선택 |
| totalRewardJack | 누적 채굴 보상 합계 (JACK satoshi) | Long | 필수 |
| blocks[].blockId | 블록 DB PK | Long | 필수 |
| blocks[].height | 블록 높이 | Long | 필수 |
| blocks[].hash | 블록 해시 | String | 필수 |
| blocks[].rewardJack | 채굴 보상 (JACK satoshi) | Long | 필수 |
| blocks[].txCount | 포함 트랜잭션 수 | Integer | 필수 |
| blocks[].minedAt | 채굴 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "채굴 블록 내역 조회가 완료되었습니다.",
  "data": {
    "hasNext": true,
    "nextCursor": 1030,
    "totalRewardJack": 50000000000,
    "blocks": [
      {
        "blockId": 1042,
        "height": 1042,
        "hash": "0000a3f...c9b2",
        "rewardJack": 10000000000,
        "txCount": 3,
        "minedAt": "2026-03-17T10:23:44"
      }
    ]
  }
}
```
