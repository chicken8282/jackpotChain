# JackpotChain 블록체인 개념 정리

> jackpotchain 코드 기반 실제 구현을 기준으로 작성한 개념 정리 문서

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                           EC2 서버                               │
│                                                                 │
│   ┌──────────┐  REST API  ┌──────────┐  Webhook  ┌───────────┐ │
│   │ Frontend │──────────▶│ Backend  │◀──────────│   Server  │ │
│   │ (React)  │◀──────────│(REST API)│           │   Node    │ │
│   └──────────┘           └────┬─────┘           │(Observer) │ │
│                               │ DB R/W           │ RPC :8332 │ │
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

### 각 컴포넌트 역할

| 컴포넌트 | 역할 |
|---------|------|
| **Frontend (React)** | 지갑·로또·교환·채굴 내역 UI. Backend REST API만 호출 |
| **Backend (Spring)** | REST API 제공, DB 저장·조회, RPC 호출, 인증 처리 |
| **Server Node (Observer)** | 24시간 상시 구동. P2P 네트워크에서 블록·TX 수신. RPC(8332) 제공. 블록 수신 시 Backend에 Webhook 전송 |
| **TUI 채굴 노드** | 사용자 로컬 PC에서 실행. 실제 PoW 채굴 수행. 채굴 보상을 받을 지갑 주소 등록 |

> **Server Node는 채굴하지 않습니다.**
> 네트워크에서 오는 블록·TX를 수신하고, Backend가 DB에 인덱싱할 수 있도록 Webhook으로 통보하는 관찰자(Observer) 역할입니다.

---

## 2. 키(Key)와 지갑 주소의 관계

블록체인에서 지갑은 세 가지 요소로 구성됩니다.

```
private key (32 bytes, 랜덤)
    │
    │ secp256k1 타원곡선 연산 (단방향, 역산 불가)
    ▼
public key (33 bytes, 압축 형태)
    │
    │ SHA256 → RIPEMD-160 → Base58Check 인코딩 (단방향)
    ▼
address (사람이 읽을 수 있는 문자열, 예: "JackpotXXXXX...")
```

| 키 | 공개 여부 | 저장 위치 | 사용 시점 |
|----|----------|----------|----------|
| **private key** | 비공개 (절대 외부 전송 금지) | 로컬 Embedded DB | TX 서명 시, 내 소유임을 증명 |
| **public key** | 공개 가능 | TX의 scriptSig에 포함 | 네트워크 노드가 서명 검증 시 |
| **address** | 완전 공개 | 블록체인 전체 | TX output의 수신처, 잔액 조회 기준 |

세 값은 모두 수학적으로 연결되어 있지만 **역산이 불가능**합니다.
address만 알아도 private key를 알아낼 수 없습니다.

---

## 3. 지갑 생성 방식: 웹 vs TUI

### TUI 환경의 지갑 생성

TUI(터미널 프로그램)에서 지갑을 생성하면 키페어가 로컬 PC의 Embedded DB(파일 기반 JSON 또는 SQLite)에 저장됩니다.

```
TUI 실행
  → secp256k1 키페어 생성 (private key, public key)
  → address 유도
  → private key → 로컬 Embedded DB 저장
  → address → 채굴 보상 수신처로 등록
```

### 웹 환경의 지갑 생성

웹 브라우저에서 지갑을 생성할 경우, **브라우저 자체가 Embedded DB** 역할을 합니다.

```
브라우저에서 지갑 생성 클릭
  → JS 라이브러리(@noble/secp256k1 등)로 키페어 생성
  → address 유도
  → private key → 브라우저 IndexedDB에 저장  ← 이것이 웹의 Embedded DB
  → address, public key → 서버에 등록 (닉네임, 테마 등 메타데이터와 함께)
```

브라우저의 **IndexedDB**는 브라우저가 제공하는 로컬 스토리지로, 같은 도메인에서만 접근 가능하며 서버에 전송되지 않습니다.

```
브라우저 저장소 선택 기준:
  IndexedDB  → 구조화된 데이터, 대용량, 비동기. private key 저장에 적합
  localStorage → 문자열만, 소용량, 동기. private key 저장에 부적합 (보안 취약)
  sessionStorage → 탭 닫으면 삭제. 영구 보관 불가
```

> **보안 강화**: IndexedDB에 private key를 저장할 때 사용자 비밀번호로 AES-GCM 암호화 후 저장하는 것을 권장합니다.
> 복호화는 사용자가 비밀번호를 입력할 때만 메모리에서 수행합니다.

