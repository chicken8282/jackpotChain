# 기능 명세서 (Functional Specification)

> JackpotChain 기반 로또 서비스 — FE-ssatto 소스코드 기준 + blockchain.md 선택된 방안 반영
> 작성 기준일: 2026-03-18

---

## 1. 문서 목적

이 문서는 `FE-ssatto` 프론트엔드 소스코드를 직접 분석하여 기능 요구사항을 정리한 문서이며, 다음 작업의 기준 문서로 사용한다.

- 백엔드 API 명세 설계 (`api.md`)
- ERD 설계 (`erd.md`)
- 프론트엔드/백엔드 책임 분리
- 목업 → 실제 백엔드 연동 전환 기준

### 1.1 blockchain.md 선택된 방안 반영

| 항목 | 선택된 방안 |
|------|------------|
| 서명 방식 (4번) | 클라이언트 사이드 서명 — private key는 브라우저 IndexedDB에만 보관 |
| 교환 방향 (7번) | JACK → POT 단방향만 — POT → JACK 역교환 없음 |
| 블록 연동 (9번) | Webhook 방식 — Server Node가 블록 수신 시 Backend에 HTTP POST |
| 수수료 구조 (12번) | 블록 보상 100 JACK / 채굴자 100% / 로또 참여비 Pool 80% · 소각 19% · 채굴자 1% |

---

## 2. 전제 조건

- 현재 FE-ssatto는 목업 데이터와 로컬 상태를 사용하고 있으며, 실제 서비스에서는 블록체인 상태·로또 상태·자산 상태를 백엔드 및 노드 연동 데이터로 전환해야 한다.
- **private key와 서명은 클라이언트(브라우저)가 전담한다.** 서버는 지갑 메타데이터(주소, 닉네임, 테마)와 조회용 인덱스 데이터만 저장한다.
- 블록체인 진실 데이터(on-chain)는 Server Node 또는 Webhook 기반 백엔드 인덱싱에서 제공한다.
- **JACK → POT 교환은 단방향이다.** FE UI는 역방향 버튼을 표시하지 않는다.
- 블록 인덱싱은 Webhook 방식으로 이루어지며, Backend는 DB 조회로 빠른 응답을 제공한다.

---

## 3. 공통 도메인 객체

### 3.1 지갑 (Wallet)

| 필드 | 타입 | 설명 |
|------|------|------|
| `walletId` | Long | 서버 PK |
| `address` | String | 블록체인 지갑 주소 (공개) |
| `nickname` | String | 사용자 정의 닉네임 |
| `walletColor` | String | 카드 테마 색상 ID |
| `jackBalance` | Long | JACK 잔액 (satoshi, on-chain RPC 조회) |
| `potBalance` | Long | POT 잔액 (satoshi, on-chain 집계) |
| `createdAt` | DateTime | 생성 일시 |

> **Note**: private key, 니모닉 — 클라이언트 IndexedDB에만 보관. 서버로 전송 금지.

### 3.2 블록 (Block)

| 필드 | 타입 | 설명 |
|------|------|------|
| `height` | Long | 블록 높이 |
| `hash` | String | 블록 해시 (64자리 hex) |
| `previousHash` | String | 이전 블록 해시 |
| `merkleRoot` | String | 머클 루트 |
| `status` | String | `confirmed` / `candidate` |
| `txCount` | Integer | 포함 트랜잭션 수 |
| `confirmations` | Integer | 확인 수 |
| `reward` | Long | 기본 채굴 보상 (100 JACK = 10,000,000,000 satoshi) |
| `feeReward` | Long | 수수료 보상 |
| `difficulty` | String | 난이도 |
| `nonce` | Long | 논스 |
| `coinbaseAddress` | String | 코인베이스 (채굴자) 주소 |
| `minerLabel` | String | 채굴자 식별 레이블 |
| `minedAt` | String | 채굴 일시 |
| `miningElapsed` | String | 채굴 소요 시간 |
| `version` | String | 블록 버전 |
| `isMainChain` | Boolean | 메인체인 여부 |
| `isMine` | Boolean | 내 지갑이 채굴한 블록 여부 |

