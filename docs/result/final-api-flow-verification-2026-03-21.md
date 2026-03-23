# Overview

`docs/reviews/api.md`를 기준으로 FE-BE-blockchain API 계약을 재검토하고, 실제 코드 기준 연결 흐름을 점검했다.

이번 작업에서는 다음을 우선 수정했다.

- BE에 누락되어 있던 `POST /api/v1/lotto/claim` 계약 추가
- `GET /api/v1/wallet/{address}/activities`의 커서 파라미터를 명세 기준 `lastActivityId`로 수용하도록 정렬
- 로또 참여 내역 응답의 수령 여부 필드명을 `claimed`로 정렬
- FE service 계층에 누락된 write API 계약 함수 추가

추가로 FE/BE 테스트를 다시 실행해 회귀 여부를 확인했다.

# File & Class Change Log

- `docs/plans/final-api-flow-verification-2026-03-21.md`
  - 최종 API 연결 검증 계획 문서 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/dto/LottoClaimRequest.java`
  - 로또 클레임 요청 DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/dto/LottoClaimResponse.java`
  - 로또 클레임 응답 DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/dto/LottoEntrySummaryResponse.java`
  - `isClaimed` -> `claimed` 계약 정렬
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
  - `POST /lotto/claim` 엔드포인트 추가
  - 인증 주체 전달 방식 유지
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
  - 클레임 제출 유스케이스 추가
  - claim 가능 여부 검증 후 `sendrawtransaction` 호출
  - 기존 commit/result/entries 흐름과 인증 경계 유지
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - `lastActivityId`와 기존 `cursor`를 함께 수용하도록 변경
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/service/LottoServiceTest.java`
  - 로또 클레임 성공/실패 테스트 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/controller/LottoControllerTest.java`
  - 로또 클레임 API 컨트롤러 테스트 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
  - `lastActivityId` 계약 반영
- `FE-ssatto/src/services/lottoService.ts`
  - `claimed` 필드 반영
  - `commitLotto`, `claimLottoReward` 추가
- `FE-ssatto/src/services/exchangeService.ts`
  - `exchangeJackToPot` 추가
- `FE-ssatto/src/services/walletService.ts`
  - 활동 내역 조회에 `lastActivityId` 사용
- `FE-ssatto/src/services/readModelAdapters.ts`
  - `claimed` 필드 사용으로 정렬
- `FE-ssatto/src/services/readModelAdapters.test.ts`
  - `claimed` 필드 반영

# Cross-Layer Impact Summary

- FE -> BE
  - FE service 계약이 `api.md` 기준 write/read 경로를 더 정확히 표현하게 되었다.
  - wallet 활동 조회의 커서 파라미터 이름을 명세 중심으로 정렬했다.
- BE -> Blockchain RPC
  - 로또 클레임도 기존 commit과 동일하게 `Service -> RpcClient -> sendrawtransaction` 경계로 처리한다.
  - Controller에서 RPC 직접 호출은 여전히 없다.
- DTO/계약
  - 로또 참여 내역의 수령 여부 필드명을 `claimed`로 정렬해 문서와 응답 표현을 맞췄다.

# Implemented Changes

1. 로또 클레임 API를 추가했다.
   - 명세에 존재하지만 코드에 없던 `POST /api/v1/lotto/claim`을 BE에 추가했다.
   - 요청 검증, 인증 주체 검증, claim 가능 여부 검증, RPC 제출, 성공 응답 조합까지 서비스 레이어에서 처리한다.

2. wallet 활동 조회 커서를 명세와 맞췄다.
   - 명세는 `lastActivityId`, 기존 FE/BE 일부 코드는 `cursor`를 사용하고 있었다.
   - BE는 `lastActivityId`를 우선 수용하고, 기존 `cursor`도 fallback으로 유지해 하위 호환성을 남겼다.
   - FE는 `lastActivityId`로 요청하도록 수정했다.

3. lotto entry 응답 필드명을 정렬했다.
   - FE/BE 내부에서는 `isClaimed`를 쓰고 있었지만 명세는 `claimed`였다.
   - 응답/어댑터/테스트를 `claimed` 기준으로 정렬했다.

4. FE service 계층의 write 계약을 보강했다.
   - `commitLotto`
   - `claimLottoReward`
   - `exchangeJackToPot`
   - 아직 페이지 UI에서는 실제 signed TX 생성/제출 UX가 완결되지 않았지만, service 계약 레벨에서는 API 연결 지점을 명확히 만들었다.

# Tests Run

- Command: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest'`
  - Passed tests:
    - `LottoServiceTest`
    - `LottoControllerTest`
    - `WalletControllerTest`
  - Failed tests:
    - 최초 TDD 단계에서 compile failure 발생
    - 원인: `LottoClaimRequest`, `LottoClaimResponse`, `LottoService.claim(...)`가 아직 구현되지 않음
    - 재현성: 재현 가능, 구현 후 해소

- Command: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
  - Passed tests:
    - 전체 백엔드 테스트 스위트 통과
  - Failed tests:
    - 없음
  - 재현성: 통과 결과 재현 가능

- Command: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - Passed tests:
    - Vitest 10개 파일, 22개 테스트 통과
  - Failed tests:
    - 없음
  - 재현성: 통과 결과 재현 가능

- Command: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
  - Passed tests:
    - TypeScript build 및 Vite production build 통과
  - Failed tests:
    - 없음
  - 재현성: 통과 결과 재현 가능

