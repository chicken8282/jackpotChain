# API 명세서 — JackpotChain

> 최종 업데이트: 2026-03-23
> 기준: 로컬 QA 전 항목 PASS (2026-03-22)
> Base URL: `/api/v1`

---

## 공통

**요청 헤더**
- `Content-Type: application/json`
- `Authorization: Bearer {accessToken}` (보호 API)

**응답 형식**
```json
{ "code": 200, "message": "...", "data": { ... } }
```

**공통 응답 코드**

| 코드 | 의미 |
|------|------|
| 200 | 정상 |
| 400 | 잘못된 요청 (파라미터 오류) |
| 401 | 인증 필요 (토큰 없음/만료) |
| 403 | 권한 없음 (다른 지갑 접근) |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등록 등) |
| 429 | 요청 과다 |
| 500 | 서버 오류 |
| 503 | 서비스 불가 (RPC 장애 등) |

**보호 API 규칙**
- JWT subject == 요청 walletAddress 일치 필수
- 불일치 → 403, 토큰 없음/만료 → 401

---

## 인증 (Auth)

> Private key는 서버에 전송하지 않음. 인증 흐름: `challenge → sign(클라이언트) → verify`

### POST /auth/challenge

지갑 서명용 일회성 챌린지 메시지 발급. TTL 5분, 단일 사용.

**Request**
```json
{ "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82" }
```

**Response 200**
```json
{
  "data": {
    "challengeId": "challenge-001",
    "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    "nonce": "nonce-001",
    "message": "SSATTO Login\naddress=...\nchallengeId=...\nnonce=...\nissuedAt=...\nexpiresAt=...\npurpose=wallet-auth",
    "expiresAt": "2026-03-20T10:05:00"
  }
}
```

### POST /auth/verify

서명된 챌린지 검증 → 액세스 토큰 + refresh 세션 발급.

**Request**
```json
{
  "challengeId": "challenge-001",
  "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
  "publicKey": "034f355bdcb7cc0af728...",
  "signature": "304402204787ca19d3d8c713..."
}
```

