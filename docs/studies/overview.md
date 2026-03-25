# JackpotChain 전체 시스템 구조 & 통신 방식

> 작성일: 2026-03-24 (코드 기반 재작성)
> 기준: FE-ssatto, BE-ssatto, blockchain/, docker-compose.local.yml 실제 코드

---

## 1. 로컬 Docker 포트 맵 (docker-compose.local.yml 기준)

```
호스트 포트   컨테이너 포트   서비스
──────────────────────────────────────────────────
13000         80            Frontend (nginx → React SPA)
8080          8080          Backend (Spring Boot)
9776          9776          JackpotChain Node RPC (내부망만, 절대 외부 노출 금지)
9777          9777          JackpotChain Node P2P (TUI 채굴자 접속용)
15432         5432          PostgreSQL
16379         6379          Redis
5672          5672          RabbitMQ AMQP
15672         15672         RabbitMQ Management UI
```

> 운영 환경: BE는 8080/8081(Blue/Green), FE는 Nginx 뒤, Node RPC는 절대 외부 비노출

---

## 2. 전체 컴포넌트 구조도

```
┌──────────────────────────────────────────────────────────────┐
│                    사용자 브라우저                             │
│   React SPA (Vite + TypeScript)                              │
│   - 개인키: IndexedDB 암호화 저장 (서버 전송 절대 없음)       │
│   - TX 서명: 브라우저에서 직접 서명 후 hex로 BE에 전달         │
│             (secp256k1 서명)                                  │
│   - 지갑 메타데이터: 탭 간 공유 저장소에 유지                  │
│                    (localStorage persist)                     │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS  /api/v1/*
                            ▼
┌──────────────────────────────────────────┐
│         Host Nginx (역방향 프록시)        │
│  ssatto777.site → 운영 (Blue/Green)       │
│  dev.ssatto777.site → 개발               │
└──────────────┬───────────────────────────┘
               │ HTTP (내부)
               ▼
┌──────────────────────────────────────────┐
│         Spring Boot Backend (8080)        │
│  - REST API /api/v1/*                    │
│  - JWT 인증 토큰 + HttpOnly 쿠키          │
│  - PostgreSQL: 읽기용 DB (Block/TX/Lotto) │
│  - Redis: 임시 데이터 캐시 (인증·세션)    │
│  - 블록 동기화 스케줄러:                  │
│    5초마다 블록체인 노드에 변경사항 조회  │
│    (BlockchainSyncScheduler, Webhook 없음)│
└──────────────┬───────────────────────────┘
               │ JSON-RPC HTTP  포트 9776 (Docker 내부망)
               ▼
┌──────────────────────────────────────────┐
│   JackpotChain Node (Python asyncio)      │
│   - PoW 합의, UTXO 모델                  │
│   - RPC 서버: 포트 9776 (내부망 전용)    │
│   - P2P 서버: 포트 9777 (TUI 채굴자 접속)│
│   - 미확정 TX 임시 보관소 (Mempool)      │
│   - 온보딩 보상: 서버 지갑으로 교환 TX  │
└──────────────┬───────────────────────────┘
               │ P2P 9777
               ▼
┌──────────────────────────────────────────┐
│   TUI Mining Node (Python Textual)        │
│   - 로컬 PC에서 채굴 수행                │
│   - 블록 생성 후 Node에 P2P 전파         │
└──────────────────────────────────────────┘
```

---

## 3. 블록 동기화 방식 — Webhook 없음, 스케줄러 폴링

> 이전 설계에서 블록 발생 시 BE에 즉시 알림(Webhook: `POST /internal/new-block`)이 언급되었으나
> **현재 구현은 BE의 백그라운드 스케줄러가 주기적으로 직접 조회(RPC 폴링)** 하는 방식이다.