---

## 4. 트랜잭션 서명과 클라이언트 사이드 서명

> ✅ **선택된 방안: 클라이언트 사이드 서명 플로우** — private key는 브라우저 IndexedDB에만 보관하며, 서명은 브라우저에서 수행 후 signed TX hex만 서버에 전달합니다. MVP 타협안(Server Node 내부 지갑)은 사용하지 않습니다.

### TX 서명이 필요한 이유

UTXO 모델에서 "내 코인을 사용한다"는 것은 **내가 해당 UTXO의 주인임을 증명**하는 것입니다.
이 증명은 private key로 TX에 서명함으로써 이루어집니다.

```
서명 생성 과정:
  sig_hash  = double_SHA256(TX 직렬화 데이터 + 이전 output의 scriptPubKey)
  signature = ECDSA_sign(sig_hash, private_key)   ← secp256k1
  input.script_sig = [signature | public_key]

서명 검증 과정 (다른 노드에서):
  sig_hash  = double_SHA256(동일한 TX 데이터)
  valid     = ECDSA_verify(sig_hash, signature, public_key)
  address   = hash(public_key) == output의 scriptPubKey?  ← 주인 확인
```

### 클라이언트 사이드 서명 플로우 (웹 환경)

private key는 절대 서버로 전송해서는 안 됩니다.
서명은 반드시 **private key가 있는 곳(브라우저)에서** 이루어져야 합니다.

```
[브라우저]
  ① UTXO 조회 → Backend API 호출 → 내 address의 미사용 출력 목록 수신
  ② TX 구조 조립 (inputs, outputs, version 등)
  ③ IndexedDB에서 private key 로드 (필요 시 비밀번호로 복호화)
  ④ secp256k1 라이브러리(JS)로 각 input에 서명
     → script_sig = [signature | public_key] 설정
  ⑤ 서명 완료된 TX를 hex로 직렬화
  ⑥ signed_tx_hex → Backend로 전송

[Backend]
  ⑦ POST /tx/broadcast { signedTxHex: "..." }
  ⑧ RPC: sendrawtransaction(signed_tx_hex)

[Server Node]
  ⑨ TX 검증 (서명, UTXO 존재, 이중지불 여부)
  ⑩ Mempool 추가 → P2P 브로드캐스트
```

**private key는 브라우저 메모리 내에서만 사용되고 네트워크로 나가지 않습니다.**

### MVP 단계 타협안

클라이언트 사이드 서명 구현이 복잡하다면, MVP 단계에서는 **Server Node 내부 지갑**을 사용할 수 있습니다.
이 경우 서비스가 사용자 대신 TX를 서명하는 구조로, 중앙화 거래소와 유사한 형태입니다.

```
MVP 구조 (Server Node 내부 지갑):
  Frontend → Backend → RPC: lottocommit()
  → Server Node 내부 지갑으로 TX 생성·서명
  → 사용자 인증은 Bearer Token으로만 처리

고도화 구조 (클라이언트 사이드 서명):
  Frontend에서 직접 서명 후 signed TX만 Backend에 전달
  → private key가 서버에 절대 노출되지 않음
```

---

## 5. 트랜잭션 생성부터 블록 기록까지

### 전체 흐름

```
사용자 TX 요청 (로또 참여 / 교환 / 전송)
      │
      ▼
① 브라우저 or TUI에서 UTXO 조회
   → 내 address 기준으로 사용 가능한 UTXO 확인
      │
      ▼
② TX 구조 생성
   inputs  : 사용할 UTXO 참조 (prev_tx_id + output_index)
   outputs : 받는 사람 주소 + 금액
   version : 1(전송) / 2(교환) / 3(로또커밋) / 5(로또클레임)
      │
      ▼
③ Private key로 각 input 서명 (로컬에서만)
      │
      ▼
④ signed TX → Backend → RPC: sendrawtransaction(hex)
      │
      ▼
⑤ Server Node: TX 유효성 검증
   - 서명 검증 (ECDSA)
   - UTXO 존재 여부 확인
   - 이중지불 방지
   - 최소 수수료 확인
      │
      ▼
⑥ Mempool에 추가
   fee_rate(satoshi/byte) 기준으로 정렬 관리
      │
      ▼
⑦ P2P 네트워크로 TX 브로드캐스트
   INV(TX_TYPE, tx_hash) → 연결된 모든 피어
   피어 GETDATA 요청 → 전체 TX 전송
   각 피어도 자신의 Mempool에 추가 후 재전파
      │
      ▼
⑧ 채굴자(TUI)가 Mempool에서 TX 선택 → 블록에 포함
   fee_rate 높은 순으로 선택 (최대 900KB)
      │
      ▼
⑨ PoW 채굴 성공 → 블록 브로드캐스트
   → 모든 노드가 블록 수신 후 체인에 추가
   → TX 상태: Confirmed (블록에 영구 기록)
```

