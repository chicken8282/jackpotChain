# FE-ssatto 기능 명세서

## 1. 문서 목적
이 문서는 현재 `FE-ssatto` 프론트엔드를 기준으로 기능 요구사항을 정리한 문서이며, 아래 작업의 기준 문서로 사용한다.

- 백엔드 API 명세 설계
- ERD 설계
- 프론트엔드/백엔드 책임 분리
- 목업 상태에서 실제 연동 상태로 전환하기 위한 구조 정리

현재 앱의 주요 페이지는 다음 4개다.

- 대시보드
- 로또
- 지갑
- 채굴

각 페이지는 아래 두 범주로 나누어 정리한다.

1. 프론트엔드 단독 처리 기능
2. 백엔드 요청 기반 기능

또한 백엔드 요청 기반 기능에는 화면에 어떤 데이터가 보여야 하는지까지 함께 명시한다.

## 2. 전제 조건
- 현재 프론트엔드는 목업 데이터와 로컬 상태를 많이 사용하고 있지만, 실제 서비스에서는 블록체인 상태, 로또 상태, 자산 상태를 백엔드 및 노드 연동 데이터로 전환해야 한다.
- 개인키와 니모닉은 클라이언트가 소유해야 하며, 백엔드는 지갑 메타데이터와 조회용 프로젝션만 저장하는 방향을 전제로 한다.
- 블록체인 진실 데이터는 노드 또는 노드 동기화 기반 백엔드에서 제공해야 하며, 프론트 로컬 상태가 기준이 되면 안 된다.
- 일부 UI 텍스트는 현재 소스상 깨져 있으므로, 이 문서는 화면 문자열 자체보다 컴포넌트 구조와 데이터 형태를 기준으로 기능 의도를 정리했다.

## 3. 공통 도메인 객체

### 3.1 지갑
여러 페이지에서 공통으로 필요한 핵심 필드:

- `walletId`
- `nickname`
- `address`
- `themeColor`
- `isPrimary`
- `jackBalance`
- `potBalance`
- `backupStatus` 또는 `mnemonicPreviewAvailable`
- `createdAt`
- `updatedAt`

### 3.2 로또 참여 내역
여러 페이지에서 공통으로 필요한 핵심 필드:

- `entryId`
- `walletId`
- `roundId`
- `selectedHexNumbers[6]`
- `resultHexNumbers[6]`
- `matchCount`
- `jackpotSnapshot`
- `blockHash`
- `status`
  - `pending`
  - `won`
  - `lost`
  - `claimable`
  - `claimed`
- `rewardAmount`
- `claimedAt`
- `createdAt`

### 3.3 블록
대시보드/채굴 페이지에 필요한 핵심 필드:

- `blockId`
- `height`
- `hash`
- `previousHash`
- `merkleRoot`
- `status`
  - `confirmed`
  - `candidate`
- `txCount`
- `confirmations`
- `reward`
- `feeReward`
- `jackpotContribution`
- `difficulty`
- `nonce`
- `coinbaseAddress`
- `minerLabel`
- `minedAt`
- `miningElapsed`
- `isMainChain`
- `isMine`

### 3.4 활동 이력 / 원장 이벤트
지갑 페이지에 필요한 핵심 필드:

- `activityId`
- `walletId`
- `type`
- `description`
- `amountText` 또는 구조화된 증감 정보
- `relatedEntityType`
- `relatedEntityId`
- `createdAt`

## 4. 공통 영역 / 앱 셸

### 4.1 앱 셸 / 네비게이션

#### 프론트엔드 단독 처리 기능
| 기능 | 설명 |
|---|---|
| 라우트 전환 애니메이션 | 대시보드, 로또, 지갑, 채굴 페이지 전환 시 페이드 애니메이션 처리 |
| 활성 메뉴 표시 | 현재 페이지에 맞는 네비게이션 활성 상태 표시 |
| 공통 레이아웃 | 배경, 최대 너비, 상단 네비게이션, 공통 여백 적용 |

#### 백엔드 요청 기반 기능
| 기능 | 설명 | 화면 표시 데이터 |
|---|---|---|
| 전역 네트워크 상태 표시 | 상단 공통 영역에서 선택적으로 현재 네트워크 상태 노출 가능 | `networkStatus`, `latestHeight`, `activeNodeCount`, `syncLag`, `updatedAt` |

## 5. 대시보드 페이지

### 5.1 페이지 목적
실시간 블록 흐름, 체인 진행 상태, 네트워크 상태를 한눈에 보여주는 페이지.

