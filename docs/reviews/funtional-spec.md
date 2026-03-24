# 기능 명세서 (Functional Specification)

> JackpotChain 기반 로또 서비스 — api.md · erd.md · architecture.md 기준 최신화
> 작성 기준일: 2026-03-19

---

## 1. 문서 목적

이 문서는 FE-ssatto 프론트엔드 소스코드 분석 결과를 api.md·erd.md·architecture.md 최신 명세에 맞게 정합성을 유지한 기능 명세서이다.

- 백엔드 API 구현 가이드 (`api.md`와 1:1 대응)
- ERD 기반 엔티티 책임 분리 기준
- 프론트엔드/백엔드 처리 경계 명확화
- 목업 → 실제 백엔드 연동 전환 기준

### 1.1 선택된 방안 반영

| 항목 | 선택된 방안 |
|------|------------|
| 서명 방식 | 클라이언트 사이드 서명 — private key는 브라우저 IndexedDB에만 보관 |
| 교환 방향 | JACK → POT 단방향만 — POT → JACK 역교환 없음 |
| 블록 연동 | Webhook 방식 — Server Node가 블록 수신 시 Backend에 HTTP POST |
| 수수료 구조 | 블록 보상 100 JACK / 채굴자 100% / 로또 참여비 Pool 80% · 소각 19% · 채굴자 1% |
| 인증 방식 | 지갑 주소 기반 JWT (로그인 없음, 지갑 선택 = 인증) |
| DB 잔액 저장 | 저장 안 함 — 매 요청 RPC(`getbalance`, `listunspent`) 조회 |

---

## 2. 전제 조건

- FE-ssatto는 현재 목업 데이터(`lib/constants.ts`, `dashboardMockData.ts`)를 사용하며, 실제 서비스 전환 시 BE 연동 데이터로 교체해야 한다.
- **private key와 서명은 클라이언트(브라우저)가 전담한다.** 서버는 지갑 메타데이터와 조회용 인덱스 데이터만 저장한다.
- 블록체인 진실 데이터(on-chain)는 Server Node 또는 Webhook 기반 백엔드 인덱싱에서 제공한다.
- **JACK → POT 교환은 단방향이다.** FE UI는 역방향 버튼을 표시하지 않는다.
- 블록 인덱싱은 Webhook 방식으로 이루어지며, Backend는 DB 조회로 빠른 응답을 제공한다.

---

## 3. 공통 도메인 객체

### 3.1 지갑 (Wallet)

| 필드 | 타입 | 설명 |
|------|------|------|
| `address` | String | 블록체인 지갑 주소 (공개, UQ) |
| `nickname` | String | 사용자 정의 닉네임 (nullable) |
| `walletColor` | String | 카드 테마 색상 ID (기본: `DEFAULT`) |
| `jackBalance` | Long | JACK 잔액 (satoshi, on-chain RPC 조회) |
| `potBalance` | Long | POT 잔액 (satoshi, on-chain RPC 조회) |
| `createdAt` | DateTime | 생성 일시 |

> **Note**: private key, 니모닉 — 클라이언트 IndexedDB에만 보관. 서버로 전송 금지.

### 3.2 블록 (Block)

> erd.md 기준. `merkle_root`는 DB에 저장하지 않음 (인덱싱 레이어 불필요).

| 필드 | 타입 | 설명 |
|------|------|------|
| `height` | Long | 블록 높이 |
| `hash` | String | 블록 해시 (64자리 hex) |
| `previousHash` | String | 이전 블록 해시 |
| `version` | String | 블록 버전 (hex, 예: `0x20000000`) |
| `txCount` | Integer | 포함 트랜잭션 수 |
| `confirmations` | Integer | 확인 수 |
| `reward` | Long | 기본 채굴 보상 (100 JACK = 10,000,000,000 satoshi) |
| `feeReward` | Long | 수수료 보상 (JACK satoshi) |
| `difficulty` | String | 난이도 (human-readable, 예: `"7.42T"`) |
| `nonce` | Long | 논스 |
| `minerName` | String | 채굴자 닉네임 (`wallet.nickname` lookup, 없으면 null) |
| `minedAt` | DateTime | 채굴 일시 |
| `miningElapsed` | Integer | 채굴 소요 시간 (초) |
| `isMainChain` | Boolean | 메인체인 여부 |