### TX를 만든 사람 ≠ 블록을 만드는 사람

블록체인에서 TX 생성과 블록 생성은 완전히 별개입니다.

```
[일반 사용자]                        [채굴자]
TX 생성 → 서명 → 브로드캐스트   →   Mempool에 TX 도착
                                      ↓
                               fee_rate 높은 순으로 TX 선택
                               블록 템플릿에 포함
                               PoW 채굴 (nonce 대입 반복)
                                      ↓
                               채굴 성공 → 블록 브로드캐스트
                                      ↓
                          내 TX가 해당 블록 안에 영구 기록됨
```

채굴자는 mempool에 있는 모든 TX를 포함하지 않습니다.
`fee_rate(satoshi/byte)` 기준으로 높은 순서대로 선택하며, 블록 크기(900KB) 한도 내에서만 담습니다.
수수료가 낮은 TX는 여러 블록을 기다릴 수도 있습니다.

---

## 6. 로또 참여 TX 상세 (version=3 Commit / version=5 Claim)

### Commit 단계

```
사용자가 6자리 hex 선택 (각 자리 0x0~0xF = 0~15)
      │
      ▼
version=3 TX 생성:
  input  : 1 POT UTXO
  output : Jackpot Pool 주소 (0.80 POT = 80%)  ✅ 선택된 비율
  output : OP_RETURN 소각 (0.19 POT = 19%)
  output : 채굴자 (0.01 POT = 1%)
  output : OP_RETURN (commit_hash 기록)
  output : POT 잔돈 (있을 경우)
      │
      ▼
TX가 블록 N에 포함 → 확정
  결과 비교 블록: N+3, N+6, N+9, N+12, N+15, N+18
  클레임 가능 기간: N+18 ~ N+68 블록 사이
```

### Claim 단계 (N+18 이후 가능)

```
version=5 TX 생성:
  비교 블록 6개의 해시에서 마지막 hex digit 추출
    block_hash_int % 16 = 결과 숫자 (0~15)

  결과 숫자 vs 선택 숫자 비교:
    블록 N+3  hash 마지막 digit ↔ 선택 숫자[0]
    블록 N+6  hash 마지막 digit ↔ 선택 숫자[1]
    블록 N+9  hash 마지막 digit ↔ 선택 숫자[2]
    블록 N+12 hash 마지막 digit ↔ 선택 숫자[3]
    블록 N+15 hash 마지막 digit ↔ 선택 숫자[4]
    블록 N+18 hash 마지막 digit ↔ 선택 숫자[5]

  일치 개수에 따라 보상:
    6개 → Jackpot Pool의 50%
    5개 → 100,000 JACK
    4개 → 20,000 JACK
    3개 → 2,000 JACK
    2개 → 300 JACK
    1개 → 1 POT 환불
    0개 → 없음
```

### 왜 미래 블록 해시로 결과를 결정하나?

커밋 시점에는 N+3~N+18 블록이 아직 존재하지 않기 때문에, **어느 누구도 결과를 미리 알거나 조작할 수 없습니다.**
블록 해시는 PoW 채굴 결과이므로 사전 예측이 불가능한 난수 소스입니다.

---

## 7. JACK → POT 교환과 단방향 구조 (version=2)

> ✅ **선택된 방안: JACK → POT 단방향 교환만** — POT → JACK 역교환은 지원하지 않습니다. FE UI도 단방향(JACK → POT)으로만 구현합니다.

### 교환 TX 구조

```
input  : JACK UTXO (100 JACK)
output : POT UTXO (1 POT, multi-asset 형태로 address에 지급)
output : OP_RETURN (교환 기록 메타데이터)
output : JACK 잔돈 (있을 경우)
```

### POT → JACK 역교환이 없는 이유

JACK은 **채굴(PoW)을 통해서만 새롭게 생성**됩니다.
만약 역교환을 허용하면 채굴 없이도 JACK을 찍어낼 수 있어 희소성이 무너집니다.
이는 의도된 경제 설계입니다. FE UI는 단방향(JACK→POT)으로만 구현합니다.

