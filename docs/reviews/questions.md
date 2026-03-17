# 블록체인 개념 Q&A 정리

> jackpotchain 코드 기반 실제 구현을 기준으로 작성

---

## Q1. 채굴자가 수수료를 받아? 수수료 비율은 무엇이며 누구를 위한 거야?

### 현재 구현 기준 수수료 구조

jackpotchain에는 **두 가지 수수료 체계**가 존재합니다.

---

#### ① 블록 TX 처리 수수료 (일반 TX, 교환 TX 등)

블록에 TX가 담길 때, 채굴자가 해당 TX들의 수수료를 분배받습니다.

| 수신자 | 비율 | 역할 |
|--------|------|------|
| **채굴자** | 50% (`FEE_MINER_RATIO`) | PoW 작업에 대한 보상 |
| **Jackpot Pool** | 30% (`FEE_JACKPOT_RATIO`) | 로또 당첨금 풀 충당 |
| **소각(Burn)** | 20% (`FEE_BURN_RATIO`) | 디플레이션 (공급 감소) |

```python
# consensus/miner.py
miner_fee   = int(total_fees * 0.50)
jackpot_fee = int(total_fees * 0.30)
burn_fee    = total_fees - miner_fee - jackpot_fee  # 나머지 = 20%
```

---

#### ② 로또 참여 비용 분배 (1 POT = 100 JACK)

로또에 참여할 때 내는 1 POT(= 100 JACK)의 분배 구조입니다.

| 수신자 | 비율 | 역할 |
|--------|------|------|
| **Jackpot Pool** | 80% (`LOTTO_POOL_RATIO`) | 당첨금 풀로 적립 |
| **소각(Burn)** | 19% (`LOTTO_BURN_RATIO`) | 디플레이션 (공급 감소) |
| **채굴자** | 1% (`LOTTO_MINER_RATIO`) | TX를 블록에 담아준 채굴자 보상 |

```python
# constants.py
LOTTO_POOL_RATIO  = 0.80   # 80 JACK → Jackpot Pool
LOTTO_BURN_RATIO  = 0.19   # 19 JACK → 소각
LOTTO_MINER_RATIO = 0.01   # 1 JACK  → 채굴자
```

---

#### ③ 블록 채굴 기본 보상 (Block Reward)

TX 수수료와 별개로, 블록을 채굴하면 기본 보상을 받습니다.

```python
# constants.py (현재 설정)
BLOCK_REWARD = 50 * COIN  # 50 JACK (수정 예정 → 100 JACK)
```

> **✅ 수정 예정**: 채굴 보상을 **100 JACK, 채굴자 100%** 로 변경 시
> `constants.py`의 `BLOCK_REWARD = 100 * COIN` 으로 수정하고,
> `miner.py`의 Jackpot Pool / Burn 분배 로직을 제거하면 됩니다.

---

#### 수수료의 목적 요약

| 목적 | 설명 |
|------|------|
| **채굴자 인센티브** | TX를 블록에 담아주는 대가. 수수료가 높을수록 빨리 처리됨 |
| **Jackpot Pool 충당** | 로또 당첨금 재원 마련 |
| **소각(Deflation)** | JACK 총 공급량을 줄여 희소성·가치 유지 |

---

## Q2. OP_RETURN(소각)은 뭘 하는 건데? 왜 19%나 차지해?

### OP_RETURN이란?

**OP_RETURN**은 블록체인에서 **"이 코인은 영원히 사용 불가"** 라고 선언하는 스크립트 형태입니다.

```python
# core/transaction.py
def is_op_return(self) -> bool:
    return len(self.script_pubkey) > 0 and self.script_pubkey[0] == 0x6a  # 0x6a = OP_RETURN
```

OP_RETURN output은 두 가지 용도로 사용됩니다:

| 용도 | 예시 | 설명 |
|------|------|------|
| **코인 소각** | JACK→POT 교환 시 | JACK을 OP_RETURN output에 담으면 영구 소멸 |
| **메타데이터 기록** | 로또 커밋 해시 저장 | 코인 없이 데이터만 블록체인에 기록 |

```
OP_RETURN output:
  jack_value  = 0 (돈이 없음)
  assets      = {} (자산 없음)
  script_pubkey = 0x6a + data  (누구도 이 output을 spending 불가)
```

