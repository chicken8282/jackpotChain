# 코드 수정 계획 (FE + JackpotChain)

> api.md · erd.md · funtional-spec.md · architecture.md 기반으로 도출한 수정 사항 정리
> 작성 기준일: 2026-03-19
> FE-ssatto 소스코드 직접 분석 + jackpotchain 소스코드 직접 분석 반영

---

## 목차

1. [FE-ssatto 수정 사항](#1-fe-ssatto-수정-사항)
   - 1-1. API 서비스 레이어 신규 구축
   - 1-2. API 엔드포인트 변경 대응
   - 1-3. 컴포넌트별 수정 사항
   - 1-4. 클라이언트 사이드 서명 구현
2. [JackpotChain 수정 사항](#2-jackpotchain-수정-사항)
   - 2-1. `constants.py`
   - 2-2. `consensus/miner.py`
   - 2-3. `network/node.py` (Webhook 연동)

---

## 1. FE-ssatto 수정 사항

### 현재 상태 분석 (소스코드 기반)

| 항목 | 현재 상태 | 목표 |
|------|---------|------|
| API 호출 | 없음 — 전체 목업 데이터 (`lib/constants.ts`, `dashboardMockData.ts`) | 실제 BE API 연동 |
| 서비스 레이어 | 없음 (`services/`, `api/` 디렉토리 미존재) | `src/services/` 신규 생성 |
| 인증 | 없음 | JWT + localStorage 관리 모듈 |
| 타입 정의 | `types/index.ts`에 일부 정의 (api.md와 불일치) | api.md 기준 재정의 |
| 상태 관리 | `useWalletStore.ts` (Zustand) | 서버 상태 연동으로 확장 |
| 로또 status 값 | `PENDING` / `WON` / `LOST` / `EXPIRED` | `DRAWING` / `WINNING` / `LOSING` / `EXPIRED` |

---

### 1-1. API 서비스 레이어 신규 구축

> 현재 FE에 API 호출 코드가 전혀 없음. `src/services/` 디렉토리를 새로 생성한다.

#### API 클라이언트 기반 설정 (`src/services/apiClient.ts`)

```ts
// Base URL: /api/v1 (vite.config.ts proxy 설정)
// JWT 자동 첨부, 401 자동 처리

const apiClient = axios.create({ baseURL: '/api/v1' });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      // 재발급 플로우 또는 지갑 선택 화면 이동
    }
    return Promise.reject(err);
  }
);
```

#### 서비스 파일 구성

| 파일 | 담당 API |
|------|---------|
| `src/services/authService.ts` | `POST /auth/token` |
| `src/services/blockchainService.ts` | `GET /blockchain/dashboard`, `GET /blockchain/blocks/{height}` |
| `src/services/walletService.ts` | `POST /wallet`, `GET /wallet`, `GET /wallet/{address}/activities` |
| `src/services/exchangeService.ts` | `GET /exchange/info`, `POST /exchange/jack-to-pot` |
| `src/services/lottoService.ts` | `GET /lotto`, `POST /lotto/commit`, `GET /lotto/entries`, `GET /lotto/entries/{commitHash}/result`, `POST /lotto/claim` |
| `src/services/miningService.ts` | `GET /mining/blocks` |

#### 인증 서비스 (`src/services/authService.ts`)

```ts
export const issueToken = async (address: string): Promise<string> => {
  const res = await apiClient.post('/auth/token', { address });
  const token = res.data.data.token;
  localStorage.setItem('jwt_token', token);
  return token;
};
```

---

### 1-2. API 엔드포인트 변경 대응

#### 대시보드 (DashboardPage)

| 기존 (funtional-spec.md 구버전) | 변경 후 (api.md 1-1) | 변경 이유 |
|-------------------------------|----------------------|----------|
| `GET /blockchain/info` + `GET /blockchain/blocks` + `GET /network/info` (3회 호출) | `GET /blockchain/dashboard?limit=10` (단일 호출) | 초기 로딩 네트워크 요청 수 최소화 |
| `GET /blockchain/candidate-blocks` | **제거** — FE 자체 프로젝션으로 대체 | 후보 블록은 미확정 데이터, API 미제공 |

- `DashboardPage.tsx` 초기화 시 `GET /blockchain/dashboard` 단일 호출
- 응답에서 `isOn`, `height`, `blocks[]`, `nodes[]`, `pooledTxCount` 분기하여 각 컴포넌트에 전달
- 후보 블록은 `dashboard.height + 1`, `+2` ... FE에서 직접 프로젝션 생성

#### 지갑 (WalletPage)

| 기존 | 변경 후 (api.md 2-2) | 변경 이유 |
|------|----------------------|----------|
| `GET /wallet/{address}/balance` (지갑마다 1회 호출) | `GET /wallet?addresses=addr1,addr2,...` (단일 호출) | 다중 지갑 일괄 조회 |

- WalletInfo 컴포넌트에서 IndexedDB의 모든 지갑 주소를 쉼표 조합 → 단일 API 호출
- 응답 `wallets[]` 배열을 캐러셀 상태에 매핑 (jackBalance, potBalance 포함)

#### 로또 (LottoPage)

| 기존 | 변경 후 (api.md 4-1) | 변경 이유 |
|------|----------------------|----------|
| `GET /lotto/pool` | `GET /lotto?address={address}` | 잭팟 풀 + 사용자 잔액 + 랭킹 통합 단일 조회 |

- `LottoPage.tsx` 초기화 시 `GET /lotto?address={currentWallet}` 호출
- 응답에서 `jackBalance`, `potBalance`, `poolBalanceJack`, `totalEntries`, `totalWinners`, `prizeTiers` 모두 수신

#### 로또 참여 응답 변경 (api.md 4-2)

- `POST /lotto/commit` 성공 응답 `data: null`
- FE에서 응답 data로 entryId·claimableFromHeight를 읽던 코드 **제거**
- 성공 후 `GET /lotto/entries?address={address}` 폴링으로 상태 확인

#### 로또 참여 내역 상태값 전면 변경 (api.md 4-3, 4-5)

| 기존 | 변경 후 |
|------|--------|
| `PENDING` | `DRAWING` |
| `WON` | `WINNING` |
| `LOST` | `LOSING` |
| `EXPIRED` | `EXPIRED` (유지) |

```ts
// HexPicker.tsx, HistoryModal 내 교체
const STATUS_LABEL: Record<string, string> = {
  DRAWING:  '추첨 중',
  WINNING:  '당첨',
  LOSING:   '미당첨',
  EXPIRED:  '만료',
};
```

#### 교환 정보 단순화 (api.md 3-2)

- `GET /exchange/info` 응답: `jackBalance`, `potBalance` 두 필드만 사용
- 기존에 있던 `jackPerPot`, `minJackAmount`, `direction` 필드 참조 코드 제거

#### 채굴 정보 API 제거 (api.md 5 서두)

- `GET /mining/info` 엔드포인트 없음 — `GET /blockchain/dashboard` 응답 재사용
- `MiningGuide.tsx`에서 별도 `/mining/info` 호출 → dashboard 캐시 데이터 사용으로 교체

#### 활동 내역 커서 페이지네이션 (api.md 2-3)

- `GET /wallet/{address}/activities?size=20&lastActivityId={cursor}`
- 무한 스크롤: `hasNext=true`이면 스크롤 하단 도달 시 `nextCursor` 사용하여 추가 조회

---

### 1-3. 컴포넌트별 수정 사항

#### `types/index.ts` 전면 재정의

```ts
// api.md 기준으로 재정의

export interface BlockSummary {
  height: number;
  hash: string;
  txCount: number;
  minedAt: string;
  minerLabel: string | null;
  rewardJack: number;
  confirmations: number;
}

export interface BlockDetail {
  height: number;
  hash: string;
  reward: number;
  feeReward: number;
  txCount: number;
  confirmations: number;
  minedAt: string;
  miningElapsed: number;
  version: string;
  previousHash: string;
  nonce: number;
  difficulty: string;
  minerName: string | null;
  isMainChain: boolean;
}

export interface LottoEntry {
  entryId: number;
  commitHash: string;
  chosenNumbers: number[];
  status: 'DRAWING' | 'WINNING' | 'LOSING' | 'EXPIRED';
  matchCount: number | null;
  rewardJack: number | null;
  claimed: boolean;
  isClaimable: boolean;
  createdAt: string;
}

export interface WalletActivity {
  activityId: number;
  type: 'WALLET_CREATED' | 'EXCHANGE' | 'LOTTO_COMMIT' | 'LOTTO_CLAIM' | 'MINING' | 'TRANSFER';
  description: string;
  txId: string | null;
  createdAt: string;
}

export interface WalletInfo {
  address: string;
  nickname: string | null;
  walletColor: string;
  jackBalance: number;
  potBalance: number;
  createdAt: string;
}
```

#### `lib/constants.ts` 목업 데이터 제거

```ts
// 제거 대상: dashboardMockData, lottoMockData, walletMockData, miningMockData
// 유지 대상: 순수 UI 상수 (walletThemes 색상, 당첨 구조 고정 상수 등)
```

#### BlockchainVisualizer (`DashboardPage`)

| 항목 | 현재 목업 | 수정 방향 |
|------|----------|----------|
| 후보 블록 hash | 임의 hex 문자열 | `"(미확정)"` |
| 후보 블록 coinbaseAddress | 임의 hex | 제거 (minerName으로 대체, 후보는 `"Pending Queue"`) |
| 후보 블록 minedAt | 고정 문자열 | 이전 블록 `minedAt` + 평균 30초 기반 예상 시각 |
| 블록 상세 모달 — 후보 블록 | 모든 필드 표시 | 미확정 필드는 `—` 표시 |
| 후보 블록 전용 API | `GET /blockchain/candidate-blocks` | **제거** — FE height 기반 프로젝션 |

#### BlockDetailModal (Dashboard + Mining 공통)

| 항목 | 수정 방향 |
|------|---------|
| `merkleRoot` (copy 버튼) | **제거** — api.md 1-2 응답에 없음, DB 미저장 |
| `coinbaseAddress` (copy 버튼) | **제거** — api.md 1-2에서 제거됨 |
| `minerName` | **추가** — `wallet.nickname` lookup 결과 (null이면 미표시) |

#### NodeNetwork (`DashboardPage`)

| 항목 | 현재 | 수정 방향 |
|------|------|---------|
| nodes 데이터 | 상세 피어 정보 (IP, port, version, connectedAt) | `GET /blockchain/dashboard` → `nodes[]` (Integer 배열) 기반으로 단순화 |
| 그래프 렌더링 | 상세 정보 포함 | 노드 ID 기반 그래프만 표시 (`connections` 수 카운트) |

#### HexPicker — 참여 내역 탭 (LottoPage)

- 커서 기반 페이지네이션 없음 → 전체 목록 단일 조회 (`GET /lotto/entries?address={address}&status=ALL`)
- status 필터 쿼리 파라미터 지원 (`ALL` / `DRAWING` / `WINNING` / `LOSING` / `EXPIRED`)
- `isClaimable=true` 항목에만 "수령" 버튼 렌더링

#### HistoryModal — 비교 블록 해시 섹션 제거 (api.md 4-3)

- `resultBlockHashes` 관련 표시 섹션 **완전 제거**
- `chosenNumbers` vs `resultNumbers` 6자리 비교 그리드만 유지
- `resultNumbers`가 null이면 "추첨 중..." 플레이스홀더 표시

#### WalletInfo / Exchange (WalletPage)

- 교환 방향 UI: `JACK → POT` 단방향만 표시
- 역방향 (`POT → JACK`) 버튼 **완전 제거**
- 교환 버튼 클릭 시 플로우:
  1. `GET /exchange/info?address={address}` 로 현재 잔액 확인
  2. JACK 잔액 ≥ 100 JACK 확인
  3. 클라이언트 사이드 서명 (version=2 TX)
  4. `POST /exchange/jack-to-pot { fromAddress, jackAmount, signedTxHex }`

#### `useWalletStore.ts` 확장

```ts
// 추가해야 할 상태
interface WalletStore {
  // 기존
  wallets: WalletInfo[];
  currentAddress: string | null;

  // 신규 추가
  jwtToken: string | null;
  setJwtToken: (token: string | null) => void;

  // 서버 상태 동기화 메서드
  fetchWallets: (addresses: string[]) => Promise<void>;
  fetchActivities: (address: string, cursor?: number) => Promise<void>;
  issueToken: (address: string) => Promise<void>;
}
```

---

### 1-4. 클라이언트 사이드 서명 구현

> blockchain.md §4: private key는 브라우저 IndexedDB에만 보관, 서명은 브라우저에서 수행

#### 의존 라이브러리 추가

```bash
npm install @noble/secp256k1 @noble/hashes
```

#### IndexedDB 키 관리 모듈 (`src/lib/wallet/keyStore.ts`)

```ts
// IndexedDB DB명: "JackpotWallet", ObjectStore: "keys"
// 키: address, 값: { address, privKeyHex }

export async function savePrivateKey(address: string, privKeyHex: string): Promise<void>
export async function loadPrivateKey(address: string): Promise<string>  // hex
export async function listAddresses(): Promise<string[]>
export async function deletePrivateKey(address: string): Promise<void>
```

#### 지갑 생성 플로우 (`WalletCreate.tsx`)

```ts
import * as secp from '@noble/secp256k1';

// 1. 키페어 생성
const privKey = secp.utils.randomPrivateKey();
const pubKey  = secp.getPublicKey(privKey, true); // 압축 공개키 33 bytes

// 2. address 유도 (jackpotchain 주소 포맷)
const address = deriveJackpotAddress(pubKey);

// 3. IndexedDB에 private key 저장
await savePrivateKey(address, toHex(privKey));

// 4. 서버에 메타데이터 등록 + JWT 발급
await walletService.register({ address, nickname, walletColor });
await authService.issueToken(address);
```

#### TX 서명 플로우 (Exchange / Lotto Commit / Lotto Claim)

```ts
// 1. 현재 지갑 잔액/UTXO 확인 (GET /wallet?addresses=...)
// 2. TX 구조 조립
const tx = buildTx({
  version,       // 2=교환, 3=로또커밋, 5=로또클레임
  inputs: utxos,
  outputs: [...],
});

// 3. IndexedDB에서 private key 로드
const privKey = await loadPrivateKey(fromAddress);

// 4. secp256k1으로 서명
const signedTxHex = signTransaction(tx, privKey);

// 5. Backend 전송
await lottoService.commit({ fromAddress, chosenNumbers, signedTxHex });
```

> **MVP 타협안**: 일정 내 서명 구현 불가 시, `signedTxHex = ""` 빈 문자열로 전송 → Backend가 Server Node 내부 지갑으로 RPC 직접 처리. 고도화 단계에서 클라이언트 서명으로 전환.

---

## 수정 우선순위 요약 (FE)

| 우선순위 | 대상 파일 | 항목 | 난이도 |
|:--------:|----------|------|:------:|
| 🔴 1 | `src/services/` (신규) | API 서비스 레이어 전체 구축 | ⭐⭐ |
| 🔴 2 | `types/index.ts` | api.md 기준 타입 재정의 | ⭐ |
| 🔴 3 | `DashboardPage.tsx` | dashboard 단일 API 호출 + 후보 블록 FE 프로젝션 | ⭐⭐ |
| 🔴 4 | `WalletInfo.tsx`, `WalletCreate.tsx` | 다중 지갑 일괄 조회 + JWT 발급 플로우 | ⭐⭐ |
| 🔴 5 | `LottoPage.tsx`, `HexPicker.tsx` | lotto 통합 API + status 값 교체 | ⭐⭐ |
| 🟡 6 | `HexPicker.tsx` (status) | `PENDING/WON/LOST` → `DRAWING/WINNING/LOSING` | ⭐ |
| 🟡 7 | `HistoryModal` | `resultBlockHashes` 섹션 제거 | ⭐ |
| 🟡 8 | `BlockDetailModal.tsx` | `merkleRoot`, `coinbaseAddress` 제거 / `minerName` 추가 | ⭐ |
| 🟡 9 | `Exchange.tsx` | 역방향 UI 완전 제거 | ⭐ |
| 🟡 10 | `NodeNetwork.tsx` | Integer 배열 기반 노드 그래프로 단순화 | ⭐ |
| 🟠 11 | `MiningPage.tsx`, `MiningGuide.tsx` | `/mining/info` → dashboard 캐시 데이터 | ⭐ |
| 🟠 12 | `ActivityList.tsx` | 커서 기반 무한 스크롤 | ⭐⭐ |
| 🟠 13 | `src/lib/wallet/keyStore.ts` (신규) | IndexedDB 키 관리 모듈 | ⭐⭐ |
| 🟠 14 | 전체 서명 플로우 | 클라이언트 사이드 secp256k1 서명 구현 | ⭐⭐⭐ |

---

## 2. JackpotChain 수정 사항

### 현재 상태 분석 (소스코드 기반)

| 파일 | 현재 상태 | 필요 변경 |
|------|---------|---------|
| `constants.py` | `BLOCK_REWARD = 50 JACK`, `FEE_MINER_RATIO = 0.50` | 100 JACK, 1.00으로 변경 |
| `consensus/miner.py` | git에서 수정됨 (상세 확인 필요) | Coinbase TX 단순화 (채굴자 100% 단일 output) |
| `network/node.py` | Webhook 코드 없음 (`_on_block` 콜백은 존재) | Webhook HTTP POST 추가 |
| `rpc/server.py` | `getlottoinfo`, `getjackpotpool`, `lottocommit`, `lottoclaim`, `lottocheckresult` 이미 구현됨 | 변경 없음 |

---

### 2-1. `jackpotchain/constants.py`

> blockchain.md §12 확정: 블록 보상 100 JACK / 채굴자 100% / 로또 참여비 Pool 80% · 소각 19% · 채굴자 1%

```python
# 현재 값                              # 변경 후
BLOCK_REWARD      = 50 * COIN          # → 100 * COIN   (10_000_000_000 satoshi)

# 블록 수수료 분배 (채굴자 100%)
FEE_MINER_RATIO   = 0.50               # → 1.00
FEE_JACKPOT_RATIO = 0.30               # → 0.00   (블록 수수료에서 잭팟 Pool 분배 제거)
FEE_BURN_RATIO    = 0.20               # → 0.00   (블록 수수료에서 소각 제거)

# 로또 참여비 분배 — 변경 없음 (유지)
LOTTO_POOL_RATIO  = 0.80               # 유지
LOTTO_BURN_RATIO  = 0.19               # 유지
LOTTO_MINER_RATIO = 0.01               # 유지
```

**수정 위치**: `jackpotchain/constants.py` 상단 상수 정의 블록

---

### 2-2. `jackpotchain/consensus/miner.py`

> 블록 Coinbase TX의 Jackpot Pool / Burn output 생성 로직 제거 → 채굴자 100% 단일 output으로 단순화

```python
# Before: create_coinbase_tx() 내부 (추정)
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

**수정 위치**: `jackpotchain/consensus/miner.py` → `create_coinbase_tx()` 함수

> ⚠️ git에서 `miner.py`가 이미 수정된 상태. 현재 코드에서 위 변경이 반영됐는지 확인 필수.

---

### 2-3. `jackpotchain/network/node.py` (Webhook 연동)

> blockchain.md §9 선택된 방안: Server Node가 블록 수신 시 Backend 내부 엔드포인트로 HTTP POST

**현재 상태**: `_on_block(block, peer)` 콜백은 존재하나 Webhook 코드 없음.

```python
# node.py에 추가 — _on_block 콜백에서 Backend Webhook 호출

import aiohttp
import os

# 환경변수로 외부화 (기본값: 로컬 개발)
BACKEND_WEBHOOK_URL = os.getenv(
    "BACKEND_WEBHOOK_URL",
    "http://localhost:8080/internal/webhook/block"
)

async def notify_backend(block: Block, peer: PeerInfo) -> None:
    """블록 수신 시 Backend에 Webhook POST. 실패해도 P2P 처리는 계속 진행."""
    payload = serialize_block_to_json(block)
    try:
        async with aiohttp.ClientSession() as session:
            resp = await session.post(
                BACKEND_WEBHOOK_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            )
            if resp.status not in (200, 202):
                logger.warning(
                    f"[Webhook] Backend returned {resp.status} for block {block.height}"
                )
    except Exception as e:
        logger.error(f"[Webhook] Failed for block {block.height}: {e}")
        # 실패는 로그만 남기고 P2P 처리 계속

# _on_block 콜백 내에 추가
async def _on_block(self, block: Block, peer: PeerInfo) -> None:
    # 기존 블록 처리 로직 ...
    await notify_backend(block, peer)  # Webhook 발행
```

**직렬화 함수**: `serialize_block_to_json(block: Block) -> dict`

```python
def serialize_block_to_json(block: Block) -> dict:
    return {
        "height":     block.height,
        "hash":       block.hash.hex(),
        "prevHash":   block.prev_hash.hex(),
        "version":    block.version,
        "minedAt":    block.timestamp,          # Unix timestamp (int)
        "nonce":      block.nonce,
        "difficulty": block.bits,               # raw bits
        "txList": [
            {
                "txId":     tx.txid().hex(),
                "version":  tx.version,
                "inputs":   [serialize_input(inp) for inp in tx.inputs],
                "outputs":  [serialize_output(out) for out in tx.outputs],
            }
            for tx in block.transactions
        ],
    }
```

**수정 위치**: `jackpotchain/network/node.py` + 필요 시 `jackpotchain/utils/serializer.py` 별도 분리

---

## 수정 우선순위 요약 (JackpotChain)

| 우선순위 | 파일 | 항목 | 난이도 |
|:--------:|------|------|:------:|
| 🔴 1 | `constants.py` | `BLOCK_REWARD` 100 JACK / `FEE_MINER_RATIO` 1.00 수정 | ⭐ |
| 🔴 2 | `consensus/miner.py` | Coinbase TX 단순화 (채굴자 100% 단일 output) — 현재 수정 상태 확인 후 보완 | ⭐⭐ |
| 🔴 3 | `network/node.py` | `_on_block` 콜백에 Webhook POST 추가 | ⭐⭐ |
| 🟡 4 | `utils/serializer.py` (신규) | `serialize_block_to_json()` 함수 구현 | ⭐⭐ |
| 🟠 5 | `rpc/server.py` | 기존 RPC 메서드 동작 검증 (변경 없음이 목표) | ⭐ |
