# ERD — JackpotChain 데이터 모델

> 최종 업데이트: 2026-03-23
> 기준: 로컬 QA 전 항목 PASS (2026-03-22), Flyway 마이그레이션 반영

---

## 설계 원칙

1. **JackpotChain은 UTXO 모델 기반 블록체인이며, on-chain 데이터가 primary source.**
   본 ERD는 FE가 빠르게 조회할 수 있도록 블록체인 데이터를 **Webhook 방식으로 인덱싱**하는 레이어 기준.
2. **지갑 잔액은 DB 저장 없음.** 잔액은 RPC(`getbalance`, `listunspent`)로 on-chain 기준 조회.
3. **private key, 니모닉, raw refresh token은 DB 저장 금지.** 클라이언트 IndexedDB에만 보관.

---

## 테이블 목록

| 테이블명 | 역할 |
|---------|------|
| `wallet` | 지갑 주소, 닉네임, 테마 등 UI 메타데이터 |
| `auth_refresh_session` | refresh 세션 해시 저장소 |
| `block` | 채굴된 블록 인덱싱 (Webhook 기반) |
| `transaction` | 블록체인 TX 인덱싱 (version별 분류) |
| `wallet_activity` | 지갑별 활동 내역 |
| `lotto_entry` | 로또 참여 기록 |
| `jackpot_pool` | 잭팟 풀 잔액 캐싱 |
| `lotto_ranking` | 역대 Top 3 당첨자 랭킹 |

**비관계 저장소 (Redis TTL)**
- `auth_challenge`: 인증용 nonce 챌린지 (`auth:challenge:{challengeId}`)

---

## Redis — auth_challenge

> `POST /auth/challenge`, `POST /auth/verify` 에서 사용. 5분 TTL, 단일 사용.

| 필드 | 타입 | 설명 |
|------|------|------|
| challenge_id | String | 챌린지 식별자 |
| address | String | 로그인 대상 지갑 주소 |
| nonce | String | 서명용 난수 |
| message | String | canonical 로그인 메시지 |
| expires_at | LocalDateTime | 챌린지 만료 시각 |
| used | Boolean | 사용 여부 (단일 사용 보장) |

---

## 1. wallet

> 지갑 주소, 닉네임, 테마 등 UI 메타데이터. 잔액은 RPC 조회.

| 컬럼 | 타입 | KEY | NotNull | Default | 설명 |
|------|------|:---:|:-------:|---------|------|
| id | Long | PK | Y | AUTO | PK |
| address | String(64) | UQ | Y | - | 블록체인 주소 |
| nickname | String(50) | | N | NULL | 지갑 닉네임 |
| wallet_color | String(20) | | N | `'DEFAULT'` | 테마 색상 ID |
| created_at | LocalDateTime | | Y | NOW() | 등록 일시 |

인덱스: `UNIQUE (address)`

---

## 2. auth_refresh_session

> refresh 세션 저장. raw token 저장 없이 SHA-256 hash만 보관.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| session_handle | String | UQ | Y | FE 지갑 메타데이터에 보관하는 핸들 |
| wallet_address | String(64) | IDX | Y | 인증된 지갑 주소 |
| refresh_token_hash | String | | Y | refresh token SHA-256 hash |
| expires_at | LocalDateTime | | Y | 세션 만료 시각 |
| created_at | LocalDateTime | | Y | 세션 생성 시각 |
| revoked_at | LocalDateTime | | N | 세션 폐기 시각 (logout 시 set) |

규칙:
- refresh rotation: `refresh_token_hash` + `expires_at`만 갱신 (새 row 생성 아님)
- logout: `revoked_at` set

---

## 3. block

> 채굴된 블록 인덱싱. Webhook으로 블록 수신 시 저장. Dashboard, Mining 페이지에서 사용.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| height | Long | UQ | Y | 블록 높이 |
| hash | String(64) | UQ | Y | 블록 해시 |
| prev_hash | String(64) | | Y | 이전 블록 해시 |
| version | String(16) | | Y | 블록 버전 (hex) |
| mined_at | LocalDateTime | IDX | Y | 채굴 일시 |
| mining_elapsed | Integer | | N | 채굴 소요 시간 (초) |
| difficulty | String(20) | | Y | 난이도 (human-readable, 예: "7.42T") |
| nonce | Long | | Y | 논스 값 |
| miner_address | String(64) | IDX | N | 채굴자 지갑 주소 (coinbase output[0]) |
| reward_jack | Long | | Y | 기본 채굴 보상 (satoshi) |
| fee_reward_jack | Long | | Y | 수수료 보상 (satoshi) |
| tx_count | Integer | | Y | 포함된 트랜잭션 수 |
| is_main_chain | Boolean | IDX | Y | 메인체인 여부 |
| created_at | LocalDateTime | | Y | 인덱싱 일시 |

인덱스: `UNIQUE (height)`, `UNIQUE (hash)`, `IDX (mined_at)`, `IDX (miner_address)`, `IDX (is_main_chain)`

---

## 4. transaction