### 로또 참여 시 19% 소각 이유

로또 참여 비용(1 POT = 100 JACK) 중 **19 JACK을 소각**하는 이유:

```
100 JACK 참여
  ├── 80 JACK → Jackpot Pool (당첨금 재원)
  ├── 19 JACK → OP_RETURN 소각 (디플레이션)
  └──  1 JACK → 채굴자 (TX 처리 대가)
```

- **경제 설계**: 참여가 많을수록 JACK 공급이 줄어 희소성 증가
- **풀 보호**: 100%를 풀에 넣으면 당첨 시 풀이 급격히 줄지만, 80%만 넣으면 풀이 안정적으로 유지됨
- **19%라는 비율**: 사실 절대적인 이유는 없음. 프로젝트 설계 결정사항 (변경 가능)

> **✅ 수정 예정 반영 시**:
> 로또 참여 1 POT → **100% Jackpot Pool** 로 변경하면,
> `constants.py`의 `LOTTO_POOL_RATIO = 1.0`, `LOTTO_BURN_RATIO = 0.0`, `LOTTO_MINER_RATIO = 0.0` 으로 수정

---

## Q3. VERSION 메시지 교환(핸드셰이크)이 뭐야? 왜 하는 거야?

### VERSION 메시지 구조

```python
# network/protocol.py
@dataclass
class VersionMessage:
    version: int          # 프로토콜 버전 (현재 70015)
    services: int         # 노드가 지원하는 서비스 비트플래그 (1 = 풀노드)
    timestamp: int        # 현재 Unix 타임스탬프
    addr_recv_ip: bytes   # 상대방 IP (내가 알고 있는)
    addr_recv_port: int   # 상대방 포트
    addr_trans_ip: bytes  # 내 IP
    addr_trans_port: int  # 내 포트
    nonce: int            # 랜덤 값 (자기 자신 연결 감지용)
    user_agent: bytes     # 소프트웨어 이름·버전 ("/JackpotChain:0.1.0/")
    start_height: int     # 내가 가진 체인의 최신 블록 높이
    relay: bool           # TX 릴레이 여부
```

### 핸드셰이크 흐름

```
노드 A (TUI 채굴자)              노드 B (Server Node)

① connect TCP 8333 ──────────────▶ 연결 수락
② VERSION 전송 ───────────────────▶ VERSION 수신
                                   (start_height: A의 최신 블록 높이 확인)
③ VERACK 수신 ◀──────────────────── VERACK 전송
④ VERSION 수신 ◀──────────────────── VERSION 전송
   (B의 블록 높이 확인)
⑤ VERACK 전송 ───────────────────▶ VERACK 수신

✅ 핸드셰이크 완료 → 정상 통신 시작
```

### 핸드셰이크를 하는 이유

| 이유 | 설명 |
|------|------|
| **프로토콜 호환성 확인** | `version` 필드로 구버전 노드 감지·차단 |
| **블록 높이 동기화** | `start_height`로 서로의 체인 상태 파악 → 뒤처진 쪽이 블록 요청 |
| **자기 연결 방지** | `nonce`가 같으면 자기 자신에게 연결한 것 → 연결 끊음 |
| **네트워크 서비스 파악** | `services` 필드로 상대가 풀노드인지, 가벼운 노드인지 확인 |

> 쉽게 말하면: **"나는 JackpotChain 0.1.0이고 1042번 블록까지 있어. 너는?"** 를 서로 교환하는 과정입니다.

---

## Q4. 서버 노드 블록 수신을 백엔드가 어떻게 알고 DB에 저장해?

### 핵심 질문
> 백엔드가 매번 polling을 해야 하나? 아니면 다른 방법이 있나?

### Server Node의 블록 수신 메커니즘

jackpotchain의 `node.py`에는 이미 **콜백(Callback) 메커니즘**이 구현되어 있습니다:

```python
# network/node.py
self._on_block: Optional[Callable[[Block, PeerInfo], None]] = None

def set_block_callback(self, callback: Callable):
    self._on_block = callback  # 새 블록 수신 시 호출될 함수 등록

# 블록 수신 시
async def _handle_block(self, block, peer):
    # ... 블록 검증 ...
    if self._on_block:
        self._on_block(block, peer)  # ← 여기서 콜백 호출됨
```

