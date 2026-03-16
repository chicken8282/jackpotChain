# 프론트엔드 UI/상태/API 도메인 정합성 점검

작성일: 2026-03-16  
대상:
- React 프론트: `C:\Users\SSAFY\S14P21E202\FE-ssatto`
- Vue 레거시/프로토타입: `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend`

전제 기준:
- 서비스는 교육 진도형 플랫폼이 아니라 블록체인 로또 이벤트 체험 서비스다.
- 브라우저는 Node RPC를 직접 호출하면 안 되고, 반드시 Spring REST API만 호출해야 한다.
- 지갑은 무로그인 + 로컬 지갑 기준이다.
- private key / mnemonic은 client-side only여야 하며 서버 저장 전제는 금지다.
- 로또 플로우는 `Commit -> 블록 포함 후 기준 높이 확정 -> 미래 블록 기반 결과 계산 -> Claim 가능 구간 진입 -> Claim 완료`다.
- 즉시 결과 확정 UX는 도메인 위반이다.
- 코어에서 바로 가능한 데이터와 projection/indexer가 필요한 데이터는 구분해야 한다.

---

## 1부: 전체 진단 요약

현재 React 프론트(`FE-ssatto`)는 "붙일 수 있는 UI"가 아니라 "데모용 인터랙션 묶음"에 가깝다. 실제 API 호출은 전혀 없고, 모든 핵심 데이터가 `zustand + mock constant`에 하드코딩되어 있다. 따라서 지금 상태에서는 "Spring REST만 호출" 제약을 어겼다기보다, 아직 연동 계층 자체가 없다.

더 심각한 문제는 상태 모델이 도메인 흐름을 반영하지 않는다는 점이다. 로또 엔트리는 사실상 `대기/당첨/미당첨/claimed` 수준으로만 취급되고 있으며, `MEMPOOL_WAITING`, `CONFIRMED_WAITING_RESULT`, `CLAIMABLE`, `CLAIMED`, `EXPIRED`, `FAILED_OR_RECHECK_REQUIRED`가 전혀 분리되어 있지 않다. 즉 현재 UI는 commit 이후의 체인 비동기성을 모델링하지 못하고 있다.

특히 아래 가정은 강하게 수정해야 한다.
- 즉시 당첨 확정 전제
- 브라우저 내부에서 결과를 계산하거나 mock으로 확정하는 전제
- 지갑/히스토리/채굴 이력을 프론트 로컬 상태만으로 유지하는 전제
- 실시간 push 또는 미래 블록 예측이 가능한 것처럼 보이게 하는 전제
- 교육/채굴 체험 UX가 서비스 메인 플로우인 것처럼 보이게 하는 전제

결론적으로 MVP 기준 권장 방향은 아래다.
- 화면 핵심을 `지갑 생성/복구`, `엔트리 커밋`, `내 엔트리 상태 추적`, `클레임` 4축으로 축소
- 대시보드는 "체인 관측 데이터"만 최소 노출
- 채굴 페이지는 제거 또는 보조 정보 페이지로 강등
- 모든 엔트리/결과/클레임 가능 여부는 Spring API 기준으로만 판정
- 지갑 로컬 저장은 프론트에서 하되, 사용자별 조회는 `walletAddress` 기준 REST 조회로 수행

현재 폴더 전체 기준 한 줄 평:
- `FE-ssatto`: 시각 데모는 있으나 도메인 모델이 틀려서 그대로는 못 붙는다.
- `jackpotchain-frontend`: 서비스 방향 자체가 "교육/즉시 결과 시뮬레이터"에 가까워 현재 제품 전제와 크게 어긋난다. 사실상 폐기 또는 참고용 분리 대상이다.

---

## 2부: 페이지별 진단

### A. React 현재 서비스 후보: `FE-ssatto`

