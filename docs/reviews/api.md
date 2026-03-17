# API 명세서

> JackpotChain 블록체인 기반 로또 시스템 REST API
> FE-ssatto 프론트엔드 요구사항 + jackpotchain RPC 분석 기반

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

## 1. 블록체인 (Dashboard)

### 1-1. 블록체인 정보 조회

> DashboardPage의 BlockHeight, BlockchainVisualizer 컴포넌트에서 사용

```
GET /blockchain/info
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요

**Response**

응답 코드: 200 / 400 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| height | 현재 블록 높이 | Long | 필수 |
| bestBlockHash | 최신 블록 해시 | String | 필수 |
| difficulty | 현재 난이도 | Long | 필수 |
| networkHashps | 네트워크 해시율 (H/s) | Long | 선택 |
| connections | 연결된 노드 수 | Integer | 필수 |
| pooledTxCount | 멤풀 대기 트랜잭션 수 | Integer | 필수 |

```json
{
  "code": 200,
  "message": "블록체인 정보 조회가 완료되었습니다.",
  "data": {
    "height": 1042,
    "bestBlockHash": "0000a3f...c9b2",
    "difficulty": 65536,
    "networkHashps": 12450,
    "connections": 3,
    "pooledTxCount": 5
  }
}
```

---

### 1-2. 최근 블록 목록 조회

> DashboardPage의 BlockchainVisualizer 체인 시각화에서 사용

```
GET /blockchain/blocks
```

**Request**
- PathVariable: 없음
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| limit | 조회 블록 수 | Integer | 선택 | 기본값: 10, 최대: 50 |

- BearerToken: 불필요

**Response**

응답 코드: 200 / 400 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| blocks | 블록 목록 | Array | 필수 |
| blocks[].height | 블록 높이 | Long | 필수 |
| blocks[].hash | 블록 해시 | String | 필수 |
| blocks[].txCount | 포함된 트랜잭션 수 | Integer | 필수 |
| blocks[].minedAt | 채굴 일시 | DateTime | 필수 |
| blocks[].minerAddress | 채굴자 주소 | String | 선택 |
| blocks[].rewardJack | 채굴 보상 (JACK, satoshi) | Long | 필수 |

```json
{
  "code": 200,
  "message": "블록 목록 조회가 완료되었습니다.",
  "data": {
    "blocks": [
      {
        "height": 1042,
        "hash": "0000a3f...c9b2",
        "txCount": 3,
        "minedAt": "2026-03-17T10:23:44",
        "minerAddress": "0xAC34EF78...",
        "rewardJack": 5000000000
      }
    ]
  }
}
```

---

## 2. 지갑 (Wallet)

### 2-1. 지갑 생성

> WalletPage의 WalletCreate 컴포넌트에서 사용

```
POST /wallet
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요
- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| nickname | 지갑 닉네임 | String | 선택 | 최대 50자 |
| walletColor | 지갑 테마 색상 ID | String | 선택 | 기본값: "DEFAULT" |

```json
{
  "nickname": "내 지갑",
  "walletColor": "BLUE"
}
```

**Response**

