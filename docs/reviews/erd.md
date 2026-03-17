# ERD (Entity Relationship Diagram)

> JackpotChain 블록체인 기반 로또 시스템의 MVP 데이터 모델
> FE-ssatto 프론트엔드와 jackpotchain 백엔드 RPC 분석 기반으로 설계

---

## 테이블 목록

| 테이블명 | 역할 |
|---------|------|
| wallet | 사용자 지갑 정보 (주소, 닉네임, 테마) 관리 |
| block | 채굴된 블록 인덱싱 (높이, 해시, 채굴자, 보상) |
| transaction | 블록체인 트랜잭션 인덱싱 (송수신, 금액, 유형) |
| lotto_entry | 로또 참여 기록 (선택 번호, 커밋, 상태, 보상) |
| jackpot_pool | 잭팟 풀 현재 상태 및 히스토리 스냅샷 |

> **Note**: JackpotChain은 UTXO 모델 기반 블록체인으로, 원장(on-chain) 데이터가 primary source입니다.
> 본 ERD는 프론트엔드가 빠르게 조회할 수 있도록 블록체인 데이터를 **인덱싱/캐싱**하는 레이어를 기준으로 설계합니다.

---

## 1. wallet (지갑)

> 사용자의 지갑 주소, 닉네임, 테마 색상 등 UI 메타데이터 관리.
> 실제 JACK/POT 잔액은 on-chain UTXO에서 RPC로 조회.

| 컬럼명 | 컬럼의미 | 타입 | NotNull | Default |
|--------|----------|------|:-------:|---------|
| id | PK | Long | Y | AUTO_INCREMENT |
| address | 지갑 주소 (0x 포함 hex) | String | Y | - |
| nickname | 지갑 닉네임 | String | N | NULL |
| wallet_color | 지갑 테마 색상 ID | String | N | `"DEFAULT"` |
| created_at | 지갑 생성 일시 | LocalDateTime | Y | NOW() |

---

## 2. block (블록)

> 채굴된 블록 정보 인덱싱. 블록 높이, 채굴자, 보상 기록.
> DashboardPage의 BlockHeight·BlockchainVisualizer, MiningPage의 MinedBlocks에서 사용.

| 컬럼명 | 컬럼의미 | 타입 | NotNull | Default |
|--------|----------|------|:-------:|---------|
| id | PK | Long | Y | AUTO_INCREMENT |
| height | 블록 높이 (체인 내 순서) | Long | Y | - |
| hash | 블록 해시 (64자리 hex) | String | Y | - |
| prev_hash | 이전 블록 해시 | String | N | NULL |
| merkle_root | 트랜잭션 머클루트 | String | Y | - |
| mined_at | 블록 채굴 일시 (Unix timestamp 변환) | LocalDateTime | Y | - |
| difficulty | 채굴 난이도 | Long | Y | - |
| nonce | 논스 값 | Long | Y | - |
| miner_address | 채굴자 지갑 주소 | String | N | NULL |
| reward_jack | 채굴 보상 (JACK, satoshi 단위) | Long | Y | `5000000000` |
| tx_count | 블록 내 포함 트랜잭션 수 | Integer | Y | `0` |

---

## 3. transaction (트랜잭션)

> 블록체인 트랜잭션 인덱싱. 송수신 주소, 금액, 유형(일반/교환/로또커밋/로또클레임) 기록.
> WalletPage ActivityList, MiningPage에서 사용.

| 컬럼명 | 컬럼의미 | 타입 | NotNull | Default |
|--------|----------|------|:-------:|---------|
| id | PK | Long | Y | AUTO_INCREMENT |
| tx_id | 트랜잭션 해시 (64자리 hex) | String | Y | - |
| block_id | 포함된 블록 FK (미확인 시 NULL) | Long | N | NULL |
| tx_version | 트랜잭션 유형 (1=전송, 2=교환, 3=로또커밋, 5=로또클레임) | Integer | Y | `1` |
| from_address | 송신자 지갑 주소 | String | N | NULL |
| to_address | 수신자 지갑 주소 | String | N | NULL |
| jack_amount | JACK 이동 금액 (satoshi) | Long | Y | `0` |
| pot_amount | POT 이동 금액 (satoshi) | Long | Y | `0` |
| fee_jack | 수수료 (JACK satoshi) | Long | Y | `0` |
| created_at | 트랜잭션 생성 일시 | LocalDateTime | Y | - |

---

## 4. lotto_entry (로또 참여)

> 사용자별 로또 참여 기록. 선택 번호, 커밋 해시, 결과 상태, 보상 정보 관리.
> LottoPage에서 참여 내역·상태·클레임에 사용.