> **minerName 제공 방식**: `miner_address`로 `wallet.address`를 lookup → `wallet.nickname`. 없으면 null 반환.

### 3.3 로또 참여 내역 (LottoEntry)

> api.md 4-3·4-5 기준. status 값은 api.md와 완전 일치.

| 필드 | 타입 | 설명 |
|------|------|------|
| `entryId` | Long | 참여 PK |
| `commitHash` | String | 커밋 트랜잭션 해시 |
| `walletAddress` | String | 참여 지갑 주소 |
| `chosenNumbers` | Integer[] | 선택한 6자리 숫자 배열 (0~15) |
| `resultNumbers` | Integer[] | 결과 숫자 배열 (null=추첨 중) |
| `matchCount` | Integer | 일치 개수 (0~6, 추첨 중이면 null) |
| `jackpotSnapshot` | Long | 참여 시점 풀 잔액 (JACK satoshi) |
| `commitBlockHeight` | Long | 커밋이 포함된 블록 높이 (N) |
| `status` | String | `DRAWING` / `WINNING` / `LOSING` / `EXPIRED` |
| `rewardJack` | Long | 보상 JACK (satoshi, 1매치는 null — on-chain POT 지급) |
| `claimed` | Boolean | 보상 수령 여부 |
| `isClaimable` | Boolean | 현재 클레임 가능 여부 (API 응답 시점 계산) |
| `claimableFromHeight` | Long | 클레임 가능 시작 블록 (commit+18) |
| `claimableUntilHeight` | Long | 클레임 만료 블록 (commit+68) |
| `createdAt` | DateTime | 참여 일시 |

**status 값**

| 값 | 설명 |
|----|------|
| `DRAWING` | 결과 블록 미확정 (commit+18 미도달) |
| `WINNING` | 1개 이상 일치 (보상 존재) |
| `LOSING` | 0개 일치 (보상 없음) |
| `EXPIRED` | 클레임 기한 만료 (commit+68 초과) |

> **1매치 환불**: `matchCount == 1`이면 BE에서 on-chain으로 1 POT(= 100,000,000 satoshi)을 직접 지급. `rewardJack`은 null, `matchCount`로 FE에서 구분.

### 3.4 활동 내역 (WalletActivity)

| 필드 | 타입 | 설명 |
|------|------|------|
| `activityId` | Long | 활동 PK |
| `walletAddress` | String | 지갑 주소 |
| `type` | String | `WALLET_CREATED` / `EXCHANGE` / `LOTTO_COMMIT` / `LOTTO_CLAIM` / `MINING` / `TRANSFER` |
| `description` | String | 활동 설명 (BE 자동 생성) |
| `txId` | String | 연관 트랜잭션 해시 (WALLET_CREATED는 null) |
| `createdAt` | DateTime | 발생 일시 |

**description 자동 생성 규칙**

| type | description 형식 | 예시 |
|------|-----------------|------|
| `WALLET_CREATED` | `"지갑 생성"` | — |
| `EXCHANGE` | `"{N} JACK → {M} POT 교환"` | `"100 JACK → 1 POT 교환"` |
| `LOTTO_COMMIT` | `"로또 참여 (1 POT)"` | — |
| `LOTTO_CLAIM` | `"로또 보상 수령 ({N} JACK)"` / `"로또 1 POT 환불"` | — |
| `MINING` | `"채굴 보상 수령 ({N} JACK)"` | — |
| `TRANSFER` | `"{N} JACK 수신"` / `"{N} JACK 전송"` | — |

---

## 4. 공통 영역 / 앱 셸

### 4.1 네비게이션 (Navbar)

**FE 단독 처리**

| 기능 | 구현 위치 |
|------|----------|
| 페이지 라우팅 (대시보드·로또·지갑·채굴) | `Navbar.tsx`, `App.tsx` |
| 활성 메뉴 강조 표시 | `Navbar.tsx` |
| 페이지 전환 페이드 애니메이션 | `PageLayout.tsx` |
| 배경 그라디언트, 공통 여백 | `PageLayout.tsx` |