```
5초마다 자동 실행되는 블록 동기화 스케줄러
(BlockchainSyncScheduler @Scheduled fixedDelay=5000ms)
    │  매 5초마다 실행 (이전 실행 완료 후 5초)
    ▼
블록 동기화 서비스 실행
(BlockchainReadModelSyncService.syncToTip())
    │
    ├── 블록체인 현재 높이 확인 (rpcClient.getBlockCount())
    ├── (로컬 DB 높이와 비교)
    └── (누락 블록이 있으면)
        ├── 해당 높이의 블록 해시 조회 (rpcClient.getBlockHash(height))
        ├── 블록 상세 정보 조회 (rpcClient.getIndexedBlock(hash))
        ├── Block 엔티티 저장
        ├── Transaction 엔티티 저장
        ├── 지갑 활동 기록 (WalletActivity)
        ├── 로또 항목 상태 업데이트 (DRAWING → WINNING/LOSING/EXPIRED)
        └── 잭팟 풀 잔액 갱신 (JackpotPool)
```

**설계 의도**: API 요청 처리 중 블록 동기화를 하면 수백 블록 처리 시 응답 지연 발생
→ 스케줄러가 독립 스레드에서 담당, API는 이미 동기화된 DB(PostgreSQL)만 조회

---

## 4. 인증 흐름 — 비밀번호 없는 지갑 기반 인증

### 왜 일반 로그인이 없는가?

비밀번호나 서버 계정 없음. **지갑 개인키 소유 증명**이 곧 인증이다.
서버가 메시지를 주면, 클라이언트가 개인키로 서명해서 돌려보내면,
서버가 공개키로 서명을 검증하고 토큰을 발급한다.

### 인증 흐름 (challenge-response 방식)

```
FE                        BE                          Redis / DB
 │                         │
 │ 인증 챌린지 요청          │
 │ (POST /auth/challenge)   │
 │  { address }             │
 │──────────────────────────▶│
 │                         │── 등록된 지갑인지 DB 확인
 │                         │   (walletRepository.findByAddress())
 │                         │── Redis에 챌린지 임시 저장 (TTL 5분)
 │                         │   SET challengeId {
 │                         │     address, nonce, message, expiresAt, used=false
 │                         │   }
 │◀────────────────────────│
 │  { challengeId, nonce,  │
 │    message }             │
 │                         │
 │  [브라우저에서 개인키로 서명]
 │  (secp256k1 서명)
 │  signature = sign(message, privateKey)
 │                         │
 │ 서명 검증 및 토큰 발급 요청│
 │ (POST /auth/verify)      │
 │  { challengeId, address, │
 │    publicKey, signature} │
 │──────────────────────────▶│
 │                         │── Redis에서 챌린지 조회
 │                         │   (없거나 이미 사용됨 → 401)
 │                         │── 챌린지 사용 처리 (단일 사용)
 │                         │   (challenge.used → true)
 │                         │── 공개키에서 주소 재도출 후 일치 확인
 │                         │   (deriveAddress(publicKey) == address)
 │                         │── 서명 유효성 검증
 │                         │   (verifySignature(message, signature, publicKey))
 │                         │── JWT 인증 토큰 생성 (accessToken, subject=address)
 │                         │── 갱신 토큰 생성 → SHA-256 해시만 DB 저장
 │                         │   (refreshToken)
 │                         │── 세션 핸들 생성 (sessionHandle UUID)
 │◀────────────────────────│
 │  accessToken (body)     │  refreshToken (HttpOnly cookie)
 │  sessionHandle (body)   │
```

**핵심 보안 포인트**
- 공개키 → 주소 재도출 검증 (`deriveAddress(publicKey)`) → 주소 위조 불가
- 챌린지는 단일 사용 + TTL 5분 → Replay Attack 방지
- 갱신 토큰 원문은 클라이언트 Cookie에만, DB에는 SHA-256 해시만 저장

---

### Q&A: challenge-response 인증 심화 이해