| 페이지 | 현재 역할 | 즉시 연동 가능 | 백엔드 projection 필요 | 현재 코어상 불가능/추정 | 진단 |
|---|---|---|---|---|---|
| `src/pages/DashboardPage.tsx` | 체인/노드/블록 현황 대시보드 | 현재 높이, 최근 확정 블록 일부 | 잭팟 풀, 활성 노드 수, 최근 블록 요약 | 후보 블록 체인, 미래 높이 체크포인트, 노드 네트워크 토폴로지 | 관측성 대시보드처럼 보이지만 대부분 mock이며 실제 체인 가용성보다 훨씬 많은 정보를 요구한다. |
| `src/pages/LottoPage.tsx` | 커밋/내 엔트리/클레임 | 커밋 제출, 내 엔트리 목록 조회 | 엔트리 상태 판정, claimable 여부, 결과/보상 집계 | 즉시 당첨 여부, 블록 해시 기반 즉시 결과 표시 | 서비스 핵심 페이지지만 현재 상태 모델이 가장 틀려 있다. |
| `src/pages/WalletPage.tsx` | 로컬 지갑 생성/복구 + 잔액/활동 | 로컬 지갑 생성/복구, 주소 표시 | 잔액, 활동 내역, 엔트리 관련 활동 | 서버가 mnemonic 보관/복구해주는 흐름 | 무로그인 로컬 지갑 전제와 일부 맞지만 다중 지갑/활동 내역이 mock라서 실제 API/스토리지 설계가 필요하다. |
| `src/pages/MiningPage.tsx` | 내 채굴 블록/보상 | 최근 확정 블록 중 내 주소 coinbase 매칭이 가능하면 일부 | 내 채굴 보상 히스토리, 정렬/페이징 | 서비스 핵심 플로우처럼 강조되는 채굴 UX | 로또 이벤트 체험 서비스 MVP 기준 과도하다. |

#### DashboardPage

관련 파일:
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\DashboardPage.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\BlockchainVisualizer.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\dashboardMockData.ts`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\NodeNetwork.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\BlockHeight.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\JackpotPool.tsx`

판정:
- 즉시 연동 가능
  - 현재 높이
  - 최근 확정 블록 몇 건
  - 블록 해시, 이전 해시, 머클 루트, nonce, difficulty 같은 헤더성 정보
- Spring 가공 API 필요
  - 잭팟 풀 합계
  - 최근 블록의 "잭팟 기여분"
  - 나의 주소로 채굴된 블록 여부
  - 최근 블록 요약 카드
- PostgreSQL projection 필요
  - 활성 노드 수 같은 운영 집계치
  - 최근 N개 블록 + 잭팟 기여 + 수수료 집계
  - 특정 주소 기준 내 블록 필터링
- 현재 코어상 불가능/추정
  - 후보 블록 체인 시각화
  - 미래 체크포인트 높이 확정
  - "Pending Queue" 식 candidate block 목록
  - 네트워크 토폴로지 지도

강한 지적:
- `candidateBlocks`는 실제로는 "체인에 아직 없는 것"을 있는 것처럼 보여준다.
- `checkpointHeight`는 시스템 룰이 명확히 API로 정의되지 않으면 UI에 고정 노출하면 안 된다.
- `activeNodes`와 `NodeNetwork`는 운영/관측용 데이터인데 실제로는 마케팅용 장식 수준이다.

MVP 권장:
- 대시보드는 `현재 높이`, `최근 확정 블록 5개`, `현재 잭팟 풀`, `마지막 추첨 기준 높이` 정도로 축소
- `NodeNetwork`, `candidateBlocks`, "체인 경계" 연출은 제거 또는 백엔드 대기

#### LottoPage

관련 파일:
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\LottoPage.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\lotto\HexPicker.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\stores\useWalletStore.ts`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\types\index.ts`

판정:
- 즉시 연동 가능
  - 번호 선택 UI
  - commit 요청 제출
  - 내 엔트리 목록 조회
  - claim 요청 제출
- Spring 가공 API 필요
  - 엔트리별 상태 판정
  - 기준 블록 높이
  - 결과 계산 완료 여부
  - claim 가능 여부 / 만료 여부
  - 엔트리별 보상 금액