응답 코드: 200 / 400 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| address | 생성된 지갑 주소 | String | 필수 |
| nickname | 닉네임 | String | 선택 |
| walletColor | 테마 색상 ID | String | 필수 |
| createdAt | 생성 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "지갑이 생성되었습니다.",
  "data": {
    "address": "0xAC34EF78B2D1...",
    "nickname": "내 지갑",
    "walletColor": "BLUE",
    "createdAt": "2026-03-17T10:23:44"
  }
}
```

---

### 2-2. 지갑 잔액 조회

> WalletPage의 WalletInfo 컴포넌트에서 JACK·POT 잔액 표시에 사용

```
GET /wallet/{address}/balance
```

**Request**
- PathVariable:
  - `address` (조회 대상 지갑 주소)
- Query Parameter: 없음
- BearerToken: 선택 (타인 조회 시 불필요, 본인 조회 시 권장)

**Response**

응답 코드: 200 / 400 / 404 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| address | 지갑 주소 | String | 필수 |
| jackBalance | JACK 잔액 (satoshi) | Long | 필수 |
| potBalance | POT 잔액 (satoshi) | Long | 필수 |

```json
{
  "code": 200,
  "message": "지갑 잔액 조회가 완료되었습니다.",
  "data": {
    "address": "0xAC34EF78B2D1...",
    "jackBalance": 1025000000000,
    "potBalance": 18400000000
  }
}
```

---

### 2-3. 활동 내역 조회

> WalletPage의 ActivityList 컴포넌트에서 사용

```
GET /wallet/{address}/activities
```

**Request**
- PathVariable:
  - `address` (조회 대상 지갑 주소)
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| lastActivityId | 마지막 활동 ID (커서) | Long | 선택 | 무한 스크롤용 |
| size | 페이지 당 개수 | Integer | 선택 | 기본값: 20 |
| type | 활동 유형 필터 | String | 선택 | TRANSFER, EXCHANGE, LOTTO_COMMIT, LOTTO_CLAIM, MINING |

- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

**Response**

응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| hasNext | 다음 페이지 존재 여부 | Boolean | 필수 |
| nextCursor | 다음 커서 ID | Long | 선택 |
| activities | 활동 목록 | Array | 필수 |
| activities[].activityId | 활동 PK | Long | 필수 |
| activities[].type | 활동 유형 | String | 필수 |
| activities[].description | 활동 설명 | String | 필수 |
| activities[].jackAmount | JACK 금액 (satoshi, 음수=지출) | Long | 선택 |
| activities[].potAmount | POT 금액 (satoshi, 음수=지출) | Long | 선택 |
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
        "jackAmount": null,
        "potAmount": -100000000,
        "txId": "a1b2c3d4...",
        "createdAt": "2026-03-17T10:23:44"
      },
      {
        "activityId": 19,
        "type": "EXCHANGE",
        "description": "100 JACK → 1 POT 교환",
        "jackAmount": -10000000000,
        "potAmount": 100000000,
        "txId": "e5f6g7h8...",
        "createdAt": "2026-03-17T09:11:22"
      }
    ]
  }
}
```

---

## 3. 교환 (Exchange)

### 3-1. JACK → POT 교환

> WalletPage의 Exchange 컴포넌트에서 사용 (100 JACK = 1 POT)

```
POST /exchange/jack-to-pot
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 교환 요청 지갑 주소 | String | 필수 | |
| jackAmount | 교환할 JACK 금액 (satoshi) | Long | 필수 | 최소 100 JACK = 10,000,000,000 satoshi |

```json
{
  "fromAddress": "0xAC34EF78B2D1...",
  "jackAmount": 10000000000
}
```

**Response**

응답 코드: 200 / 400 / 401 / 429 / 500 / 503

**Success**

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

> WalletPage의 Exchange 컴포넌트에서 교환 비율 표시에 사용

```
GET /exchange/info
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요

**Response**

응답 코드: 200 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| jackPerPot | JACK → POT 교환 비율 | Integer | 필수 |
| minJackAmount | 최소 교환 JACK (satoshi) | Long | 필수 |

```json
{
  "code": 200,
  "message": "교환 정보 조회가 완료되었습니다.",
  "data": {
    "jackPerPot": 100,
    "minJackAmount": 10000000000
  }
}
```

---

## 4. 로또 (Lotto)

### 4-1. 잭팟 풀 조회

> LottoPage의 JackpotPool 컴포넌트에서 애니메이션 코인 표시에 사용