**Q. challenge가 정확히 무엇인가?**
> 서버가 클라이언트에게 던지는 **일회용 문제(nonce 포함 메시지)**다.
> `{ challengeId, nonce, message }` 형태로 발급되며, Redis에 TTL 5분으로 저장된다.
> 클라이언트는 이 메시지를 자신의 개인키로 서명해서 되돌려 보내야 한다.
> "서버만 알 수 있는 것"이 아니라 "클라이언트만 서명할 수 있는 것"을 증명하는 구조다.

**Q. 서버가 서명 검증 시 무엇과 무엇을 비교하는가?**
> **비교값을 만드는 것이 아니라 수학 등식으로 판정**한다.
> ECDSA 서명 `(r, s)`는 `privateKey`로 만든 두 정수다.
> 서버는 `(message, publicKey, signature(r,s))`를 받아 타원곡선 방정식을 계산한다:
> - `(r, s)`와 `message` + `publicKey`로 점 `R'`을 도출
> - `R'.x mod n == r` 이면 검증 성공
> 서버는 개인키를 모르지만, **올바른 개인키로 서명했다면 이 등식이 반드시 성립**한다.

**Q. 임의로 키페어를 만들면 인증을 통과할 수 있는가?**
> 불가능하다. **2단계 검증**이 있기 때문이다:
> 1. challenge 요청 시 → DB에서 해당 address 존재 여부 확인 (없으면 즉시 401)
> 2. verify 요청 시 → `deriveAddress(publicKey) == address` 일치 확인 + 서명 수학 검증
>
> 즉, 임의 키페어를 만들어도 해당 address가 DB에 등록되어 있지 않으면 challenge 자체가 발급되지 않는다.

**Q. `deriveAddress(publicKey)`는 항상 동일한 결과를 내는가?**
> 그렇다. `publicKey → hash160(SHA-256 + RIPEMD-160) → Base58Check 인코딩 → address`
> 같은 publicKey를 넣으면 항상 같은 address가 나온다 (결정론적 단방향 함수).
> address에서 publicKey로 역산은 불가능하다.

**Q. 서명 `(r, s)`는 어떤 형태인가?**
> 두 정수로 이루어진 쌍이다. SHA-256 같은 해시값이 아니라 타원곡선 위의 점 좌표에서 파생된 값이다.
> 실제로는 DER(Distinguished Encoding Rules) 형식으로 인코딩되어 hex 문자열로 전송된다.
> 예: `3045022100...` 형태의 16진수 문자열 (71~72바이트)

---

## 5. 지갑 상태 유지 — 다른 탭/페이지 이동 후에도 로그인 유지

### 두 개의 저장소 역할 분리

```
지갑 기본 정보 저장소 (useWalletStore, Zustand persist → localStorage)
  - 탭 닫아도, 페이지 새로고침해도 유지
  - 저장 내용: address, nickname, walletColor, keystoreId, refreshSessionHandle
  ↑ 브라우저의 localStorage에 JSON으로 저장 (암호화 안 됨 → 비민감 메타데이터만)

지갑 세션 저장소 (useWalletSessionStore, Zustand, persist 없음 → 메모리만)
  - 탭 닫거나 새로고침 → 즉시 소멸
  - 저장 내용: privateKey (복호화 후), accessToken
  - 유휴 5분 자동 잠금 (WALLET_IDLE_LOCK_MS = 5분)
  ↑ 절대 persist 하지 않음 → 가장 민감한 정보
```

### 다른 탭으로 이동해도 지갑 유지되는 이유

```
같은 브라우저 → localStorage 공유
    ↓
지갑 기본 정보 즉시 복원 (useWalletStore: wallets, activeAddress)
    ↓
페이지 마운트 시 세션 복구 시도 (restoreWalletSession())
    ↓ (3단계 복구 순서)
    1) 메모리 확인:
       메모리에 accessToken이 있고 만료 전이면 → 그대로 사용

    2) 토큰 갱신:
       저장된 세션 핸들로 갱신 요청 (POST /auth/refresh)
       → HttpOnly 쿠키의 refreshToken 자동 전송
       → 새 accessToken 발급 (토큰 로테이션)
       → 사용자는 아무것도 안 해도 자동 로그인 상태

    3) 재인증:
       갱신도 실패하면 (쿠키 만료 또는 탈취 후 폐기)
       → 잠금 해제된 개인키가 있으면 자동 challenge-sign-verify
       → 없으면 → 잠금 해제 모달 표시 (비밀번호 재입력)
```