### 3.3 로또 참여 내역 (LottoEntry)

| 필드 | 타입 | 설명 |
|------|------|------|
| `entryId` | Long | 참여 PK |
| `commitHash` | String | 커밋 트랜잭션 해시 |
| `walletAddress` | String | 참여 지갑 주소 |
| `chosenNumbers` | Integer[] | 선택한 6자리 숫자 배열 (0~15) |
| `resultNumbers` | Integer[] | 결과 숫자 배열 (블록해시에서 추출) |
| `resultBlockHashes` | String[] | 결과 산출에 사용된 6개 블록 해시 |
| `matchCount` | Integer | 일치 개수 |
| `jackpotSnapshot` | Long | 참여 시점 풀 잔액 |
| `commitBlockHeight` | Long | 커밋이 포함된 블록 높이 |
| `status` | String | `PENDING` / `WON` / `LOST` / `EXPIRED` |
| `rewardJack` | Long | 보상 JACK (satoshi) |
| `rewardPot` | Long | 보상 POT (satoshi, 1매치 환불) |
| `claimed` | Boolean | 수령 여부 |
| `isClaimable` | Boolean | 현재 클레임 가능 여부 |
| `claimableFromHeight` | Long | 클레임 가능 시작 블록 (commit+18) |
| `claimableUntilHeight` | Long | 클레임 만료 블록 (commit+68) |
| `createdAt` | DateTime | 참여 일시 |

### 3.4 활동 내역 (WalletActivity)

| 필드 | 타입 | 설명 |
|------|------|------|
| `activityId` | Long | 활동 PK |
| `walletAddress` | String | 지갑 주소 |
| `type` | String | `TRANSFER` / `EXCHANGE` / `LOTTO_COMMIT` / `LOTTO_CLAIM` / `MINING` / `WALLET_CREATED` |
| `description` | String | 활동 설명 문자열 |
| `jackAmount` | Long | JACK 증감 (음수=지출, satoshi) |
| `potAmount` | Long | POT 증감 (음수=지출, satoshi) |
| `txId` | String | 연관 트랜잭션 해시 |
| `createdAt` | DateTime | 발생 일시 |

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

### 5.3 BlockchainVisualizer

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 블록 레일 드래그/휠 스크롤 | 가로 스크롤 + 관성(momentum) 스크롤 |
| 블록 hover 애니메이션 | 블록 카드 및 연결선 강조 |
| 첫 렌더링 중심 정렬 | 합의 경계를 뷰포트 중앙으로 자동 이동 |
| 블록 상세 모달 열기/닫기 | 블록 클릭 → 모달 열림, 배경 클릭 또는 Esc → 닫힘 |
| 확정/후보 경계 시각적 구분 | `확정 블록` / `합의 경계` / `후보 블록` 레이블 |

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 확정 블록 목록 | `height`, `hash`, `status="confirmed"`, `minerLabel`, `isMine`, `reward`, `feeReward`, `txCount`, `confirmations`, `minedAt` |
| 후보 블록 목록 | `height`, `hash="(projected)"`, `status="candidate"`, `txCount(예상)`, `confirmations=0`, `difficulty` |
| 현재 높이 / 활성 노드 수 | `currentHeight`, `activeNodes` |

#### 5.3.1 블록 상세 모달 (`BlockDetailModal.tsx`)

블록 카드 클릭 시 표시. 대시보드와 채굴 페이지에서 공통 사용.

| 섹션 | 표시 데이터 |
|------|-----------|
| 요약 정보 | `height`, `status`, `totalReward(reward+feeReward)`, `minedAt`, `txCount`, `miningElapsed` |
| 블록 상세 | `version`, `previousHash(copy버튼)`, `merkleRoot(copy버튼)`, `nonce`, `difficulty`, `coinbaseAddress(copy버튼)` |
| 헤더 | `status 뱃지`, `isMine 뱃지`, `height`, `minerLabel`, `hash(줄임표시)` |

---

### 5.4 BlockHeight 컴포넌트

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 현재 블록 높이 | `currentHeight` |
| 최근 블록 높이 스택 | `recentHeights[]` |

