# Overview

- `api.md` 기준으로 `wallet activities`, `lotto entries`, `lotto result`, `mining blocks` 읽기 플로우를 FE/BE에 연결했다.
- BE에는 `GET /api/v1/mining/blocks`를 신규 구현했고, `lotto result`는 DB read-model + 인증 주체 검증 기반으로 정리했다.
- FE는 지갑 활동, 로또 참여 내역/결과 상세, 채굴 블록 목록을 실제 API 기반으로 조회하도록 바꿨다.
- `docker-compose.local.yml` 기반 FE-BE smoke test는 시도했지만 현재 실행 환경에 `docker` 바이너리가 없어 완료하지 못했다.

# File & Class Change Log

- BE
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/repository/BlockRepository.java`
    - 채굴자 주소 기준 커서 조회 및 누적 보상 합산 쿼리 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/controller/MiningController.java`
    - `GET /api/v1/mining/blocks` 엔드포인트 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/service/MiningService.java`
    - 주소/주체 검증, 커서 페이지네이션, 누적 보상 조회 구현
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/dto/MiningBlockCursorResponse.java`
    - 채굴 블록 커서 응답 DTO 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/dto/MiningBlockItemResponse.java`
    - 채굴 블록 단건 DTO 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/exception/InvalidMiningRequestException.java`
    - 채굴 조회 요청 검증 예외 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
    - `GET /lotto/entries/{commitHash}/result`에 인증 주체 전달 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
    - 결과 조회를 RPC 직결에서 DB read-model + claim window 계산 기반으로 변경
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/exception/LottoEntryNotFoundException.java`
    - 로또 결과 상세 조회용 not found 예외 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/dto/WalletActivityItemResponse.java`
    - `jackAmount`, `potAmount` 필드 추가
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
    - 활동 응답에 금액 필드 포함
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
    - `/api/v1/mining/blocks`, `/api/v1/lotto/entries/*/result` 보호 API 반영