```
GET /lotto/pool
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요

**Response**

응답 코드: 200 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| balanceJack | 현재 풀 잔액 (JACK satoshi) | Long | 필수 |
| totalEntries | 누적 총 참여 횟수 | Long | 필수 |
| totalWinners | 누적 당첨자 수 | Long | 필수 |
| prizeTiers | 당첨 구조 | Array | 필수 |
| prizeTiers[].matches | 일치 개수 | Integer | 필수 |
| prizeTiers[].rewardJack | 보상 JACK (satoshi, null=풀 비율) | Long | 선택 |
| prizeTiers[].rewardPot | 보상 POT (satoshi) | Long | 선택 |
| prizeTiers[].rewardRatio | 풀 비율 보상 (소수, 6매치 = 0.5) | Double | 선택 |

```json
{
  "code": 200,
  "message": "잭팟 풀 조회가 완료되었습니다.",
  "data": {
    "balanceJack": 450000000000,
    "totalEntries": 1240,
    "totalWinners": 3,
    "prizeTiers": [
      { "matches": 6, "rewardJack": null, "rewardPot": null, "rewardRatio": 0.5 },
      { "matches": 5, "rewardJack": 10000000000000, "rewardPot": null, "rewardRatio": null },
      { "matches": 4, "rewardJack": 2000000000000, "rewardPot": null, "rewardRatio": null },
      { "matches": 3, "rewardJack": 200000000000, "rewardPot": null, "rewardRatio": null },
      { "matches": 2, "rewardJack": 30000000000, "rewardPot": null, "rewardRatio": null },
      { "matches": 1, "rewardJack": null, "rewardPot": 100000000, "rewardRatio": null }
    ]
  }
}
```

---

### 4-2. 로또 참여 (커밋)

> LottoPage의 HexPicker 컴포넌트에서 번호 선택 후 참여 시 사용

```
POST /lotto/commit
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 참여 지갑 주소 | String | 필수 | |
| chosenNumbers | 선택한 6자리 숫자 배열 | Array\<Integer\> | 필수 | 각 값 0~15 (0x0~0xF) |

```json
{
  "fromAddress": "0xAC34EF78B2D1...",
  "chosenNumbers": [10, 1, 15, 3, 4, 14]
}
```

**Response**

응답 코드: 200 / 400 / 401 / 429 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| entryId | 로또 참여 PK | Long | 필수 |
| commitHash | 커밋 트랜잭션 해시 | String | 필수 |
| chosenNumbers | 선택한 숫자 배열 | Array\<Integer\> | 필수 |
| jackpotSnapshot | 참여 시점 풀 잔액 (JACK satoshi) | Long | 필수 |
| commitBlockHeight | 커밋 블록 높이 | Long | 필수 |
| claimableFromHeight | 클레임 가능 시작 블록 높이 (N+18) | Long | 필수 |
| claimableUntilHeight | 클레임 만료 블록 높이 (N+80) | Long | 필수 |
| status | 참여 상태 | String | 필수 |
| createdAt | 참여 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "로또 참여가 완료되었습니다.",
  "data": {
    "entryId": 42,
    "commitHash": "a1b2c3d4e5f6...",
    "chosenNumbers": [10, 1, 15, 3, 4, 14],
    "jackpotSnapshot": 450000000000,
    "commitBlockHeight": 1042,
    "claimableFromHeight": 1060,
    "claimableUntilHeight": 1122,
    "status": "PENDING",
    "createdAt": "2026-03-17T10:23:44"
  }
}
```

---

### 4-3. 로또 결과 미리보기

> LottoPage에서 클레임 전 결과 확인에 사용

```
GET /lotto/entries/{commitHash}/result
```

**Request**
- PathVariable:
  - `commitHash` (커밋 트랜잭션 해시)
- Query Parameter: 없음
- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

**Response**

응답 코드: 200 / 400 / 401 / 404 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| commitHash | 커밋 해시 | String | 필수 |
| chosenNumbers | 선택 숫자 배열 | Array\<Integer\> | 필수 |
| resultNumbers | 결과 숫자 배열 (블록해시 추출) | Array\<Integer\> | 선택 |
| matchCount | 일치 개수 | Integer | 선택 |
| isClaimable | 현재 클레임 가능 여부 | Boolean | 필수 |
| status | 상태 (PENDING/WON/LOST/EXPIRED) | String | 필수 |
| estimatedRewardJack | 예상 JACK 보상 (satoshi) | Long | 선택 |
| estimatedRewardPot | 예상 POT 보상 (satoshi) | Long | 선택 |

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
    "status": "WON",
    "estimatedRewardJack": 2000000000000,
    "estimatedRewardPot": null
  }
}
```