### OP_RETURN이란?

OP_RETURN은 블록체인에서 두 가지 용도로 사용됩니다.

| 용도 | 설명 |
|------|------|
| **코인 소각** | OP_RETURN output에 담긴 코인은 영구적으로 사용 불가. UTXO Set에서 제외 |
| **메타데이터 기록** | 금액 없이 데이터만 블록체인에 영구 기록 (교환 기록, 커밋 해시 등) |

```python
# core/transaction.py
def is_op_return(self) -> bool:
    return self.script_pubkey[0] == 0x6a  # OP_RETURN opcode

# 누구도 이 output을 input으로 참조할 수 없음 → 사실상 소각
```

---

## 8. 채굴(Mining) 플로우

### TUI 채굴 참여 흐름

```
① TUI 설치 및 지갑 주소 등록
   - 웹이나 TUI에서 생성한 지갑 주소를 채굴 보상 수신처로 등록
   - private key는 TUI 로컬 Embedded DB에 저장

② Server Node에 P2P 연결 (8333 포트)
   - VERSION 메시지 교환(핸드셰이크) → 블록 동기화
   - 체인 tip을 맞춘 후 채굴 시작

③ 블록 템플릿 생성
   - Mempool에서 TX 선택 (fee_rate 높은 순, 900KB 이하)
   - Coinbase TX 생성:
       블록 보상 100 JACK → 채굴자 주소 (수정 예정)
   - 블록 헤더: prev_block_hash, merkle_root, timestamp, difficulty_target

④ PoW 채굴 (nonce brute force)
   target = compact_to_target(difficulty_target)
   for nonce in 0 ~ 0xFFFFFFFF:
       block_hash = double_SHA256(header)
       if block_hash < target: 채굴 성공!

⑤ 채굴 성공 → 블록 브로드캐스트
   INV(BLOCK_TYPE, block_hash) → 모든 연결 피어
   피어들이 블록 검증 후 체인에 추가 → 재전파

⑥ Server Node가 블록 수신 → Webhook → Backend → DB 저장
⑦ 웹에서 GET /mining/blocks?address={채굴자주소} 로 채굴 내역 조회
```

### 채굴 보상과 Jackpot Pool 형성

```
채굴 보상 ✅:
  블록 생성 성공 → 채굴자에게 100 JACK (100%)

Jackpot Pool 형성 ✅:
  사용자가 로또 참여 시 1 POT → Pool 80% / 소각 19% / 채굴자 1%
  Pool에 쌓인 JACK이 당첨자에게 지급됨
```

---

## 9. Server Node 블록 수신과 Backend 연동 (Webhook 방식)

> ✅ **선택된 방안: Webhook 방식** — Server Node가 블록 수신 시 Backend 내부 엔드포인트로 HTTP POST를 전송, Backend가 블록·TX를 파싱하여 DB에 인덱싱합니다. 매번 RPC를 호출하는 Polling 방식 대신 이 방식을 사용합니다.

### 왜 Webhook 방식인가?

Server Node(`node.py`)에는 블록 수신 시 콜백을 실행하는 메커니즘이 이미 구현되어 있습니다.

```python
# network/node.py
self._on_block: Optional[Callable[[Block, PeerInfo], None]] = None

def set_block_callback(self, callback: Callable):
    self._on_block = callback

async def _handle_block(self, block, peer):
    # 블록 검증 ...
    if self._on_block:
        self._on_block(block, peer)  # ← 블록 수신 즉시 콜백 실행
```

이 콜백에서 **Backend의 내부 엔드포인트로 HTTP POST를 보내는 것이 Webhook 방식**입니다.

### Webhook 연동 전체 흐름

```
① 채굴 노드 → 블록 브로드캐스트 (P2P)
      │
      ▼
② Server Node → 블록 수신 (_handle_block 이벤트 발생)
      │
      ▼
③ Server Node → HTTP POST http://backend/internal/new-block
   payload: 블록 직렬화 데이터 (height, hash, TX 목록 등)
      │
      ▼
④ Backend → 블록 파싱 · DB 저장
   - block 테이블: height, hash, miner_address, reward_jack
   - transaction 테이블: 블록 내 모든 TX (version별 파싱)
   - lotto_entry 테이블: version=3 → PENDING, version=5 → WON/LOST
   - jackpot_pool 테이블: 풀 잔액 갱신
   - activity 테이블: 주소별 활동 내역 인덱싱
      │
      ▼
⑤ Frontend → GET /wallet/{address}/activities
   Backend → DB SELECT (즉시 응답, RPC 호출 없음)
```