---

### 5.5 NodeNetwork 컴포넌트

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 활성 노드 수 | `activeNodeCount` |
| 노드 그래프 | `nodes[]`: `nodeId`, `nodeLabel`, `nodeRole`, `status`, `connections[]` |
| 피어 정보 | `ip`, `port`, `version`, `connectedAt` |

---

## 6. 로또 페이지 (`LottoPage.tsx`)

### 6.1 페이지 목적

16진수 번호 6개를 선택하고, POT를 사용해 로또에 참여하고, 참여 내역과 결과를 확인하는 페이지.

### 6.2 컴포넌트 구성

```
LottoPage
  ├── JackpotPool   # 잭팟 풀 시각화 + 애니메이션
  └── HexPicker     # 번호 선택 / 참여 / 내역 (탭 구조)
        ├── Tab: 로또 추첨 참여   # 번호 선택, 잔액 표시, 교환 버튼
        └── Tab: 참여 내역        # 히스토리 목록 → 상세 모달
```

### 6.3 JackpotPool 컴포넌트

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 현재 잭팟 풀 잔액 | `balanceJack` (JACK satoshi) |
| 누적 참여 / 당첨자 수 | `totalEntries`, `totalWinners` |
| 당첨 구조 표 | `prizeTiers[]`: `matches`, `rewardJack`, `rewardPot`, `rewardRatio` |

> **수수료 구조 반영**: 로또 참여 1 POT → Pool 80% / 소각 19% / 채굴자 1%

---

### 6.4 HexPicker 컴포넌트 — 추첨 참여 탭

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 6자리 hex 슬롯 증감 | 각 슬롯 `+` / `-` 버튼으로 값 변경 (0x00~0xFF) |
| 랜덤 번호 생성 | 순차 잠금(Sequential Lock) 방식으로 6개 순서대로 확정 |
| 슬롯 애니메이션 | 숫자 변경 및 랜덤 생성 시 bounce/pulse 애니메이션 |
| 참여 성공 피드백 모달 | 참여 완료 후 2초간 "로또 추첨이 되었습니다" 모달 표시 후 내역 탭 자동 전환 |

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| JACK 잔액 표시 | `jackBalance` |
| POT 잔액 표시 | `potBalance` |
| JACK → POT 교환 버튼 | 단방향만 지원, `→` 아이콘 클릭 시 즉시 100 JACK → 1 POT 교환 |
| 로또 참여 제출 | `fromAddress`, `chosenNumbers[6]` (0~15 int) → 클라이언트 서명 후 signed TX 전송 |

> **클라이언트 사이드 서명 플로우**: 브라우저에서 IndexedDB의 private key로 TX 서명 → signed TX hex를 Backend로 전송

---

### 6.5 HexPicker 컴포넌트 — 참여 내역 탭

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 탭 전환 | `로또 추첨 참여` ↔ `참여 내역` |
| 내역 목록 스크롤 | 최대 높이 480px, overflow-y 스크롤 |
| 내역 항목 클릭 → 상세 모달 | 참여 내역 항목 클릭 시 `HistoryModal` 표시 |

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 참여 내역 목록 | `entryId`, `createdAt`, `chosenNumbers[]`, `status(PENDING/WON/LOST/EXPIRED)`, `matchCount`, `isClaimable` |

#### 6.5.1 참여 내역 상세 모달 (`HistoryModal` in `HexPicker.tsx`)

참여 내역 항목 클릭 시 표시. 내 선택 번호와 블록 결과 번호를 비교하여 보여줌.