즉, **Server Node(Python)는 블록이 올 때마다 이벤트를 발생시킬 수 있습니다.**
문제는 이 이벤트를 **Backend(Java/Spring)에 어떻게 전달하느냐**입니다.

### 연동 방식 3가지 비교

#### 방법 A: Backend Polling (가장 단순)
```
Backend (Spring Scheduler) ──┬── 매 N초 RPC 호출 → getblockcount()
                             │   새 블록이면 → getblock() 호출 → DB 저장
                             └── 반복
```

| 항목 | 내용 |
|------|------|
| 구현 난이도 | ⭐ 매우 쉬움 |
| 실시간성 | ❌ 스케줄 주기만큼 지연 (예: 10초 polling → 최대 10초 지연) |
| 블록 누락 위험 | 낮음 (블록 높이 비교로 확인 가능) |
| 권장 사용 | MVP, 빠른 개발 시 |

```java
// Spring @Scheduled 예시
@Scheduled(fixedDelay = 5000) // 5초마다
public void syncNewBlocks() {
    long rpcHeight = rpcClient.getBlockCount();
    long dbHeight  = blockRepository.getMaxHeight();
    for (long h = dbHeight + 1; h <= rpcHeight; h++) {
        String hash  = rpcClient.getBlockHash(h);
        Block  block = rpcClient.getBlock(hash);
        blockRepository.save(mapToEntity(block));
        indexTransactions(block);
    }
}
```

---

#### 방법 B: Server Node → Backend Webhook (추천 ⭐)
```
Server Node (Python) ── 새 블록 수신 → HTTP POST /internal/blocks → Backend
                                                                        └── DB 저장
```

| 항목 | 내용 |
|------|------|
| 구현 난이도 | ⭐⭐ 약간 복잡 (Server Node에 HTTP 클라이언트 추가 필요) |
| 실시간성 | ✅ 거의 즉시 (블록 수신 즉시 전송) |
| 블록 누락 위험 | 낮음 (재시도 로직 추가 시 거의 없음) |
| 권장 사용 | 실시간성이 중요한 경우 |

```python
# Server Node (Python) - node.py에 추가
import aiohttp

async def _on_new_block(block: Block, peer: PeerInfo):
    payload = serialize_block(block)
    async with aiohttp.ClientSession() as session:
        await session.post("http://backend:8080/internal/blocks", json=payload)

node.set_block_callback(_on_new_block)
```

```java
// Backend - 내부 수신 엔드포인트
@PostMapping("/internal/blocks")
public void receiveNewBlock(@RequestBody BlockDto block) {
    blockService.saveAndIndex(block);
}
```

---

#### 방법 C: Server Node가 DB에 직접 쓰기 (단순하지만 결합도 높음)
```
Server Node (Python) ── 새 블록 수신 → 직접 DB INSERT
Backend ────────────────────────────── DB READ만 담당
```

| 항목 | 내용 |
|------|------|
| 구현 난이도 | ⭐⭐ Python에서 DB 라이브러리 필요 |
| 실시간성 | ✅ 즉시 |
| 결합도 | ❌ 높음 (Server Node가 DB 스키마에 종속) |
| 권장 사용 | MVP 빠른 구현 시 고려 가능 |

---

### 🏆 권장 방법: Polling (MVP) → Webhook (고도화)

```
MVP 단계: 방법 A (Polling, 5~10초 간격)
  → 빠른 개발, 블록 생성 주기(30초)보다 짧게 설정하면 충분

고도화: 방법 B (Webhook)
  → Server Node의 _on_block 콜백에 HTTP 호출 추가
  → 블록 수신 즉시 Backend에 통보
```

### 결론: 흐름 정리

```
① 채굴 노드 → 블록 브로드캐스트 (P2P)
② Server Node → 블록 수신 (_handle_block 이벤트)
③ Server Node → Backend 통보 (Webhook POST 또는 Polling으로 Backend가 인지)
④ Backend → 블록 파싱 · DB 저장 (block, transaction, lotto_entry, jackpot_pool 테이블)
⑤ Frontend → Backend REST API 조회 → 렌더링
```