### 활동 내역 조회에 listtransactions RPC가 필요한가?

**필요하지 않습니다.**

Webhook 방식을 채택하면 블록 수신 시점에 Backend가 이미 TX를 파싱해 DB에 저장합니다.
프론트엔드가 활동 내역을 요청할 때는 Backend가 **DB를 조회**하면 됩니다.
매번 RPC를 호출할 필요가 없으며, `listtransactions`를 새로 구현할 필요도 없습니다.

```
RPC listtransactions가 필요한 경우:
  DB 인덱싱 없이 매번 실시간으로 노드에서 TX 조회할 때

Webhook + DB 인덱싱을 사용하면:
  활동 내역 → DB SELECT (빠름, RPC 호출 없음)
  잔액 조회 → RPC getbalance / listunspent (현재 상태 확인 필요)
  블록 정보 → DB SELECT (이미 저장됨)
```

### Backend 내부 Webhook 엔드포인트 예시

```java
// Backend - 내부 수신 전용 (외부 노출 X)
@PostMapping("/internal/new-block")
public void receiveNewBlock(@RequestBody BlockPayload payload) {
    // 블록 저장
    blockService.save(payload);
    // TX 파싱 → activity, lotto_entry, jackpot_pool 업데이트
    indexingService.indexBlock(payload);
}
```

```python
# Server Node - _on_block 콜백에서 호출
import aiohttp

async def notify_backend(block: Block, peer: PeerInfo):
    payload = serialize_block_to_json(block)
    async with aiohttp.ClientSession() as session:
        await session.post("http://localhost:8080/internal/new-block", json=payload)

node.set_block_callback(notify_backend)
```

---

## 10. VERSION 메시지와 블록 높이 동기화

### VERSION 메시지란?

두 노드가 P2P로 처음 연결될 때 서로의 상태를 교환하는 메시지입니다.

```python
# network/protocol.py
@dataclass
class VersionMessage:
    version: int       # 프로토콜 버전 (현재 70015)
    services: int      # 지원 서비스 비트플래그 (1 = 풀노드)
    timestamp: int     # 현재 Unix 타임스탬프
    addr_recv_ip: bytes    # 상대방 IP
    addr_recv_port: int    # 상대방 포트
    addr_trans_ip: bytes   # 내 IP
    addr_trans_port: int   # 내 포트
    nonce: int         # 랜덤값 (자기 자신 연결 감지용)
    user_agent: bytes  # "/JackpotChain:0.1.0/"
    start_height: int  # 내가 보유한 최신 블록 높이
    relay: bool        # TX 릴레이 수락 여부
```

### 핸드셰이크 순서

```
노드 A (TUI)                     노드 B (Server Node)

connect TCP 8333 ──────────────▶ 연결 수락
VERSION(start_height=500) ─────▶ 수신
                                 ├── A의 높이: 500 파악
                                 └── VERACK 전송
VERACK 수신 ◀───────────────────
                          ◀───── VERSION(start_height=1042) 전송
수신: B의 높이 1042 파악
└── 나(A)는 500, B는 1042 → 내가 뒤처짐
VERACK 전송 ─────────────────▶
✅ 핸드셰이크 완료
```

### 블록 높이 비교 후 동기화

핸드셰이크로 서로의 `start_height`를 확인한 뒤, 뒤처진 쪽이 블록을 요청합니다.

```
내 높이 < 상대방 높이 (내가 뒤처진 경우)
  → 내가 GETBLOCKS 메시지 전송 (내 block locator 포함)
  → 상대방이 INV 메시지로 모르는 블록 해시 목록 전송
  → 나는 GETDATA로 블록 하나씩 요청
  → 상대방이 BLOCK 메시지로 전체 블록 전송
  → 나는 블록 검증 후 체인에 추가
  → 내 높이 == 상대방 높이가 될 때까지 반복

내 높이 > 상대방 높이 (상대방이 뒤처진 경우)
  → 상대방이 동일한 방식으로 나에게 블록 요청
  → 나는 요청받은 블록을 전송

내 높이 == 상대방 높이
  → 이미 동기화됨, 새 블록 수신 대기
```