### 4.2 인증 흐름

**FE + BE 연동**

```
사이트 접속
  └─▶ IndexedDB 지갑 목록 있음?
        │
        ├─ YES │ 지갑 선택
        │      └─ POST /auth/token { address }
        │            └─ JWT → localStorage 저장 → 메인 화면 진입
        │
        └─ NO  │ 지갑 생성 화면으로 이동
               └─ 키페어 생성 → IndexedDB 저장
                     └─ POST /wallet { address, nickname, walletColor }
                           └─ POST /auth/token { address }
                                 └─ JWT → localStorage 저장 → 메인 화면 진입
```

- JWT는 `Authorization: Bearer {token}` 헤더로 모든 인증 필요 API에 자동 첨부
- 토큰 payload: `{ address, iat, exp }` (만료: 24시간)
- 인증 검증: token.payload.address == request.fromAddress → 불일치 시 401

---

## 5. 대시보드 페이지 (`DashboardPage.tsx`)

### 5.1 페이지 목적

실시간 블록 흐름, 체인 진행 상태, 네트워크 상태를 한눈에 보여주는 페이지.

### 5.2 컴포넌트 구성

```
DashboardPage
  ├── BlockchainVisualizer    # 블록 흐름 레일 + 블록 상세 모달
  ├── BlockHeight             # 현재 블록 높이 요약
  └── NodeNetwork             # 노드 네트워크 그래프
```

> **초기 로딩 API**: `GET /blockchain/dashboard?limit=10` 단일 호출 → `isOn`, `height`, `blocks[]`, `nodes[]` 분기

### 5.3 BlockchainVisualizer

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 블록 레일 드래그/휠 스크롤 | 가로 스크롤 + 관성(momentum) 스크롤 |
| 블록 hover 애니메이션 | 블록 카드 및 연결선 강조 |
| 첫 렌더링 중심 정렬 | 확정/후보 경계를 뷰포트 중앙으로 자동 이동 |
| 블록 상세 모달 열기/닫기 | 블록 클릭 → 모달 열림, 배경 클릭 또는 Esc → 닫힘 |
| 후보 블록 FE 프로젝션 | `height+1`, `height+2` ... FE에서 직접 생성 (`hash="(미확정)"`, minerLabel=`"Pending Queue"`, txCount=pooledTxCount 기반 추정) |

**백엔드 연동 필요**

| 기능 | 데이터 출처 | 제공 API |
|------|-----------|---------|
| 확정 블록 목록 | `block` 테이블 | `GET /blockchain/dashboard` → `blocks[]` |
| 현재 높이 | RPC + `block` 테이블 | `GET /blockchain/dashboard` → `height` |
| 멤풀 TX 수 | RPC | `GET /blockchain/dashboard` → `pooledTxCount` |
| 블록 상세 | `block` + `wallet` 테이블 | `GET /blockchain/blocks/{height}` |

#### 5.3.1 블록 상세 모달 (`BlockDetailModal.tsx`)

블록 카드 클릭 시 표시. 대시보드와 채굴 페이지에서 공통 사용.

| 섹션 | 표시 데이터 | 비고 |
|------|-----------|------|
| 요약 | `height`, `totalReward(reward+feeReward)`, `minedAt`, `txCount`, `miningElapsed`, `confirmations` | |
| 블록 상세 | `version`, `previousHash`(copy), `nonce`, `difficulty` | `merkleRoot` 제거 (DB 미저장) |
| 헤더 | `height`, `minerName`(채굴자 닉네임), `hash`(줄임표시) | `coinbaseAddress` 제거, `minerName`으로 대체 |

> **후보 블록 모달**: 미확정 필드(`hash`, `minerName`, `nonce` 등)는 `—` 또는 `(미확정)` 표시

---

### 5.4 BlockHeight 컴포넌트

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| 현재 블록 높이 | `GET /blockchain/dashboard` → `height` |
| 최근 블록 높이 스택 | `blocks[].height` 배열 |