### 5.2 프론트엔드 단독 처리 기능
| 기능 | 설명 |
|---|---|
| 블록 레일 드래그/휠 스크롤 | 블록 흐름 레일을 드래그하거나 마우스 휠로 가로 스크롤 |
| 블록 hover 애니메이션 | 블록 카드, 연결선 강조 애니메이션 처리 |
| 초기 중앙 정렬 | 첫 렌더링 시 흐름 레일을 중심 지점으로 자동 이동 |
| 블록 상세 모달 열기/닫기 | 블록 클릭 시 모달 열림, 배경 클릭 또는 `Esc`로 닫힘 |
| 노드 그래프 시각 효과 | 연결선, 펄스, 노드 강조 애니메이션 처리 |

### 5.3 백엔드 요청 기반 기능
| 기능 | 설명 | 화면 표시 데이터 |
|---|---|---|
| 블록체인 흐름 레일 | 확정 블록과 후보 블록을 시간/높이 순서대로 표시 | `blockId`, `height`, `hash`, `status`, `minerLabel`, `isMine`, `reward`, `feeReward`, `jackpotContribution`, `txCount`, `confirmations` |
| 현재 블록 높이 요약 | 현재 체인 높이 표시 | `currentHeight`, `updatedAt` |
| 활성 노드 수 요약 | 현재 활성 노드 수 표시 | `activeNodeCount`, `updatedAt` |
| 확정/후보 경계 표시 | 확정 영역과 후보 영역 사이의 기준점 표시 | `checkpointHeight`, `confirmedTipHeight`, `candidateTipHeight` |
| 블록 상세 모달 | 선택한 블록의 상세 메타데이터 표시 | `height`, `status`, `reward`, `feeReward`, `minedAt`, `txCount`, `miningElapsed`, `version`, `previousHash`, `merkleRoot`, `nonce`, `difficulty`, `coinbaseAddress`, `minerLabel`, `hash`, `confirmations`, `isMine`, `isMainChain` |
| 블록 높이 박스 | 현재 높이와 최근 레이어/스택 정보 표시 | `currentHeight`, `recentHeights[]`, `currentLayerLabel` |
| 노드 네트워크 박스 | 활성 노드 네트워크 그래프와 노드 수 표시 | `activeNodeCount`, `nodes[]`, `nodeId`, `nodeLabel`, `nodeRole`, `status`, `connections[]`, `latencyMs` 또는 `healthLevel` |

### 5.4 백엔드 설계 참고 메모
- 대시보드는 하나의 거대한 응답보다 최소한 아래 수준으로 분리하는 것이 바람직하다.
  - 체인 요약
  - 블록 흐름 목록
  - 블록 상세
  - 네트워크/노드 요약
- 후보 블록은 확정 블록과 성격이 다르므로 모델을 구분하는 편이 안전하다.

## 6. 로또 페이지

### 6.1 페이지 목적
사용자가 16진수 번호 6개를 선택하고, POT를 사용해 로또 라운드에 참여하고, 참여 내역과 결과를 확인하는 페이지.

### 6.2 프론트엔드 단독 처리 기능
| 기능 | 설명 |
|---|---|
| 16진수 슬롯 증감 UI | 각 슬롯 값을 위/아래 버튼으로 변경 |
| 랜덤 번호 생성 | 6개 번호를 랜덤으로 생성 |
| 슬롯 애니메이션 | 숫자 변경 및 랜덤 생성 시 펄스/이동 애니메이션 적용 |
| 탭 전환 | 추첨 참여 탭과 참여 내역 탭 전환 |
| 참여 성공 피드백 모달 | 참여 완료 후 2초간 성공 모달 표시 |
| 참여 내역 상세 모달 열기/닫기 | 히스토리 항목 클릭 시 비교 모달 표시 |
| 잭팟 풀 애니메이션 | `J` 코인이 떨어지는 시각 효과 처리 |

### 6.3 백엔드 요청 기반 기능
| 기능 | 설명 | 화면 표시 데이터 |
|---|---|---|
| 잭팟 풀 요약 | 현재 잭팟 풀 총량 표시 | `jackpotPoolAmount`, `currency`, `updatedAt` |
| 참여 가능 여부 판단 | 지갑 연결 여부와 POT 잔액에 따라 참여 가능/불가 처리 | `walletConnected`, `potBalance`, `entryCost`, `roundStatus` |
| JACK/POT 잔액 표시 | 참여 화면에서 사용하는 잔액 표시 | `walletId`, `jackBalance`, `potBalance` |
| JACK/POT 교환 | JACK과 POT 간 교환 처리 | `exchangeRate`, `minExchangeUnit`, `walletBalancesBefore`, `walletBalancesAfter`, `transactionId` |
| 로또 참여 제출 | 현재 라운드에 6개 번호 조합 제출 | `walletId`, `roundId`, `selectedHexNumbers[6]`, `entryCost`, `submittedAt`, `entryId`, `status` |
| 참여 내역 목록 | 현재/과거 참여 내역 리스트 표시 | `entryId`, `createdAt`, `selectedHexNumbers[6]`, `status`, `rewardAmount`, `claimable`, `claimed`, `blockHash`, `roundId` |
| 참여 결과 비교 모달 | 내가 선택한 번호와 블록 결과 번호를 비교 표시 | `entryId`, `selectedHexNumbers[6]`, `resultHexNumbers[6]`, `matchCount`, `blockHash`, `status`, `rewardAmount`, `claimable`, `claimedAt` |
| 당첨 보상 수령 | 보상 수령 가능한 항목에 대해 수령 처리 | `entryId`, `rewardAmount`, `claimable`, `claimed`, `claimTxId`, `claimedAt` |
| 당첨 규칙 / 보상 표 | 매칭 수에 따른 보상 기준 표시 | `roundId` 또는 `prizeConfigVersion`, `tiers[]`, `matchCount`, `bonusRule`, `rewardAmount`, `jackpotRule` |