- BE Tests
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/mining/service/MiningServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/mining/controller/MiningControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/service/LottoServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/controller/LottoControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/config/ProtectedApiSecurityTest.java`
- FE
  - `FE-ssatto/src/services/walletService.ts`
    - 지갑 활동 조회 DTO/API 추가
  - `FE-ssatto/src/services/lottoService.ts`
    - 로또 참여 내역/결과 조회 DTO/API 추가
  - `FE-ssatto/src/services/miningService.ts`
    - 채굴 블록 조회 API 추가
  - `FE-ssatto/src/services/readModelAdapters.ts`
    - BE 응답 -> FE 화면 모델 매핑 추가
  - `FE-ssatto/src/hooks/useWalletActivities.ts`
    - 지갑 활동 polling hook 추가
  - `FE-ssatto/src/hooks/useLottoEntries.ts`
    - 로또 참여 내역 polling hook 추가
  - `FE-ssatto/src/hooks/useMiningBlocks.ts`
    - 채굴 블록 polling hook 추가
  - `FE-ssatto/src/pages/WalletPage.tsx`
    - 활동 목록을 실제 API 응답으로 연결
  - `FE-ssatto/src/pages/LottoPage.tsx`
    - 참여 내역/상세 결과를 실제 API 응답으로 연결
  - `FE-ssatto/src/pages/MiningPage.tsx`
    - 채굴 블록 목록을 실제 API 응답으로 연결
  - `FE-ssatto/src/components/lotto/HexPicker.tsx`
    - 히스토리 상세를 API 기반 결과 조회 방식으로 변경
  - `FE-ssatto/src/components/mining/MinedBlocks.tsx`
    - API 누적 보상 사용 가능하도록 수정
  - `FE-ssatto/src/components/wallet/ActivityList.tsx`
    - empty 문구를 실제 API empty 상태에 맞게 조정
  - `FE-ssatto/src/types/index.ts`
    - 활동/채굴 블록 타입 보강
  - `FE-ssatto/src/lib/constants.ts`
    - `MinedBlock` 타입 보정
- FE Tests
  - `FE-ssatto/src/services/readModelAdapters.test.ts`
    - wallet/lotto/mining 화면용 매핑 테스트 추가

# Cross-Layer Impact Summary

- FE 페이지는 더 이상 지갑 활동, 로또 히스토리, 채굴 블록을 mock/placeholder 상태로 유지하지 않고 BE read API를 직접 소비한다.
- BE는 `mining` 읽기 API를 새로 제공하고, `wallet activities`, `lotto result` 응답을 `api.md` 계약에 더 가깝게 보정했다.
- 인증 경계는 유지했다.
  - `wallet activities`, `lotto entries`, `lotto result`, `mining blocks` 모두 access token 보호를 받는다.
  - `lotto result`는 commitHash 소유 지갑인지 서비스에서 검증한다.
- 채굴 제어 RPC, private key 저장, controller -> RPC direct call은 추가하지 않았다.

# Implemented Changes

- `wallet activities`
  - FE `WalletPage`에 active wallet 기준 활동 polling을 연결했다.
  - BE 응답에 `jackAmount`, `potAmount`를 포함시켜 화면 금액 표시 기반을 맞췄다.
- `lotto entries`
  - FE `LottoPage`에서 active wallet 기준 `GET /lotto/entries` polling을 연결했다.
  - `HexPicker`의 참여 내역 탭이 API 데이터로 렌더링되도록 바꿨다.
- `lotto result`
  - FE는 히스토리 항목 클릭 시 `GET /lotto/entries/{commitHash}/result`를 호출해 상세 비교 modal을 연다.
  - BE는 결과 조회를 DB `lotto_entry` 기준으로 읽고, `DRAWING/WINNING/LOSING/EXPIRED`, `isClaimable`, `rewardJack`를 현재 블록 높이 기준으로 계산한다.
- `mining blocks`
  - BE에 `GET /api/v1/mining/blocks`를 새로 추가했다.
  - `miner_address`, `is_main_chain`, `id DESC` 기준으로 커서 페이지네이션을 수행한다.
  - FE `MiningPage`는 active wallet 기준 채굴 블록과 누적 보상을 API에서 읽는다.
- Spec/Review 체크
  - `frontend-spec.md`: page/service/hook 분리를 유지했고 page에 raw mock 데이터를 직접 넣지 않았다.
  - `backend-spec.md`: controller는 request/response만 담당하고, mining은 service에서 검증/조회만 수행한다.
  - `infra-spec.md`: miner 제어를 추가하지 않았고 compose 검증은 시도했으나 환경 제약으로 중단되었다.
  - `blockchain.md`: private key 서버 저장 없음, miner process 제어 없음, read-model 조회만 추가했다.

# Tests Run

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.mining.service.MiningServiceTest' --tests 'ssatto.BE_ssatto.domain.mining.controller.MiningControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest'`
  - 최초 실패
  - passed tests
    - 없음
  - failed tests
    - `MiningServiceTest`
    - `MiningControllerTest`
    - `WalletServiceTest`
    - `WalletControllerTest`
    - `ProtectedApiSecurityTest`
  - brief failure symptoms/messages
    - `MiningService`, `MiningController`, mining DTO가 아직 없어 test compile failure 발생
    - `WalletActivityItemResponse`가 `jackAmount/potAmount`를 지원하지 않아 constructor/type mismatch 발생
  - reproducibility
    - 로컬에서 재현 가능
- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.mining.service.MiningServiceTest' --tests 'ssatto.BE_ssatto.domain.mining.controller.MiningControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest'`
  - 최종 통과
  - passed tests
    - mining service/controller/security
    - wallet activity service/controller
    - lotto entries/result service/controller
  - failed tests
    - 없음
  - reproducibility
    - 로컬에서 재현 가능
- `cd BE-ssatto && ./gradlew test`
  - 통과
  - passed tests
    - backend 전체 테스트 스위트
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - reproducibility
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm test -- src/services/readModelAdapters.test.ts`
  - 통과
  - passed tests
    - `src/services/readModelAdapters.test.ts`
  - failed tests
    - 없음
  - reproducibility
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm test`
  - 통과
  - passed tests
    - 9개 test file, 19개 test
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - reproducibility
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm run build`
  - 통과
  - passed tests
    - TypeScript build
    - Vite production build
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - build 자체는 성공, 단 chunk size warning 존재
  - reproducibility
    - 로컬에서 재현 가능
- `docker compose --env-file .env.local -f docker-compose.local.yml config`
  - 실패
  - passed tests
    - 없음
  - failed tests
    - compose 정적 검증
  - brief failure symptoms/messages
    - `zsh:1: command not found: docker`
  - reproducibility
    - 현재 Codex 실행 환경에서 재현 가능
- `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
  - 실패
  - passed tests
    - 없음
  - failed tests
    - compose 기반 FE-BE 통합 기동
  - brief failure symptoms/messages
    - `zsh:1: command not found: docker`
  - reproducibility
    - 현재 Codex 실행 환경에서 재현 가능