- PostgreSQL projection 필요
  - 내 주소 기준 엔트리 목록
  - 상태 전이 이력
  - 페이징/정렬된 히스토리
  - claim 완료/만료 집계
- 현재 코어상 불가능/추정
  - 즉시 당첨 여부
  - 엔트리 직후 블록 해시 표시
  - 프론트 단독으로 "결과 계산 완료" 판정

강한 지적:
- 현재 `HexPicker.tsx`는 부모에서 받은 `entries`, `onCommit`, `onClaim`를 사실상 무시하고 내부 `mockHistory`, `jackBalance`, `potBalance`를 별도로 유지한다.
- 즉 서비스 핵심 화면이 전역 상태나 실제 API 모델과 연결되지 않는다.
- `BlockDetailModal`에서 `blockHash`, `isWinner`, `prize`를 바로 보여주는 구조는 commit 직후 UX를 잘못 유도한다.
- 도메인상 엔트리는 "참여 즉시 결과 확인"이 아니라 "기준 높이와 future block 기준 결과 대기"가 핵심인데 현재 UI는 거의 즉시 추첨 UI다.

MVP 권장:
- 탭 구조를 `참여하기 / 내 엔트리`로 단순화
- 각 엔트리에 아래만 보여주기
  - 커밋 시각
  - commit tx/hash
  - commit 포함 블록 높이
  - result 기준 높이
  - 상태 배지
  - claim 버튼 또는 재조회 버튼
- `잭/팟 교환`은 지갑 페이지로만 이동시키고 로또 페이지에서는 제거

#### WalletPage

관련 파일:
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\WalletPage.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\WalletCreate.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\WalletInfo.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\ActivityList.tsx`

판정:
- 즉시 연동 가능
  - 로컬 지갑 생성/복구
  - 주소 표시
  - 로컬 저장
- Spring 가공 API 필요
  - 주소 기준 잔액
  - 활동 내역
  - 엔트리/클레임 기반 활동 로그
- PostgreSQL projection 필요
  - 주소별 활동 피드
  - 엔트리 + 클레임 + 보상 합성 히스토리
- 현재 코어상 불가능/추정
  - 서버가 mnemonic을 보관/복원하는 흐름
  - mock 다중 지갑들의 활동/잔액을 실제인 것처럼 표시

강한 지적:
- `WalletPage.tsx`는 base wallet 외에 `extraWallets` mock를 주입한다. 무로그인 로컬 지갑 MVP에서 굳이 여러 지갑 캐러셀을 기본 UX로 둘 이유가 약하다.
- `ActivityList`는 온체인/오프체인 이벤트를 섞은 추상 로그인데 실제로는 projection 없이 안정적으로 만들기 어렵다.
- `WalletInfo.tsx`는 exchange를 프론트 store 내부 숫자 연산으로 처리한다. 실제 체인 자산 교환이라면 절대 이런 방식이면 안 된다.

MVP 권장:
- 지갑 페이지는 `지갑 생성/복구`, `주소`, `잔액`, `내 엔트리 바로가기`로 축소
- 활동 내역은 백엔드 준비 전까지 "최근 엔트리/클레임" 10건 정도만 제한적으로 표시
- 다중 지갑 캐러셀은 제거하거나 완전 mock 태그를 붙인 개발용 기능으로 격리

#### MiningPage

관련 파일:
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\MiningPage.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\MinedBlocks.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\MiningGuide.tsx`
- `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\RewardPolicy.tsx`

판정:
- 즉시 연동 가능
  - 특정 주소가 채굴한 확정 블록 목록 조회가 가능하다면 기본 리스트 정도
- Spring 가공 API 필요
  - 주소 기준 채굴 보상 합계
  - 확정 블록만 필터링된 내 채굴 히스토리
- PostgreSQL projection 필요
  - 주소별 채굴 통계
  - 보상 합산/기간별 집계
- 현재 코어상 불가능/추정
  - 지갑 기준 채굴자 라벨, "지급 완료" 확정, 상세 합성 정보