| 섹션 | 표시 데이터 |
|------|-----------|
| 내 선택 번호 (3×2 그리드) | `chosenNumbers[]` (6개, hex 표시) |
| 블록 결과 번호 (3×2 그리드) | `resultNumbers[]` (6개, 일치 자리는 금색 강조) |
| 비교한 블록 해시 | `resultBlockHashes[0]` 또는 대표 블록 해시 |
| 비교 결과 | `matchCount` / 6 일치, `statusLabel(당첨/미당첨/추첨중)` |
| 보상 금액 | `rewardJack` 또는 `rewardPot` |
| 보상 받기 버튼 | `isClaimable=true`일 때만 표시, 클릭 시 클레임 처리 |

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
| 모달 UX | 생성/복구 모달 열기·닫기 |

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 지갑 메타데이터 서버 등록 | `address`, `nickname`, `walletColor`, `createdAt` 전송 (private key는 전송 안 함) |

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

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 지갑 목록 | `wallets[]`: `address`, `nickname`, `walletColor`, `jackBalance`, `potBalance` |
| JACK 잔액 표시 | `jackBalance` (satoshi) |
| POT 잔액 표시 | `potBalance` (satoshi) |
| JACK → POT 교환 (단방향) | 100 JACK → 1 POT, 클라이언트 서명 후 signed TX 전송 |
| 다중 지갑 등록 (생성/복구) | `address`, `nickname`, `walletColor` 서버 등록 |

> **교환 방향**: JACK → POT 단방향만. `→` 버튼만 표시, 역방향 없음.

---

### 7.5 ActivityList 컴포넌트

**FE 단독 처리**

| 기능 | 설명 |
|------|------|
| 활동 항목 애니메이션 | 각 항목 fade-in, layout 애니메이션 |
| 스크롤 | 최대 400px, hover 시 overflow-y 활성 |

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 활동 기록 목록 | `activityId`, `type`, `description`, `amount(JACK 또는 POT)`, `createdAt` |
| 활동 유형 | `WALLET_CREATED(지갑 생성)`, `EXCHANGE(교환)`, `LOTTO_COMMIT(로또 참여)`, `LOTTO_CLAIM(보상 수령)`, `MINING(채굴)`, `TRANSFER(전송)` |

> **구현 방안**: Webhook 방식으로 블록 인덱싱 시 `wallet_activity` 테이블에 저장. 지갑 생성·복구 이벤트는 서버가 직접 저장.

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

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 내 채굴 블록 목록 | `blockId`, `height`, `hash`, `reward(JACK satoshi)`, `minedAt` |
| 총 채굴 보상 합계 | `blocks[].reward` 합산 |

#### 8.3.1 내가 채굴한 블록 상세 모달

`MinedBlocks`에서 블록 카드 클릭 시 `BlockDetailModal` 재사용. 대시보드 블록 상세와 동일한 UI.

| 섹션 | 표시 데이터 |
|------|-----------|
| 요약 정보 | `height`, `status="confirmed"`, `totalReward`, `minedAt`, `txCount`, `miningElapsed` |
| 블록 상세 | `version`, `previousHash`, `merkleRoot`, `nonce`, `difficulty`, `coinbaseAddress` |
| 헤더 | `isMine=true 뱃지`, `height`, `minerLabel="My Wallet"`, `hash` |

> **필요 API**: `GET /blockchain/blocks/{height}` — 블록 높이 기준으로 상세 정보 조회

---

### 8.4 MiningGuide 컴포넌트

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 채굴 기본 정보 | `currentHeight`, `difficulty`, `networkHashps`, `pooledTxCount` |
| 블록 보상 안내 | `blockRewardJack=100 JACK`, `blockTimeTarget` |
| TUI 다운로드 가이드 | 정적 텍스트 |

---

### 8.5 RewardPolicy 컴포넌트

**백엔드 연동 필요**

| 기능 | 화면 표시 데이터 |
|------|----------------|
| 보상 정책 목록 | `policyId`, `title`, `body`, `sortOrder`, `policyType` |
| 현재 수수료 구조 | 블록 100 JACK / 채굴자 100% / 로또 Pool 80% · 소각 19% · 채굴자 1% |

---

## 9. 후보 블록 (Candidate Blocks) 처리 방침

FE-ssatto의 `BlockchainVisualizer`는 확정 블록(confirmed)과 후보 블록(candidate)을 동시에 표시한다.

### 9.1 후보 블록의 성격