- Command: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker ps --format 'table {{.Names}}\t{{.Status}}'`
  - Passed tests:
    - 없음
  - Failed tests:
    - 명령 실행 실패
  - Brief failure symptoms/messages:
    - `zsh:1: command not found: docker`
  - Reproducibility:
    - 현재 환경 의존적이며 동일 환경에서 재현 가능

# Failed Tests / Unresolved Issues

1. 실제 docker-compose 기반 런타임 연동 검증은 완료하지 못했다.
   - What was tested:
     - `docker ps`
   - Why it failed:
     - 현재 작업 환경에 `docker` 명령 자체가 없다.
   - Suspected root cause:
     - 로컬 런타임/컨테이너 툴링 미설치 또는 PATH 미구성
   - Impact scope:
     - FE -> BE -> 실제 JackpotChain node까지의 live HTTP/RPC 연동 smoke test 미실시
   - What should be improved next:
     - Docker 사용 가능한 환경에서 `docker compose -f docker-compose.local.yml up` 후 실 API smoke test 수행

2. FE UI의 signed TX 생성/제출 UX는 아직 완결되지 않았다.
   - What was tested:
     - FE service 계약, FE build/test, BE write API 계약
   - Why it failed:
     - 페이지 컴포넌트는 여전히 실제 signed TX 생성기를 갖고 있지 않아 commit/exchange/claim을 버튼 클릭만으로 끝까지 수행하지 못한다.
   - Suspected root cause:
     - 클라이언트 측 UTXO 조회/tx 조립/version별 서명 flow 미구현
   - Impact scope:
     - Wallet/Lotto 화면의 실제 write flow
   - What should be improved next:
     - FE에서 address 기준 UTXO 조회, version=2/3/5 TX 조립, private key 기반 서명, BE write API 호출까지 연결

3. 인증 포함 live auth flow는 환경 제약으로 별도 HTTP smoke test를 수행하지 못했다.
   - What was tested:
     - 컨트롤러/서비스 테스트
   - Why it failed:
     - 실제 로컬 런타임에서 Redis-backed challenge 저장소를 붙인 end-to-end auth smoke test는 수행하지 못했다.
   - Suspected root cause:
     - 현재 환경에 Docker/Redis 런타임이 없다.
   - Impact scope:
     - `challenge -> verify -> refresh -> protected API` 실제 HTTP 체인
   - What should be improved next:
     - Redis 포함 로컬 스택 또는 메모리 challenge 저장소 dev fallback 전략을 준비하고 curl 기반 smoke test 추가

# Risks / Assumptions

- `docs/reviews/api.md`를 현재 활성 계약으로 간주했다.
- 로또 클레임 성공 후 read-model 반영은 기존 아키텍처대로 별도 인덱싱/동기화 경로에 의존한다고 가정했다.
- live node가 없는 환경에서는 `sendrawtransaction`의 실제 노드 검증 결과를 확인하지 못했다.
- 기존 워크트리에 이미 많은 변경사항이 존재하므로, 이번 작업은 직접 건드린 계약 범위만 기준으로 검증했다.

# Next Steps

1. Docker 가능한 환경에서 backend + jackpotchain-node를 올리고 실제 smoke test를 수행한다.
2. FE에 UTXO 조회 및 signed TX 생성 로직을 추가해 write flow를 UI에서 끝까지 연결한다.
3. `challenge -> verify -> refresh -> protected APIs` 실 HTTP 시나리오를 스크립트 또는 통합 테스트로 자동화한다.

# Prompt for Next Fix

다음 작업을 진행해줘.

목표:
- FE Wallet/Lotto 화면에서 실제 signed TX 생성 후 BE write API까지 연결해 end-to-end write flow를 완성해줘.

현재 failing behavior:
- `FE-ssatto/src/pages/LottoPage.tsx`와 `FE-ssatto/src/pages/WalletPage.tsx`는 commit/exchange/claim write flow를 실제 API까지 연결하지 못하고 있다.
- 서비스 함수는 존재하지만 UI에서 version=2/3/5 signed TX를 만들지 못한다.
- live docker/node 환경이 없어서 실제 node smoke test도 아직 없다.

Likely files/layers involved:
- `FE-ssatto/src/pages/LottoPage.tsx`
- `FE-ssatto/src/pages/WalletPage.tsx`
- `FE-ssatto/src/components/lotto/HexPicker.tsx`
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- `FE-ssatto/src/services/lottoService.ts`
- `FE-ssatto/src/services/exchangeService.ts`
- `FE-ssatto/src/services/*` 아래에 추가될 tx-builder/utxo-adapter 계층
- 필요 시 `BE-ssatto`의 write API DTO/validation 보강

Suspected cause:
- 클라이언트 측 UTXO 조회, raw transaction 조립, secp256k1 서명, version별 payload 생성 로직이 없다.

Required fixes:
- FE에서 address 기준 UTXO 조회 어댑터 추가
- version=2 exchange, version=3 lotto commit, version=5 lotto claim TX builder 추가
- private key는 기존 규칙대로 client-side memory/keystore에서만 사용
- page/widget은 raw mock data나 tx 생성 세부 구현에 직접 의존하지 않도록 service/adapter 분리 유지
- 성공/실패 상태를 Korean UI 문구로 반영

Tests that must pass:
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
- 가능하면 docker 가능한 환경에서 `curl` 또는 스크립트 기반 write smoke test 추가

Remaining spec constraints:
- Controller -> RPC direct call 금지
- private key 저장 금지 / 서버 전송 금지
- uncertain RPC result를 성공으로 처리 금지
- FE user-facing text는 한국어 유지
- page/widget/entity/service/adapter/mock 분리 유지
