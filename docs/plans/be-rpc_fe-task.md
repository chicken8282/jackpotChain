# Goal

`docs/reviews/modify.md`의 FE 수정 요구사항이 현재 `FE-ssatto`에 실제 반영됐는지 점검하고, `docs/reviews/api.md` 기준으로 Backend RPC 래퍼 보강, FE mock 제거, read-model 정책 확정을 위한 구현 계획을 수립한다.

# Review Result

기준일: 2026-03-20

## 1. `docs/reviews/modify.md` 반영 여부

결론: 부분 반영 상태이며, 대시보드 외 영역은 대부분 미반영이다.

### 반영된 항목

- FE가 blockchain에 직접 붙지 않고 BE `/api/v1/...`를 통해 접근해야 한다는 방향은 대시보드에서만 일부 반영됐다.
- `GET /blockchain/dashboard`, `GET /blockchain/blocks/{height}` 호출은 [FE-ssatto/src/hooks/useDashboardData.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/hooks/useDashboardData.ts) 에서 동작 중이다.

### 미반영 또는 불완전한 항목

- `src/services/*` 계층 신설 요구는 미반영이다.
  - 현재는 [FE-ssatto/src/lib/api.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/lib/api.ts) 의 단일 `getJson()`만 있다.
  - `POST`, 인증 헤더, 도메인별 호출 모듈, 에러 매핑이 없다.
- API 응답 타입 재정의 요구는 미반영이다.
  - [FE-ssatto/src/lib/api.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/lib/api.ts) 의 `ApiResponse<T>` 는 `code: string` 인데, [docs/reviews/api.md](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/reviews/api.md) 는 `code: 200` 형태를 기준으로 작성돼 있다.
  - [FE-ssatto/src/types/index.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/types/index.ts) 는 화면용 mock 타입 중심이며 REST 계약 타입이 아니다.
- mock 제거 요구는 대시보드 외에 미반영이다.
  - [FE-ssatto/src/stores/useWalletStore.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/stores/useWalletStore.ts) 가 지갑, 활동, 로또 참여, 보상 수령, 교환, 채굴 기록을 모두 로컬 state로 처리한다.
  - [FE-ssatto/src/lib/constants.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/lib/constants.ts) 에 초기 mock 데이터가 남아 있다.
  - [FE-ssatto/src/pages/WalletPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/WalletPage.tsx) 는 추가 지갑도 mock으로 생성한다.
  - [FE-ssatto/src/pages/LottoPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/LottoPage.tsx) 와 [FE-ssatto/src/pages/MiningPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/MiningPage.tsx) 도 모두 store/mock 기반이다.
- 로또 상태 enum 정리 요구는 미반영이다.
  - store 타입은 `"당첨" | "추첨중" | "미당첨"` 이고, [FE-ssatto/src/components/lotto/HexPicker.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/lotto/HexPicker.tsx) 는 내부적으로 `"DRAWING" | "WINNING" | "LOSING"` 을 다시 매핑해 사용한다.
  - `modify.md` 기준의 `DRAWING/WINNING/LOSING/EXPIRED` 단일 기준이 아직 없다.
- 클라이언트 키 저장 전략 확정 요구는 미반영이다.
  - `localStorage`, `IndexedDB`, 브라우저 저장 abstraction 이 없다.
  - 현재는 지갑 생성/복구가 메모리 store 기준이다.

## 2. FE 수정이 필요한 구체 지점

### 반드시 수정 필요

- `src/services/` 또는 `src/api/` 도메인 레이어 추가
- 공통 응답 타입과 에러 타입을 `api.md` 기준으로 재정의
- `wallet`, `lotto`, `mining`, `exchange` 페이지의 mock/store 로직을 실제 BE API 호출로 교체
- 로또 상태 enum 을 화면/스토어/서버 응답 모두 단일 값으로 통일
- 지갑 저장 전략을 최소 MVP라도 확정

### 구조적으로 같이 정리할 것

- `useWalletStore` 는 UI 상태와 서버 데이터 상태를 분리한다.
- 대시보드도 `dashboardMockData` 타입 의존을 제거하고 API 전용 타입으로 이동한다.
- `WalletPage` 의 추가 mock 지갑, `LottoPage` 의 mock claim 흐름, `MiningPage` 의 mock block 상세 변환은 제거한다.

# Gap Matrix

## 1. `api.md` 기준 BE RPC 래퍼 누락

현재 [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java) 에 있는 메서드는 아래만 구현돼 있다.

- `getblockcount`
- `getblockchaininfo`
- `getblockhash`
- `getblock`
- `getpeerinfo`
- `getmempoolinfo`
- `sendrawtransaction`

반면 blockchain RPC 서버는 [blockchain/rpc/server.py](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/blockchain/rpc/server.py) 에 아래 메서드를 이미 제공한다.

