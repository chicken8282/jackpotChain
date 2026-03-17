# JackpotChain 핵심 플로우 정리

> blockchain.md 개념 정리를 기반으로 구현에 필요한 전체 플로우를 작성한 문서
> 수정 예정 사항(채굴 보상 100 JACK, 로또 참여비 100% Pool 적립)이 반영된 최신 버전

---

## 0. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                           EC2 서버                               │
│                                                                 │
│   ┌──────────┐  REST API  ┌──────────┐  Webhook  ┌───────────┐ │
│   │ Frontend │──────────▶│ Backend  │◀──────────│   Server  │ │
│   │ (React)  │◀──────────│(Spring)  │           │   Node    │ │
│   └──────────┘           └────┬─────┘           │(Observer) │ │
│                               │ R/W              │ RPC :8332 │ │
│                          ┌────▼─────┐           │  P2P :8333│ │
│                          │    DB    │           └─────┬─────┘ │
│                          └──────────┘                 │        │
└──────────────────────────────────────────────────────┼────────┘
                                                        │ P2P (8333)
                               ┌────────────────────────┤
                               │   블록체인 P2P 네트워크  │
                          ┌────▼─────┐           ┌──────▼────┐
                          │ TUI 채굴A │           │ TUI 채굴B │
                          │ (로컬 PC) │           │ (로컬 PC) │
                          └──────────┘           └───────────┘
```

| 컴포넌트 | 역할 |
|---------|------|
| **Frontend** | 지갑·로또·교환·채굴 내역 UI. Backend REST API만 호출 |
| **Backend** | REST API, DB 저장·조회, RPC 호출 래핑, 인증 처리 |
| **Server Node** | 24시간 P2P 수신 전용 Observer. RPC 제공. 블록 수신 시 Webhook |
| **TUI 채굴 노드** | 사용자 로컬 PC. 실제 PoW 채굴 수행. 지갑 주소로 보상 수령 |

---

## 1. 키(Key) · 주소 관계 — 지갑의 구성

블록체인 지갑은 세 요소의 단방향 파생 구조로 구성됩니다.

```
private key  (32 bytes, 랜덤 생성)
    │
    │  secp256k1 타원곡선 연산 ← 단방향, 역산 불가
    ▼
public key   (33 bytes, 압축 형태)
    │
    │  SHA256 → RIPEMD-160 → Base58Check 인코딩 ← 단방향
    ▼
address      (사람이 읽을 수 있는 문자열, 예: "JackpotXXXXX...")
```

| 키 | 공개 여부 | 저장 위치 | 사용 시점 |
|----|----------|----------|----------|
| **private key** | 비공개 — 절대 외부 전송 금지 | 로컬 Embedded DB (TUI: JSON/SQLite, 웹: IndexedDB) | TX의 각 input을 서명할 때. 오직 로컬에서만 |
| **public key** | 공개 가능 | TX의 scriptSig에 포함되어 블록체인에 기록 | 다른 노드가 서명을 검증할 때 |
| **address** | 완전 공개 | 블록체인 전체, 서버 DB | TX output의 수신처 지정, 잔액 조회 기준 |

> address만 알아도 public key를, public key만 알아도 private key를 역산하는 것은 수학적으로 불가능합니다.

---

## 2. 지갑 생성 플로우

### 2-1. TUI 환경 지갑 생성

```
[채굴 참여자] TUI 프로그램 설치 후 지갑 생성
      │
      ▼
① secp256k1 키페어 생성
   private_key = os.urandom(32)              ← 32 bytes 랜덤
   public_key  = secp256k1(private_key)      ← 33 bytes 압축 공개키
      │
      ▼
② 지갑 주소 유도
   public_key → SHA256 → RIPEMD-160 → Base58Check
   → address  (예: "JackpotXXXXX...")
   ※ 역산 불가, 같은 public_key → 항상 같은 address
      │
      ▼
③ 저장
   private_key → 로컬 Embedded DB (JSON 파일 or SQLite)
   public_key  → 동일 Embedded DB (참조용)
   address     → TUI에 채굴 보상 수신처로 등록
              → 필요 시 웹사이트에 수동 입력해 조회
```

### 2-2. 웹(브라우저) 환경 지갑 생성

브라우저에서는 **IndexedDB가 Embedded DB** 역할을 합니다.

```
[사용자] 웹사이트에서 지갑 생성 클릭
      │
      ▼
