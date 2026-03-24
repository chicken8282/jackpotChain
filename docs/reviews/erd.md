# ERD (Entity Relationship Diagram)

> JackpotChain 블록체인 기반 로또 시스템의 MVP 데이터 모델
> api.md(확정 API 명세) + blockchain.md(선택된 방안) 기반 재작성
> 블록 보상 100 JACK / 채굴자 100% / 로또 참여비 Pool 80% · 소각 19% · 채굴자 1%

---

## 설계 원칙

1. **JackpotChain은 UTXO 모델 기반 블록체인으로, on-chain 데이터가 primary source입니다.**
   본 ERD는 FE가 빠르게 조회할 수 있도록 블록체인 데이터를 **Webhook 방식으로 인덱싱/캐싱**하는 레이어를 기준으로 설계합니다.
2. **지갑 잔액은 DB에 저장하지 않습니다.** 잔액은 매번 RPC(`getbalance`, `listunspent`)를 호출하여 on-chain 기준으로 제공합니다.
3. **확장성을 고려하되, 현재 화면 구성에 당장 불필요한 컬럼은 제거합니다.**
4. private key, 니모닉은 DB에 저장하지 않습니다. 클라이언트 IndexedDB에만 보관합니다.

---

## 테이블 목록

| 테이블명 | 역할 |
|---------|------|
| `wallet` | 지갑 주소, 닉네임, 테마 등 UI 메타데이터 |
| `auth_challenge` | 인증용 nonce 챌린지 저장소 (Redis TTL, DB 테이블 아님) |
| `auth_refresh_session` | refresh 세션 해시 저장소 |
| `block` | 채굴된 블록 인덱싱 (Webhook 기반) |
| `transaction` | 블록체인 TX 인덱싱 (version별 분류) |
| `wallet_activity` | 지갑별 활동 내역 (GAP 1 해결: Webhook + DB 저장) |
| `lotto_entry` | 로또 참여 기록 (선택번호, 결과, 상태, 보상) |
| `jackpot_pool` | 잭팟 풀 잔액 캐싱 (빠른 조회용) |
| `lotto_ranking` | 역대 Top 3 당첨자 랭킹 (read/write 분리 최적화) |

---

## 비관계 저장소

### auth_challenge (Redis TTL)

> `POST /auth/challenge`, `POST /auth/verify` 에서 사용하는 인증용 임시 저장소다.
> DB 테이블이 아니라 Redis key-value TTL 저장소이며, 챌린지는 만료 또는 사용 완료 후 제거된다.

| 필드명 | 의미 | 타입 |
|--------|------|------|
| challenge_id | 챌린지 식별자 | String |
| address | 로그인 대상 지갑 주소 | String |
| nonce | 서명용 난수 | String |
| message | canonical 로그인 메시지 | String |
| expires_at | 챌린지 만료 시각 | LocalDateTime |
| used | 사용 여부 | Boolean |

> Redis key 예시: `auth:challenge:{challengeId}`

> private key, refresh token 원문은 여전히 서버 DB에 저장하지 않는다.

### auth_refresh_session

> `POST /auth/verify`, `POST /auth/refresh`, `POST /auth/logout` 에서 사용하는 wallet-scoped refresh 세션 저장소다.
> raw refresh token은 저장하지 않고 SHA-256 hash만 저장한다.

| 필드명 | 의미 | 타입 |
|--------|------|------|
| id | PK | Long |
| session_handle | FE가 지갑 메타데이터에 보관하는 세션 핸들 | String |
| wallet_address | 인증된 지갑 주소 | String |
| refresh_token_hash | refresh token SHA-256 hash | String |
| expires_at | 세션 만료 시각 | LocalDateTime |
| created_at | 세션 생성 시각 | LocalDateTime |
| revoked_at | 세션 폐기 시각 | LocalDateTime |

Rules:

- one session row per wallet session handle
- refresh rotation updates only `refresh_token_hash` and `expires_at`
- logout sets `revoked_at`
- private key and raw refresh token are never stored in DB

---

## 1. wallet (지갑)