---

### 5.5 NodeNetwork 컴포넌트

**백엔드 연동 필요**

| 기능 | 데이터 | 비고 |
|------|--------|------|
| 연결된 노드 수 | `GET /blockchain/dashboard` → `connections` | |
| 노드 ID 목록 | `GET /blockchain/dashboard` → `nodes[]` (Array\<Integer\>) | 상세 피어 정보 미제공 — FE에서 노드 ID 기반 그래프 렌더링 |

> **변경 사항**: `nodes[]`는 상세 피어 정보 없이 정수형 노드 ID 배열만 제공. FE는 노드 ID 기반으로 그래프 시각화.

---

## 6. 로또 페이지 (`LottoPage.tsx`)

### 6.1 페이지 목적

16진수 번호 6개를 선택하고, POT를 사용해 로또에 참여하고, 참여 내역과 결과를 확인하는 페이지.

### 6.2 컴포넌트 구성

```
LottoPage
  ├── JackpotPool   # 잭팟 풀 시각화 + 역대 Top 3 랭킹
  └── HexPicker     # 번호 선택 / 참여 / 내역 (탭 구조)
        ├── Tab: 로또 추첨 참여   # 번호 선택, 잔액 표시, 교환 버튼
        └── Tab: 참여 내역        # 히스토리 목록 → 상세 모달
```

> **초기 로딩 API**: `GET /lotto?address={walletAddress}` 단일 호출

### 6.3 JackpotPool 컴포넌트

**백엔드 연동 필요**

| 기능 | 데이터 | 비고 |
|------|--------|------|
| 현재 잭팟 풀 잔액 | `GET /lotto` → `poolBalanceJack` | |
| 누적 참여 / 당첨자 수 | `GET /lotto` → `totalEntries`, `totalWinners` | |
| 역대 Top 3 수상자 랭킹 | `GET /lotto` → `prizeTiers[]` | `rank`, `matches`, `rewardJack` — **역대 최고 보상 수령자** 기준 (매치별 고정 보상표 아님) |

> **수수료 구조 반영**: 로또 참여 1 POT → Pool 80% / 소각 19% / 채굴자 1%

---

### 6.4 HexPicker 컴포넌트 — 추첨 참여 탭

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 6자리 hex 슬롯 증감 | 각 슬롯 `+` / `-` 버튼으로 값 변경 (0x0~0xF) |
| 랜덤 번호 생성 | 순차 잠금(Sequential Lock) 방식으로 6개 순서대로 확정 |
| 슬롯 애니메이션 | 숫자 변경 및 랜덤 생성 시 bounce/pulse 애니메이션 |
| 참여 성공 피드백 모달 | 참여 완료 후 2초간 "로또 추첨이 되었습니다" 모달 표시 후 내역 탭 자동 전환 |

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| JACK / POT 잔액 표시 | `GET /lotto` → `jackBalance`, `potBalance` |
| JACK → POT 교환 버튼 | `GET /exchange/info` 잔액 확인 → 클라이언트 서명 → `POST /exchange/jack-to-pot` |
| 로또 참여 제출 | 클라이언트 서명(version=3) → `POST /lotto/commit { fromAddress, chosenNumbers[], signedTxHex }` |

> **클라이언트 사이드 서명 플로우**: 브라우저 IndexedDB의 private key로 TX 서명 → signed TX hex를 Backend로 전송 → BE는 `sendrawtransaction(signedTxHex)` RPC 호출

---

### 6.5 HexPicker 컴포넌트 — 참여 내역 탭

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 탭 전환 | `로또 추첨 참여` ↔ `참여 내역` |
| 내역 목록 스크롤 | 최대 높이 480px, overflow-y 스크롤 |
| 내역 항목 클릭 → 상세 모달 | `HistoryModal` 표시 |
| isClaimable 버튼 표시 | `isClaimable=true`일 때만 "수령" 버튼 렌더링 |

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| 참여 내역 목록 | `GET /lotto/entries?address={walletAddress}&status=ALL` |

