# 작업 결과

작성일: 2026-03-20

## Scope

- Backend direct-pull API 구현
- JackpotChain RPC 클라이언트 확장
- wallet activity / lotto entry read-model 조회 API 구현
- FE wallet/lotto/mining 화면의 mock server-state 제거
- FE services 레이어 신설

## Touched Layers

- Controller
- Service
- Repository
- RPC Client
- MQ

이번 작업에서 실제 구현한 레이어:

- Controller
- Service
- Repository
- RPC Client

이번 작업에서 구현하지 않은 레이어:

- MQ

## Assumptions

- `POST /lotto/commit`, `POST /exchange/jack-to-pot` 는 backend-spec 기준에 따라 `sendrawtransaction` 으로만 제출한다.
- FE는 아직 실제 트랜잭션 signer 가 없으므로 제출 버튼은 실서명 호출 대신 준비 중 상태로 유지한다.
- `GET /lotto` 의 `prizeTiers` 는 read-model 미구현 상태이므로 빈 배열을 반환한다.
- `GET /wallet/{address}/activities`, `GET /lotto/entries` 는 이미 적재된 projection/read-model을 조회하는 API로 구현한다.
- `GET /mining/blocks` 는 이번 범위 밖이다.
- 워크스페이스 루트의 실제 `AGENTS.md` 파일은 존재하지 않아, 스레드에 제공된 AGENTS 지시를 기준으로 작업했다.

## Data Flow

### Wallet

`FE WalletPage -> /api/v1/wallet -> WalletService -> WalletRepository + JackpotChainRpcClient(getbalances)`

`FE WalletPage -> /api/v1/wallet/{address}/activities -> WalletService -> WalletRepository + WalletActivityRepository`

### Auth

`FE WalletPage -> /api/v1/auth/token -> AuthService -> WalletRepository + JwtUtil`

### Lotto

`FE LottoPage -> /api/v1/lotto -> LottoService -> JackpotChainRpcClient(getbalances/getjackpotpool/getlottoinfo)`

`POST /api/v1/lotto/commit -> LottoService -> JackpotChainRpcClient(sendrawtransaction)`

`GET /api/v1/lotto/entries/{commitHash}/result -> LottoService -> JackpotChainRpcClient(lottocheckresult)`

`GET /api/v1/lotto/entries -> LottoService -> LottoEntryRepository + JackpotChainRpcClient(getblockcount)`

### Exchange

`GET /api/v1/exchange/info -> ExchangeService -> JackpotChainRpcClient(getbalances/getexchangeinfo)`

`POST /api/v1/exchange/jack-to-pot -> ExchangeService -> JackpotChainRpcClient(sendrawtransaction)`

## Transaction Boundaries

- `WalletService.createWallet`: DB write 트랜잭션
- `WalletService.getWallets`: read-only 트랜잭션
- `WalletService.getActivities`: read-only 트랜잭션
- `AuthService.issueToken`: read-only 트랜잭션
- `LottoService.getOverview`, `LottoService.getResult`, `LottoService.getEntries`: read-only 트랜잭션
- `ExchangeService.getExchangeInfo`: read-only 트랜잭션
- `LottoService.commit`, `ExchangeService.exchangeJackToPot`: DB write 없음, RPC submit 단발 호출

## Failure Modes

- 잘못된 입력값: `COMMON_INVALID_REQUEST`
- 중복 지갑 주소: `WALLET_ADDRESS_DUPLICATED`
- 등록되지 않은 지갑: `WALLET_NOT_FOUND`
- 잘못된 로또 번호: `LOTTO_INVALID_NUMBERS`
- 최소 교환 수량 미만: `EXCHANGE_BELOW_MINIMUM`
- RPC/HTTP/JSON 파싱 실패: `BLOCKCHAIN_RPC_FAILED`

## Implemented Backend API

- `POST /api/v1/auth/token`
- `POST /api/v1/wallet`
- `GET /api/v1/wallet`
- `GET /api/v1/wallet/{address}/activities`
- `GET /api/v1/lotto`
- `POST /api/v1/lotto/commit`
- `GET /api/v1/lotto/entries`
- `GET /api/v1/lotto/entries/{commitHash}/result`
- `GET /api/v1/exchange/info`
- `POST /api/v1/exchange/jack-to-pot`

## Implemented FE Changes

- `src/services/` 계층 추가
- `WalletPage` 를 로컬 세션 + BE REST 조회 기반으로 전환
- `LottoPage` 를 BE REST 조회 기반으로 전환
- `MiningPage` 를 mock mined blocks 대신 empty-state 기반으로 전환
- `useWalletStore` 를 mock server state 저장소에서 local wallet session 저장소로 축소
- `JackpotPool`, `LottoTierRanking`, `HexPicker`, `WalletInfo`, `ActivityList` 를 API 연동 구조에 맞게 수정

## Logging Review

준수 내용:

- query 서비스에는 `log.info()` 를 추가하지 않았다.
- RPC/infra 실패는 `JackpotChainHttpRpcClient` 에서 `ERROR` 로 기록된다.
- `INFO` 로그는 완료된 핵심 비즈니스 이벤트에만 추가했다.

추가된 `INFO` 로그:

- `WALLET_REGISTERED`
- `LOTTO_COMMIT_SUBMITTED`
- `EXCHANGE_TRANSACTION_SUBMITTED`

검토 결과:

- 이번 턴에 추가한 query API (`getActivities`, `getEntries`) 에는 `INFO` 로그를 넣지 않았다.
- request entry 수준의 `INFO` 로그도 추가하지 않았다.

## Backend Spec Checklist

- [x] 서버 노드와 채굴 클라이언트 경계가 명확하다
- [x] `blockchain/rpc` 패키지가 존재한다
- [x] 핵심 RPC 조회/제출 로직에 단위 테스트가 있다
- [x] 테스트를 먼저 쓰고 실패를 확인했다
- [x] 제출 성공 시에만 `INFO` 로그가 있다
- [x] RPC/인프라 실패는 `ERROR` 로그다
- [x] request entry / query `log.info()`가 없다
- [x] 결과 문서가 작성되었다

## Test Results

TDD 확인:

1. 테스트 추가
2. `./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest'` 실행
3. missing class / missing method 컴파일 실패 확인
4. 구현 후 재실행
5. 대상 테스트 통과 확인

최종 검증:

- `cd BE-ssatto && ./gradlew test`
- `cd FE-ssatto && npm run build`

이번 턴 검증:

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest'`
- `cd BE-ssatto && ./gradlew test`

모두 성공했다.

## Remaining Risks

- FE는 아직 실제 signer 가 없어서 `lotto commit`, `exchange submit` 을 실트랜잭션으로 보내지 않는다.
- `wallet activities`, `lotto entries` 는 조회 API가 생겼지만 projection 적재 경로 자체는 아직 별도 배치/MQ 없이 외부 적재에 의존한다.
- `prizeTiers`, `mining blocks` 는 아직 미구현이다.
- `ApiResponse` 성공 포맷은 여전히 `SUCCESS` 문자열 기반이라 `docs/reviews/api.md` 의 숫자형 `code` 계약과 다르다.
- `lotto result` 의 `EXPIRED` 상태는 현재 chain RPC 정보만으로 확정하기 어려워 이번 범위에서는 사실상 사용하지 않는다.

## File & Class Change Log

### Backend

- `domain/blockchain/rpc/JackpotChainRpcClient`
- `domain/blockchain/rpc/JackpotChainHttpRpcClient`
- `domain/blockchain/rpc/JackpotChainBalances`
- `domain/blockchain/rpc/JackpotChainExchangeInfo`
- `domain/blockchain/rpc/JackpotChainJackpotPool`
- `domain/blockchain/rpc/JackpotChainLottoInfo`
- `domain/blockchain/rpc/JackpotChainLottoResult`
- `domain/wallet/controller/WalletController`
- `domain/wallet/service/WalletService`
- `domain/wallet/dto/CreateWalletRequest`
- `domain/wallet/dto/CreateWalletResponse`
- `domain/wallet/dto/WalletActivityItemResponse`
- `domain/wallet/dto/WalletActivityCursorResponse`
- `domain/wallet/dto/WalletSummaryResponse`
- `domain/wallet/dto/WalletListResponse`
- `domain/auth/controller/AuthController`
- `domain/auth/service/AuthService`
- `domain/auth/dto/AuthTokenRequest`
- `domain/auth/dto/AuthTokenResponse`
- `domain/lotto/controller/LottoController`
- `domain/lotto/service/LottoService`
- `domain/lotto/dto/LottoCommitRequest`
- `domain/lotto/dto/LottoEntriesResponse`
- `domain/lotto/dto/LottoEntrySummaryResponse`
- `domain/lotto/dto/LottoOverviewResponse`
- `domain/lotto/dto/LottoPrizeTierResponse`
- `domain/lotto/dto/LottoResultResponse`
- `domain/exchange/controller/ExchangeController`
- `domain/exchange/service/ExchangeService`
- `domain/exchange/dto/ExchangeRequest`
- `domain/exchange/dto/ExchangeInfoResponse`
- `domain/exchange/dto/ExchangeResponse`

### Backend Tests

- `domain/blockchain/rpc/JackpotChainHttpRpcClientTest`
- `domain/wallet/service/WalletServiceTest`
- `domain/wallet/controller/WalletControllerTest`
- `domain/auth/controller/AuthControllerTest`
- `domain/lotto/service/LottoServiceTest`
- `domain/lotto/controller/LottoControllerTest`
- `domain/exchange/service/ExchangeServiceTest`
- `domain/exchange/controller/ExchangeControllerTest`

### Frontend

- `src/lib/api.ts`
- `src/services/authService.ts`
- `src/services/walletService.ts`
- `src/services/lottoService.ts`
- `src/services/exchangeService.ts`
- `src/stores/useWalletStore.ts`
- `src/pages/WalletPage.tsx`
- `src/pages/LottoPage.tsx`
- `src/pages/MiningPage.tsx`
- `src/components/dashboard/JackpotPool.tsx`
- `src/components/lotto/HexPicker.tsx`
- `src/components/lotto/LottoTierRanking.tsx`
- `src/components/wallet/WalletInfo.tsx`
- `src/components/wallet/ActivityList.tsx`