> 사용자의 지갑 주소, 닉네임, 테마 색상 등 UI 메타데이터 관리.
> 실제 JACK/POT 잔액은 on-chain UTXO에서 RPC로 조회 (DB 미저장).
> 다중 지갑 지원: 한 사용자가 여러 지갑을 등록할 수 있음.
>
> **연관 API**: `POST /wallet` (2-1), `GET /wallet?addresses=...` (2-2)

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| address | 지갑 주소 (블록체인 주소) | String(64) | UQ | Y | - |
| nickname | 지갑 닉네임 | String(50) | | N | NULL |
| wallet_color | 지갑 테마 색상 ID | String(20) | | N | `'DEFAULT'` |
| created_at | 지갑 등록 일시 | LocalDateTime | | Y | NOW() |

**인덱스**
- `UNIQUE (address)` — 동일 주소 중복 등록 방지

---

## 2. block (블록)

> 채굴된 블록 정보 인덱싱. Webhook으로 블록 수신 시 저장.
> DashboardPage BlockHeight·BlockchainVisualizer, MiningPage MinedBlocks에서 사용.
> 블록 상세 모달(BlockDetailModal)의 모든 필드를 제공합니다.
>
> **연관 API**: `GET /blockchain/dashboard` (1-1), `GET /blockchain/blocks/{height}` (1-2), `GET /mining/blocks` (5-1)

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| height | 블록 높이 (체인 내 순서) | Long | UQ | Y | - |
| hash | 블록 해시 (64자리 hex) | String(64) | UQ | Y | - |
| prev_hash | 이전 블록 해시 | String(64) | | Y | - |
| version | 블록 버전 (hex, 예: 0x20000000) | String(16) | | Y | - |
| mined_at | 블록 채굴 일시 (timestamp 변환) | LocalDateTime | IDX | Y | - |
| mining_elapsed | 채굴 소요 시간 (초) — 이전 블록 timestamp 차이 계산 | Integer | | N | NULL |
| difficulty | 채굴 난이도 (human-readable, 예: "7.42T") | String(20) | | Y | - |
| nonce | 논스 값 | Long | | Y | - |
| miner_address | 채굴자 지갑 주소 (coinbase TX output[0]) | String(64) | IDX | N | NULL |
| reward_jack | 기본 채굴 보상 (JACK satoshi, 100 JACK = 10,000,000,000) | Long | | Y | `10000000000` |
| fee_reward_jack | 수수료 보상 (JACK satoshi) | Long | | Y | `0` |
| tx_count | 블록 내 포함 트랜잭션 수 | Integer | | Y | `0` |
| is_main_chain | 메인체인 여부 | Boolean | | Y | `true` |

> ⚠️ **merkle_root 제거**: 블록 해시 검증은 on-chain RPC로 수행하며, 인덱싱 레이어에서 merkle_root를 별도 저장·활용하는 시나리오가 없으므로 제거합니다.

**인덱스**
- `UNIQUE (hash)` — 블록 해시 유니크
- `UNIQUE (height)` — 블록 높이 유니크 (메인체인 기준)
- `INDEX (miner_address)` — 채굴자별 블록 조회 (api.md GAP 3 해결)
- `INDEX (mined_at DESC)` — 최근 블록 조회 (`GET /blockchain/dashboard` blocks[] 정렬)

> **minerName 제공 방식**: `GET /blockchain/blocks/{height}` 응답의 `minerName` 필드는 `miner_address`로 `wallet.address`를 lookup하여 `wallet.nickname`을 반환. 없으면 `"Node-{id}"` 자동 생성.

---

## 3. transaction (트랜잭션)