#### 6.5.1 참여 내역 상세 모달 (HistoryModal)

| 섹션 | 표시 데이터 | 비고 |
|------|-----------|------|
| 내 선택 번호 (3×2 그리드) | `chosenNumbers[]` (6개, hex 표시) | |
| 블록 결과 번호 (3×2 그리드) | `resultNumbers[]` (6개, 일치 자리 금색 강조) | null이면 "추첨 중" 표시 |
| 비교 결과 | `matchCount` / 6 일치, statusLabel | |
| 보상 금액 | `rewardJack` (1매치이면 "1 POT 환불" 표시) | |
| 보상 받기 버튼 | `isClaimable=true`일 때만 표시 | 클릭 → `POST /lotto/claim` |

> **결과 조회 API**: `GET /lotto/entries/{commitHash}/result` — 클레임 가능 여부(`isClaimable`) 포함
> **`resultBlockHashes` 제거**: FE 모달에서 비교 블록 해시 표시 섹션 제거. `chosenNumbers` vs `resultNumbers` 6자리 비교 그리드만 유지.

---

## 7. 지갑 페이지 (`WalletPage.tsx`)

### 7.1 페이지 목적

지갑 생성/복구, 지갑 전환, 자산 확인, JACK→POT 교환, 활동 이력 확인을 수행하는 페이지.

### 7.2 컴포넌트 구성

```
WalletPage
  ├── [미연결] WalletCreate   # 지갑 생성 또는 복구
  └── [연결됨]
        ├── WalletInfo        # 지갑 카드 캐러셀 + 잔액 + 교환 + 추가 버튼
        └── ActivityList      # 활동 기록 타임라인
```

### 7.3 WalletCreate 컴포넌트 (미연결 상태)

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 지갑 생성 / 복구 탭 전환 | 두 탭(생성, 복구) 전환 UI |
| 지갑 테마 색상 선택 | 색상 팔레트에서 카드 테마 선택 |
| 생성 시 키페어 생성 | 브라우저에서 secp256k1 키페어 생성, IndexedDB에 private key 저장 |
| 복구 시 private key 입력 | private key 직접 입력 → address 유도 → IndexedDB 저장 |

**백엔드 연동 필요**

| 기능 | 연동 순서 |
|------|---------|
| 지갑 메타데이터 서버 등록 | ① `POST /wallet { address, nickname, walletColor }` → ② `POST /auth/token { address }` → JWT 저장 |

---

### 7.4 WalletInfo 컴포넌트 (연결 상태)

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 지갑 카드 캐러셀 전환 | 좌우 화살표·드래그(PanInfo)로 지갑 카드 전환, 3D rotateY 애니메이션 |
| 캐러셀 인디케이터 | 현재 지갑 위치 dot 표시 |
| 지갑 추가 버튼(+) | 툴팁 표시, 클릭 시 추가 모달 |
| 추가 모달 | `choose → create` 또는 `choose → restore` 2단계 플로우 |
| 교환 오류 피드백 | JACK 잔액 부족 등 에러 메시지 인라인 표시 |

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| 다중 지갑 목록 + 잔액 | `GET /wallet?addresses=addr1,addr2,...` → `wallets[]` (RPC 잔액 포함) |
| JACK → POT 교환 (단방향) | `GET /exchange/info?address=...` 잔액 확인 → 클라이언트 서명(version=2) → `POST /exchange/jack-to-pot` |
| 다중 지갑 등록 | `POST /wallet { address, nickname, walletColor }` + `POST /auth/token` |

> **교환 방향**: JACK → POT 단방향만. `→` 버튼만 표시, 역방향(`POT → JACK`) 없음.

---

### 7.5 ActivityList 컴포넌트

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 활동 항목 애니메이션 | 각 항목 fade-in, layout 애니메이션 |
| 스크롤 | 최대 400px, hover 시 overflow-y 활성 |
| 무한 스크롤 (커서 기반) | `hasNext=true`이면 스크롤 하단 도달 시 `lastActivityId` 커서로 추가 조회 |

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| 활동 기록 목록 | `GET /wallet/{address}/activities?size=20` (커서 페이지네이션) |
| 페이지네이션 | `lastActivityId` 커서 파라미터, `hasNext` / `nextCursor` 응답 |