# Failed Tests / Unresolved Issues

- 현재 자동 테스트 자체는 모두 통과했다.
- 남은 미해결 이슈는 compose 기반 통합 검증이다.
  - what was tested
    - `docker-compose.local.yml` 정적 검증
    - `docker-compose.local.yml` 빌드 및 기동
  - why it failed
    - 현재 실행 환경에 `docker` CLI가 설치되어 있지 않아 compose 명령 자체가 실행되지 않았다.
  - suspected root cause
    - Codex 실행 환경의 도구 제약
  - impact scope
    - 실제 컨테이너 네트워크에서 FE -> BE -> DB/Redis/RPC 노드까지 연결되는 최종 smoke 검증은 이번 턴에서 확인하지 못했다.
  - what should be improved next
    - Docker 엔진과 `docker compose`가 있는 환경에서 동일 명령을 재실행하고, `frontend`, `backend`, `jackpotchain-node` health 및 보호 API smoke call까지 확인해야 한다.
- 추가 리스크
  - FE build는 통과했지만 Vite main chunk가 500kB 경고를 넘는다.
  - `MiningPage`는 현재 첫 페이지 10건 기준으로만 보여주며, FE 무한 스크롤/더보기는 아직 없다.

# Risks / Assumptions

- `mining blocks`의 `totalRewardJack`은 현재 `reward_jack` 합산 기준으로 계산했다. `fee_reward_jack` 포함 여부는 명세가 더 명확해지면 재검토가 필요하다.
- `lotto result`는 DB `lotto_entry` read-model이 최신이라는 가정 하에 구현했다. webhook 인덱싱 지연이 있으면 결과 반영도 지연될 수 있다.
- `WalletPage`는 현재 active wallet 기준 최근 활동 1페이지만 polling한다.
- compose 통합 검증은 코드 문제가 아니라 실행 환경 제약으로 남았다.

# Next Steps

- Docker 가능한 환경에서 `docker-compose.local.yml` smoke test를 다시 수행하고 결과를 갱신
- `MiningPage`에 cursor 기반 더보기 또는 무한 스크롤 추가
- `WalletPage` 활동 목록과 `MiningPage` 블록 목록에 상세 drill-down UX 추가
- `LottoPage`의 commit/claim write flow도 현재 auth/session 구조 위에 연결

# Prompt for Next Fix

`Read AGENTS.md if present, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, docs/reviews/api.md, and docs/reviews/blockchain.md first.

Task:
Complete the remaining FE/BE read-flow follow-up after the wallet/lotto/mining API connection work. Focus on two gaps: actual docker-compose.local.yml smoke verification in a Docker-enabled environment, and FE cursor pagination for mining blocks.

Likely files/layers involved:
- docker-compose.local.yml
- BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/**
- FE-ssatto/src/pages/MiningPage.tsx
- FE-ssatto/src/components/mining/MinedBlocks.tsx
- FE-ssatto/src/hooks/useMiningBlocks.ts
- FE-ssatto/src/services/miningService.ts
- docs/result/fe-be-wallet-lotto-mining-read-apis-2026-03-20.md

Current failing behavior:
- In the current Codex environment, compose-based FE-BE smoke verification could not run because `docker` is unavailable.
- Mining page only renders the first page of mined blocks and does not expose cursor-based pagination in the UI.

Suspected cause:
- Environment tool limitation for compose.
- FE mining hook currently polls only the first page and does not manage `nextCursor`/append state.

Required fixes:
- In a Docker-enabled environment, run:
  - `docker compose --env-file .env.local -f docker-compose.local.yml config`
  - `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
  - verify `frontend`, `backend`, `jackpotchain-node` health
  - perform protected API smoke calls for wallet/lotto/mining
- Extend FE mining flow to support cursor-based append or load-more while preserving polling for the first page.
- Keep controller/request-response boundaries and do not add miner-control behavior.

Tests that must pass:
- `cd BE-ssatto && ./gradlew test`
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- compose smoke commands above in a Docker-enabled environment

Remaining spec constraints:
- All user-facing FE text must remain Korean
- Controller = request/response only
- Service = use case and transaction boundary
- No private key storage on BE
- Never control miner processes
- Do not treat uncertain RPC results as success`