> 블록체인 TX 인덱싱. version별로 분류.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| tx_id | String(64) | UQ | Y | TX 해시 |
| block_height | Long | IDX | Y | 포함된 블록 높이 |
| version | Integer | IDX | Y | TX 버전 (1/2/3/5) |
| sender_address | String(64) | IDX | N | 발신자 주소 |
| receiver_address | String(64) | IDX | N | 수신자 주소 |
| amount_jack | Long | | N | JACK satoshi 금액 |
| amount_pot | Long | | N | POT satoshi 금액 |
| fee_jack | Long | | N | 수수료 (JACK satoshi) |
| confirmed_at | LocalDateTime | | N | 확인 일시 |
| created_at | LocalDateTime | | Y | 인덱싱 일시 |

TX 버전: 1=일반전송, 2=JACK→POT교환, 3=로또커밋, 5=로또클레임

---

## 5. wallet_activity

> 지갑별 활동 내역. Webhook 블록 인덱싱 시 저장. 커서 기반 페이지네이션.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK (커서) |
| wallet_address | String(64) | IDX | Y | 지갑 주소 |
| type | String(20) | IDX | Y | 활동 유형 (아래 목록) |
| tx_id | String(64) | IDX | N | 연관 TX 해시 |
| amount_jack | Long | | N | JACK 금액 |
| amount_pot | Long | | N | POT 금액 |
| block_height | Long | | N | 발생 블록 높이 |
| created_at | LocalDateTime | IDX | Y | 발생 일시 |

활동 유형 (type):

| type | 설명 |
|------|------|
| `WALLET_CREATED` | 지갑 생성 |
| `EXCHANGE` | JACK↔POT 교환 |
| `LOTTO_COMMIT` | 로또 참여 |
| `LOTTO_CLAIM` | 로또 보상 수령 |
| `MINING` | 채굴 보상 |
| `TRANSFER` | 일반 전송 |

---

## 6. lotto_entry

> 로또 참여 기록. commit-reveal 결과, claim 상태 관리.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| wallet_address | String(64) | IDX | Y | 참여 지갑 주소 |
| commit_hash | String(64) | UQ | Y | commit TX 해시 |
| commit_block_height | Long | IDX | Y | commit 블록 높이 (N) |
| commit_numbers | String | | Y | 선택 번호 (JSON) |
| result_numbers | String | | N | 결과 번호 (N+18 블록 결정 후) |
| match_count | Integer | | N | 일치 번호 수 |
| status | String(20) | IDX | Y | 상태 (아래 목록) |
| reward_jack | Long | | N | JACK 보상 (satoshi) |
| reward_pot | Long | | N | POT 보상 (satoshi, 환불 시) |
| is_claimable | Boolean | IDX | N | claim 가능 여부 (N+18 도달 후) |
| claimed | Boolean | | Y | claim 완료 여부 |
| claim_tx_id | String(64) | | N | claim TX 해시 |
| result_determined_at | LocalDateTime | | N | 결과 확정 일시 |
| created_at | LocalDateTime | | Y | 참여 일시 |

상태 (status):

| status | 설명 |
|--------|------|
| `DRAWING` | 결과 대기 중 (N+18 미도달) |
| `WINNING` | 당첨 (claim 전) |
| `LOSING` | 낙첨 |
| `EXPIRED` | claim 기간 만료 (N+68 초과) |

---

## 7. jackpot_pool

> 잭팟 풀 잔액 캐싱. 빠른 조회용 (on-chain primary, 주기적 동기화).

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| balance_pot | Long | | Y | POT 잔액 (satoshi) |
| balance_jack | Long | | Y | JACK 잔액 (satoshi) |
| synced_at | LocalDateTime | | Y | 마지막 동기화 일시 |
| block_height | Long | | Y | 동기화 기준 블록 높이 |

---

## 8. lotto_ranking

> 역대 Top 3 당첨자 랭킹. read/write 분리 최적화.

| 컬럼 | 타입 | KEY | NotNull | 설명 |
|------|------|:---:|:-------:|------|
| id | Long | PK | Y | PK |
| rank | Integer | UQ | Y | 순위 (1~3) |
| wallet_address | String(64) | | Y | 당첨자 지갑 주소 |
| nickname | String(50) | | N | 당첨자 닉네임 |
| reward_jack | Long | | Y | 수령 보상 (JACK satoshi) |
| commit_hash | String(64) | | Y | 당첨 commit TX 해시 |
| won_at | LocalDateTime | | Y | 당첨 일시 |
| updated_at | LocalDateTime | | Y | 최종 갱신 일시 |

---

## 관계 다이어그램 (텍스트)

```
wallet ──── 1:N ──── auth_refresh_session
wallet ──── 1:N ──── wallet_activity
wallet ──── 1:N ──── lotto_entry

block  ──── 1:N ──── transaction
block  ──── 1:N ──── wallet_activity (via block_height)
block  ──── 1:N ──── lotto_entry    (via commit_block_height)

lotto_entry ──── 1:1 ──── lotto_ranking (당첨 시)
```