강한 지적:
- 로또 이벤트 체험 서비스 전제에서 채굴 페이지는 메인 내비게이션 1축을 차지할 정도로 중요하지 않다.
- `RewardPolicy.tsx`는 블록 보상이 "즉시 지급"된다는 식 설명이 들어가 있는데, 이런 설명은 체인/정산 설계와 다르면 바로 오해를 만든다.
- `MinedBlocks.tsx`는 `selectedBlock`를 임의 shape로 생성해 대시보드 모달에 꽂는다. 타입도 안 맞고, 데이터 출처도 없다.

MVP 권장:
- 메인 내비게이션에서 제거하거나 보조 페이지로 강등
- 유지한다면 "내 주소로 채굴된 최근 확정 블록" 정도만 표시

### B. Vue 레거시/프로토타입: `jackpotchain-frontend`

관련 파일:
- `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\router\index.ts`
- `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\LotteryInputView.vue`
- `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\EducationView.vue`
- `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\HashRevealView.vue`
- `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\ResultView.vue`

판정:
- 전체적으로 현재 제품 전제와 매우 불일치
- 교육형 진행, 채굴 시뮬레이션, 즉시 reveal, 즉시 result 확정 구조를 전제
- sessionStorage만으로 flow를 이어 붙이며 실제 체인/백엔드 상태를 전혀 모델링하지 않음

강한 지적:
- `EducationView.vue`는 "교육 진도형 플랫폼이 아니다"라는 현재 서비스 전제와 정면 충돌한다.
- `LotteryInputView.vue`는 "번호 입력 후 채굴 시작"으로 유도하는데 서비스 핵심은 commit transaction 제출이지, 사용자 브라우저에서 채굴 체험을 시작하는 게 아니다.
- `HashRevealView.vue`는 미래 블록 해시를 브라우저에서 mock 생성하고 즉시 비교한다. 이는 도메인상 가장 위험한 잘못된 가정이다.
- `ResultView.vue`는 즉시 등수/상금 확정 UX를 제공한다. 현재 서비스 방향에서는 폐기 대상에 가깝다.

권고:
- `jackpotchain-frontend`는 제품 코드 기준에서 제외
- 참고용 디자인/스토리보드로만 보관하거나 아카이브 처리

---

## 3부: 컴포넌트별 수정 포인트

### 핵심 상태/도메인 모델

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\stores\useWalletStore.ts`
- 문제점
  - 지갑, 잔액, 로또 엔트리, 활동, 채굴 블록을 전부 프론트 로컬 mock로 유지한다.
  - `commitLotto`가 곧바로 엔트리를 생성하고 `claimReward`가 로컬 상태만 바꾼다.
  - API 레이어가 없고, 상태 전이가 도메인과 다르다.
- 왜 문제인지
  - commit/claim은 체인 및 백엔드 판정이 필요한 작업이다.
  - 현재 구조는 "사용자 브라우저 안에서 당첨/클레임이 확정되는 것처럼" 보이게 만든다.
- 어떻게 바꿔야 하는지
  - store를 `ui state` 중심으로 축소
  - 서버 연동은 `src/services` 또는 `src/api` 계층으로 분리
  - `entries`는 아래 상태 enum 기반으로 재설계:
    - `MEMPOOL_WAITING`
    - `CONFIRMED_WAITING_RESULT`
    - `CLAIMABLE`
    - `CLAIMED`
    - `EXPIRED`
    - `FAILED_OR_RECHECK_REQUIRED`
- 처리 방침
  - 현재 mock 유지 금지
  - API 붙을 때까지는 "백엔드 대기 상태 mock"로만 제한 유지

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\types\index.ts`
- 문제점
  - `LottoEntry.status`가 사실상 `대기/당첨/미당첨` 수준이다.
  - commit height, result target height, claim window, tx hash 등 필드가 없다.
- 왜 문제인지
  - 도메인상 중요한 것은 "맞았냐"보다 "현재 어느 단계냐"다.
- 어떻게 바꿔야 하는지
  - `LottoEntry`를 `LottoEntrySummary` / `LottoEntryDetail`로 분리
  - 상태 enum과 체인 기준 필드를 추가