> **저장 시점**: Webhook 블록 인덱싱 시 `wallet_activity` 테이블에 저장. 지갑 생성 이벤트는 `POST /wallet` 즉시 저장.

---

## 8. 채굴 페이지 (`MiningPage.tsx`)

### 8.1 페이지 목적

내가 채굴한 블록, 채굴 보상, 채굴 정책/가이드를 보여주는 페이지.

### 8.2 컴포넌트 구성

```
MiningPage
  ├── MinedBlocks    # 내가 채굴한 블록 레일 + 블록 상세 모달
  ├── MiningGuide    # 채굴 가이드 카드
  └── RewardPolicy   # 보상 정책 아코디언
```

### 8.3 MinedBlocks 컴포넌트

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 블록 카드 가로 스크롤 | 가로 레일, 마우스 휠로 스크롤 |
| 총 보상 애니메이션 | `AnimatedNumber`로 총 JACK 보상 카운트업 |
| 빈 상태 표시 | 채굴 블록 없을 때 안내 메시지 |
| 블록 상세 모달 | 카드 클릭 시 `BlockDetailModal` 표시 (대시보드와 동일 컴포넌트 재사용) |
| 무한 스크롤 | `hasNext=true`이면 `lastBlockId` 커서로 추가 조회 |

**백엔드 연동 필요**

| 기능 | 데이터 |
|------|--------|
| 내 채굴 블록 목록 | `GET /mining/blocks?address={walletAddress}&size=10` (커서 페이지네이션) |
| 누적 채굴 보상 합계 | `GET /mining/blocks` → `totalRewardJack` |
| 블록 상세 | `GET /blockchain/blocks/{height}` |

---

### 8.4 MiningGuide 컴포넌트

**백엔드 연동 필요**

| 기능 | 데이터 | 비고 |
|------|--------|------|
| 채굴 기본 정보 | `GET /blockchain/dashboard` → `height`, `difficulty`, `networkHashps`, `pooledTxCount` | 별도 `/mining/info` API 없음 |
| 블록 보상 안내 | 고정 상수: `100 JACK / 블록` | |
| TUI 다운로드 가이드 | 정적 텍스트 | |

---

### 8.5 RewardPolicy 컴포넌트

**FE 단독 / 정적 처리**

| 기능 | 처리 |
|------|------|
| 보상 정책 목록 | 정적 텍스트 (블록 100 JACK / 채굴자 100% / 로또 Pool 80% · 소각 19% · 채굴자 1%) |
| 당첨 구조 표 | 정적 상수 (6매치 잭팟 50%, 5매치 100,000 JACK, 4매치 20,000 JACK, 3매치 2,000 JACK, 2매치 300 JACK, 1매치 1 POT 환불) |

---

## 9. 후보 블록 (Candidate Blocks) 처리 방침

FE-ssatto의 `BlockchainVisualizer`는 확정 블록(confirmed)과 후보 블록(candidate)을 동시에 표시한다.

### 9.1 처리 원칙

- **후보 블록 API 없음** — `GET /blockchain/candidate-blocks` 엔드포인트 제공하지 않음
- FE가 `dashboard.height + 1`, `height + 2` ... 를 직접 프로젝션하여 생성

### 9.2 후보 블록 프로젝션 데이터

| 필드 | FE 생성 값 |
|------|-----------|
| `hash` | `"(미확정)"` |
| `minerName` | `"Pending Queue"` |
| `txCount` | `pooledTxCount` 기반 추정 |
| `minedAt` | 이전 블록 `minedAt` + 30초 기반 예상 시각 |
| `miningElapsed` | `"대기 중"` |
| `confirmations` | 0 |

---

## 10. 확정 API 엔드포인트 목록

> api.md 기준 최종 확정 엔드포인트. Base URL: `/api/v1`

### 인증 (Auth)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| POST | `/auth/token` | 지갑 주소 기반 JWT 발급 | ✗ |