**실제 결과**: 같은 브라우저라면 탭 전환/다른 페이지 이동 → localStorage의 `refreshSessionHandle` + HttpOnly 쿠키 → 자동 토큰 갱신 → 사용자는 재인증 필요 없음

---

## 6. 지갑 생성 & 1 POT 온보딩 보상

### 1 POT 재원: Seed Node 채굴 보상

**Seed Node는 채굴자이기도 하다.** `.env.local` / 운영 환경 모두 `NODE_MINE=true`, `NODE_SEED_NODE=true`로 실행.
채굴 성공 시 블록 보상(JACK)이 Seed Node 운영자 지갑의 Coinbase UTXO로 쌓이고,
**이 Coinbase JACK이 온보딩 보상 재원**이다. Coinbase UTXO는 100 블록 성숙(maturity) 후에야 사용 가능.

```
[Seed Node — 상시 채굴]

 PoW 채굴 성공
     │
     ▼
 Coinbase TX 생성 (블록 높이 H)
   출력: BLOCK_REWARD JACK → 운영자 지갑
     │
     ▼
 블록 H+100 이후 → Coinbase UTXO 성숙 (is_coinbase && current_height - block_height >= 100)
     │
     ▼
 grantonboardingreward 호출 시 사용 가능한 UTXO 풀에 편입
```

### 지갑 생성 (type: "create")

```
FE                              BE                         Seed Node (Python)
 │                               │                         │
 │                               │                         │ [상시 채굴 중]
 │                               │                         │ PoW 성공 → Coinbase JACK 적립
 │                               │                         │ (100블록 이후 성숙)
 │                               │
 │ [브라우저에서 키페어 생성]      │
 │  generateKeyPair()            │
 │  개인키 → AES-GCM 암호화       │
 │  → 브라우저 DB 저장 (IndexedDB)│
 │                               │
 │ 지갑 등록 + 온보딩 보상 요청   │
 │ (POST /v1/wallet)             │
 │  { address, nickname,         │
 │    grantOnboardingReward:true }│
 │────────────────────────────────▶│
 │                               │── Wallet 엔티티 DB 저장
 │                               │── 온보딩 보상 미지급 확인
 │                               │   (wallet.isOnboardingRewardGranted() == false)
 │                               │
 │                               │── 온보딩 보상 지급 RPC 호출
 │                               │   (jackpotChainRpcClient
 │                               │    .grantOnboardingPotReward(address))
 │                               │────────────────────────▶│
 │                               │    JSON-RPC:             │
 │                               │    grantonboardingreward │
 │                               │    (recipient_address)   │
 │                               │                         │── 운영자 지갑 UTXO 조회
 │                               │                         │   성숙한 Coinbase UTXO만 선택
 │                               │                         │   (is_mature: 현재높이 - 블록높이 >= 100)
 │                               │                         │   mempool에서 이미 소비된 UTXO 제외
 │                               │                         │
 │                               │                         │── 100.1 JACK 이상 수집 확인
 │                               │                         │   (100 JACK 교환용 + 0.1 JACK 수수료용)
 │                               │                         │
 │                               │                         │── 교환 TX 생성 (version=2):
 │                               │                         │   입력: 성숙한 Coinbase JACK UTXO
 │                               │                         │   출력[0]: 1 POT   → recipient
 │                               │                         │   출력[1]: 80 JACK → 잭팟 풀
 │                               │                         │   출력[2]: OP_RETURN EXCHANGE:19JACK
 │                               │                         │            (소각 기록)
 │                               │                         │   출력[3]: 0.1 JACK → recipient
 │                               │                         │            (향후 TX 수수료용)
 │                               │                         │   출력[4]: 잔돈 JACK → 운영자 지갑
 │                               │                         │   암묵적 수수료: 1 JACK (채굴자 몫)
 │                               │                         │
 │                               │                         │── 운영자 키로 서명
 │                               │                         │── TX → mempool 추가
 │                               │                         │── P2P 네트워크 전파
 │                               │◀───────────────────────│
 │                               │   { txId, potAmount }   │
 │                               │── 온보딩 보상 지급 완료 기록
 │                               │   (wallet.markOnboardingRewardGranted(txId))
 │◀───────────────────────────────│
 │  { address, onboardingRewardGranted:true, txId }
```