---

### 4-4. 로또 보상 수령 (클레임)

> LottoPage에서 당첨 시 보상 수령에 사용

```
POST /lotto/claim
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

- Request Body:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| fromAddress | 수령 지갑 주소 | String | 필수 | |
| commitHash | 커밋 트랜잭션 해시 | String | 필수 | |

```json
{
  "fromAddress": "0xAC34EF78B2D1...",
  "commitHash": "a1b2c3d4e5f6..."
}
```

**Response**

응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| claimTxId | 클레임 트랜잭션 해시 | String | 필수 |
| matchCount | 일치 개수 | Integer | 필수 |
| rewardJack | 수령한 JACK (satoshi) | Long | 선택 |
| rewardPot | 수령한 POT (satoshi) | Long | 선택 |
| claimedAt | 수령 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "보상 수령이 완료되었습니다.",
  "data": {
    "claimTxId": "z9y8x7w6...",
    "matchCount": 4,
    "rewardJack": 2000000000000,
    "rewardPot": null,
    "claimedAt": "2026-03-17T11:05:00"
  }
}
```

---

### 4-5. 로또 참여 내역 조회

> LottoPage의 참여 내역 목록에서 사용

```
GET /lotto/entries
```

**Request**
- PathVariable: 없음
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 조회 대상 지갑 주소 | String | 필수 | |
| status | 상태 필터 | String | 선택 | ALL(전체), PENDING(추첨중), WON(당첨), LOST(미당첨), EXPIRED(만료) |
| lastEntryId | 마지막 참여 ID (커서) | Long | 선택 | 무한 스크롤용 |
| size | 페이지 당 개수 | Integer | 선택 | 기본값: 10 |

- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

**Response**

응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| hasNext | 다음 페이지 존재 여부 | Boolean | 필수 |
| nextCursor | 다음 커서 ID | Long | 선택 |
| entries | 참여 목록 | Array | 필수 |
| entries[].entryId | 참여 PK | Long | 필수 |
| entries[].commitHash | 커밋 트랜잭션 해시 | String | 필수 |
| entries[].chosenNumbers | 선택 숫자 배열 | Array\<Integer\> | 필수 |
| entries[].jackpotSnapshot | 참여 시 풀 잔액 (JACK satoshi) | Long | 필수 |
| entries[].status | 상태 (PENDING/WON/LOST/EXPIRED) | String | 필수 |
| entries[].matchCount | 일치 개수 | Integer | 선택 |
| entries[].rewardJack | 보상 JACK (satoshi) | Long | 선택 |
| entries[].rewardPot | 보상 POT (satoshi) | Long | 선택 |
| entries[].claimed | 보상 수령 여부 | Boolean | 필수 |
| entries[].isClaimable | 현재 클레임 가능 여부 | Boolean | 필수 |
| entries[].createdAt | 참여 일시 | DateTime | 필수 |

```json
{
  "code": 200,
  "message": "로또 참여 내역 조회가 완료되었습니다.",
  "data": {
    "hasNext": false,
    "nextCursor": null,
    "entries": [
      {
        "entryId": 42,
        "commitHash": "a1b2c3d4...",
        "chosenNumbers": [10, 1, 15, 3, 4, 14],
        "jackpotSnapshot": 450000000000,
        "status": "WON",
        "matchCount": 4,
        "rewardJack": 2000000000000,
        "rewardPot": null,
        "claimed": false,
        "isClaimable": true,
        "createdAt": "2026-03-17T10:23:44"
      },
      {
        "entryId": 38,
        "commitHash": "b5c6d7e8...",
        "chosenNumbers": [0, 7, 3, 11, 2, 5],
        "jackpotSnapshot": 420000000000,
        "status": "LOST",
        "matchCount": 1,
        "rewardJack": null,
        "rewardPot": 100000000,
        "claimed": true,
        "isClaimable": false,
        "createdAt": "2026-03-16T22:10:05"
      }
    ]
  }
}
```

