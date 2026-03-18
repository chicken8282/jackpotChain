# 코드 수정 계획 (FE + JackpotChain)

> api.md · blockchain.md · funtional-spec.md · flow.md 기반으로 도출한 수정 사항 정리
> 작성 기준일: 2026-03-18

---

## 목차

1. [FE-ssatto 수정 사항](#1-fe-ssatto-수정-사항)
   - 1-1. API 엔드포인트 변경 대응
   - 1-2. 컴포넌트별 수정 사항
   - 1-3. 클라이언트 사이드 서명 구현
2. [JackpotChain 수정 사항](#2-jackpotchain-수정-사항)
   - 2-1. constants.py
   - 2-2. consensus/miner.py
   - 2-3. network/node.py (Webhook 연동)

---

## 1. FE-ssatto 수정 사항

### 1-1. API 엔드포인트 변경 대응

#### 대시보드 (DashboardPage)

| 기존 (funtional-spec.md 10.1) | 변경 후 (api.md 1-1) | 변경 이유 |
|-------------------------------|----------------------|----------|
| `GET /blockchain/info` + `GET /blockchain/blocks` + `GET /network/info` (3회 호출) | `GET /blockchain/dashboard?limit=10` (단일 호출) | 초기 로딩 시 네트워크 요청 수 최소화 |
| `GET /blockchain/candidate-blocks` | **제거** — FE 자체 프로젝션으로 대체 | 후보 블록은 미확정 데이터라 실 API 없음 |

- `DashboardPage.tsx` 초기화 코드에서 3개 API 호출 → `GET /blockchain/dashboard` 단일 호출로 교체
- 응답에서 `isOn`, `blocks[]`, `nodes[]` 분리하여 각 컴포넌트에 전달
- `후보 블록`은 `dashboard.height + 1`, `height + 2` ... 를 FE에서 직접 생성 (hash=`"(미확정)"`, minerLabel=`"Pending Queue"`, txCount = pooledTxCount 기반 추정)

#### 지갑 (WalletPage)

| 기존 | 변경 후 (api.md 2-2) | 변경 이유 |
|------|----------------------|----------|
| `GET /wallet/{address}/balance` (지갑마다 1회 호출) | `GET /wallet?addresses=addr1,addr2,...` (단일 호출) | WalletPage 캐러셀의 다중 지갑 일괄 조회 |

- WalletInfo 컴포넌트에서 IndexedDB에 저장된 모든 지갑 주소를 쉼표로 조합 → 단일 API 호출
- 응답 `wallets[]` 배열을 캐러셀 상태에 매핑

#### 로또 (LottoPage)

| 기존 | 변경 후 (api.md 4-1) | 변경 이유 |
|------|----------------------|----------|
| `GET /lotto/pool` | `GET /lotto?address={address}` | 잭팟 풀 + 사용자 잔액 통합 단일 조회 |

- `LottoPage.tsx` 초기화 시 `GET /lotto?address=현재지갑주소` 호출
- 응답에서 `jackBalance`, `potBalance`, `poolBalanceJack`, `prizeTiers` 모두 수신

#### 로또 참여 응답 변경 (api.md 4-2)

- `POST /lotto/commit` 응답 `data` 필드가 `null`로 변경됨
- FE에서 응답 data 필드로 entryId·claimableFromHeight를 읽던 코드 **제거** → 성공 여부만 판단 후 `GET /lotto/entries` 폴링으로 상태 확인

#### 로또 참여 내역 상태값 변경 (api.md 4-3, 4-5)

| 기존 (한글 or 구 영문) | 변경 후 |
|----------------------|--------|
| `PENDING` | `DRAWING` |
| `WON` | `WINNING` |
| `LOST` | `LOSING` |
| `EXPIRED` | `EXPIRED` (유지) |

- `HexPicker.tsx` 내 status 비교 문자열 전면 교체
- `HistoryModal` 내 statusLabel 매핑 테이블 업데이트:
  ```ts
  const STATUS_LABEL: Record<string, string> = {
    DRAWING:  '추첨 중',
    WINNING:  '당첨',
    LOSING:   '미당첨',
    EXPIRED:  '만료',
  };
  ```

#### HistoryModal 비교 블록 해시 컴포넌트 제거 (api.md 4-3 callout)

- `HistoryModal`에서 `resultBlockHashes` 관련 컴포넌트(비교 블록 해시 표시 섹션) **제거**
- `chosenNumbers`와 `resultNumbers`의 6자리 비교 그리드만 유지

#### 교환 정보 단순화 (api.md 3-2)

- `GET /exchange/info` 응답에서 `jackPerPot`, `minJackAmount`, `direction` 필드 제거됨
- FE에서 해당 필드 참조 코드 제거, `jackBalance`·`potBalance`만 사용

#### 채굴 정보 API 제거 (api.md 5 서두)

- `GET /mining/info` 제거됨 — `GET /blockchain/dashboard` 응답의 `difficulty`, `networkHashps`, `pooledTxCount`, `height`로 대체
- `MiningGuide.tsx`에서 `/mining/info` 호출 → `/blockchain/dashboard` 캐시 데이터 사용으로 교체

---

### 1-2. 컴포넌트별 수정 사항

#### BlockchainVisualizer (DashboardPage)

| 항목 | 현재 목업 | 수정 방향 |
|------|----------|----------|
| 후보 블록 hash | 임의 hex 문자열 | `"(미확정)"` 표시 |
| 후보 블록 coinbaseAddress | 임의 hex | `"(채굴자 미정)"` 표시 |
| 후보 블록 minedAt | 고정 문자열 | 이전 블록 `minedAt` + 평균 30초 기반 예상 시각 |
| 블록 상세 모달 — 후보 블록 | 모든 필드 표시 | 미확정 필드는 `—` 또는 `(미확정)` 표시 |
| 후보 블록 전용 API | `GET /blockchain/candidate-blocks` | **제거** — FE height 기반 프로젝션으로 대체 |

#### BlockDetailModal (Dashboard + Mining 공통)

- `merkleRoot`(copy 버튼) 표시 유지 (DB에는 저장하되 API 응답에서는 제거됨 — UI에서 사용 여부 팀 협의 필요)
- `coinbaseAddress`(copy 버튼): api.md 1-2에서 제거됨 → UI에서 **제거** 또는 `minerName`으로 대체
- `minerName`(채굴자 닉네임) 필드 추가 표시

#### WalletInfo / Exchange (WalletPage)

- 교환 방향 UI: `JACK → POT` 단방향만 표시, 역방향(`POT → JACK`) 버튼 **완전 제거**
- 교환 버튼 클릭 시 플로우:
  1. `GET /exchange/info?address={address}` 로 현재 잔액 확인
  2. JACK 잔액 ≥ 100 JACK 확인 → 클라이언트 사이드 서명 → `POST /exchange/jack-to-pot`

#### HexPicker — 참여 내역 탭 (LottoPage)

- 커서 기반 페이지네이션 제거 → 전체 목록 단일 조회 (`GET /lotto/entries?address={address}`)
- status 필터 쿼리 파라미터 지원 (`ALL` / `DRAWING` / `WINNING` / `LOSING` / `EXPIRED`)
- `isClaimable=true` 항목에만 "수령" 버튼 렌더링

---

### 1-3. 클라이언트 사이드 서명 구현

> blockchain.md §4 선택된 방안: private key는 브라우저 IndexedDB에만 보관, 서명은 브라우저에서 수행

#### 의존 라이브러리 추가

```bash
npm install @noble/secp256k1 @noble/hashes
# 니모닉이 필요한 경우
npm install @scure/bip39
```

#### IndexedDB 키 관리 모듈 (`src/lib/wallet/keyStore.ts`)

```ts
// IndexedDB DB명: "JackpotWallet", ObjectStore: "keys"
// 키: address, 값: { address, encryptedPrivKey, iv }
// AES-GCM으로 사용자 비밀번호 암호화 후 저장 권장

export async function savePrivateKey(address: string, privKeyHex: string): Promise<void>
export async function loadPrivateKey(address: string): Promise<string>  // hex
export async function deletePrivateKey(address: string): Promise<void>
```

#### 지갑 생성 플로우 (`WalletCreate.tsx`)

```ts
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

// 1. 키페어 생성
const privKey = secp.utils.randomPrivateKey();
const pubKey  = secp.getPublicKey(privKey, true); // 압축 공개키 33 bytes

// 2. address 유도: SHA256 → RIPEMD160 → Base58Check
//    (jackpotchain 주소 포맷에 맞게 구현 필요)
const address = deriveAddress(pubKey);

// 3. IndexedDB에 private key 저장
await savePrivateKey(address, toHex(privKey));

// 4. 서버에 메타데이터 등록
await fetch('/api/v1/wallet', {
  method: 'POST',
  body: JSON.stringify({ address, nickname, walletColor }),
});
```

#### TX 서명 플로우 (Exchange / Lotto Commit / Lotto Claim)

```ts
// 1. UTXO 조회 (별도 API 필요 — GET /wallet/{address}/utxos)
const utxos = await fetchUtxos(fromAddress);

// 2. TX 구조 조립
const tx = buildTx({
  version,       // 2=교환, 3=로또커밋, 5=로또클레임
  inputs: utxos,
  outputs: [...],
});

// 3. IndexedDB에서 private key 로드
const privKey = await loadPrivateKey(fromAddress);

// 4. secp256k1으로 각 input 서명
const signedTxHex = signTransaction(tx, privKey);

// 5. Backend로 전송
await fetch('/api/v1/exchange/jack-to-pot', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ fromAddress, jackAmount, signedTxHex }),
});
```

> **MVP 타협안**: 클라이언트 사이드 서명 구현이 일정 내 어려울 경우, Server Node 내부 지갑 방식으로 우선 구현 후 고도화 단계에서 전환 가능. 이 경우 FE에서 `signedTxHex` 필드를 빈 문자열로 전송하고 Backend가 RPC 직접 호출.

---

## 2. JackpotChain 수정 사항

### 2-1. `jackpotchain/constants.py`

> blockchain.md §12 확정: 블록 보상 100 JACK / 채굴자 100% / 로또 참여비 Pool 80% · 소각 19% · 채굴자 1%

```python
# Before                          # After
BLOCK_REWARD      = 50 * COIN     # → 100 * COIN   ✅
FEE_MINER_RATIO   = 0.50          # → 1.00          ✅
FEE_JACKPOT_RATIO = 0.30          # → 0.00          ✅
FEE_BURN_RATIO    = 0.20          # → 0.00          ✅

# 로또 참여비 분배 — 기존 구조 유지 (변경 없음)
LOTTO_POOL_RATIO  = 0.80          # 유지            ✅
LOTTO_BURN_RATIO  = 0.19          # 유지            ✅
LOTTO_MINER_RATIO = 0.01          # 유지            ✅
```

**수정 위치**: `jackpotchain/constants.py` 상단 상수 정의 블록

---

### 2-2. `jackpotchain/consensus/miner.py`

> 블록 Coinbase TX의 Jackpot Pool / Burn output 생성 로직 제거 → 채굴자 100% 단일 output으로 단순화

```python
# Before: create_coinbase_tx() 내부
miner_reward  = int((block_reward + total_fees) * FEE_MINER_RATIO)    # 50%
jackpot_share = int((block_reward + total_fees) * FEE_JACKPOT_RATIO)  # 30%
burn_share    = (block_reward + total_fees) - miner_reward - jackpot_share  # 20%

outputs = [
    TxOutput(jack_value=miner_reward,  script_pubkey=miner_script),
    TxOutput(jack_value=jackpot_share, script_pubkey=jackpot_pool_script),
    TxOutput(jack_value=burn_share,    script_pubkey=op_return_script),  # 소각
]

# After: create_coinbase_tx() 내부
total_reward = block_reward + total_fees  # 채굴자 100%

outputs = [
    TxOutput(jack_value=total_reward, script_pubkey=miner_script),
    # Jackpot Pool output 제거
    # OP_RETURN(소각) output 제거
]
```

**수정 위치**: `jackpotchain/consensus/miner.py` 내 `create_coinbase_tx()` 함수

---

### 2-3. `jackpotchain/network/node.py` (Webhook 연동)

> blockchain.md §9 선택된 방안: Server Node가 블록 수신 시 Backend 내부 엔드포인트로 HTTP POST

```python
# node.py에 추가 — _on_block 콜백에서 Backend Webhook 호출

import aiohttp
import json

BACKEND_WEBHOOK_URL = "http://localhost:8080/internal/new-block"

async def notify_backend(block: Block, peer: PeerInfo) -> None:
    """블록 수신 시 Backend에 Webhook POST"""
    payload = serialize_block_to_json(block)
    try:
        async with aiohttp.ClientSession() as session:
            resp = await session.post(
                BACKEND_WEBHOOK_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            )
            if resp.status != 200:
                logger.warning(f"Webhook failed: {resp.status} for block {block.height}")
    except Exception as e:
        logger.error(f"Webhook error: {e} for block {block.height}")
        # 실패해도 P2P 처리는 계속 진행

# Node 초기화 시 콜백 등록
node.set_block_callback(notify_backend)
```

**구현 필요 함수**: `serialize_block_to_json(block: Block) -> dict`

```python
def serialize_block_to_json(block: Block) -> dict:
    return {
        "height":    block.height,
        "hash":      block.hash.hex(),
        "prevHash":  block.prev_hash.hex(),
        "merkleRoot": block.merkle_root.hex(),
        "version":   block.version,
        "minedAt":   block.timestamp,          # Unix timestamp
        "nonce":     block.nonce,
        "difficulty": block.bits,
        "txList": [
            {
                "txId":      tx.txid().hex(),
                "version":   tx.version,
                "inputs":  [ ... ],             # input 직렬화
                "outputs": [ ... ],             # output 직렬화
            }
            for tx in block.transactions
        ],
    }
```

**수정 위치**: `jackpotchain/network/node.py` + 필요 시 별도 `jackpotchain/utils/serializer.py` 분리

---

## 수정 우선순위 요약

| 우선순위 | 대상 | 항목 | 난이도 |
|:--------:|------|------|:------:|
| 🔴 1 | JackpotChain | `constants.py` BLOCK_REWARD / FEE_MINER_RATIO 수정 | ⭐ |
| 🔴 2 | JackpotChain | `miner.py` Coinbase TX 단순화 | ⭐⭐ |
| 🔴 3 | JackpotChain | `node.py` Webhook 연동 | ⭐⭐ |
| 🔴 4 | FE | API 엔드포인트 변경 대응 (dashboard 통합, 지갑 다중 조회, lotto 통합) | ⭐⭐ |
| 🟡 5 | FE | 로또 status 값 한글→영문 전환 | ⭐ |
| 🟡 6 | FE | `HistoryModal` 비교 블록 해시 컴포넌트 제거 | ⭐ |
| 🟡 7 | FE | `BlockDetailModal` coinbaseAddress 제거 / minerName 추가 | ⭐ |
| 🟡 8 | FE | 교환 역방향 UI 제거 (단방향만) | ⭐ |
| 🟠 9 | FE | 후보 블록 FE 프로젝션 로직 | ⭐⭐ |
| 🟠 10 | FE | 클라이언트 사이드 서명 구현 (IndexedDB + secp256k1) | ⭐⭐⭐ |