- 처리 방침
  - 즉시 수정 필요

### 로또 UI

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\lotto\HexPicker.tsx`
- 문제점
  - props로 받은 상태/핸들러를 거의 사용하지 않고 내부 mock state를 유지한다.
  - 참여 히스토리가 `mockHistory` 기반이다.
  - 블록 해시/당첨 여부/상금을 상세 모달에서 즉시 노출한다.
  - 로또 페이지 안에 교환 UX까지 섞여 있다.
- 왜 문제인지
  - 실서비스에서는 엔트리 상태와 결과가 백엔드 판정 결과여야 한다.
  - 즉시 reveal/즉시 winner UX는 잘못된 방향이다.
- 어떻게 바꿔야 하는지
  - `CommitComposer`와 `EntryList`로 분리
  - 입력 UI는 번호 선택 + 제출만 담당
  - 내 엔트리 목록은 부모에서 받은 서버 DTO만 렌더링
  - 상세 모달은 `commitTxHash`, `commitBlockHeight`, `resultBlockHeight`, `status`, `claimableAt`, `expiresAt` 중심
- 처리 방침
  - 현재 내부 mock history 제거
  - 교환 UI 제거
  - 백엔드 대기 중인 상세 필드는 skeleton/placeholder 처리

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\LottoPage.tsx`
- 문제점
  - `jackBalance`, `potBalance`를 읽지만 실제로 사용하지 않는다.
  - 핵심 서비스 페이지가 API가 아니라 store mock에만 의존한다.
- 왜 문제인지
  - 화면 책임과 데이터 책임이 섞여 있고 실제 연동 전환 지점이 없다.
- 어떻게 바꿔야 하는지
  - page에서 API hooks 호출
  - `useLotteryEntries`, `useCommitLottery`, `useClaimLottery` 식으로 분리
- 처리 방침
  - 즉시 수정 대상

### 지갑 UI

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\pages\WalletPage.tsx`
- 문제점
  - `extraWallets` mock를 기본 UX로 노출한다.
  - 무작위 주소를 생성해서 실제 지갑처럼 보여준다.
- 왜 문제인지
  - 무로그인 로컬 지갑 서비스에서 다중 mock 지갑은 오해만 만든다.
- 어떻게 바꿔야 하는지
  - 단일 활성 지갑 중심으로 축소
  - 다중 지갑 지원이 필요하면 브라우저 local storage 목록을 실제로 관리
- 처리 방침
  - mock 지갑 제거

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\WalletInfo.tsx`
- 문제점
  - 캐러셀, mock 지갑, 로컬 exchange, restore 입력까지 한 컴포넌트에 과도하게 몰려 있다.
  - 프론트 숫자 연산으로 자산 교환을 수행한다.
- 왜 문제인지
  - 체인 자산과 앱 포인트의 교환이 실제 트랜잭션/백엔드 정합성과 분리될 수 없다.
- 어떻게 바꿔야 하는지
  - `WalletSummary`, `WalletRestoreForm`, `BalancePanel`로 분리
  - 교환 기능은 명확한 제품 범위가 아니면 MVP에서 제거
- 처리 방침
  - 교환은 임시 mock 또는 제거 중 택1
  - 현재 상태라면 제거 권장

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\ActivityList.tsx`
- 문제점
  - 활동 로그가 추상적이며 실제 데이터 원천이 불명확하다.
- 왜 문제인지
  - projection 없이 안정적인 activity feed를 만들기 어렵다.
- 어떻게 바꿔야 하는지
  - MVP에서는 `최근 엔트리`, `최근 claim`만 표시
  - 또는 백엔드 준비 전까지 숨김
- 처리 방침
  - 백엔드 대기 상태 권장

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\wallet\WalletCreate.tsx`
- 문제점
  - 주소 미리보기, 컬러 선택 등 비핵심 장식이 많다.
  - mnemonic 보안 경고, 로컬 저장 안내가 없다.