> 블록체인 TX 인덱싱. 블록 내 모든 TX를 version별로 파싱하여 저장.
>
> **연관 API**: Webhook 블록 인덱싱 시 자동 저장. `wallet_activity.tx_id`, `lotto_entry.commit_hash`의 참조 원천.

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| tx_id | 트랜잭션 해시 (64자리 hex) | String(64) | UQ | Y | - |
| block_id | 포함된 블록 ID | Long | FK | Y | - |
| tx_version | TX 유형 (1/2/3/5) | Integer | IDX | Y | `1` |
| from_address | 송신자 지갑 주소 | String(64) | IDX | N | NULL |
| to_address | 수신자 지갑 주소 | String(64) | IDX | N | NULL |
| jack_amount | JACK 이동 금액 (satoshi) | Long | | Y | `0` |
| pot_amount | POT 이동 금액 (satoshi) | Long | | Y | `0` |
| created_at | TX 생성 일시 (블록 타임스탬프 기준) | LocalDateTime | | Y | - |

**FK**
- `block_id` → `block.id` (ON DELETE CASCADE)

**tx_version 의미**

| 값 | 유형 | 설명 | 연관 API |
|----|------|------|---------|
| `1` | 일반 전송 (TRANSFER) | 지갑 간 JACK 전송. 표준 P2PKH 트랜잭션 | - |
| `2` | 교환 (EXCHANGE) | JACK → POT 단방향 교환 (100 JACK = 1 POT 고정). `OP_EXCHANGE` 스크립트 포함 | `POST /exchange/jack-to-pot` (3-1) |
| `3` | 로또 커밋 (LOTTO_COMMIT) | 1 POT를 지출하고 선택 번호를 OP_RETURN에 기록. 참여 블록 높이(N) 확정 후 N+18 블록에서 결과 산출 | `POST /lotto/commit` (4-2) |
| `5` | 로또 클레임 (LOTTO_CLAIM) | 당첨 보상 수령. commit_hash를 참조하여 검증 후 JACK/POT 지급. N+18 ~ N+68 블록 내에서만 유효 | `POST /lotto/claim` (4-4) |

> version=4는 예약(미사용)입니다.

**인덱스**
- `UNIQUE (tx_id)` — TX 해시 유니크
- `INDEX (block_id)` — 블록별 TX 조회
- `INDEX (from_address)` — 송신자별 조회
- `INDEX (to_address)` — 수신자별 조회

---

## 4. wallet_activity (지갑 활동 내역)

> api.md GAP 1 해결: 지갑별 활동 내역을 Webhook 블록 인덱싱 시 저장.
> wallet 1:N wallet_activity 관계.
> WalletPage ActivityList 컴포넌트에서 사용.
>
> **연관 API**: `GET /wallet/{address}/activities` (2-3)
>
> **저장 시점**:
> - 블록 관련 이벤트 (교환, 로또참여, 로또클레임, 채굴): Webhook 블록 수신 시 TX 파싱 후 저장
> - 지갑 생성/등록: `POST /wallet` 호출 시 즉시 저장

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| wallet_address | 지갑 주소 (wallet.address 참조) | String(64) | FK/IDX | Y | - |
| type | 활동 유형 | String(20) | | Y | - |
| description | 활동 설명 문자열 | String(200) | | Y | - |
| jack_amount | JACK 증감 (satoshi, 음수=지출) | Long | | N | NULL |
| pot_amount | POT 증감 (satoshi, 음수=지출) | Long | | N | NULL |
| tx_id | 연관 트랜잭션 해시 (transaction.tx_id 참조) | String(64) | FK/IDX | N | NULL |
| created_at | 활동 발생 일시 | LocalDateTime | | Y | NOW() |

**FK**
- `wallet_address` → `wallet.address`
- `tx_id` → `transaction.tx_id` (nullable, 지갑 생성 이벤트는 TX 없음)

> **tx_id 필요 이유**: api.md 2-3 응답에 `txId` 필드가 명시되어 있으며, FE에서 활동 항목 클릭 시 해당 on-chain TX를 블록 탐색기(BlockDetailModal)와 연결하는 딥링크 역할을 합니다. `WALLET_CREATED` 타입은 TX가 없으므로 `NULL` 허용이며, 나머지 블록 기반 이벤트(`EXCHANGE`, `LOTTO_COMMIT`, `LOTTO_CLAIM`, `MINING`, `TRANSFER`)는 반드시 tx_id가 존재합니다.