**백엔드가 DB에 저장하는 주체**가 맞습니다. Server Node는 블록을 수신하고 RPC로 제공하는 역할이며, 저장·인덱싱은 Backend가 담당합니다.

---

## Q5. 왜 POT→JACK 역교환이 안 돼? 소각하고 JACK 주면 되는 거 아닌가?

### 기술적으로는 가능합니다

맞습니다. 기술적으로는 가능합니다:
- POT UTXO를 input으로 쓰고 OP_RETURN으로 소각
- 신규 JACK UTXO를 output으로 생성 (version=6 TX 등 추가)

### 그러나 경제적 이유로 설계를 하지 않은 것

| 문제 | 설명 |
|------|------|
| **JACK 공급 인플레이션** | POT→JACK을 허용하면 누군가 임의로 JACK을 늘릴 수 있음. JACK은 채굴(PoW)을 통해서만 생성되어야 희소성·가치가 유지됨 |
| **양방향 교환의 차익거래** | JACK→POT (100:1) / POT→JACK (100:1) 모두 허용하면 의미 없는 순환 교환만 발생 |
| **JACK 발행 권한** | 비트코인처럼 JACK은 채굴로만 발행. "역교환"은 채굴 없이 JACK을 찍는 것과 같음 |

### 단방향 구조가 맞는 이유

```
JACK (채굴로만 생성) ──교환──▶ POT (게임 토큰, JACK 태워서 얻음)
                                 │
                                 └── 로또 참여에 사용
                                      ↓
                                 (당첨 시 JACK으로 보상)
```

- POT는 JACK을 소비해서 얻는 **게임 참여권** 성격
- POT를 다시 JACK으로 바꾸려면 → 로또에 참여해서 당첨되는 게 올바른 방법

> **✅ 결론**: 역교환 불가는 버그가 아니라 **의도된 설계**입니다. FE UI는 단방향(JACK→POT)으로 수정 필요.

---

## Q6. 채굴 보상 100 JACK, 채굴자 100% 수령 + 로또 참여비 100% 풀 적립으로 수정하려면?

### 변경 필요 사항

#### `constants.py` 수정
```python
# Before
BLOCK_REWARD      = 50 * COIN
FEE_MINER_RATIO   = 0.50
FEE_JACKPOT_RATIO = 0.30
FEE_BURN_RATIO    = 0.20
LOTTO_POOL_RATIO  = 0.80
LOTTO_BURN_RATIO  = 0.19
LOTTO_MINER_RATIO = 0.01

# After
BLOCK_REWARD      = 100 * COIN  # ← 100 JACK
FEE_MINER_RATIO   = 1.00        # ← 채굴자 100%
FEE_JACKPOT_RATIO = 0.00
FEE_BURN_RATIO    = 0.00
LOTTO_POOL_RATIO  = 1.00        # ← 풀 100%
LOTTO_BURN_RATIO  = 0.00
LOTTO_MINER_RATIO = 0.00
```

#### `consensus/miner.py` 수정
```python
# create_coinbase_tx() 에서 Jackpot/Burn output 생성 부분 제거
# coinbase outputs: [채굴자 output] 만 남김
outputs = [
    TxOutput(jack_value=block_reward + total_fees, ...)  # 채굴자 100%
]
```

---

## Q7. Private Key로 서명을 어떻게 해? 로컬 Embedded DB에 저장된 private key는?

### 문제 상황

웹 서비스에서 TX를 생성할 때 private key로 서명이 필요한데:
- Private key는 사용자 로컬(TUI의 Embedded DB)에 저장
- 웹 서버(Backend)는 private key에 접근 불가
- RPC를 통해 서버 내부 지갑으로 서명하면 → **사용자가 자기 코인에 대한 통제권을 잃음**

### 해결 방안

#### 방안 A: 클라이언트 사이드 서명 (권장 ⭐)

```
사용자 브라우저(FE) 또는 TUI에서 서명 후 서버에 전달

[사용자] Private Key (로컬 보관)
     │
     ▼
① FE/TUI에서 TX 구성 (inputs, outputs)
② FE/TUI에서 private key로 서명 → signed TX (hex)
③ signed TX를 Backend API로 전송
④ Backend → RPC: sendrawtransaction(signed_tx_hex)
⑤ Server Node → Mempool 추가 → 브로드캐스트
```