① 브라우저 내 키페어 생성
   @noble/secp256k1 (JS 라이브러리)로 키페어 생성
   private_key, public_key 모두 브라우저 메모리에 존재
      │
      ▼
② 지갑 주소 유도
   public_key → SHA256 → RIPEMD-160 → Base58Check → address
      │
      ▼
③ 저장 분리
   private_key → 브라우저 IndexedDB 저장
                 (AES-GCM으로 비밀번호 암호화 권장)
   address, public_key, 닉네임, 테마
                → Backend API POST /wallet 로 서버 DB 저장

브라우저 저장소 선택 기준:
  IndexedDB   → 구조화 데이터, 대용량, 비동기. private key 보관에 적합
  localStorage → 문자열만, 소용량, 동기. 보안 취약 → 부적합
  sessionStorage → 탭 닫으면 소멸. 영구 보관 불가 → 부적합
```

> **private key는 서버로 전송하지 않습니다.**
> 서버 DB에는 address와 public key 및 UI 메타데이터(닉네임, 테마)만 저장합니다.

---

## 3. TX 서명 방식 — 클라이언트 사이드 서명

UTXO 모델에서 코인을 사용하려면 **내가 해당 UTXO의 주인임을 서명으로 증명**해야 합니다.
서명에는 private key가 필요하므로, 서명은 private key가 있는 곳(브라우저 or TUI)에서 수행됩니다.

### 서명 생성 · 검증 메커니즘

```
[서명 생성 — 로컬]
  sig_hash  = double_SHA256(TX 직렬화 + 이전 output의 scriptPubKey)
  signature = ECDSA_sign(sig_hash, private_key)    ← secp256k1
  input.script_sig = [ signature | public_key ]

[서명 검증 — 모든 노드]
  sig_hash  = double_SHA256(동일 TX 데이터)
  valid     = ECDSA_verify(sig_hash, signature, public_key)
  소유 확인  = hash(public_key) == output의 scriptPubKey?
```

### 웹 환경 클라이언트 사이드 서명 플로우

```
[브라우저]
  ① GET /wallet/{address}/utxos → 사용 가능한 UTXO 목록 수신
  ② TX 구조 조립 (inputs, outputs, version)
  ③ IndexedDB에서 private key 로드
     (저장 시 암호화했다면 사용자 비밀번호로 복호화)
  ④ @noble/secp256k1(JS)로 각 input 서명
     → script_sig = [signature | public_key] 세팅
  ⑤ 서명 완료된 TX를 hex로 직렬화
  ⑥ { signedTxHex: "..." } → Backend POST /tx/broadcast

[Backend]
  ⑦ RPC: sendrawtransaction(signed_tx_hex) 호출

[Server Node]
  ⑧ TX 서명 검증, UTXO 확인, Mempool 추가, P2P 브로드캐스트
```

### MVP 단계 타협안 (서버 지갑)

클라이언트 사이드 서명 구현이 MVP 범위를 초과할 경우,
Server Node 내부 지갑으로 TX를 서명하는 중앙화 방식을 임시 채택할 수 있습니다.

```
MVP (서버 내부 지갑):
  Frontend → Backend → RPC: lottocommit() / exchangetopot()
  → Server Node 내부 지갑으로 TX 생성·서명
  → 사용자 인증은 Bearer Token으로만 처리 (블록체인 수준 서명 없음)

고도화 (클라이언트 사이드 서명):
  Frontend에서 직접 서명 → signed TX만 Backend로 전달
  → private key가 서버에 절대 노출되지 않음
```

---

## 4. TX 생성 ~ 블록 기록 플로우

### 4-1. 전체 흐름

```
[사용자] TX 요청 (로또 참여 / 교환 / 전송)
      │
      ▼
① UTXO 조회
   Backend → RPC: listunspent(address)
   → 내 address로 잠긴 미사용 출력(UTXO) 목록
   → JACK / POT 잔액 확인
      │
      ▼
② TX 구조 생성
   inputs  : 사용할 UTXO 참조 (prev_tx_id + output_index)
   outputs : 수신자 주소(scriptPubKey) + 금액
   version : 1(전송) / 2(교환) / 3(로또커밋) / 5(로또클레임)
      │
      ▼