**활동 유형 (type)**

| 값 | 설명 | tx_id | 저장 시점 |
|----|------|:-----:|----------|
| `WALLET_CREATED` | 지갑 생성/등록 | NULL | `POST /wallet` 즉시 |
| `EXCHANGE` | JACK → POT 교환 (version=2 TX) | 필수 | Webhook 블록 인덱싱 |
| `LOTTO_COMMIT` | 로또 참여 (1 POT 지출, version=3 TX) | 필수 | Webhook 블록 인덱싱 |
| `LOTTO_CLAIM` | 로또 보상 수령 (version=5 TX) | 필수 | Webhook 블록 인덱싱 |
| `MINING` | 채굴 보상 수령 (coinbase TX) | 필수 | Webhook 블록 인덱싱 |
| `TRANSFER` | 일반 전송 (version=1 TX) | 필수 | Webhook 블록 인덱싱 |

**인덱스**
- `INDEX (wallet_address, created_at DESC)` — 지갑별 최신 활동 조회 (커서 페이지네이션)
- `INDEX (tx_id)` — TX 기준 활동 조회

---

## 5. lotto_entry (로또 참여)

> 사용자별 로또 참여 기록.
> LottoPage 참여 내역 탭 및 HistoryModal에서 사용.
>
> **연관 API**: `GET /lotto/entries` (4-5), `GET /lotto/entries/{commitHash}/result` (4-3), `POST /lotto/claim` (4-4)
>
> **status 값은 api.md 응답 규격과 일치** (`DRAWING` / `WINNING` / `LOSING` / `EXPIRED`)

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| commit_hash | 커밋 TX 해시 (transaction.tx_id 참조) | String(64) | FK/UQ | Y | - |
| wallet_address | 참여자 지갑 주소 (wallet.address 참조) | String(64) | FK/IDX | Y | - |
| chosen_numbers | 선택한 6자리 숫자 배열 (JSON, 0~15) | String(50) | | Y | - |
| jackpot_snapshot | 참여 시점 잭팟 풀 잔액 (JACK satoshi) | Long | | Y | - |
| commit_block_height | 커밋이 포함된 블록 높이 (N) | Long | IDX | Y | - |
| result_numbers | 결과 6자리 숫자 배열 (JSON, null=미확정) | String(50) | | N | NULL |
| match_count | 일치한 숫자 개수 (0~6) | Integer | | N | NULL |
| status | 참여 상태 | String(10) | IDX | Y | `'DRAWING'` |
| reward_jack | 당첨 보상 JACK (satoshi, 1매치는 null — on-chain POT 지급) | Long | | N | NULL |
| claim_tx_id | 보상 수령 TX 해시 (transaction.tx_id 참조) | String(64) | FK | N | NULL |
| claimable_from_height | 클레임 가능 시작 블록 높이 (commit_block_height + 18) | Long | | Y | - |
| claimable_until_height | 클레임 만료 블록 높이 (commit_block_height + 68) | Long | | Y | - |
| created_at | 참여 일시 | LocalDateTime | | Y | NOW() |
| claimed_at | 보상 수령 일시 | LocalDateTime | | N | NULL |

**FK**
- `commit_hash` → `transaction.tx_id`
- `wallet_address` → `wallet.address`
- `claim_tx_id` → `transaction.tx_id` (nullable)