**1 POT의 출처**: Seed Node가 채굴로 쌓은 Coinbase JACK → 100블록 성숙 → 교환 TX로 POT 발행
- 100 JACK → 1 POT + 0.1 JACK (수수료) → recipient에게 전달
- 100 JACK 중: 80 JACK → 잭팟 풀, 19 JACK → 소각(OP_RETURN 기록), 1 JACK → 채굴자 수수료
- Coinbase UTXO가 부족(미성숙 포함)하면 RPC 오류 → 온보딩 보상 지급 실패

> 로컬 개발에서도 `NODE_MINE=true`로 Seed Node가 직접 채굴하므로 초기 100블록 채굴 전에는
> 온보딩 보상을 지급할 수 없다. (합성 UTXO 주입 방식은 현재 사용하지 않음)

### 기존 지갑 등록 (type: "restore")

```
FE                              BE
 │ [기존 privateKey 입력]         │
 │  privateKey → 주소 도출        │
 │  → 암호화 → IndexedDB 저장     │
 │                               │
 │ 지갑 등록 요청 (복구)          │
 │ (POST /v1/wallet)             │
 │  { address, grantOnboardingReward:false }
 │────────────────────────────────▶│
 │                               │── 주소가 이미 존재하면 → 409 (duplicate_restore)
 │                               │   FE에서 정상 처리 (이미 등록된 지갑으로 간주)
 │                               │── 신규이면 Wallet DB 저장
 │                               │   (온보딩 보상 없음)
 │◀───────────────────────────────│
```

---

## 7. JACK → POT 교환 흐름

### 흐름

```
FE                              BE                         Node
 │ [지갑 잠금 해제 필요]          │
 │ 내 UTXO 목록 조회 요청         │
 │ (getWalletUtxos(address))     │
 │────────────────────────────────▶│── 미사용 출력값 조회 RPC
 │                                 │   (listUnspent(address) RPC) ──▶│
 │◀────────────────────────────────│◀────────────────────────────── │
 │  utxos[]                      │
 │                               │
 │  [브라우저에서 교환 TX 직접 조립]
 │  buildExchangeTransaction()
 │  ┌────────────────────────────────┐
 │  │ version = 2                    │
 │  │ inputs (사용할 돈):             │
 │  │   JACK UTXOs (≥ 100 JACK)      │
 │  │ outputs (보낼 곳):              │
 │  │   [0] 1 POT → 사용자 주소      │
 │  │   [1] 80 JACK → 잭팟 풀        │
 │  │   [2] 소각 마커 (OP_RETURN)    │
 │  │       EXCHANGE:burned          │
 │  │   [3] JACK 거스름돈 (선택)     │
 │  │ 서명: secp256k1 서명           │
 │  └────────────────────────────────┘
 │  signedTxHex = 서명된 TX를 16진수 문자열로 직렬화
 │                               │
 │ 교환 요청 (백엔드에 서명된 TX 전달)
 │ (POST /v1/exchange/jack-to-pot)│
 │  { fromAddress, jackAmount,    │
 │    signedTxHex }               │
 │────────────────────────────────▶│
 │                               │── 교환 처리 서비스 실행
 │                               │   (ExchangeService.exchange())
 │                               │── 백엔드를 통해 서명된 TX 블록체인에 전송
 │                               │   (sendRawTransaction(signedTxHex)) ──▶│
 │                               │                                         │ TX → 미확정 보관소 (mempool)
 │                               │◀──────────────────────────────────────│
 │                               │   txId (전송된 TX 식별자)              │
 │◀───────────────────────────────│
 │  { txId, burnedJack, receivedPot }
```