③ TX 서명  ← private key 사용. 이 단계에서만 사용
   For each input:
     sig_hash = double_SHA256(TX 사본 + prev_scriptPubKey)
     signature = ECDSA_sign(sig_hash, private_key)    ← secp256k1
     input.script_sig = [signature | public_key]

   웹:  브라우저(IndexedDB)에서 로드 후 JS 라이브러리로 서명
   TUI: 로컬 Embedded DB에서 로드 후 Python ECDSA로 서명
      │
      ▼
④ signed TX (hex) → Backend → RPC: sendrawtransaction(hex_tx)
      │
      ▼
⑤ Server Node: TX 유효성 검증
   - ECDSA 서명 검증
   - UTXO 존재 여부 확인 (이중지불 방지)
   - 최소 수수료 확인 (1,000,000 satoshi 이상)
      │
      ▼
⑥ Mempool에 TX 추가
   MempoolEntry { tx, fee, fee_rate(satoshi/byte), size, added_time }
   fee_rate = fee / tx_size 기준 내림차순 정렬 관리
      │
      ▼
⑦ P2P 네트워크 브로드캐스트 (8333 포트)
   INV(TX_TYPE, tx_hash) → 모든 연결된 피어에 전송
   피어 → GETDATA 요청 → 전체 TX 전송
   각 피어도 자신의 Mempool에 추가 후 재전파
   → 네트워크 전체 Mempool에 TX 전파 완료
      │
      ▼
⑧ 채굴 노드(TUI)가 Mempool에서 TX 선택 → 블록에 포함
   (아래 4-2 참고)
      │
      ▼
⑨ 블록 채굴 성공 → 블록 브로드캐스트
   → 모든 노드가 블록 수신 후 체인에 추가
   → TX 상태: Confirmed (블록에 영구 기록)
      │
      ▼
⑩ Server Node 수신 → Webhook → Backend → DB 인덱싱
   → Frontend가 Backend REST API로 조회 가능
```

### 4-2. 채굴자의 Mempool TX 선택 방식

TX를 만든 사람(사용자)과 블록을 만드는 사람(채굴자)은 **다른 주체**입니다.
채굴자는 Mempool의 모든 TX를 포함하지 않고, fee_rate 기준으로 선택합니다.

```
[일반 사용자]                       [채굴자 TUI]
TX 생성 → 서명 → 브로드캐스트  →   Mempool에 TX 도착
                                     ↓
                               fee_rate(satoshi/byte) 내림차순 정렬
                               블록 크기 한도(900KB) 내에서 선택
                               의존성(parent TX) 먼저 포함
                                     ↓
                               블록 템플릿에 TX 추가
                               PoW 채굴 시작
                                     ↓
                               채굴 성공 → 블록 브로드캐스트
                                     ↓
                         내 TX가 해당 블록 안에 영구 기록됨
```

> 수수료가 낮은 TX는 블록 크기 초과 시 다음 블록으로 밀립니다.
> Mempool이 가득 차면 fee_rate 최저 TX부터 퇴출(eviction)됩니다.

---

## 5. 로또 참여 플로우 (Commit / Claim)

### 5-1. Commit 단계 (version=3 TX)

```
[사용자] 6자리 hex 선택 (각 자리 0x0~0xF = 0~15)
      │
      ▼
① Frontend → POST /lotto/commit
   Body: { fromAddress, chosenNumbers: [10, 1, 15, 3, 4, 14] }
      │
      ▼
② Backend 처리
   - 사용자 인증 (Bearer Token)
   - POT 잔액 확인 (RPC: listunspent)
   - RPC: lottocommit(chosen_numbers)
      │
      ▼
③ Server Node: version=3 TX 생성
   input  : 1 POT UTXO (참여 비용)
   output : Jackpot Pool 주소 ← 1 POT 100% 적립  ← 수정 예정
   output : OP_RETURN (commit_hash 데이터 기록)
   output : POT 잔돈 (있을 경우)
      │
      ▼
④ TX 서명 · Mempool 추가 · P2P 브로드캐스트
      │
      ▼
⑤ 채굴자가 블록(높이 N)에 포함 → Confirmed
   결과 비교 블록 : N+3, N+6, N+9, N+12, N+15, N+18
   클레임 가능 창 : 블록 N+18 ~ N+68
      │
      ▼
⑥ Server Node 수신 → Webhook → Backend
   lotto_entry 테이블 INSERT
   { commitHash, walletAddress, chosenNumbers, commitBlockHeight, status=PENDING }