**Response 200**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "walletAddress": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    "accessTokenExpiresAt": "2026-03-20T10:15:00",
    "refreshSessionHandle": "session-handle-001",
    "refreshToken": "opaque-refresh-token"
  }
}
```

Set-Cookie: `ssatto_refresh_{sessionHandle}=...; HttpOnly; Path=/api/v1/auth`

### POST /auth/refresh

refresh 토큰 로테이션 + 액세스 토큰 재발급.

**Request**: `{ "sessionHandle": "session-handle-001" }`
- Cookie에서 raw refresh token 자동 읽음

**Response 200**: verify와 동일 구조

### POST /auth/logout

세션 폐기 + refresh 쿠키 만료.

**Request**: `{ "sessionHandle": "session-handle-001" }`

---

## 블록체인 (Blockchain)

### GET /blockchain/dashboard

체인 상태, 최근 블록 목록, 피어 목록 단일 조회. (인증 불필요)

**Query**: `limit` (기본 10, 최대 50)

**Response 200**
```json
{
  "data": {
    "isOn": true,
    "height": 1042,
    "bestBlockHash": "0000a3f...",
    "difficulty": 65536,
    "networkHashps": 12450,
    "connections": 3,
    "pooledTxCount": 5,
    "blocks": [
      {
        "height": 1042,
        "hash": "0000a3f...",
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

### GET /blockchain/blocks/{height}

블록 상세 조회. Dashboard/Mining 모달에서 공통 사용. (인증 불필요)

**Response 200**
```json
{
  "data": {
    "height": 1042,
    "hash": "0000a3f...",
    "reward": 10000000000,
    "feeReward": 320000000,
    "txCount": 3,
    "confirmations": 15,
    "minedAt": "2026-03-17T10:23:44",
    "miningElapsed": 12,
    "version": "0x20000000",
    "previousHash": "0000b4f...",
    "nonce": 183402,
    "difficulty": "7.42T",
    "minerName": "Validator-03",
    "isMainChain": true
  }
}
```

---

## 지갑 (Wallet)

### POST /wallet

지갑 메타데이터 등록 (키페어는 클라이언트 생성, private key 서버 전송 금지). 온보딩 1 POT 지급 포함.

**Request**
```json
{ "address": "JackpotAC34...", "nickname": "내 지갑", "walletColor": "BLUE" }
```

**Response 200**
```json
{
  "data": {
    "address": "JackpotAC34...",
    "nickname": "내 지갑",
    "walletColor": "BLUE",
    "createdAt": "2026-03-17T10:23:44"
  }
}
```

### GET /wallet

지갑 목록 조회. 잔액은 on-chain RPC 기준. (인증 불필요)

**Query**: `addresses=addr1,addr2` (필수)

**Response 200**
```json
{
  "data": {
    "wallets": [
      {
        "address": "JackpotAC34...",
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

### GET /wallet/{address}/activities

활동 내역 커서 기반 페이지네이션. **인증 필요.**

**Query**: `lastActivityId` (커서), `size` (기본 20, 최대 100), `type` (필터)

**Response 200**
```json
{
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
      }
    ]
  }
}
```

활동 type: `WALLET_CREATED`, `EXCHANGE`, `LOTTO_COMMIT`, `LOTTO_CLAIM`, `MINING`, `TRANSFER`

### GET /wallet/{address}/utxos

지갑 UTXO 목록 조회. **인증 필요.**

**Response 200**: UTXO 목록 (txId, vout, amount, type 등)

---

## 로또 (Lotto)

### GET /lotto

로또 개요 조회 (잔액, 잭팟 풀, 현재 라운드 등). **인증 필요.**

**Query**: `address` (필수)

### POST /lotto/commit

로또 참여. 클라이언트가 signed version=3 TX 생성 후 relay. **인증 필요.**

**Request**
```json
{
  "address": "XB2T67y...",
  "signedTxHex": "01000000...",
  "commitNumbers": [3, 7, 11, 14]
}
```

**Response 200**: `{ "commitHash": "a1b2c3...", "blockHeight": null, "status": "DRAWING" }`

### GET /lotto/entries

참여 내역 조회 (커서 페이지네이션). **인증 필요.**

**Query**: `address` (필수), `lastEntryId` (커서), `size` (기본 20)

**Response 200**: entries 배열 (commitHash, status, commitNumbers, resultNumbers, matchCount, isClaimable, claimed 등)

### GET /lotto/entries/{commitHash}/result

특정 참여 결과 조회. **인증 필요.**

**Response 200**: `{ status, resultNumbers, matchCount, rewardJack, rewardPot, isClaimable, claimed }`

### GET /lotto/entries/{commitHash}/claim-context ✨ 신규

클레임 서명에 필요한 체인 컨텍스트 제공. 클라이언트가 직접 signed version=5 TX 생성 시 사용. **인증 필요.**

**Response 200**
```json
{
  "data": {
    "commitHash": "a1b2c3...",
    "rewardJack": 20000000000,
    "rewardPot": 0,
    "payoutUtxo": { "txId": "...", "vout": 0, "amount": 20000000000 },
    "poolUtxos": [
      { "txId": "...", "vout": 0, "amount": 500000000000 }
    ]
  }
}
```

### POST /lotto/claim

클레임 TX relay. 클라이언트가 claim-context로 signed version=5 TX 생성 후 제출. **인증 필요.**

**Request**: `{ "address": "...", "commitHash": "...", "signedTxHex": "..." }`

---

## 교환 (Exchange)

### GET /exchange/info

교환 가능 잔액, 교환 비율 조회. **인증 필요.**

**Query**: `address` (필수)

**Response 200**: `{ jackBalance, potBalance, exchangeRate, minJackAmount }`

### POST /exchange/jack-to-pot

JACK → POT 교환. 클라이언트가 signed version=2 TX 생성 후 relay. **인증 필요.**

**Request**: `{ "address": "...", "signedTxHex": "...", "jackAmount": 10000000000 }`

---

## 채굴 (Mining)

### GET /mining/blocks

채굴 블록 목록 (지갑 기준, 커서 페이지네이션). **인증 필요.**

**Query**: `address` (필수), `lastBlockId` (커서), `size` (기본 20, 최소 1)

**Response 200**: blocks 배열 (height, hash, rewardJack, minedAt, confirmations 등)

---

## Polling 전략

| 엔드포인트 | 주기 | 중단 조건 |
|-----------|------|---------|
| GET /wallet | 10초 | 페이지 이탈 |
| GET /wallet/{address}/activities | 10초 | 페이지 이탈 |
| GET /lotto | 10초 | 페이지 이탈 |
| GET /lotto/entries | 10초 | 모든 엔트리 확정 시 30초로 전환 |
| GET /lotto/entries/{hash}/result | 10초 | status != "DRAWING" |
| GET /mining/blocks | 15초 | 페이지 이탈 |

- 탭 비활성화 시 pause (`document.visibilityState !== 'visible'`)
- POST 후 즉시 refetch (polling 미사용)
- AbortController로 인플라이트 요청 취소