### 6.4 백엔드 설계 참고 메모
- 로또 도메인은 최소 아래 엔티티를 고려하는 것이 좋다.
  - `lottery_round`
  - `lottery_entry`
  - `lottery_result`
  - `lottery_claim`
  - 선택적으로 `exchange_transaction`
- 결과 확인 가능 시간, 클레임 가능 시간은 단순 상태 문자열이 아니라 명시적인 필드로 내려주는 것이 좋다.
- 로또 결과의 기준값은 블록 기반 또는 노드 검증 기반이어야 한다.

## 7. 지갑 페이지

### 7.1 페이지 목적
지갑 생성/복구, 지갑 전환, 자산 확인, JACK/POT 교환, 활동 이력 확인을 수행하는 페이지.

### 7.2 프론트엔드 단독 처리 기능
| 기능 | 설명 |
|---|---|
| 지갑 색상 선택 | 지갑 생성 시 카드 테마 색상 선택 |
| 지갑 생성 모달 UX | 생성 모달 열기/닫기 및 니모닉 미리보기 |
| 지갑 복구 모달 UX | 복구 모달 열기/닫기 및 12단어 입력 |
| 지갑 캐러셀 전환 | 좌우 스와이프/화살표로 지갑 카드 전환 |
| 지갑 추가 모달 UX | 추가 지갑 생성/복구 선택 모달 표시 |
| 툴팁 / hover 처리 | 추가 버튼 툴팁 등 UI 보조 상태 처리 |

### 7.3 백엔드 요청 기반 기능
| 기능 | 설명 | 화면 표시 데이터 |
|---|---|---|
| 기본 지갑 프로필 표시 | 현재 선택된 지갑 정보와 잔액 표시 | `walletId`, `nickname`, `address`, `themeColor`, `jackBalance`, `potBalance`, `isPrimary` |
| 지갑 생성 등록 | 클라이언트에서 생성한 지갑 메타데이터를 서버에 등록 | `walletId`, `nickname`, `address`, `themeColor`, `createdAt`, `backupConfirmed` |
| 지갑 복구 등록 | 복구 완료된 지갑 메타데이터를 서버에 등록 | `walletId`, `nickname`, `address`, `themeColor`, `restoredAt` |
| 다중 지갑 목록 | 캐러셀에서 전환할 전체 지갑 목록 표시 | `wallets[]`, `walletId`, `nickname`, `address`, `themeColor`, `jackBalance`, `potBalance`, `isPrimary`, `sortOrder` |
| 자산 교환 | 현재 활성 지갑 기준 JACK/POT 교환 처리 | `walletId`, `jackBalanceBefore`, `potBalanceBefore`, `jackBalanceAfter`, `potBalanceAfter`, `exchangeRate`, `transactionId`, `createdAt` |
| 활동 이력 타임라인 | 지갑 관련 이력 목록 표시 | `activityId`, `walletId`, `type`, `description`, `amountText` 또는 구조화된 델타, `relatedEntityType`, `relatedEntityId`, `createdAt` |
| 추가 지갑 등록 | 플러스 버튼 모달을 통한 새 지갑 등록 | `walletId`, `nickname`, `address`, `themeColor`, `walletSource(create|restore)`, `createdAt` |

### 7.4 백엔드 설계 참고 메모
- 지갑 민감 정보는 클라이언트 처리와 서버 메타데이터 저장을 분리해야 한다.
- 추천 엔티티:
  - `wallet`
  - `wallet_balance_projection`
  - `wallet_activity`
  - `exchange_transaction`
  - 선택적으로 `wallet_preferences`
- 한 사용자에게 여러 지갑을 허용할 경우 소유권과 정렬 순서를 명확히 모델링해야 한다.

## 8. 채굴 페이지

### 8.1 페이지 목적
내가 채굴한 블록, 채굴 보상, 채굴 정책/가이드를 보여주는 페이지.