- 왜 문제인지
  - 무로그인 로컬 지갑 서비스에서 가장 중요한 UX는 "복구 문구 보관 책임"이다.
- 어떻게 바꿔야 하는지
  - 생성 후 mnemonic 확인, 로컬 저장, 백업 경고를 명시
  - 서버 저장 안 함 문구를 분명히 표시
- 처리 방침
  - 즉시 수정 대상

### 대시보드/채굴

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\dashboardMockData.ts`
- 문제점
  - 거의 모든 데이터가 mock이며 실재하지 않는 candidate/future data를 포함한다.
- 왜 문제인지
  - 실서비스 데이터 경계를 흐리게 한다.
- 어떻게 바꿔야 하는지
  - mock을 `api contract mock` 수준으로 축소
  - candidate/future block 제거
- 처리 방침
  - 즉시 축소

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\BlockchainVisualizer.tsx`
- 문제점
  - 확정 블록과 후보 블록이 한 체인처럼 연결된다.
- 왜 문제인지
  - 아직 확정되지 않은 대상, 또는 체인에 존재하지 않는 대상을 실체처럼 표현한다.
- 어떻게 바꿔야 하는지
  - 최근 확정 블록 리스트/카드로 단순화
- 처리 방침
  - MVP에서는 대폭 단순화

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\dashboard\NodeNetwork.tsx`
- 문제점
  - 활성 노드 수와 토폴로지를 확정 데이터처럼 렌더링한다.
- 왜 문제인지
  - projection 또는 운영 API 없이는 신뢰 불가다.
- 어떻게 바꿔야 하는지
  - 삭제 또는 운영자 전용 화면으로 분리
- 처리 방침
  - 제거 권장

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\MinedBlocks.tsx`
- 문제점
  - `selectedBlock`를 임의 object로 조립해 다른 모달 타입에 꽂는다.
  - "지급 완료" 같은 상태를 근거 없이 렌더링한다.
- 왜 문제인지
  - 실제 데이터 스키마와 UI 표현이 분리돼 있다.
- 어떻게 바꿔야 하는지
  - 전용 DTO/전용 상세 모달로 분리
  - MVP에서 유지 시 최근 확정 블록 리스트만
- 처리 방침
  - 간소화 또는 제거

#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\MiningGuide.tsx`
#### `C:\Users\SSAFY\S14P21E202\FE-ssatto\src\components\mining\RewardPolicy.tsx`
- 문제점
  - 제품 핵심과 무관한 설명이 많고 일부는 즉시 지급 전제를 암시한다.
- 왜 문제인지
  - 잘못된 기대를 만든다.
- 어떻게 바꿔야 하는지
  - 로또 규칙/결과 대기/claim window 설명으로 교체
- 처리 방침
  - 내용 전면 교체 또는 페이지 제거

### 레거시 Vue

#### `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\LotteryInputView.vue`
#### `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\EducationView.vue`
#### `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\HashRevealView.vue`
#### `C:\Users\SSAFY\S14P21E202\jackpotchain-frontend\src\views\ResultView.vue`
- 문제점
  - 교육형/시뮬레이터형/즉시 결과형 흐름
- 왜 문제인지
  - 현재 서비스 정의와 반대 방향이다.
- 어떻게 바꿔야 하는지
  - 제품 코드에서 분리
- 처리 방침
  - 제거 또는 아카이브

---

## 4부: API / DTO 제안

### 권장 상태 모델

```ts
export type LottoEntryLifecycleStatus =
  | "MEMPOOL_WAITING"
  | "CONFIRMED_WAITING_RESULT"
  | "CLAIMABLE"
  | "CLAIMED"
  | "EXPIRED"
  | "FAILED_OR_RECHECK_REQUIRED";
```

### 핵심 DTO 제안

#### 1. 지갑 로컬 메타

이 데이터는 서버 저장이 아니라 브라우저 로컬 저장 대상이다.

```ts
export interface LocalWalletMeta {
  walletId: string;
  nickname: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: string;
  lastUsedAt: string;
}
```

#### 2. 지갑 잔액 응답