**교환 비율 (EXCHANGE_RATE_JACK = 100)**:
- 100 JACK → 1 POT
- 100 JACK 중: 80 JACK → 잭팟 풀, 19 JACK → 소각, 1 JACK → TX 수수료

---

## 8. 로또 Commit 흐름

### Commit-Reveal 원리

온체인에서 미래 블록 해시를 결과 시드로 사용 → **커밋 시점에 결과를 아무도 예측 불가**

```
Commit 블록: N
결과 블록: N+3, N+6, N+9, N+12, N+15, N+18
  → 각 블록 해시의 마지막 hex digit (0~F = 0~15)
  → 6개 digit = 로또 결과

Claim 가능 구간: N+18 ~ N+68
Claim 만료: N+68 이후 → EXPIRED 상태
```

### Commit TX 흐름

```
FE                              BE                         Node
 │                               │
 │ 내 UTXO 목록 조회 요청         │
 │ (getWalletUtxos(address))     │
 │────────────────────────────────▶│── 미사용 출력값 조회 RPC
 │                                 │   (listUnspent(address)) ──▶│
 │◀────────────────────────────────│                              │
 │
 │ [브라우저에서 로또 커밋 TX 직접 조립]
 │ buildLottoCommitTransaction()
 │ ┌──────────────────────────────────────────┐
 │ │ version = 3                              │
 │ │ inputs (사용할 돈):                       │
 │ │   POT UTXO (≥ 1 POT 필요)               │
 │ │   JACK UTXO (수수료용, 선택)             │
 │ │ outputs (보낼 곳):                        │
 │ │   [0] 숫자 기록 (OP_RETURN)              │
 │ │       "LOTTO" + 6개 숫자(0~15)           │
 │ │   [1] POT 거스름돈 → 사용자 (선택)       │
 │ │   [2] JACK 거스름돈 → 사용자 (선택)      │
 │ │ 서명: secp256k1 서명                     │
 │ └──────────────────────────────────────────┘
 │
 │ 로또 참여 요청 (백엔드에 서명된 TX 전달)
 │ (POST /v1/lotto/commit)       │
 │  { fromAddress, chosenNumbers,│
 │    signedTxHex }              │
 │────────────────────────────────▶│
 │                               │── 로또 커밋 처리 서비스 실행
 │                               │   (LottoService.commit())
 │                               │── 백엔드를 통해 서명된 TX 블록체인에 전송
 │                               │   (sendRawTransaction(signedTxHex)) ──▶│
 │                               │                                         │ TX → 미확정 보관소 (mempool)
 │                               │                                         │ 다음 블록에 포함
 │                               │◀──────────────────────────────────── ──│
 │                               │   txId (commitHash = 이 TX의 식별자)    │
 │◀───────────────────────────────│
 │  (commitHash = 이 TX의 txId)  │
 │                               │
 │ ... N+18 블록이 채굴될 때 ...  │
 │                               │── 블록 동기화 스케줄러 (5초마다)
 │                               │   (BlockchainSyncScheduler)
 │                               │   syncToTip() → 로또 항목 상태 업데이트
 │                               │   DRAWING → WINNING / LOSING / EXPIRED
 │
 │ 로또 결과 조회 (10초마다 반복) │
 │ (GET /v1/lotto/entries?address)│
 │────────────────────────────────▶│
 │◀────────────────────────────────│
 │  [{ status: "DRAWING"|"WINNING"|"LOSING"|"EXPIRED", ... }]
```

---

## 9. 로또 Claim 흐름

