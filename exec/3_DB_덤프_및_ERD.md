# 3. DB 덤프 및 ERD

> DB 접속 정보, 스키마(ERD), 주요 테이블 설명, 프로퍼티 파일 목록

---

## 3.1 DB 접속 정보

| 항목 | 값 |
|------|-----|
| DBMS | PostgreSQL 16 (alpine) |
| 데이터베이스명 | `jackpotchain` |
| 사용자 | `jackpot` |
| 비밀번호 | `.env.local` 파일에 정의 |
| 호스트 (로컬) | `localhost:15432` |
| 호스트 (Docker 내부) | `postgres:5432` |
| JDBC URL | `jdbc:postgresql://postgres:5432/jackpotchain` |

---

## 3.2 마이그레이션 관리

- **도구**: Flyway (Spring Boot 통합)
- **마이그레이션 파일 위치**: `BE-ssatto/src/main/resources/db/migration/`
- **실행 시점**: Spring Boot 기동 시 자동 실행

| 파일 | 설명 |
|------|------|
| `V1__init_schema.sql` | 초기 스키마 (wallet, block, transaction, lotto 등) |
| `V2__add_indexes.sql` | 성능 최적화 인덱스 추가 |
| `V3__add_auth_refresh_session.sql` | 인증/리프레시 세션 테이블 |
| `V4__add_learning_tables.sql` | 학습 모듈 테이블 |
| `V5__add_wallet_onboarding_reward_columns.sql` | 온보딩 보상 컬럼 |
| `V6__add_outbox_events.sql` | 아웃박스 이벤트 패턴 테이블 |

---

## 3.3 ERD (Entity Relationship Diagram)

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│     wallet      │     │       block          │     │   jackpot_pool   │
├─────────────────┤     ├─────────────────────┤     ├──────────────────┤
│ id (PK)         │     │ id (PK)             │     │ id (PK, =1)      │
│ address (UK)    │     │ height (UK)         │     │ balance_jack     │
│ nickname        │     │ hash (UK)           │     │ total_entries    │
│ wallet_color    │     │ prev_hash           │     │ total_winners    │
│ created_at      │     │ version             │     │ last_synced_height│
└────────┬────────┘     │ mined_at            │     │ updated_at       │
         │              │ mining_elapsed      │     └──────────────────┘
         │              │ difficulty          │
         │              │ nonce               │
         │              │ miner_address       │
         │              │ reward_jack         │
         │              │ fee_reward_jack     │
         │              │ tx_count            │
         │              │ is_main_chain       │
         │              └──────────┬──────────┘
         │                         │
         │    ┌────────────────────┘
         │    │ FK: block_id
         │    ▼
         │  ┌─────────────────────┐
         │  │    transaction      │
         │  ├─────────────────────┤
         │  │ id (PK)             │
         │  │ tx_id (UK)          │
         │  │ block_id (FK→block) │
         │  │ tx_version          │
         │  │ from_address        │
         │  │ to_address          │
         │  │ jack_amount         │
         │  │ pot_amount          │
         │  │ created_at          │
         │  └──────────┬──────────┘
         │             │
    ┌────┴─────────────┼──────────────────┐
    │ FK: wallet_addr  │ FK: tx_id        │
    ▼                  ▼                  │
┌─────────────────────┐  ┌───────────────┴───────┐
│  wallet_activity    │  │     lotto_entry       │
├─────────────────────┤  ├───────────────────────┤
│ id (PK)             │  │ id (PK)               │
│ wallet_address (FK) │  │ commit_hash (UK,FK)   │
│ type                │  │ wallet_address (FK)   │
│ description         │  │ chosen_numbers        │
│ jack_amount         │  │ jackpot_snapshot      │
│ pot_amount          │  │ commit_block_height   │
│ tx_id (FK)          │  │ result_numbers        │
│ created_at          │  │ match_count           │
└─────────────────────┘  │ status                │
                         │ reward_jack           │
                         │ claim_tx_id (FK)      │
                         │ claimable_from_height │
                         │ claimable_until_height│
                         │ created_at            │
                         │ claimed_at            │
                         └───────────┬───────────┘
                                     │
                                     │ FK: commit_hash
                                     ▼
                         ┌───────────────────────┐
                         │   lotto_ranking       │
                         ├───────────────────────┤
                         │ id (PK)               │
                         │ rank (UK)             │
                         │ wallet_address (FK)   │
                         │ commit_hash (UK,FK)   │
                         │ match_count           │
                         │ reward_jack           │
                         │ claimed_at            │
                         │ updated_at            │
                         └───────────────────────┘
```

---

## 3.4 주요 테이블 설명

### wallet
지갑 주소 및 메타데이터. **잔액은 DB에 저장하지 않음** — 블록체인 노드 RPC로 실시간 조회.

### block
블록체인에서 수신한 블록 정보. Webhook(`/internal/new-block`)으로 노드가 새 블록을 전달하면 인덱싱.

### transaction
블록에 포함된 트랜잭션. `tx_version`으로 유형 구분:

| tx_version | 유형 |
|------------|------|
| 1 | 일반 송금 |
| 2 | JACK → POT 교환 (단방향) |
| 3 | 로또 커밋 |
| 5 | 로또 클레임 |

### wallet_activity
지갑별 활동 이력 (송금, 수신, 교환, 채굴 보상 등).

### lotto_entry
로또 참여 내역. Commit-Reveal 방식:
- 커밋: 블록 N에 참여
- 결과: N+3, N+6, N+9, N+12, N+15, N+18 블록 해시로 결정
- 클레임: N+18 ~ N+68 블록 사이에 당첨금 수령

### lotto_ranking
역대 로또 당첨 순위.

### jackpot_pool
잭팟 풀 잔액 (싱글톤, id=1). 로또 참가비의 81%가 잭팟 풀에 적립.

---

## 3.5 프로퍼티 파일 목록

| 파일 | 활용 |
|------|------|
| `BE-ssatto/src/main/resources/application.yml` | 공통: JPA, JWT 만료시간, RPC URL, Actuator |
| `BE-ssatto/src/main/resources/application-local.yml` | 로컬: DB/Redis/RabbitMQ 접속 정보 |
| `BE-ssatto/src/main/resources/application-dev.yml` | Dev: 개발 서버 접속 정보 |
| `BE-ssatto/src/main/resources/application-prod.yml` | Prod: 운영 서버 접속 정보, 쿠키 정책 |

### 주요 설정값

| 설정 | 값 | 설명 |
|------|-----|------|
| `jwt.access-expiration` | 900000 (15분) | 액세스 토큰 만료 |
| `jwt.refresh-expiration` | 1209600000 (14일) | 리프레시 토큰 만료 |
| `auth.challenge-ttl-seconds` | 300 (5분) | 인증 챌린지 TTL |
| `jackpotchain.rpc.connect-timeout-ms` | 2000 | RPC 연결 타임아웃 |
| `jackpotchain.rpc.read-timeout-ms` | 5000 | RPC 읽기 타임아웃 |