---

## 5. 채굴 (Mining)

### 5-1. 채굴 정보 조회

> MiningPage의 MiningGuide, RewardPolicy 컴포넌트에서 사용

```
GET /mining/info
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요

**Response**

응답 코드: 200 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| currentHeight | 현재 블록 높이 | Long | 필수 |
| difficulty | 현재 난이도 | Long | 필수 |
| networkHashps | 네트워크 해시율 (H/s) | Long | 필수 |
| pooledTxCount | 멤풀 대기 수 | Integer | 필수 |
| blockRewardJack | 블록 채굴 보상 (JACK satoshi) | Long | 필수 |
| blockTimeTarget | 목표 블록 생성 주기 (초) | Integer | 필수 |

```json
{
  "code": 200,
  "message": "채굴 정보 조회가 완료되었습니다.",
  "data": {
    "currentHeight": 1042,
    "difficulty": 65536,
    "networkHashps": 12450,
    "pooledTxCount": 5,
    "blockRewardJack": 5000000000,
    "blockTimeTarget": 30
  }
}
```

---

### 5-2. 채굴 블록 내역 조회 (주소별)

> MiningPage의 MinedBlocks 컴포넌트에서 사용

```
GET /mining/blocks
```

**Request**
- PathVariable: 없음
- Query Parameter:

| 파라미터 | 의미 | 타입 | 필수 여부 | 비고 |
|----------|------|------|:--------:|------|
| address | 채굴자 지갑 주소 | String | 필수 | |
| lastBlockId | 마지막 블록 ID (커서) | Long | 선택 | 무한 스크롤용 |
| size | 페이지 당 개수 | Integer | 선택 | 기본값: 10 |

- BearerToken: 필수

| 파라미터 | 의미 | 타입 |
|----------|------|------|
| Authorization | Bearer {accessToken} | String |

**Response**

응답 코드: 200 / 400 / 401 / 404 / 429 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| hasNext | 다음 페이지 존재 여부 | Boolean | 필수 |
| nextCursor | 다음 커서 ID | Long | 선택 |
| blocks | 채굴 블록 목록 | Array | 필수 |
| blocks[].blockId | 블록 PK | Long | 필수 |
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
    "blocks": [
      {
        "blockId": 1042,
        "height": 1042,
        "hash": "0000a3f...c9b2",
        "rewardJack": 5000000000,
        "txCount": 3,
        "minedAt": "2026-03-17T10:23:44"
      }
    ]
  }
}
```

---

## 6. 네트워크 (Dashboard)

### 6-1. 노드 네트워크 정보 조회

> DashboardPage의 NodeNetwork 컴포넌트에서 사용

```
GET /network/info
```

**Request**
- PathVariable: 없음
- Query Parameter: 없음
- BearerToken: 불필요

**Response**

응답 코드: 200 / 500 / 503

**Success**

| 파라미터 | 의미 | 타입 | 필수 여부 |
|----------|------|------|:--------:|
| connections | 연결 노드 수 | Integer | 필수 |
| version | 노드 버전 | String | 필수 |
| peers | 피어 목록 | Array | 필수 |
| peers[].ip | 피어 IP | String | 필수 |
| peers[].port | 피어 포트 | Integer | 필수 |
| peers[].version | 피어 버전 | String | 선택 |
| peers[].connectedAt | 연결 시각 | DateTime | 선택 |

```json
{
  "code": 200,
  "message": "네트워크 정보 조회가 완료되었습니다.",
  "data": {
    "connections": 3,
    "version": "0.1.0",
    "peers": [
      {
        "ip": "192.168.0.10",
        "port": 8333,
        "version": "0.1.0",
        "connectedAt": "2026-03-17T08:00:00"
      }
    ]
  }
}
```