```

### 5-2. Claim 단계 (version=5 TX)

```
[블록 N+18 도달 이후]
      │
      ▼
① Frontend → POST /lotto/claim
   Body: { fromAddress, commitHash }
      │
      ▼
② Backend 검증
   - 현재 블록 높이 >= claimableFromHeight (N+18)
   - 현재 블록 높이 <= claimableUntilHeight (N+68)
   - RPC: lottocheckresult(commit_hash) → 결과 미리 확인
      │
      ▼
③ RPC: lottoclaim(commit_hash)
   비교 블록 6개의 해시에서 마지막 hex digit 추출:
     block_hash_int % 16 = 결과 숫자 (0~15)

   결과 비교:
     블록 N+3  hash 마지막 digit  ↔  chosenNumbers[0]
     블록 N+6  hash 마지막 digit  ↔  chosenNumbers[1]
     블록 N+9  hash 마지막 digit  ↔  chosenNumbers[2]
     블록 N+12 hash 마지막 digit  ↔  chosenNumbers[3]
     블록 N+15 hash 마지막 digit  ↔  chosenNumbers[4]
     블록 N+18 hash 마지막 digit  ↔  chosenNumbers[5]

   일치 개수 → 보상 결정:
     6개 → Jackpot Pool의 50%
     5개 → 100,000 JACK
     4개 →  20,000 JACK
     3개 →   2,000 JACK
     2개 →     300 JACK
     1개 →       1 POT (환불)
     0개 → 없음
      │
      ▼
④ 보상 TX (version=5) 생성 · 브로드캐스트
      │
      ▼
⑤ Server Node 수신 → Webhook → Backend
   lotto_entry 업데이트: status=WON/LOST, rewardJack, claimedAt
```

> **왜 미래 블록 해시로 결과를 결정하나?**
> 커밋 시점에 비교 블록(N+3~N+18)은 아직 존재하지 않습니다.
> 블록 해시는 PoW 채굴 결과이므로 사전 예측·조작이 불가능한 난수 소스입니다.
> 덕분에 운영자도 결과를 미리 알 수 없는 공정한 추첨이 됩니다.

---

## 6. JACK → POT 교환 플로우 (version=2 TX)

### 6-1. 교환 플로우

```
[사용자] 교환 요청: 100 JACK → 1 POT
      │
      ▼
① Frontend → POST /exchange/jack-to-pot
   Body: { fromAddress, jackAmount: 10000000000 }  ← 100 JACK in satoshi
      │
      ▼
② Backend
   - JACK 잔액 확인 (RPC: getbalance)
   - 최소 100 JACK 이상 여부 확인
   - RPC: exchangetopot(jack_amount)
      │
      ▼
③ Server Node: version=2 TX 생성
   input  : JACK UTXO (100 JACK)

   output 구성:
   ┌─────────────────────────────────────────────────────┐
   │ POT output    : 수령자 주소에 1 POT (multi-asset)   │
   │ OP_RETURN     : "EXCHANGE:{jack_burned}" 메타데이터 │
   │ JACK 잔돈     : 남은 JACK → 본인 주소              │
   └─────────────────────────────────────────────────────┘

   JACK은 OP_RETURN output에 담겨 영구 소각(burn)됨
      │
      ▼
④ TX 서명 · Mempool 추가 · P2P 브로드캐스트
      │
      ▼
⑤ 채굴자가 블록에 포함 → POT 잔액 반영
      │
      ▼
⑥ Server Node 수신 → Webhook → Backend
   activity 테이블 INSERT { type=EXCHANGE, jackAmount=-100JACK, potAmount=+1POT }
```

### 6-2. OP_RETURN이란?

OP_RETURN은 블록체인에서 두 가지 목적으로 사용되는 스크립트 타입입니다.

| 용도 | 설명 |
|------|------|
| **코인 소각** | OP_RETURN output에 담긴 코인은 영구 사용 불가. UTXO Set에서 제외됨 |
| **메타데이터 기록** | 금액 없이 데이터(교환 기록, 커밋 해시 등)만 블록체인에 영구 기록 |

```python
# core/transaction.py
def is_op_return(self) -> bool:
    return self.script_pubkey[0] == 0x6a  # OP_RETURN opcode(0x6a)

