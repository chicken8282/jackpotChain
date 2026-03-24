# 블록체인 학습 — JackpotChain Node (blockchain/)

> 작성일: 2026-03-24
> 목적: 자체 구현 PoW 블록체인 구조 이해 + 로또 Commit-Reveal 로직

---

## 1. 디렉토리 구조

```
blockchain/
├── core/
│   ├── block.py           ← 블록 구조, 헤더 직렬화
│   ├── transaction.py     ← TX 파싱, 버전별 처리
│   └── utxo.py            ← UTXO 집합 상태 관리
├── consensus/
│   ├── chain.py           ← 메인 체인 관리 (orphan, reorg)
│   ├── difficulty.py      ← 난이도 조정 알고리즘
│   └── miner.py           ← 채굴 루프 (TUI 노드용)
├── crypto/
│   ├── hash.py            ← SHA-256, double SHA-256
│   ├── merkle.py          ← Merkle Tree 루트 계산
│   ├── signature.py       ← secp256k1 서명 검증
│   ├── address.py         ← 주소 파생 (공개키 → Base58Check)
│   └── encryption.py      ← 지갑 암호화
├── gacha/
│   ├── commit_reveal.py   ← Commit-Reveal 결과 결정 로직
│   ├── game.py            ← 로또 게임 상태
│   ├── pool.py            ← 잭팟 풀 관리
│   └── service.py         ← 로또 서비스 인터페이스
├── network/
│   ├── node.py            ← 메인 노드 (P2P + RPC 서버)
│   ├── peer.py            ← 피어 연결 관리
│   ├── protocol.py        ← P2P 메시지 프로토콜
│   └── discovery.py       ← 피어 탐색
├── mempool/
│   └── pool.py            ← 미확정 TX 보관
├── validation/
│   ├── block.py           ← 블록 유효성 검사
│   └── transaction.py     ← TX 유효성 검사
├── wallet/
│   └── wallet.py          ← 키 생성, 서명, 주소 관리
├── tui/                   ← TUI 채굴 클라이언트 (Textual)
└── asset/
    ├── manager.py         ← 자산(JACK/POT) 상태 관리
    └── exchange.py        ← 교환 로직
```

---

## 2. PoW (Proof of Work) 합의 메커니즘

### 개념

채굴자가 블록 헤더를 반복 해싱해서 목표 난이도 이하의 해시를 찾는다.
"작업 증명" — CPU 연산 비용으로 블록 생성권을 획득.

### 블록 구조

```python
# core/block.py (개념적)
Block:
    header:
        version
        previous_hash     ← 체인 연결
        merkle_root       ← 포함된 TX들의 해시 트리 루트
        timestamp
        bits              ← 난이도 (target)
        nonce             ← 채굴자가 찾는 값
    transactions: List[Transaction]
```

### 채굴 과정

```
while True:
    header_bytes = serialize(header)
    block_hash = double_sha256(header_bytes)
    if block_hash < target:
        break  ← 유효한 nonce 발견
    nonce += 1
```

### 공부할 것

- [ ] Double SHA-256 — 비트코인이 이중 해싱을 쓰는 이유
- [ ] bits 필드 → target 변환 (compact format)
- [ ] 난이도 조정 알고리즘 (`consensus/difficulty.py`)
  - 목표: 평균 N블록마다 X초 간격 유지
  - `new_bits = old_bits × (actual_time / expected_time)`
- [ ] 51% 공격과 PoW의 보안 가정

---

## 3. UTXO 모델

### 개념

계좌 잔액 모델과 달리, 각 코인은 **소비되지 않은 출력(Unspent Transaction Output)**으로 존재한다.

```
TX A 출력:
    [0]: 10 JACK → 주소X
    [1]: 5 JACK  → 주소Y

TX B 입력:
    [0]: TX_A[0] 참조 (주소X의 10 JACK)
    → 서명 필요: 주소X의 개인키로 서명

TX B 출력:
    [0]: 7 JACK → 주소Z  (거슬러줌)
    [1]: 3 JACK → 주소W  (지불)
```

**검증 규칙**
- 입력 합계 ≥ 출력 합계 (차액 = 수수료)
- 입력 참조 UTXO가 실제로 존재하는가?
- 서명이 유효한가?
- 이미 사용된 UTXO인가? (이중 지불 방지)

### 공부할 것

- [ ] `core/utxo.py` — UTXO 집합 상태 관리 (add, remove, get)
- [ ] Coinbase TX — 채굴 보상 (입력 없는 특수 TX)
- [ ] UTXO vs 계좌 모델 장단점
- [ ] `listunspent` RPC — 특정 주소의 UTXO 목록

---

## 4. TX 버전 구조

| version | 종류 | 특징 |
|---------|------|------|
| 1 | 일반 전송 | 기본 P2PKH |
| 2 | JACK → POT 교환 | 특수 출력 스크립트 |
| 3 | 로또 커밋 | 커밋 메타데이터 포함 |
| 5 | 로또 클레임 | 잭팟 풀 UTXO 소비 |

### Version 3 (Commit) 구조 (개념)

```
입력: 사용자 UTXO (JACK)
출력:
    [0]: 커밋 금액 → 잭팟 풀 주소
    [1]: 거스름돈 → 사용자 주소
메타데이터: 커밋 블록 높이, 결과 결정 블록 범위
```