```
FE                              BE                         Node
 │  (당첨 확인 후 Claim 시작)     │
 │                               │
 │ 클레임 가능 정보 조회 요청     │
 │ (GET /v1/lotto/entries/{hash}/claim-context)
 │────────────────────────────────▶│
 │                               │── 클레임 컨텍스트 조회 서비스 실행
 │                               │   (LottoService.getClaimContext())
 │                               │── 잭팟 풀 UTXO 목록 조회 RPC
 │                               │   (listPoolUnspent() RPC) ─────▶│
 │                               │◀──────────────────────────── ──│
 │                               │   잭팟 풀 미사용 출력값 목록     │
 │◀───────────────────────────────│
 │  { claimable:true, rewardJack, │
 │    rewardPot, poolUtxos[] }    │
 │
 │ 내 UTXO 목록 조회              │── 내 미사용 출력값 조회 RPC
 │ (getWalletUtxos(address))     │   (listUnspent(address) RPC) ──▶│
 │◀────────────────────────────────│◀─────────────────────────── ─│
 │
 │ [브라우저에서 클레임 TX 직접 조립]
 │ buildLottoClaimTransaction()
 │ ┌──────────────────────────────────────────────────────┐
 │ │ version = 5                                          │
 │ │ inputs (사용할 돈):                                   │
 │ │   [내 JACK UTXO] 수수료 지불용                        │
 │ │   [풀 UTXO] 잭팟 풀 미사용 출력값 (보상 금액만큼 선택) │
 │ │ outputs (보낼 곳):                                    │
 │ │   [0] 보상 (rewardJack + rewardPot) → 내 주소         │
 │ │   [1] 풀 거스름돈 → 잭팟 풀 마커 (선택)               │
 │ │   [2] 클레임 기록 (OP_RETURN)                         │
 │ │       "CLAIM" + commitHash                            │
 │ │ 서명: 수수료 UTXO에만 서명 (풀 UTXO는 무서명)         │
 │ └──────────────────────────────────────────────────────┘
 │
 │ 당첨금 수령 요청 (백엔드에 서명된 TX 전달)
 │ (POST /v1/lotto/claim)        │
 │  { fromAddress, commitHash,   │
 │    signedTxHex }              │
 │────────────────────────────────▶│
 │                               │── 클레임 처리 서비스 실행
 │                               │   (LottoService.claim())
 │                               │── 백엔드를 통해 서명된 TX 블록체인에 전송
 │                               │   (sendRawTransaction(signedTxHex)) ──▶│
 │                               │                                         │ TX → 미확정 보관소 → 블록 포함
 │◀───────────────────────────────│
 │  { claimTxId, matchCount,     │
 │    rewardJack, claimedAt }    │
```

**Claim이 복잡한 이유**: 잭팟 풀 UTXO는 서버가 관리하지만, 브라우저가 직접 소비해야 함.
`claimContext`로 BE가 풀 UTXO를 FE에 전달 → FE가 TX를 조립해서 서명 → BE가 블록체인에 중계

---

## 10. RPC 통신 구조 (BE ↔ Node)

BE → Node 방향만 존재 (Node → BE 방향 없음, 스케줄러가 대신)

```
BE가 Node에 JSON 형식으로 명령 전달
(JackpotChainHttpRpcClient)
    restClient.post()
    ├── URL: http://jackpotchain-node:9776  (Docker 내부망)
    ├── Content-Type: application/json
    └── Body 예시:
        {
          "jsonrpc": "2.0",
          "method": "getblockcount",
          "params": [],
          "id": 1
        }

구현된 RPC 명령 목록 (명령어 이름):
  getblockcount                   → 현재 블록 높이 조회
  getblockchaininfo               → 체인 요약 (높이, 난이도, best hash, 피어 수 등)
  getbalances(addr)               → 특정 주소의 JACK / POT 잔액 조회
  listunspent(addr)               → 특정 주소의 미사용 출력값(UTXO) 목록 조회
  listpoolunspent                 → 잭팟 풀 미사용 출력값 목록 조회
  getblockhash(height)            → 특정 높이의 블록 해시 조회
  getblock(hash)                  → 블록 상세 내용 조회
  getindexedblock(hash)           → 블록 상세 (인덱싱 추가 필드 포함) 조회
  getlottoinfo                    → 로또 개요 조회
  getjackpotpool                  → 잭팟 풀 상태 조회
  getpeerinfo                     → 연결된 피어 목록 조회
  getmempoolcount                 → 미확정 TX 수 조회 (mempool)
  getrawmempool                   → 미확정 TX 상세 조회 (mempool)
  checklottoresult(hash)          → 로또 결과 조회
  getexchangeinfo                 → 교환 비율 정보 조회
  grantonboardingreward(addr)     → 온보딩 1 POT 신규 지갑에 지급
  sendrawtransaction(hex)         → 서명된 TX를 블록체인에 중계 (relay)
```