# 어떤 노드도 이 output을 input으로 참조 불가 → 사실상 영구 소각
```

### 6-3. POT → JACK 역교환이 없는 이유

JACK은 **PoW 채굴을 통해서만 새롭게 생성**되도록 설계된 희소 자산입니다.
역교환을 허용하면 채굴 없이도 JACK을 발행할 수 있어 희소성이 무너집니다.
단방향(JACK→POT)은 의도된 경제 설계이며, FE UI는 단방향으로 구현합니다.

---

## 7. 채굴 플로우

### 7-1. TUI 채굴 전체 흐름

```
[채굴 참여자] 사용자 PC에 TUI 프로그램 설치
      │
      ▼
① 지갑 주소 등록
   - 웹 또는 TUI에서 생성한 지갑 주소를 TUI에 입력
   - 채굴 성공 시 이 주소로 보상 지급
   - private key는 로컬 Embedded DB에 저장
      │
      ▼
② Server Node에 P2P 연결 (8333 포트)
   - TCP 연결 → VERSION 메시지 교환 (핸드셰이크)
   - start_height 비교 → 체인 동기화 (아래 8번 참고)
      │
      ▼
③ 블록 템플릿 생성
   - RPC: getblocktemplate() 또는 직접 Mempool TX 수집
   - Mempool에서 TX 선택 (fee_rate 내림차순, 최대 900KB)
   - Coinbase TX 생성:
       블록 보상 100 JACK → 채굴자 주소  ← 수정 예정 (현재 50 JACK)
       ※ 수수료 Pool/소각 분배 제거 예정 → 채굴자 100% 수령
   - 블록 헤더: prev_block_hash, merkle_root, timestamp, difficulty_target
      │
      ▼
④ PoW 채굴 (nonce brute force)
   target = compact_to_target(difficulty_target)
   for nonce in range(0, 0xFFFFFFFF):
       block.header.nonce = nonce
       block_hash = double_SHA256(header.serialize())
       if int(block_hash, 'big') < target:
           # 채굴 성공!
           break
      │
      ▼
⑤ 채굴 성공 → 블록 브로드캐스트 (P2P)
   INV(BLOCK_TYPE, block_hash) → 모든 연결 피어에 전송
   피어 → GETDATA 요청 → 전체 블록 전송
   피어들이 블록 검증 후 체인에 추가 → 재전파
   → 네트워크 전체에 블록 전파 완료
      │
      ▼
⑥ Server Node(Observer)가 블록 수신
   → Webhook: HTTP POST /internal/new-block → Backend
   → Backend가 블록 파싱 · DB 저장:
       block 테이블 : height, hash, miner_address, reward_jack
       miner_address = coinbase TX output[0]의 수신 address
      │
      ▼
⑦ 웹페이지에서 채굴 결과 조회
   Frontend → GET /mining/blocks?address={채굴자주소}
   Backend → DB: block 테이블에서 miner_address 필터링
   → 채굴 블록 목록, 보상, 채굴 일시 표시
```

### 7-2. 채굴 보상 구조 (수정 예정 반영)

```
채굴 보상 (수정 예정):
  블록 생성 성공 → 채굴자 100 JACK (100%)
  TX 수수료 분배 → 채굴자 100% (Pool/소각 비율 제거)

Jackpot Pool 형성:
  사용자 로또 참여 1 POT → 100% Jackpot Pool 적립
  Pool 잔액 = 당첨 시 지급 재원
```

| 항목 | 현재 코드 | 수정 예정 | 수정 위치 |
|------|----------|----------|----------|
| 블록 채굴 보상 | 50 JACK | **100 JACK** | `constants.py BLOCK_REWARD` |
| 채굴자 수수료 비율 | 50% | **100%** | `constants.py FEE_MINER_RATIO` |
| Pool 수수료 비율 | 30% | **0%** | `constants.py FEE_JACKPOT_RATIO` |
| 소각 수수료 비율 | 20% | **0%** | `constants.py FEE_BURN_RATIO` |
| 로또 참여비 Pool 비율 | 80% | **100%** | `constants.py LOTTO_POOL_RATIO` |
| 로또 참여비 소각 비율 | 19% | **0%** | `constants.py LOTTO_BURN_RATIO` |
| 로또 채굴자 비율 | 1% | **0%** | `constants.py LOTTO_MINER_RATIO` |

---

## 8. Server Node 블록 수신 → Backend Webhook 플로우

### 8-1. Webhook 연동 전체 흐름

Server Node의 `node.py`에 `_on_block` 콜백이 구현되어 있어,
블록 수신 즉시 Backend에 HTTP POST(Webhook)를 보낼 수 있습니다.

```
① 채굴 노드 → 블록 채굴 성공 → P2P 브로드캐스트
      │
      ▼