### Version 5 (Claim) 구조 (개념)

```
입력:
    [0]: 잭팟 풀 UTXO (풀에서 인출)
출력:
    [0]: 당첨 금액 → 사용자 주소
서명: 사용자 개인키 (클레임 권리 증명)
```

---

## 5. Commit-Reveal 로또 메커니즘

### 왜 이 방식인가?

온체인 랜덤성 문제: 스마트 컨트랙트/블록체인에서 순수 랜덤은 조작 가능.
**해결책**: 미래 블록의 해시를 사용 — 커밋 시점에 결과를 알 수 없다.

### 결과 결정 규칙

```
Commit 블록 높이: N

결과 결정 블록: N+3, N+6, N+9, N+12, N+15, N+18
    → 각 블록 해시의 마지막 hex digit (0~F = 0~15)
    → 6개 digit이 결과 (로또 번호)

Claim 가능 구간: N+18 ~ N+68
    (N+68 이후는 만료)
```

```python
# gacha/commit_reveal.py (개념)
def determine_result(commit_block_height, block_hashes):
    result_blocks = [
        commit_block_height + 3,
        commit_block_height + 6,
        commit_block_height + 9,
        commit_block_height + 12,
        commit_block_height + 15,
        commit_block_height + 18,
    ]
    digits = [
        int(block_hashes[h][-1], 16)  # 마지막 hex digit
        for h in result_blocks
    ]
    return digits  # [0~15, 0~15, 0~15, 0~15, 0~15, 0~15]
```

### 공부할 것

- [ ] 온체인 랜덤성 문제 (Chainlink VRF와 비교)
- [ ] 블록 해시의 마지막 hex digit 분포 — 균등 분포인가?
- [ ] 클레임 만료 (N+68) 존재 이유 — UTXO 집합 크기 제한

---

## 6. JSON-RPC 서버

Node는 BE의 RPC 요청을 8332 포트에서 수신한다.

```python
# 구현된 RPC 메서드
getblockcount()          → 현재 블록 높이
getblockchaininfo()      → 체인 상태 전반
getlottoinfo(address)    → 특정 주소 로또 상태
getjackpotpool()         → 잭팟 풀 잔액
getbalances(address)     → JACK/POT 잔액
listunspent(address)     → 특정 주소 UTXO 목록
listpoolunspent()        → 풀 UTXO 목록 (QA 전용)
sendrawtransaction(hex)  → 서명된 TX relay
```

### Webhook 발송

새 블록이 체인에 추가될 때:

```python
# network/node.py (개념)
async def on_new_block(block):
    await process_block(block)
    await send_webhook(
        url="http://backend:8080/internal/new-block",
        body={"height": block.height, "hash": block.hash}
    )
```

### 공부할 것

- [ ] JSON-RPC 2.0 스펙 — request/response/error 형식
- [ ] asyncio 기반 서버 — event loop, coroutine, async/await
- [ ] Webhook 패턴 vs Polling 비교

---

## 7. 네트워크 — P2P

```
network/
├── node.py      ← 메인 노드: P2P + RPC 서버 동시 실행
├── peer.py      ← 피어 연결 상태
├── protocol.py  ← 메시지 타입 (BLOCK, TX, PING, GETBLOCKS 등)
└── discovery.py ← 피어 탐색 (seed nodes, peer exchange)
```

**Server Node 역할** (우리 서버에서 실행)
- 채굴 안 함 (수신 전용)
- TUI 채굴 노드들로부터 P2P 블록 수신
- RPC 제공

**TUI Mining Node 역할** (채굴자가 실행)
- 채굴 수행 (`consensus/miner.py`)
- 블록 생성 후 Server Node에 P2P 전파
- Textual 기반 터미널 UI

### 공부할 것

- [ ] P2P 네트워크 기본 — gossip protocol
- [ ] 체인 재구성(Reorg) — 더 긴 체인이 나타났을 때 (`test_reorg.py`)
- [ ] orphan block 처리

---

## 8. 암호화 라이브러리 구조

```python
crypto/
├── hash.py       ← sha256(data), double_sha256(data)
├── merkle.py     ← merkle_root(tx_hashes)
├── signature.py  ← verify_signature(msg, sig, pubkey)
│                    sign(msg, privkey) [TUI 지갑용]
├── address.py    ← pubkey_to_address(pubkey) [Base58Check]
└── encryption.py ← 지갑 파일 암호화 (AES)
```

FE의 `lib/crypto/` 와 대응 관계:

| FE (TypeScript) | Blockchain (Python) | 역할 |
|-----------------|---------------------|------|
| `hash.ts` | `crypto/hash.py` | SHA-256 |
| `signature.ts` | `crypto/signature.py` | secp256k1 서명/검증 |
| `address.ts` | `crypto/address.py` | 주소 파생 |
| `base58.ts` | 내장 | Base58Check 인코딩 |

**같은 알고리즘, 다른 언어** — FE 서명과 Node 검증이 호환되어야 한다.

### 공부할 것

- [ ] Base58Check 인코딩 — 주소 형식, checksum
- [ ] Merkle Tree — 블록에 TX 포함 증명
- [ ] 비트코인 스크립트 P2PKH — Pay to Public Key Hash