- **장점**: Private key가 로컬을 절대 벗어나지 않음. 보안 최상.
- **단점**: FE/TUI에 secp256k1 서명 라이브러리 필요
- **구현**: 웹의 경우 `@noble/secp256k1` (JS), TUI는 이미 Python ECDSA 사용 중

---

#### 방안 B: 서버 관리 지갑 (현재 RPC 구현 방식)

```
[현재 jackpotchain RPC 구현]
RPC: lottocommit() → Server Node 내부 지갑으로 TX 생성·서명
```

- **문제**: 서버가 사용자 대신 서명 → 사용자 자산을 서버가 통제
- **단기 MVP**로는 가능하지만, 장기적으로는 보안 리스크
- **해결**: 사용자별 지갑을 서버에 등록하는 방식 (중앙화 지갑)

---

#### 방안 C: TUI 로컬 서명 (채굴자 동일 방식)

```
TUI 프로그램:
  - Embedded DB에서 private key 로드
  - TX 구성 + 서명
  - signed TX → RPC sendrawtransaction
  - 웹사이트는 address 기반으로 조회만
```

- 채굴은 TUI에서 하고, 로또 참여·교환도 TUI 프로그램에서 처리
- 웹사이트는 **조회 전용** (read-only)
- 현실적으로 UX가 불편 (로또 참여하려면 TUI를 열어야 함)

---

### 🏆 권장 방향: 단계별 접근

```
MVP 단계:
  - Server Node 내부 지갑으로 처리 (현재 RPC 방식)
  - 사용자 인증(Bearer Token)으로 API 레벨 보호
  - "서비스가 지갑을 관리" 형태 (중앙화 거래소와 유사)

고도화 단계:
  - FE에서 클라이언트 사이드 서명 (방안 A)
  - TUI에서도 동일 방식 지원
  - Private key는 절대 서버로 전송하지 않음
```

---

## Q8. 활동 내역 조회 흐름 - Polling vs 이벤트?

### 두 방식 모두 결국 백엔드 DB를 거칩니다

```
[단기 방식 - DB 인덱싱 기반]
채굴 노드 → 블록 생성 → P2P → Server Node 수신
                                    │
                                    ├── (Polling) Backend가 주기적으로 getblock() 호출
                                    │   → TX 파싱 → activity 테이블 저장
                                    │
                                    └── (Webhook) Server Node가 /internal/blocks 호출
                                        → Backend가 TX 파싱 → activity 테이블 저장

Frontend ──▶ GET /wallet/{address}/activities ──▶ Backend ──▶ DB 조회 ──▶ 응답
```

```
[장기 방식 - RPC listtransactions 추가]
Frontend ──▶ GET /wallet/{address}/activities ──▶ Backend ──▶ RPC listtransactions() ──▶ 응답
```

### 두 방식의 차이점

| 방식 | DB 저장 시점 | API 호출 시 | 장점 | 단점 |
|------|------------|------------|------|------|
| **DB 인덱싱** | 블록 수신 시 미리 저장 | DB 조회만 | 빠른 응답, 프론트 요청 부하 낮음 | 인덱서 구현 필요 |
| **RPC 직접 조회** | 저장 안 함 | 매번 RPC 호출 | 항상 최신 데이터 | 응답 느림, Node 부하 높음 |

### 🏆 권장: DB 인덱싱 방식 (방법 A)

```
이유:
1. 프론트가 활동 내역을 자주 조회 → 매번 RPC 호출 시 Node 과부하
2. RPC listtransactions 현재 미구현 → 단기간 개발 어려움
3. DB에 미리 인덱싱 → 빠른 응답 + 페이지네이션 쉬움

흐름:
블록 수신 → Backend 인지 (Polling 5초 or Webhook)
→ TX 파싱 → activity 테이블 INSERT
→ 프론트 요청 → DB SELECT → 즉시 응답
```

---

## Q9. Server Node가 블록 수신 → DB 저장, 백엔드를 거쳐야 하나?

### 정확한 이해