> ⚠️ **result_block_hashes 제거 주의사항**: → [하단 크리티컬 사항](#크리티컬-사항-정리) 참고
>
> **1매치 보상**: `reward_pot` 컬럼은 제거되었습니다. `match_count == 1`이면 BE가 on-chain으로 1 POT(= 100,000,000 satoshi)을 직접 지급하며, `reward_jack`은 NULL로 저장합니다.

**status 값** (api.md 4-3, 4-5 기준)

| 값 | 설명 | 전이 조건 |
|----|------|----------|
| `DRAWING` | 결과 블록 미확정 (commit_block_height + 18 미만) | 초기값 |
| `WINNING` | 1개 이상 일치 (보상 존재) | Webhook으로 비교 블록 6개 확인 후 |
| `LOSING` | 0개 일치 (보상 없음) | Webhook으로 비교 블록 6개 확인 후 |
| `EXPIRED` | 클레임 기한 만료 (commit_block_height + 68 초과) | 스케줄러 또는 Webhook 트리거 |

> **isClaimable 계산 방식** (api.md 4-5): DB 컬럼으로 저장하지 않고 API 응답 시점에 계산.
> `isClaimable = (status == 'WINNING') AND (claimed_at IS NULL) AND (현재 높이 >= claimableFromHeight) AND (현재 높이 <= claimableUntilHeight)`

**인덱스**
- `UNIQUE (commit_hash)` — 커밋 해시 유니크
- `INDEX (wallet_address, created_at DESC)` — 지갑별 참여 내역 조회 (`GET /lotto/entries`)
- `INDEX (status, claimable_from_height)` — 상태별 클레임 처리 스케줄러
- `INDEX (commit_block_height)` — 블록 높이 기준 결과 업데이트 (Webhook)

---

## 6. jackpot_pool (잭팟 풀)

> 잭팟 풀의 현재 잔액과 참여 통계 캐싱. LottoPage JackpotPool 컴포넌트에서 사용.
> 실잔액은 on-chain이지만 빠른 조회를 위해 캐싱. Webhook 블록 수신 시 갱신.
>
> **연관 API**: `GET /lotto?address={address}` (4-1) — `poolBalanceJack`, `totalEntries`, `totalWinners`
>
> **로또 참여비 분배**: 1 POT → Pool 80% / 소각 19% / 채굴자 1%

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| balance_jack | 현재 잭팟 풀 잔액 (JACK satoshi) | Long | | Y | `0` |
| total_entries | 누적 총 참여 횟수 | Long | | Y | `0` |
| total_winners | 누적 당첨자 수 | Long | | Y | `0` |
| last_synced_height | 마지막 동기화 블록 높이 | Long | | Y | `0` |
| updated_at | 마지막 갱신 일시 | LocalDateTime | | Y | NOW() |

> **last_synced_height 필요 이유**: Webhook은 네트워크 지연·재전송으로 인해 동일 블록이 중복 수신되거나, 블록이 역순으로 도착할 수 있습니다. `last_synced_height`를 통해 ① **중복 처리 방지** (수신 블록 높이 ≤ last_synced_height이면 무시), ② **순서 보장** (높이가 연속되지 않으면 누락 감지 후 보완 처리), ③ **장애 복구 시 재동기화 시작 지점** 역할을 수행합니다.

> **운영 방식**: 단일 레코드(`id=1`)로 현재 상태를 관리. Webhook 수신마다 UPDATE.

---

## 7. lotto_ranking (로또 당첨 Top 3 랭킹)

> 역대 최고 보상 수령자 Top 3 랭킹 캐싱.
> LottoPage `prizeTiers[]` 응답에 사용 (api.md 4-1).
>
> **연관 API**: `GET /lotto?address={address}` (4-1) — `prizeTiers[]`
>
> **새 테이블 추가 이유**: read/write가 모두 많은 환경에서 `jackpot_pool` 단일 레코드에 JSON으로 관리하면
> ① 매 클레임 시 전체 row LOCK이 발생하고 ② JSON 파싱 오버헤드가 있으며 ③ 인덱스 활용 불가.
> 별도 테이블로 분리하면 row-level 독립 write + `rank` 인덱스 read 최적화가 모두 가능합니다.
> 최대 3개 레코드만 유지하며, 신규 당첨자 발생 시 UPSERT로 갱신합니다.

| 컬럼명 | 컬럼의미 | 타입 | KEY | NotNull | Default |
|--------|----------|------|:---:|:-------:|---------|
| id | PK | Long | PK | Y | AUTO_INCREMENT |
| rank | 순위 (1~3) | Integer | UQ | Y | - |
| wallet_address | 당첨자 지갑 주소 (wallet.address 참조) | String(64) | FK | Y | - |
| commit_hash | 당첨 커밋 TX 해시 (lotto_entry.commit_hash 참조) | String(64) | FK/UQ | Y | - |
| match_count | 일치 개수 (1~6) | Integer | | Y | - |
| reward_jack | 수령한 JACK 보상 (satoshi) | Long | | Y | - |
| claimed_at | 보상 수령 일시 | LocalDateTime | | Y | - |
| updated_at | 랭킹 갱신 일시 | LocalDateTime | | Y | NOW() |

**FK**
- `wallet_address` → `wallet.address`
- `commit_hash` → `lotto_entry.commit_hash`

**갱신 전략**: 신규 당첨자의 `reward_jack`이 현재 3위보다 크면 UPSERT → rank 재정렬 (최대 3 row).

**인덱스**
- `UNIQUE (rank)` — 순위 중복 방지, 조회 최적화
- `UNIQUE (commit_hash)` — 동일 당첨 TX 중복 진입 방지
- `INDEX (reward_jack DESC)` — 보상 기준 정렬 조회

---

## 테이블 간 관계

```
wallet ──────────────< wallet_activity   : 1:N (한 지갑 → 여러 활동 내역)
wallet ──────────────< lotto_entry       : 1:N (한 지갑 → 여러 로또 참여)
wallet ──────────────< lotto_ranking     : 1:N (한 지갑 → 여러 랭킹 진입 가능)
block  ──────────────< transaction       : 1:N (한 블록 → 여러 TX)
block  ──────────────< lotto_entry       : 1:N (commit_block_height 기준)
transaction >─────────── lotto_entry     : 1:1 (commit_hash / claim_tx_id)
transaction >─────────── wallet_activity : 1:1 (tx_id)
lotto_entry >─────────── lotto_ranking   : 1:1 (commit_hash)
jackpot_pool : 단독 테이블 (단일 레코드, 집계 캐시)
```

### 관계 상세

| 관계 | 설명 |
|------|------|
| `wallet` 1 : N `wallet_activity` | 지갑별 모든 활동 이벤트 (교환, 로또, 채굴, 생성) |
| `wallet` 1 : N `lotto_entry` | 한 지갑이 여러 번 로또 참여 가능 |
| `wallet` 1 : N `lotto_ranking` | 동일 지갑이 여러 순위에 오를 수 있음 (기간 제한 없음) |
| `block` 1 : N `transaction` | 블록에 여러 TX 포함 |
| `block` 1 : N `lotto_entry` | 로또 커밋은 특정 블록 높이에 귀속 (결과 산출도 N+3~N+18 블록 사용) |
| `transaction` 1 : 1 `lotto_entry` | 로또 커밋/클레임 TX와 lotto_entry 1:1 연결 |
| `transaction` 1 : 1 `wallet_activity` | TX 기반 활동(교환/로또/채굴)은 transaction과 연결 |
| `wallet` 1 : N `block` | 채굴자 지갑 주소(`miner_address`) 기준 채굴 블록 조회 |
| `lotto_entry` 1 : 1 `lotto_ranking` | 당첨 Top 3 진입 시 랭킹 레코드와 연결 |

---

## API ↔ 테이블 매핑

| API | 주요 사용 테이블 | 비고 |
|-----|----------------|------|
| `GET /blockchain/dashboard` (1-1) | `block` | 최근 N개 블록 + RPC로 노드 정보 |
| `GET /blockchain/blocks/{height}` (1-2) | `block`, `wallet` | minerName = wallet.nickname lookup |
| `POST /wallet` (2-1) | `wallet`, `wallet_activity` | 등록 + WALLET_CREATED activity |
| `GET /wallet?addresses=...` (2-2) | `wallet` + RPC | 잔액은 RPC로 실시간 조회 |
| `GET /wallet/{address}/activities` (2-3) | `wallet_activity` | 커서 페이지네이션 |
| `POST /exchange/jack-to-pot` (3-1) | — | RPC sendrawtransaction → Webhook 후 DB 저장 |
| `GET /exchange/info` (3-2) | — | RPC listunspent로 잔액 조회 |
| `GET /lotto` (4-1) | `jackpot_pool`, `lotto_ranking` + RPC | 잔액 RPC, 통계 DB, 랭킹 DB |
| `POST /lotto/commit` (4-2) | — | RPC sendrawtransaction → Webhook 후 lotto_entry INSERT |
| `GET /lotto/entries/{commitHash}/result` (4-3) | `lotto_entry` | isClaimable 계산 후 반환 |
| `POST /lotto/claim` (4-4) | `lotto_entry`, `lotto_ranking` | claim_tx_id·claimed_at UPDATE + 랭킹 UPSERT |
| `GET /lotto/entries` (4-5) | `lotto_entry` | 전체 목록 반환 (페이지네이션 없음) |
| `GET /mining/blocks` (5-1) | `block` | miner_address 필터 + 커서 페이지네이션 |

---

## 수수료 구조 참고 (blockchain.md §12 확정)

| 항목 | 확정 값 |
|------|--------|
| 블록 채굴 보상 | **100 JACK** (= 10,000,000,000 satoshi) |
| 블록 보상 수령자 | **채굴자 100%** |
| 로또 참여비 분배 | **Pool 80% / 소각 19% / 채굴자 1%** |

## 당첨 구조 참고 (api.md 4-1 prizeTiers)

| 일치 개수 | 보상 | lotto_entry 컬럼 |
|-----------|------|-----------------|
| 6개 일치 | 잭팟 풀의 **50%** | `reward_jack` = pool_balance × 0.5 |
| 5개 일치 | **100,000 JACK** (= 10,000,000,000,000 satoshi) | `reward_jack` |
| 4개 일치 | **20,000 JACK** (= 2,000,000,000,000 satoshi) | `reward_jack` |
| 3개 일치 | **2,000 JACK** (= 200,000,000,000 satoshi) | `reward_jack` |
| 2개 일치 | **300 JACK** (= 30,000,000,000 satoshi) | `reward_jack` |
| 1개 일치 | **1 POT 환불** (= 100,000,000 satoshi) | `reward_jack` = NULL, BE에서 on-chain POT 직접 지급. `match_count`로 구분 |
| 0개 일치 | 없음 | NULL |

> 참여 비용: **1 POT** (= 100 JACK 교환 기준, = 100,000,000 satoshi)
> 분배: Pool 80% → 잭팟 풀, 19% → 소각(OP_RETURN), 1% → 해당 블록 채굴자

---

## 크리티컬 사항 정리

> 요청사항 중 API 명세 또는 결과 산출 로직에 직접 영향을 주는 항목입니다.
> 팀 내 확인 후 최종 결정이 필요합니다.

### ① result_block_hashes 제거

| 항목 | 내용 |
|------|------|
| **제거 요청** | `lotto_entry.result_block_hashes` (결과 산출에 사용된 6개 블록 해시, API 미노출) |
| **영향** | 로또 결과 숫자(`result_numbers`)는 commit 블록 N 이후 N+3~N+18 특정 블록들의 해시를 조합하여 산출. 해당 필드를 제거하면 **결과 재계산 시 매번 RPC로 블록 해시를 re-fetch** 해야 함. |
| **권고** | `result_numbers`가 이미 확정되어 저장된 이후에는 `result_block_hashes`가 불필요하므로 제거 가능. 단, **결과 산출 Webhook 처리 중 실패·재시도 시나리오**에서 중간 상태 저장용으로 일시적으로 필요할 수 있음. 제거 후에는 결과 재산출 로직이 항상 on-chain RPC 기반이어야 함을 팀에서 합의 필요. |

### ② reward_pot 제거 — **확정 반영 완료**

- `lotto_entry.reward_pot` 컬럼 **제거 완료**
- api.md **4-3**, **4-4** 응답에서 `rewardPot` 필드 **제거 완료**
- `match_count == 1`이면 BE가 on-chain으로 1 POT(= 100,000,000 satoshi)을 직접 지급하고, `match_count`로 클라이언트가 구분합니다.