- `getbalances`
- `getlottoinfo`
- `getjackpotpool`
- `lottocommit`
- `lottocheckresult`
- `listlottocommits`
- `getexchangeinfo`
- `exchangetopot`

즉, 다음 래퍼 추가가 우선이다.

- `JackpotChainBalances getBalances(String address)`
- `JackpotChainLottoInfo getLottoInfo()`
- `JackpotChainJackpotPool getJackpotPool()`
- `JackpotChainLottoCommitResult commitLotto(List<Integer> chosenNumbers)`
- `JackpotChainLottoResult checkLottoResult(String txId)`
- `List<JackpotChainLottoCommit> listLottoCommits(String address)`
- `JackpotChainExchangeInfo getExchangeInfo()`
- `JackpotChainExchangeResult exchangeToPot(double jackAmount)`

## 2. `api.md` 기준 FE-BE 연결 누락

직접 연결 누락 API:

- `POST /auth/token`
- `GET /wallet`
- `POST /wallet`
- `GET /lotto`
- `POST /lotto/commit`
- `GET /lotto/entries/{txId}/result`
- `GET /exchange/info`
- `POST /exchange/jack-to-pot`

read-model 또는 적재 없이는 불완전한 API:

- `GET /wallet/{address}/activities`
- `GET /mining/blocks`
- `GET /lotto/entries`
- 랭킹, 최근 이력, 누적 통계성 응답

# Read-Model Policy

## 1. 직접 pull 로 충분한 API

원칙:

- 요청 단위로 필요한 데이터가 명확하다.
- 체인에 즉시 질의해도 비용이 상대적으로 작다.
- 단건 조회 위주라 DB projection 없이도 UX가 성립한다.

대상 API:

- `GET /blockchain/dashboard`
- `GET /blockchain/blocks/{height}`
- `GET /wallet`
- `GET /lotto`
- `GET /lotto/entries/{txId}/result`
- `GET /exchange/info`
- `POST /lotto/commit`
- `POST /exchange/jack-to-pot`

정책:

- BE가 요청 시점에 RPC를 직접 호출한다.
- `node.py` 수정은 하지 않는다.
- 실패 시 FE에 즉시 오류를 반환하고, 별도 동기화 재시도는 두지 않는다.

## 2. 주기적 적재가 필요한 API

원칙:

- 목록, 정렬, 기간 필터, 누적 집계가 필요하다.
- FE가 자주 조회할 가능성이 높다.
- chain RPC만으로 매번 계산하면 비용이 커진다.

대상 API:

- `GET /wallet/{address}/activities`
- `GET /mining/blocks`
- `GET /lotto/entries`
- 대시보드의 장기 히스토리, 랭킹, 통계 카드

정책:

- Backend에 polling worker 또는 scheduler를 둔다.
- worker는 `getblockcount`, `getblockhash`, `getblock`, `listlottocommits`, `lottocheckresult` 등을 이용해 DB projection 을 갱신한다.
- FE는 REST로 projection 테이블을 조회한다.
- blockchain 쪽 push/webhook은 이번 단계 범위에서 제외한다.

## 3. 실시간 전송 정책

현재 확정안:

- 기본은 REST + polling
- 대시보드나 로또 결과 갱신 빈도가 높아지면 BE -> FE 에 SSE 추가
- WebSocket 은 이번 단계에서 도입하지 않는다

이유:

- 현재 FE-BE 통신은 REST 기반이다.
- blockchain 에서 직접 push 하는 구현이 아직 없다.
- SSE 는 단방향 알림 용도에 충분하고, WebSocket 보다 운영 복잡도가 낮다.

# Implementation Plan

## Phase 1. BE RPC 래퍼 완성

목표:

- `api.md` 에 필요한 chain 조회/명령 메서드를 `JackpotChainRpcClient` 에 모두 노출한다.

작업:

- DTO 추가
  - balances
  - lotto info
  - jackpot pool
  - lotto commit result
  - lotto result
  - lotto commit summary
  - exchange info
  - exchange result
- `JackpotChainRpcClient` 인터페이스 확장
- `JackpotChainHttpRpcClient` 파싱 로직 추가
- 실패 케이스별 예외 매핑 보강

완료 조건:

- 각 RPC 메서드에 대한 단위 테스트 또는 파싱 테스트가 존재한다.
- 잘못된 응답 형식일 때 `BusinessException` 으로 정리된다.

## Phase 2. BE REST 공개 API 추가

목표:

- FE가 필요한 `/api/v1` 엔드포인트를 실제 호출 가능하게 만든다.

작업:

- `wallet` 도메인
  - `POST /wallet`
  - `GET /wallet`
- `auth` 도메인
  - `POST /auth/token`
- `lotto` 도메인
  - `GET /lotto`
  - `POST /lotto/commit`
  - `GET /lotto/entries/{txId}/result`