---

## 7. JackpotChain RPC 갭 분석

### 7-1. 프론트엔드 요구사항 vs RPC 제공 현황

| 기능 | FE 요구사항 | RPC 메서드 | 구현 가능 여부 |
|------|------------|------------|:----------:|
| 블록체인 정보 | height, hash, difficulty | `getblockchaininfo()` | ✅ 가능 |
| 최근 블록 목록 | 최근 N개 블록 | `getblock()` + `getblockhash()` 반복 | ✅ 가능 (N번 호출 필요) |
| 지갑 생성 | 주소 생성 | `getnewaddress(label)` | ⚠️ 부분 가능 (BIP39 니모닉 미지원) |
| JACK 잔액 | JACK balance | `getbalance(address)` | ✅ 가능 |
| POT 잔액 | POT balance | `listunspent(address)` 후 assets 파싱 | ⚠️ 부분 가능 (직접 조회 불가, 파싱 필요) |
| 활동 내역 | 트랜잭션 히스토리 | **RPC 없음** | ❌ **GAP** |
| JACK→POT 교환 | 교환 실행 | `exchangetopot(jack_amount)` | ✅ 가능 |
| POT→JACK 교환 | 역방향 교환 | **RPC 없음 (단방향)** | ❌ **GAP (블록체인 설계상 불가)** |
| 잭팟 풀 조회 | 풀 잔액, 통계 | `getjackpotpool()` | ✅ 가능 |
| 로또 참여 | 번호 선택 후 커밋 | `lottocommit(chosen_numbers)` | ✅ 가능 |
| 로또 결과 미리보기 | 클레임 전 결과 확인 | `lottocheckresult(commit_hash)` | ✅ 가능 |
| 로또 보상 수령 | 클레임 실행 | `lottoclaim(commit_hash)` | ✅ 가능 |
| 로또 참여 내역 | 주소별 커밋 목록 | `listlottocommits(address)` | ⚠️ 부분 가능 (페이지네이션 미지원) |
| 채굴 정보 | 난이도, 해시율 | `getmininginfo()` | ✅ 가능 |
| 채굴 블록 내역 | 주소별 채굴 블록 | **RPC 없음** | ❌ **GAP** |
| 노드 네트워크 | 피어 목록, 연결 수 | `getnetworkinfo()` + `getpeerinfo()` | ✅ 가능 |

---

### 7-2. GAP 상세 분석

#### ❌ GAP 1: 활동 내역 조회 (`GET /wallet/{address}/activities`)

- **문제**: jackpotchain RPC에는 주소별 트랜잭션 히스토리를 반환하는 `listtransactions(address)` 메서드가 **없음**
- **현재 RPC**: `getrawmempool()` (미확인 TX 목록), `listunspent()` (UTXO 목록)만 존재
- **RPC로 구현 가능한가?** ❌ 불가능
  - UTXO 모델 특성상 "이미 소비된 TX"를 주소 기준으로 역추적하려면 모든 블록을 풀스캔해야 함
  - 블록 N개를 `getblock(hash, 2)`로 순회하며 TX를 파싱해야 하나, 블록 수가 많아질수록 비현실적
- **해결 방안**: 별도 인덱서(indexer) 레이어 필요
  - 블록이 추가될 때마다 TX를 파싱하여 `address → tx_history` 테이블에 인덱싱
  - 또는 jackpotchain RPC에 `listtransactions(address, count, skip)` 메서드 추가 필요

#### ❌ GAP 2: POT→JACK 역방향 교환

- **문제**: FE-ssatto의 Exchange 컴포넌트는 JACK↔POT 양방향 교환 UI를 제공하지만, jackpotchain은 **JACK→POT 단방향**만 지원
- **현재 RPC**: `exchangetopot(jack_amount)` 만 존재 (POT→JACK 없음)
- **RPC로 구현 가능한가?** ❌ 블록체인 설계상 불가
  - JACK→POT 교환 시 JACK은 OP_RETURN으로 소각(burn)되므로 역방향 복원 불가
  - POT→JACK 교환 기능 추가 시 새로운 TX 유형(v6 등)과 토큰 발행 메커니즘 설계 필요