```
P2P 메시지 흐름:
  A → B : GETBLOCKS (내가 아는 마지막 block hash 목록)
  B → A : INV (A가 모르는 블록 해시들)
  A → B : GETDATA (각 블록 hash 요청)
  B → A : BLOCK (블록 전체 데이터)
  반복...
```

### 프로토콜 버전 충돌 처리

`version` 필드는 프로토콜 자체의 버전을 나타냅니다.
새로운 기능(예: 새로운 TX 유형 추가)이 생기면 이 버전 번호가 올라갑니다.

```
버전 충돌 시나리오:
  노드 A: version=70015 (구버전)
  노드 B: version=70016 (신버전, 새 TX 유형 추가됨)

처리 방식:
  ① 최소 지원 버전(MIN_VERSION) 이하면 연결 거부
     예: MIN_VERSION=70015 설정 시 70014 이하 노드는 거부

  ② 최소 버전 이상이면 연결 허용, 하위 호환 기능만 사용
     예: A는 새 TX 유형을 이해 못해도 기존 TX는 정상 처리

  ③ services 비트플래그로 기능 협상
     예: services bit 2 = 새 TX 유형 지원 여부
```

```
소프트 포크 (하위 호환):
  새 규칙이 기존 규칙보다 엄격해지는 경우
  구버전 노드도 새 블록을 유효하다고 인정 (단, 새 기능 이해 불가)
  → 점진적 업그레이드 가능

하드 포크 (하위 비호환):
  새 규칙이 기존 규칙과 충돌하는 경우
  구버전 노드와 신버전 노드가 서로 다른 체인을 따름
  → 모든 노드가 동시에 업그레이드해야 함
```

JackpotChain 같은 소규모 네트워크에서는 **모든 노드(Server Node, TUI)를 동시에 업그레이드**하는 방식이 현실적입니다.

---

## 11. 전체 데이터 흐름 요약

```
[지갑 생성]
  웹: 브라우저에서 키 생성 → IndexedDB에 private key 저장
  TUI: 로컬 PC에서 키 생성 → Embedded DB에 private key 저장
  공통: address는 서버에 등록 (닉네임, 색상 등 메타데이터)

[TX 생성 (로또/교환)]
  브라우저: IndexedDB에서 private key 로드 → 서명 → signed TX hex → Backend → RPC

[TX 전파]
  Server Node → Mempool 추가 → P2P 브로드캐스트 → 전체 노드 Mempool에 전파

[블록 생성]
  TUI 채굴자 → Mempool에서 TX 선택(fee 순) → PoW 채굴 → 블록 브로드캐스트

[블록 인덱싱]
  Server Node 수신 → Webhook → Backend → DB 저장
  (block, transaction, lotto_entry, jackpot_pool, activity 테이블)

[조회]
  Frontend → Backend REST API → DB SELECT → 응답
  잔액만: Backend → RPC getbalance/listunspent → 응답
```

---

## 12. 수수료 구조 (✅ 선택된 방안 확정)

| 항목 | 기존 코드 | ✅ 선택된 방안 |
|------|----------|--------------:|
| 블록 채굴 보상 | 50 JACK | **100 JACK** ✅ |
| 블록 보상 수령자 | 채굴자 50% / Pool 30% / 소각 20% | **채굴자 100%** ✅ |
| 로또 참여비(1 POT) | Pool 80% / 소각 19% / 채굴자 1% | **Pool 80% / 소각 19% / 채굴자 1% (기존 유지)** ✅ |

> **결정 근거**: 블록 보상은 채굴자에게 100% 귀속시켜 채굴 인센티브를 극대화하고,
> 로또 참여비 분배는 기존 구조(Pool 80% / 소각 19% / 채굴자 1%)를 그대로 유지합니다.
> "수정 예정"이었던 로또 Pool 100% 안은 채택하지 않습니다.

수정 위치: `jackpotchain/constants.py`
```python
BLOCK_REWARD      = 100 * COIN   # ✅ 50 → 100
FEE_MINER_RATIO   = 1.00         # ✅ 0.50 → 1.00
FEE_JACKPOT_RATIO = 0.00         # ✅ 0.30 → 0.00
FEE_BURN_RATIO    = 0.00         # ✅ 0.20 → 0.00
LOTTO_POOL_RATIO  = 0.80         # ✅ 기존 유지 (0.80)
LOTTO_BURN_RATIO  = 0.19         # ✅ 기존 유지 (0.19)
LOTTO_MINER_RATIO = 0.01         # ✅ 기존 유지 (0.01)
```