`GET /api/wallets/{address}/summary`

```ts
export interface WalletSummaryResponse {
  address: string;
  jackBalance: string;
  potBalance?: string;
  pendingClaimJackAmount?: string;
  lastSyncedBlockHeight: number;
}
```

비고:
- `potBalance`가 실제 온체인/오프체인 자산인지 확정 필요
- 실체가 불분명하면 MVP에서 제거 권장

#### 3. 엔트리 목록 응답

`GET /api/lottery/entries?walletAddress=...`

```ts
export interface LottoEntrySummaryDto {
  entryId: string;
  walletAddress: string;
  pickedNumbers: string[];
  commitTxHash: string;
  commitBlockHeight: number | null;
  targetResultBlockHeight: number | null;
  status: LottoEntryLifecycleStatus;
  matchedCount: number | null;
  rewardJackAmount: string | null;
  claimTxHash: string | null;
  claimableFrom: string | null;
  claimDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  failureReason?: string | null;
}
```

#### 4. 엔트리 상세 응답

`GET /api/lottery/entries/{entryId}`

```ts
export interface LottoEntryDetailDto extends LottoEntrySummaryDto {
  commitBlockHash: string | null;
  resultBlockHash: string | null;
  resultCalculatedAt: string | null;
  resultProofVersion?: string | null;
  canClaim: boolean;
  canRetryCheck: boolean;
}
```

#### 5. 커밋 요청/응답

`POST /api/lottery/entries`

```ts
export interface CreateLottoEntryRequest {
  walletAddress: string;
  pickedNumbers: string[];
  signedCommitPayload: string;
}

export interface CreateLottoEntryResponse {
  entryId: string;
  commitTxHash: string;
  acceptedAt: string;
  status: "MEMPOOL_WAITING" | "FAILED_OR_RECHECK_REQUIRED";
}
```

#### 6. 클레임 요청/응답

`POST /api/lottery/entries/{entryId}/claim`

```ts
export interface ClaimLottoRewardRequest {
  walletAddress: string;
  signedClaimPayload: string;
}

export interface ClaimLottoRewardResponse {
  entryId: string;
  claimTxHash: string;
  status: "CLAIMED" | "FAILED_OR_RECHECK_REQUIRED";
  claimedRewardJackAmount: string;
  claimedAt: string;
}
```

#### 7. 대시보드 요약 응답

`GET /api/dashboard/summary`

```ts
export interface DashboardSummaryDto {
  currentBlockHeight: number;
  latestResultReferenceHeight: number | null;
  jackpotPoolJackAmount: string;
  recentConfirmedBlocks: Array<{
    height: number;
    hash: string;
    minedAt: string;
    txCount: number;
    jackpotContributionJackAmount?: string | null;
  }>;
}
```

#### 8. 내 채굴 블록 요약 응답

`GET /api/mining/blocks?walletAddress=...`

```ts
export interface MyMinedBlockDto {
  blockHash: string;
  blockHeight: number;
  minedAt: string;
  rewardJackAmount: string;
  confirmations: number;
}
```

### 화면/API 매핑 및 인프라 판정 표