### 8.2 프론트엔드 단독 처리 기능
| 기능 | 설명 |
|---|---|
| 채굴 블록 레일 스크롤 | 가로 스크롤로 블록 카드 탐색 |
| 보상 정책 아코디언 | 정책 섹션 펼침/접힘 처리 |
| 블록 상세 모달 열기/닫기 | 채굴 블록 선택 시 공통 블록 상세 모달 표시 |

### 8.3 백엔드 요청 기반 기능
| 기능 | 설명 | 화면 표시 데이터 |
|---|---|---|
| 내 채굴 블록 목록 | 현재 지갑/사용자가 채굴한 블록 리스트 표시 | `blockId`, `height`, `hash`, `reward`, `createdAt`, `isMine` |
| 채굴 블록 상세 | 선택한 채굴 블록의 상세 메타데이터 표시 | `height`, `hash`, `reward`, `feeReward`, `jackpotContribution`, `txCount`, `difficulty`, `nonce`, `coinbaseAddress`, `version`, `previousHash`, `merkleRoot`, `minedAt`, `miningElapsed`, `confirmations` |
| 총 채굴 보상 | 누적 보상 총합 표시 | `totalMinedReward`, `rewardCurrency`, `periodScope` |
| 채굴 가이드 / 보상 안내 | 채굴 보상, 노드 보상 관련 안내 카드 표시 | `baseMiningReward`, `nodeRewardRule`, `distributionRule`, `updatedAt` |
| 보상 정책 게시판 | 정책 제목과 설명 리스트 표시 | `policyId`, `title`, `body`, `sortOrder`, `policyType`, `updatedAt` |

### 8.4 백엔드 설계 참고 메모
- 채굴 데이터는 블록 및 보상 이벤트를 기반으로 한 조회용 프로젝션으로 설계하는 것이 적절하다.
- 추천 엔티티:
  - `block`
  - `mining_reward_event`
  - `wallet_mined_block`
  - `reward_policy`

## 9. 페이지별 추천 API 초안

### 9.1 대시보드
- `GET /dashboard/summary`
- `GET /blocks/flow`
- `GET /blocks/{blockId}`
- `GET /network/nodes`

### 9.2 로또
- `GET /lottery/summary`
- `GET /lottery/rounds/current`
- `POST /lottery/entries`
- `GET /lottery/entries?walletId=...`
- `GET /lottery/entries/{entryId}`
- `POST /lottery/entries/{entryId}/claim`
- `POST /wallets/{walletId}/exchange`

### 9.3 지갑
- `GET /wallets`
- `POST /wallets`
- `POST /wallets/restore`
- `GET /wallets/{walletId}`
- `GET /wallets/{walletId}/activities`
- `POST /wallets/{walletId}/exchange`

### 9.4 채굴
- `GET /mining/summary?walletId=...`
- `GET /mining/blocks?walletId=...`
- `GET /blocks/{blockId}`
- `GET /mining/policies`

## 10. ERD 설계 시작점 제안

### 10.1 추천 엔티티
- `wallet`
- `wallet_activity`
- `wallet_balance_projection`
- `lottery_round`
- `lottery_entry`
- `lottery_result`
- `lottery_claim`
- `exchange_transaction`
- `block`
- `block_candidate`
- `node_status`
- `mining_reward_event`
- `reward_policy`

### 10.2 추천 관계
- 하나의 `wallet` 는 여러 `wallet_activity` 를 가진다.
- 하나의 `wallet` 는 여러 `lottery_entry` 를 가진다.
- 하나의 `lottery_round` 는 여러 `lottery_entry` 를 가진다.
- 하나의 `lottery_entry` 는 0개 또는 1개의 `lottery_claim` 을 가진다.
- 하나의 `block` 은 결과 산출용 `lottery_result` 와 연결될 수 있다.
- 하나의 `wallet` 은 채굴 보상/채굴 블록 프로젝션을 여러 건 가질 수 있다.

## 11. 백엔드 설계 우선순위 제안
실제 백엔드 설계를 시작한다면 우선순위는 다음 순서가 효율적이다.

1. 지갑 메타데이터 + 잔액 프로젝션
2. 로또 라운드 / 참여 / 결과 / 클레임 모델
3. 블록 흐름 / 블록 상세 / 대시보드 요약
4. 채굴 보상 프로젝션 / 정책 조회
5. 노드 / 네트워크 모니터링

## 12. 최종 메모
현재 프론트엔드에서 로컬 상태로 처리 중인 아래 기능은 임시 UI 스캐폴딩으로 보는 것이 맞다.

- 지갑 생성 완료 상태
- 추가 지갑 캐러셀 항목
- 로또 참여 결과 비교용 목업 값
- 대시보드 및 채굴 블록 목업 목록

API와 ERD가 정리되면 위 항목들은 모두 백엔드 응답 기반으로 전환하는 것을 권장한다.