| 컬럼명 | 컬럼의미 | 타입 | NotNull | Default |
|--------|----------|------|:-------:|---------|
| id | PK | Long | Y | AUTO_INCREMENT |
| commit_hash | 커밋 트랜잭션 해시 | String | Y | - |
| wallet_address | 참여자 지갑 주소 | String | Y | - |
| chosen_numbers | 선택한 6자리 숫자 배열 (JSON, 0~15) | String | Y | - |
| jackpot_snapshot | 참여 시점 잭팟 풀 잔액 (JACK satoshi) | Long | Y | - |
| commit_block_height | 커밋이 포함된 블록 높이 | Long | Y | - |
| result_numbers | 결과 6자리 숫자 배열 (JSON, 블록해시에서 추출) | String | N | NULL |
| match_count | 일치한 숫자 개수 (0~6) | Integer | N | NULL |
| status | 참여 상태 (PENDING/WON/LOST/EXPIRED) | String | Y | `"PENDING"` |
| reward_jack | 당첨 보상 JACK (satoshi) | Long | N | NULL |
| reward_pot | 당첨 보상 POT (satoshi) | Long | N | NULL |
| claim_tx_id | 보상 수령 트랜잭션 해시 | String | N | NULL |
| claimable_from_height | 클레임 가능 시작 블록 높이 (commit+18) | Long | Y | - |
| claimable_until_height | 클레임 만료 블록 높이 (commit+80) | Long | Y | - |
| created_at | 참여 일시 | LocalDateTime | Y | NOW() |
| claimed_at | 보상 수령 일시 | LocalDateTime | N | NULL |

---

## 5. jackpot_pool (잭팟 풀)

> 잭팟 풀의 현재 잔액과 참여 통계. LottoPage의 JackpotPool 컴포넌트에서 사용.
> 실잔액은 on-chain 이지만 빠른 조회를 위해 캐싱.

| 컬럼명 | 컬럼의미 | 타입 | NotNull | Default |
|--------|----------|------|:-------:|---------|
| id | PK | Long | Y | AUTO_INCREMENT |
| balance_jack | 현재 잭팟 풀 잔액 (JACK satoshi) | Long | Y | `0` |
| total_entries | 누적 총 참여 횟수 | Long | Y | `0` |
| total_winners | 누적 당첨자 수 | Long | Y | `0` |
| last_synced_height | 마지막 동기화 블록 높이 | Long | Y | `0` |
| updated_at | 마지막 갱신 일시 | LocalDateTime | Y | NOW() |

---

## 테이블 간 관계

```
wallet ──< lotto_entry     : 1:N  (한 지갑은 여러 로또에 참여 가능)
block  ──< transaction     : 1:N  (한 블록은 여러 트랜잭션을 포함)
block  ──< lotto_entry     : 1:N  (한 블록에 여러 로또 커밋이 포함될 수 있음, commit_block_height 기준)
transaction >── lotto_entry : 1:1  (로또 커밋·클레임 트랜잭션과 lotto_entry는 1:1 대응, commit_hash/claim_tx_id)
jackpot_pool : 단독 테이블  (풀 상태 단일 레코드 또는 히스토리 스냅샷)
```

### 관계 상세

| 관계 | 설명 |
|------|------|
| `wallet` 1 : N `lotto_entry` | 한 명의 사용자(지갑)가 여러 번 로또에 참여할 수 있음 |
| `block` 1 : N `transaction` | 하나의 블록은 여러 트랜잭션을 포함함 |
| `block` 1 : N `lotto_entry` | 로또 커밋은 특정 블록 높이(commit_block_height)에 귀속되며, 결과 추출에도 N+3~N+18 블록 사용 |
| `transaction` 1 : 1 `lotto_entry` | 로또 참여(커밋)와 보상 수령(클레임)은 각각 transaction과 1:1로 연결됨 (commit_hash, claim_tx_id) |
| `wallet` 1 : N `transaction` | 한 지갑은 여러 트랜잭션의 송수신자가 될 수 있음 |
| `wallet` 1 : N `block` | 한 지갑(채굴자)이 여러 블록을 채굴할 수 있음 (miner_address 기준) |

---

## 당첨 구조 (참고)

| 일치 개수 | 보상 |
|-----------|------|
| 6개 일치 | 잭팟 풀의 50% (참여 시점 snapshot 기준) |
| 5개 일치 | 100,000 JACK |
| 4개 일치 | 20,000 JACK |
| 3개 일치 | 2,000 JACK |
| 2개 일치 | 300 JACK |
| 1개 일치 | 1 POT 환불 |
| 0개 일치 | 없음 |

> 참여 비용: 1 POT (= 100 JACK)
> 분배: 80% → 잭팟 풀, 19% → 소각, 1% → 채굴자