| 화면/컴포넌트 | 필요한 API | 용도 | Node RPC 직접 래핑 가능 | Spring 가공 API 필요 | PostgreSQL projection 필요 | Redis 캐시 권장 | 비고 |
|---|---|---|---|---|---|---|---|
| Dashboard 상단 요약 | `GET /api/dashboard/summary` | 현재 높이, 잭팟 풀, 최근 블록 | 일부만 가능 | 예 | 예 | 예 | 잭팟 풀/최근 요약은 projection 성격 |
| 최근 확정 블록 리스트 | `GET /api/blocks/recent` | 최근 블록 나열 | 가능 | 권장 | 선택 | 예 | 블록 헤더 자체는 래핑 가능 |
| 블록 상세 모달 | `GET /api/blocks/{heightOrHash}` | 헤더 상세 | 가능 | 권장 | 선택 | 예 | 블록 헤더는 RPC 기반 가능 |
| 로또 엔트리 생성 | `POST /api/lottery/entries` | commit 제출 | 불가 | 예 | 선택 | 아니오 | 브라우저 직접 RPC 금지 |
| 내 엔트리 목록 | `GET /api/lottery/entries?walletAddress=` | 내 상태 추적 | 불가 | 예 | 예 | 예 | 핵심 projection |
| 엔트리 상세 | `GET /api/lottery/entries/{id}` | 상태/결과/claim 정보 | 불가 | 예 | 예 | 예 | 코어+projection 합성 |
| 엔트리 재조회 | `POST /api/lottery/entries/{id}/recheck` | 실패/재검증 | 불가 | 예 | 예 | 아니오 | 백엔드 작업 트리거 |
| 보상 클레임 | `POST /api/lottery/entries/{id}/claim` | claim 제출 | 불가 | 예 | 선택 | 아니오 | 서버 검증 필수 |
| 지갑 요약 | `GET /api/wallets/{address}/summary` | 잔액/보류 보상 | 일부 가능 | 예 | 권장 | 예 | UTXO/account 조합 가공 필요 가능성 높음 |
| 지갑 활동 피드 | `GET /api/wallets/{address}/activities` | 활동 로그 | 불가 | 예 | 예 | 예 | projection 없으면 구현 비권장 |
| 내 채굴 블록 | `GET /api/mining/blocks?walletAddress=` | 내 블록 이력 | 부분 가능 | 예 | 예 | 예 | coinbase/address 조인 필요 가능성 큼 |
| 노드 네트워크 시각화 | `GET /api/network/nodes` | 노드 수/토폴로지 | 코어별 상이 | 예 | 예 | 예 | MVP 비권장 |

### 캐시 기준

Redis 캐시 권장:
- 대시보드 요약
- 최근 블록 목록
- 블록 상세
- 지갑 요약
- 엔트리 목록 읽기

Redis 캐시 비권장:
- commit 제출
- claim 제출
- recheck 요청

---

## 5부: 즉시 수정 우선순위 Top 10

1. `src/types/index.ts`, `src/stores/useWalletStore.ts`의 로또 상태 모델을 lifecycle 기반으로 재설계
2. `src/components/lotto/HexPicker.tsx` 내부 mock state/history 제거
3. `src/pages/LottoPage.tsx`를 API 연동 중심 컨테이너로 전환
4. `src/pages/WalletPage.tsx`의 mock 다중 지갑 제거
5. `src/components/wallet/WalletInfo.tsx`의 프론트 숫자 교환 로직 제거 또는 비활성화
6. `src/components/dashboard/dashboardMockData.ts`의 candidate/future block 제거
7. `src/components/dashboard/BlockchainVisualizer.tsx`를 최근 확정 블록 리스트 수준으로 단순화
8. `src/components/dashboard/NodeNetwork.tsx` 제거 또는 운영 화면 분리
9. `src/components/mining/*`를 MVP 범위에서 축소하거나 메뉴에서 제거
10. `jackpotchain-frontend/src/views/*`를 제품 코드 기준에서 제외하고 아카이브 판단

---

## 부록: 현재 코드베이스에서 확인된 구조적 사실

- React 프론트에는 `fetch`, `axios` 등 실제 API 호출이 없다.
- 브라우저 direct RPC 호출 코드도 없다.
- 현재 문제는 "RPC를 잘못 직접 호출한다"가 아니라 "아예 연동이 없고 mock이 도메인 오해를 만든다"는 점이다.
- Vue 레거시 쪽은 `sessionStorage` 기반 즉시 결과 시뮬레이터에 가깝다.

최종 판단:
- 현재 UI는 JackpotChain 분석 리포트 기준과 여러 지점에서 어긋난다.
- 가장 큰 어긋남은 "즉시 결과 확정형 UX"와 "projection 없이도 히스토리/상태 피드를 줄 수 있다는 가정"이다.
- 먼저 고쳐야 하는 것은 디자인이 아니라 상태 모델과 데이터 계약이다.