맞습니다. 두 가지를 명확히 구분해야 합니다:

```
블록 수신:  Server Node (Python, P2P) ← 브로드캐스트로 블록이 옴
DB 저장:   Backend (Java/Spring)      → DB에 INSERT
```

### 왜 Server Node가 직접 DB에 쓰면 안 좋은가?

| 이유 | 설명 |
|------|------|
| **역할 분리** | Server Node = 블록체인 P2P 노드, Backend = 비즈니스 로직·DB 관리 |
| **스키마 결합도** | Server Node(Python)가 DB 스키마를 알면 두 시스템이 강하게 결합됨 |
| **유지보수** | DB 스키마 변경 시 Python 코드도 수정 필요 |

### 그러나 MVP에서는 Server Node 직접 쓰기도 가능

```
현실적 선택:

방법 1 (권장): Polling
  Backend 스케줄러 (5초) → getblockcount() → 새 블록이면 getblock() → DB 저장
  → 구현 가장 쉬움, MVP에 적합

방법 2: Webhook
  Server Node _on_block → HTTP POST → Backend → DB 저장
  → 실시간성 좋음, 구현 약간 복잡

방법 3: Server Node 직접 DB 쓰기
  Server Node → DB INSERT (Python SQLAlchemy 등)
  Backend → DB READ만
  → MVP 빠른 구현 가능, 하지만 결합도 높음 (비추천)
```

### 최종 권장 아키텍처

```
┌────────────────────────────────────────────────────────┐
│                     EC2                                │
│                                                        │
│  ┌────────────┐  REST API   ┌──────────────────────┐  │
│  │  Frontend  │ ──────────▶ │      Backend         │  │
│  │  (React)   │ ◀────────── │   (Spring Boot)      │  │
│  └────────────┘             │                      │  │
│                             │  @Scheduled (5초)    │  │
│                             │  getblockcount() ──┐ │  │
│                             └──────────┬─────────┘ │  │
│                                        │RPC 8332   │  │
│                             ┌──────────▼──────────┐│  │
│                             │   Server Node        ││  │
│                             │   (Python, Observer) ││  │
│                             │   - P2P 수신         ││  │
│                             │   - RPC 8332 제공    ││  │
│                             └──────────────────────┘│  │
│                                                      │  │
│                      ┌───────────────────────────────┘  │
│                      ▼                                   │
│              ┌───────────────┐                          │
│              │   Database    │ ◀── Backend만 쓰기 접근  │
│              │ (MySQL/Postgres)│                         │
│              └───────────────┘                          │
└────────────────────────────────────────────────────────┘
                          ▲ P2P 8333
                          │
            ┌─────────────┴─────────────┐
            │       블록체인 네트워크    │
            │  ┌──────────┐  ┌────────┐ │
            │  │TUI 채굴A │  │TUI 채굴B│ │
            │  └──────────┘  └────────┘ │
            └───────────────────────────┘
```

---

## 전체 요약 정리

| 질문 | 핵심 답변 |
|------|----------|
| 수수료 비율 | TX 수수료: 채굴자 50% / 풀 30% / 소각 20%. 로또 참여: 풀 80% / 소각 19% / 채굴자 1% |
| OP_RETURN | 코인을 영구 사용 불가로 만드는 소각 + 메타데이터 기록 스크립트. 19%는 디플레이션 설계 |
| VERSION 핸드셰이크 | 프로토콜 호환성 확인 + 블록 높이 교환 + 자기 연결 방지 |
| 블록 수신 → DB 저장 | Backend가 Polling(5초) 또는 Webhook으로 인지 → Backend가 파싱·DB 저장 |
| POT→JACK 불가 | JACK 공급 인플레이션 방지. 기술적은 가능하나 의도된 설계 |
| 채굴 보상 수정 | constants.py BLOCK_REWARD=100, FEE_MINER_RATIO=1.0 로 변경 |
| Private key 서명 | MVP: 서버 내부 지갑 / 고도화: FE 클라이언트 사이드 서명 |
| 활동 내역 흐름 | DB 인덱싱 방식 권장 (블록 수신→파싱→DB) → API는 DB 조회만 |
| Server Node → DB | 직접 쓰기 X. Server Node → Backend → DB 흐름 유지 |