### 블록체인 (Blockchain)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| GET | `/blockchain/dashboard` | 대시보드 통합 조회 (블록 목록 + 노드 목록 + 체인 상태) | ✗ |
| GET | `/blockchain/blocks/{height}` | 블록 상세 조회 | ✗ |

### 지갑 (Wallet)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| POST | `/wallet` | 지갑 메타데이터 등록 | ✗ |
| GET | `/wallet?addresses=...` | 다중 지갑 목록 + 잔액 조회 (RPC) | ✗ |
| GET | `/wallet/{address}/activities` | 활동 내역 (커서 페이지네이션) | ✓ |

### 교환 (Exchange)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| GET | `/exchange/info` | JACK/POT 잔액 조회 | ✗ |
| POST | `/exchange/jack-to-pot` | JACK→POT 교환 (signed TX) | ✓ |

### 로또 (Lotto)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| GET | `/lotto` | 로또 페이지 통합 조회 (풀·랭킹·잔액) | ✗ |
| POST | `/lotto/commit` | 로또 참여 (signed TX, version=3) | ✓ |
| GET | `/lotto/entries` | 참여 내역 목록 | ✓ |
| GET | `/lotto/entries/{commitHash}/result` | 참여 결과 조회 | ✓ |
| POST | `/lotto/claim` | 보상 수령 (signed TX, version=5) | ✓ |

### 채굴 (Mining)

| 메서드 | 경로 | 설명 | BearerToken |
|--------|------|------|:-----------:|
| GET | `/mining/blocks` | 내 채굴 블록 목록 (커서 페이지네이션) | ✓ |

### 내부 (Internal — Webhook)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/internal/webhook/block` | Server Node → Backend 블록 수신 |

---

## 11. 클라이언트 사이드 서명 흐름 (Exchange / Lotto Commit / Lotto Claim)

```
[브라우저]
  ① RPC 조회 → GET /wallet?addresses=... (현재 잔액 확인)
  ② TX 구조 조립 (inputs=UTXO, outputs, version=2/3/5)
  ③ IndexedDB에서 private key 로드
  ④ @noble/secp256k1로 각 input 서명
  ⑤ signed TX hex 생성

[Backend]
  ⑥ POST /exchange/jack-to-pot 또는 POST /lotto/commit 또는 POST /lotto/claim
     body: { fromAddress, signedTxHex, ... }
  ⑦ RPC: sendrawtransaction(signed_tx_hex)

[Server Node]
  ⑧ TX 검증 (ECDSA, UTXO, 이중지불)
  ⑨ Mempool 추가 → P2P 브로드캐스트
  ⑩ 채굴 후 블록 포함 → Webhook → Backend DB 인덱싱
```

> **MVP 타협안**: 클라이언트 사이드 서명 구현이 일정 내 어려울 경우, `signedTxHex` 필드를 빈 문자열로 전송하고 Backend가 Server Node 내부 지갑으로 RPC 직접 처리. 고도화 단계에서 전환.

---

## 12. 백엔드 설계 우선순위

| 우선순위 | 항목 | 연관 API |
|:--------:|------|---------|
| 🔴 1 | JWT 발급 + 지갑 메타데이터 등록 | `POST /auth/token`, `POST /wallet` |
| 🔴 2 | Webhook 인덱서: block, transaction, wallet_activity | `POST /internal/webhook/block` |
| 🔴 3 | 대시보드 통합 조회 | `GET /blockchain/dashboard` |
| 🔴 4 | 로또 참여(commit) + 결과 조회 + 클레임 | `POST /lotto/commit`, `GET /lotto/entries`, `POST /lotto/claim` |
| 🟡 5 | 지갑 활동 내역 조회 | `GET /wallet/{address}/activities` |
| 🟡 6 | 블록 상세 조회 | `GET /blockchain/blocks/{height}` |
| 🟡 7 | 교환 | `GET /exchange/info`, `POST /exchange/jack-to-pot` |
| 🟠 8 | 채굴 블록 내역 | `GET /mining/blocks` |
| 🟠 9 | 로또 통합 조회 (풀·랭킹) | `GET /lotto` |