② Server Node → _handle_block() 이벤트 발생
      │
      ▼
③ Server Node → HTTP POST http://backend:8080/internal/new-block
   payload: { height, hash, prevHash, minedAt, txList: [...] }
      │
      ▼
④ Backend /internal/new-block 수신 → 파싱 · DB 저장
   ┌──────────────────────────────────────────────────────┐
   │ block 테이블       height, hash, miner_address, ...  │
   │ transaction 테이블 version별 TX 파싱 및 저장          │
   │ lotto_entry 테이블 v=3→PENDING 등록 / v=5→WON/LOST  │
   │ jackpot_pool 테이블 Pool 주소 UTXO 합산 갱신         │
   │ activity 테이블    주소별 활동 내역 인덱싱            │
   └──────────────────────────────────────────────────────┘
      │
      ▼
⑤ Frontend → GET /wallet/{address}/activities
   Backend → DB SELECT → 즉시 응답 (RPC 호출 없음)
```

### 8-2. Webhook 구현 코드 예시

```python
# Server Node (Python) — node.py에 추가
import aiohttp

async def notify_backend(block: Block, peer: PeerInfo):
    payload = serialize_block_to_json(block)
    async with aiohttp.ClientSession() as session:
        await session.post(
            "http://localhost:8080/internal/new-block",
            json=payload
        )

node.set_block_callback(notify_backend)
```

```java
// Backend (Spring) — 내부 전용 엔드포인트, 외부 노출 X
@PostMapping("/internal/new-block")
public void receiveNewBlock(@RequestBody BlockPayload payload) {
    blockService.save(payload);          // block 테이블 저장
    indexingService.indexBlock(payload); // 나머지 테이블 인덱싱
}
```

### 8-3. Webhook 유실 대비 — catchup 로직

Backend 재시작 시 누락된 블록을 RPC로 보정합니다.

```java
// Backend 시작 시 실행
@PostConstruct
public void catchup() {
    long dbHeight  = blockRepository.getMaxHeight();    // DB 최신 높이
    long rpcHeight = rpcClient.getBlockCount();         // 노드 최신 높이
    for (long h = dbHeight + 1; h <= rpcHeight; h++) {
        String hash  = rpcClient.getBlockHash(h);
        Block  block = rpcClient.getBlock(hash);
        indexingService.indexBlock(block);  // 누락 블록 보정
    }
}
```

---

## 9. P2P 노드 연결 — VERSION 핸드셰이크 · 블록 동기화

### 9-1. VERSION 메시지 구조

두 노드가 처음 TCP 연결을 맺을 때 교환하는 상태 정보입니다.

```python
# network/protocol.py
@dataclass
class VersionMessage:
    version: int        # 프로토콜 버전 (현재 70015)
    services: int       # 지원 서비스 비트플래그 (1 = 풀노드)
    timestamp: int      # 현재 Unix 타임스탬프
    addr_recv_ip: bytes # 상대방 IP (내가 인식하는)
    addr_recv_port: int # 상대방 포트
    addr_trans_ip: bytes# 내 IP
    addr_trans_port: int# 내 포트
    nonce: int          # 랜덤값 (자기 자신 연결 감지)
    user_agent: bytes   # "/JackpotChain:0.1.0/"
    start_height: int   # 내가 보유한 최신 블록 높이  ← 핵심
    relay: bool         # TX 릴레이 수락 여부
```

### 9-2. 핸드셰이크 순서

```
TUI 노드 A                              Server Node B

① TCP connect 8333 ─────────────────▶ 연결 수락
② VERSION(start_height=500) ─────────▶ 수신
                                        ├── A의 블록 높이: 500 파악
                                        └── VERACK 전송
③ VERACK 수신 ◀──────────────────────
                                 ◀──── VERSION(start_height=1042) 전송
④ B의 높이 1042 파악
   └── 내(A) 높이 500 < B 높이 1042 → 내가 뒤처짐
⑤ VERACK 전송 ─────────────────────▶