- **해결 방안**:
  - FE UI를 단방향으로 수정하거나
  - jackpotchain에 POT→JACK 교환 로직 및 RPC 메서드 신규 추가 필요 (상당한 설계 변경)

#### ❌ GAP 3: 채굴 블록 내역 조회 (주소별)

- **문제**: `getmininginfo()`는 전체 채굴 통계만 반환, 특정 주소가 채굴한 블록 목록 조회 불가
- **RPC로 구현 가능한가?** ❌ 직접 불가
  - 전체 블록을 순회하며 `miner_address` 필드를 비교해야 하므로 현실적으로 비효율
- **해결 방안**: 블록 인덱서에서 `miner_address` 기준 인덱싱 추가, 또는 RPC에 `listminedblocks(address)` 추가

#### ⚠️ GAP 4: POT 잔액 직접 조회 불가

- **문제**: `getbalance(address)`는 JACK만 반환. POT 잔액은 별도 조회 필요
- **RPC로 구현 가능한가?** ⚠️ 우회 가능
  - `listunspent(address)` 응답의 각 UTXO에 포함된 `assets.POT` 값을 합산하면 POT 잔액 계산 가능
  - 단, 응용 레이어(API 서버)에서 집계 로직 구현 필요
- **해결 방안**: `getbalance`를 확장하거나 `getassetbalance(address, asset_name)` RPC 추가 권장

#### ⚠️ GAP 5: 로또 참여 내역 페이지네이션 미지원

- **문제**: `listlottocommits(address)`는 전체 목록을 한 번에 반환, 커서 기반 페이지네이션 미지원
- **RPC로 구현 가능한가?** ⚠️ 부분 가능
  - 전체 목록을 받아 API 서버 레이어에서 커서 기반 슬라이싱으로 해결 가능
  - 다만 참여 수가 매우 많아지면 성능 문제 발생
- **해결 방안**: `listlottocommits(address, count, skip)` 파라미터 추가 권장

#### ⚠️ GAP 6: 지갑 BIP39 니모닉 미지원

- **문제**: FE-ssatto는 12-word BIP39 니모닉으로 지갑을 생성·복원하지만, `getnewaddress(label)`는 니모닉을 반환하지 않음
- **RPC로 구현 가능한가?** ⚠️ 부분 가능
  - jackpotchain의 주소 생성은 ECDSA 키페어 기반이나 니모닉 표준(BIP39/BIP44) 미구현
  - 니모닉은 프론트엔드에서 자체 생성 후 개인키 유도 로직을 직접 구현하거나, 별도 키 관리 서비스 필요
- **해결 방안**: jackpotchain RPC에 `createwalletfrommnemonic(mnemonic)` 메서드 추가 또는 BIP39 라이브러리 통합

---

### 7-3. 요약 - 추가 개발 필요 사항

| 우선순위 | 항목 | 조치 방법 |
|:--------:|------|----------|
| 🔴 High | 활동 내역 인덱서 | 블록 파싱 인덱서 구현 또는 RPC `listtransactions` 추가 |
| 🔴 High | 채굴 블록 인덱서 | 블록 파싱 인덱서에 miner_address 인덱싱 추가 또는 RPC `listminedblocks` 추가 |
| 🟡 Medium | POT 잔액 집계 | API 서버에서 `listunspent` 결과 집계 또는 RPC `getassetbalance` 추가 |
| 🟡 Medium | 로또 내역 페이지네이션 | API 서버 레이어 슬라이싱 또는 RPC 파라미터 추가 |
| 🟠 Low | POT→JACK 역교환 | FE UI 단방향으로 수정하거나 신규 TX 유형 설계 (큰 설계 변경) |
| 🟠 Low | BIP39 니모닉 지원 | FE 자체 니모닉 생성 또는 RPC BIP39 통합 |