- `exchange` 도메인
  - `GET /exchange/info`
  - `POST /exchange/jack-to-pot`
- 공통 응답 포맷을 `api.md` 와 맞춘다.

주의:

- `POST /lotto/claim` 는 이번 단계에서 구현하지 않는다.
- 체인 모델이 자동 지급이므로 API 문서 수정 또는 deprecated 처리 대상이다.

완료 조건:

- FE가 mock 없이 위 API를 실제 호출할 수 있다.
- 최소 controller/service 테스트가 존재한다.

## Phase 3. FE 서비스 레이어 도입과 mock 제거

목표:

- 화면의 서버 데이터 의존을 store/mock 에서 REST 호출로 이동한다.

작업:

- `src/services/` 신설
  - `authService`
  - `walletService`
  - `lottoService`
  - `exchangeService`
  - `blockchainService`
- [FE-ssatto/src/lib/api.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/lib/api.ts) 정비
  - `getJson`, `postJson`
  - Bearer token 주입
  - 공통 에러 매핑
- 페이지 교체
  - `WalletPage`: 실지갑 조회, 활동 조회, 생성/복구 분리
  - `LottoPage`: 실 `GET /lotto`, `POST /lotto/commit`, 결과 조회 연동
  - `MiningPage`: 실 `GET /mining/blocks` 또는 임시 빈 상태 처리
  - `DashboardPage`: `dashboardMockData` 타입 의존 제거
- mock 제거
  - `useWalletStore` 의 서버 데이터 부분 제거
  - `constants.ts` 초기 mock 데이터 제거 또는 UI 샘플 전용으로 이동

완료 조건:

- `wallet`, `lotto`, `exchange`, `mining` 화면에서 mock 데이터가 렌더링되지 않는다.
- 새로고침 후에도 선택 지갑과 토큰 상태가 유지된다.

## Phase 4. read-model 설계 확정과 적재 최소 구현

목표:

- history/list API를 chain direct pull 에서 분리한다.

작업:

- projection 대상 테이블 정의
  - wallet activity
  - mined block summary
  - lotto entry summary
- 적재 방식
  - 주기적 scheduler polling
  - 마지막 처리 block height 체크포인트 저장
- projection API 추가
  - `GET /wallet/{address}/activities`
  - `GET /mining/blocks`
  - `GET /lotto/entries`

완료 조건:

- 목록성 API가 chain direct pull 없이 DB에서 조회된다.
- 중복 적재와 누락 적재를 막는 체크포인트가 존재한다.

# Detailed FE Fix Checklist

## Wallet

- `WalletPage` 의 mock 추가 지갑 제거
- `WalletInfo` 내부 `exchangeJackToPot` store 직접 참조 제거
- 지갑 생성/복구 후 `POST /wallet`, `POST /auth/token` 연동
- 활동 기록은 `GET /wallet/{address}/activities` 로 교체

## Lotto

- `HexPicker` 의 store 직접 참조 제거
- `DRAWING/WINNING/LOSING/EXPIRED` enum 단일화
- `claim` 버튼은 자동 지급 모델 기준으로 숨기거나 “결과 확인” 버튼으로 교체
- `JackpotPool` 은 `dashboardMockData` 대신 `GET /lotto` 또는 대시보드 응답 사용

## Mining

- `MinedBlocks` 의 fake `DashboardBlockDetail` 변환 제거
- 실 블록 상세는 `GET /blockchain/blocks/{height}` 재사용
- 내 채굴 이력은 projection API가 준비되기 전까지 empty-state 로 명시

## Dashboard

- `dashboardMockData` 는 fallback 샘플에서 API 타입 분리 용도로 축소
- `JackpotPool`, `NodeNetwork`, `BlockHeight` 의 `dashboardStats` 직접 참조 제거

# Risks

- FE에서 mock 제거를 먼저 하고 BE API가 덜 준비되면 페이지가 대거 깨질 수 있다.
- `wallet activities`, `mining blocks`, `lotto entries` 를 direct pull 로 억지 구현하면 성능과 정합성 문제가 생긴다.
- `POST /lotto/claim` 를 문서만 보고 구현하면 chain 실제 모델과 충돌한다.
- `node.py` 를 건드리지 않는 원칙을 지키면 기존 네트워크 영향은 최소화되지만, 실시간 push 최적화는 후순위가 된다.

# Recommendation

우선순위는 아래 순서가 맞다.

1. BE RPC 래퍼 전부 확장
2. direct pull 대상 REST API부터 공개
3. FE services 레이어 도입 후 mock 제거
4. history/list API는 projection 방식으로 분리
5. 이후 필요 시 SSE 추가 검토

이번 범위에서는 `node.py` 수정, webhook 도입, WebSocket 도입을 하지 않는다.