| 항목 | 설명 |
|------|------|
| 정의 | 아직 채굴되지 않은 예상(projected) 블록 |
| 해시 | 실제 해시 없음 — `"(pending)"` 또는 높이 기반 임시 ID |
| nonce | 0 (미확정) |
| minerLabel | `"Pending Queue"` (채굴자 미정) |
| txCount | 현재 멤풀 TX 수 기반 예상 값 |
| minedAt | `"예상 YYYY-MM-DD HH:mm KST"` |
| miningElapsed | `"대기 중"` |
| confirmations | 0 |

### 9.2 백엔드 제공 가능 범위

- **제공 가능**: 현재 높이, 난이도, 예상 블록 시각(이전 블록 간격 기반), 멤풀 TX 수
- **제공 불가**: 실제 해시, nonce, coinbaseAddress (채굴 전이므로 존재하지 않음)

### 9.3 FE 수정 필요 사항

| 항목 | 현재 목업 | 수정 방향 |
|------|----------|----------|
| 후보 블록 해시 | 임의 hex 문자열 | `"(미확정)"` 또는 표시 생략 |
| coinbaseAddress | 임의 hex | `"(채굴자 미정)"` 표시 |
| minedAt | 고정 문자열 | 이전 블록 타임스탬프 + 평균 블록 시간(30초) 기반 예상 시각 |
| 블록 상세 모달 | 모든 필드 표시 | 후보 블록에서 미확정 필드는 `—` 또는 `(미확정)` 표시 |

---

## 10. 추천 API 엔드포인트

### 10.1 대시보드
- `GET /blockchain/info` — 체인 요약
- `GET /blockchain/blocks` — 확정 블록 목록
- `GET /blockchain/blocks/{height}` — 블록 상세 (모달용)
- `GET /blockchain/candidate-blocks` — 후보 블록 프로젝션
- `GET /network/info` — 노드 네트워크

### 10.2 로또
- `GET /lotto/pool` — 잭팟 풀 요약
- `POST /lotto/commit` — 로또 참여 (signed TX)
- `GET /lotto/entries` — 참여 내역 목록
- `GET /lotto/entries/{commitHash}/result` — 참여 상세 (모달용)
- `POST /lotto/claim` — 보상 수령 (signed TX)

### 10.3 지갑
- `POST /wallet` — 지갑 메타데이터 등록
- `GET /wallet/{address}/balance` — 잔액 조회
- `GET /wallet/{address}/activities` — 활동 내역

### 10.4 교환
- `POST /exchange/jack-to-pot` — JACK→POT 교환 (단방향, signed TX)
- `GET /exchange/info` — 교환 정보

### 10.5 채굴
- `GET /mining/info` — 채굴 정보
- `GET /mining/blocks` — 내 채굴 블록 목록
- `GET /blockchain/blocks/{height}` — 블록 상세 (공통)

---

## 11. 클라이언트 사이드 서명 흐름 (Exchange / Lotto Commit)

```
[브라우저]
  ① UTXO 조회 → GET /wallet/{address}/utxo
  ② TX 구조 조립 (inputs, outputs, version)
  ③ IndexedDB에서 private key 로드
  ④ secp256k1(JS 라이브러리)로 서명
  ⑤ signed TX hex 생성

[Backend]
  ⑥ POST /exchange/jack-to-pot 또는 POST /lotto/commit
     body: { fromAddress, signedTxHex, ... }
  ⑦ RPC: sendrawtransaction(signed_tx_hex)

[Server Node]
  ⑧ TX 검증 (ECDSA, UTXO, 이중지불)
  ⑨ Mempool 추가 → P2P 브로드캐스트
  ⑩ 채굴 후 블록 포함 → Webhook → Backend DB 인덱싱
```

---

## 12. 백엔드 설계 우선순위

| 우선순위 | 항목 |
|:--------:|------|
| 🔴 1 | 지갑 메타데이터 등록 + 잔액 RPC 조회 |
| 🔴 2 | Webhook 인덱서: block, transaction, wallet_activity |
| 🔴 3 | 로또 참여(commit) + 결과 조회 + 클레임 |
| 🟡 4 | 블록 상세 조회 (대시보드 + 채굴 모달) |
| 🟡 5 | 후보 블록 프로젝션 |
| 🟠 6 | 노드 네트워크 정보 |
| 🟠 7 | 채굴 가이드 / 보상 정책 |