---

## 11. TX 버전 구조 (UTXO 모델)

| version | 종류 | 서명자 | 주요 출력 |
|---------|------|--------|----------|
| 1 | 일반 전송 | FE 브라우저 | P2PKH |
| 2 | JACK→POT 교환 | FE 브라우저 | POT 출력 + 풀 입금 + 소각 마커 (OP_RETURN) |
| 3 | 로또 커밋 | FE 브라우저 | 숫자 기록 마커 (OP_RETURN LOTTO+숫자) |
| 5 | 로또 클레임 | FE 브라우저 | 보상 + 클레임 마커 (OP_RETURN CLAIM+hash) |

> FE `txBuilder.ts` → raw bytes 직렬화 → secp256k1 서명 → hex 문자열 → BE에 전달 → Node 중계

---

## 12. FE HTTP 통신 레이어

```
Axios 인스턴스 (lib/api.ts)
    baseURL: /api  (Nginx가 /api/* → BE 8080으로 라우팅)

요청 인터셉터 (request interceptor):
    인증 토큰 자동 주입
    Authorization: Bearer {accessToken} (메모리에서 꺼내 붙임)

응답 인터셉터 (response interceptor):
    401 (인증 만료) → 갱신 토큰으로 재발급 시도
                      (POST /auth/refresh, refreshSessionHandle + HttpOnly 쿠키 자동 전송)
                    → 새 accessToken 발급 후 원래 요청 자동 재시도
    403 (권한 없음) → 다른 지갑 접근 차단 처리
```

---

## 13. 보안 원칙 요약

| 원칙 | 구현 | 이유 |
|------|------|------|
| 개인키 서버 전송 금지 | 브라우저 DB 암호화 저장(IndexedDB AES-GCM), 브라우저에서 직접 서명 | 서버 침해 시 자산 보호 |
| 갱신 토큰 해시 저장 | SHA-256 해시만 DB 저장 (refreshToken) | 원문 유출 방지 |
| 챌린지 단일 사용 + TTL | Redis 5분, used 플래그 | Replay Attack 방지 |
| 공개키 → 주소 재도출 검증 | 인증 시 `deriveAddress(publicKey)` 비교 | 주소 위조 방지 |
| RPC 포트 외부 차단 | Docker 내부망 전용 포트 9776 | 외부에서 직접 RPC 호출 차단 |
| JWT subject == walletAddress | 모든 보호 API에서 강제 검증 | 타인 자산 접근 차단 |
| 유휴 자동 잠금 | 5분 무활동 시 자동 잠금 (WALLET_IDLE_LOCK_MS = 5분) | 방치된 세션 보호 |

---

## 14. 파트별 상세 학습

| 파일 | 내용 |
|------|------|
| [be.md](./be.md) | Spring Boot 구조, JWT, Redis, HikariCP |
| [fe.md](./fe.md) | React Query, Polling, IndexedDB, TX 빌더 |
| [blockchain.md](./blockchain.md) | PoW, UTXO, Commit-Reveal, JSON-RPC |
| [performance-test.md](./performance-test.md) | nGrinder, Cache-Aside, Outbox, N+1 |