✅ 핸드셰이크 완료 → 블록 동기화 시작
```

### 9-3. 블록 높이 비교 후 동기화

```
경우 1: 내 높이 < 상대방 높이  (내가 뒤처짐)
  A → B : GETBLOCKS (내가 아는 마지막 block hash 목록)
  B → A : INV      (A가 모르는 블록 해시들)
  A → B : GETDATA  (각 블록 hash 요청)
  B → A : BLOCK    (블록 전체 데이터)
  A : 블록 검증 후 체인에 추가
  위 과정 반복 → 내 높이 == 상대방 높이까지

경우 2: 내 높이 > 상대방 높이  (상대방이 뒤처짐)
  역할이 뒤바뀌어 상대방이 나에게 동일 과정 수행

경우 3: 내 높이 == 상대방 높이
  동기화 완료. 새 블록 수신 대기 상태
```

### 9-4. 프로토콜 버전 충돌 처리

새로운 TX 유형 추가나 기능 변경 시 `version` 번호가 올라갑니다.

```
시나리오:
  노드 A: version=70015 (구버전)
  노드 B: version=70016 (신버전, 새 TX 유형 추가됨)

처리 방식:
  ① MIN_VERSION 미만 → 연결 거부
     MIN_VERSION=70015 설정 시 70014 이하 노드는 즉시 연결 종료
  ② MIN_VERSION 이상 → 연결 허용, 공통 기능만 사용
     A는 새 TX 유형을 이해 못해도 기존 TX 처리는 정상
  ③ services 비트플래그로 기능 협상
     services bit X = 새 TX 유형 지원 여부 → 지원 시에만 해당 TX 전파

소프트 포크 (하위 호환):
  새 규칙이 기존보다 엄격해지는 경우
  구버전 노드도 새 블록을 유효하다고 인정 → 점진적 업그레이드 가능

하드 포크 (하위 비호환):
  새 규칙이 기존과 충돌하는 경우
  구버전 노드와 신버전 노드가 서로 다른 블록을 유효하다고 판단
  → 체인이 두 갈래로 분기
  → JackpotChain 규모에서는 모든 노드 동시 업그레이드가 현실적
```

---

## 10. 전체 데이터 흐름 요약

```
[지갑 생성]
  웹  : 브라우저에서 키 생성 → private key → IndexedDB
        address, public key → Backend DB (메타데이터)
  TUI : 로컬에서 키 생성 → private key → Embedded DB
        address → TUI 채굴 보상 등록

[TX 생성 (로또/교환/전송)]
  웹  : IndexedDB에서 private key 로드 → JS 서명 → signed TX → Backend → RPC
  TUI : Embedded DB에서 private key 로드 → Python 서명 → RPC 직접 호출

[TX 전파]
  Server Node → Mempool 추가 → P2P → 전체 노드 Mempool에 전파

[블록 생성]
  TUI 채굴자 → Mempool TX 선택(fee 순) → PoW → 블록 브로드캐스트

[블록 인덱싱]
  Server Node 수신
    → _on_block 콜백 → Webhook POST /internal/new-block
    → Backend 파싱 · DB 저장
      (block / transaction / lotto_entry / jackpot_pool / activity)

[조회]
  Frontend → Backend REST API → DB SELECT → 즉시 응답
  잔액만  : Backend → RPC getbalance / listunspent → 응답

[채굴 내역 조회]
  Frontend → GET /mining/blocks?address={지갑주소}
  Backend  → DB: block.miner_address = coinbase output[0].address로 매핑
```

---

## 부록. RPC 호출이 필요한 항목 vs DB 조회로 대체 가능한 항목

| 기능 | 방식 | 이유 |
|------|------|------|
| JACK 잔액 | **RPC** `getbalance` | 최신 UTXO 상태는 항상 노드 기준 |
| POT 잔액 | **RPC** `listunspent` 파싱 | multi-asset UTXO 집계 |
| 활동 내역 | **DB SELECT** | Webhook으로 인덱싱 완료 |
| 로또 참여 내역 | **DB SELECT** | Webhook으로 인덱싱 완료 |
| 채굴 블록 내역 | **DB SELECT** | coinbase miner_address 인덱싱 완료 |
| 블록체인 info | **RPC** `getblockchaininfo` | 실시간 체인 상태 필요 |
| 잭팟 풀 잔액 | **DB SELECT** (캐시) + RPC 검증 | 빠른 응답 + 정확성 |
| 로또 결과 확인 | **RPC** `lottocheckresult` | 비교 블록 해시는 노드에서 계산 |
