# Overview

이번 작업에서는 지갑-로또 onboarding 흐름을 보강했다. 핵심 변경은 세 가지다.

1. 지갑이 없는 최초 방문자가 `로또 추첨` CTA를 눌렀을 때, 바로 실패하지 않고 `지갑을 먼저 생성해주세요` 성격의 안내 모달을 띄운 뒤 지갑 생성 페이지(`/wallet`)로 유도하도록 변경했다.
2. 신규 지갑 생성 시 백엔드가 onboarding reward로 `1 POT`를 지급하도록 create-wallet contract를 확장했다. 중복 요청과 재시도를 고려해 create 요청을 reward-aware/idempotent 흐름으로 조정했다.
3. 지갑 생성 직후 상단에 보이던 raw `Failed to fetch` 문구를 사용자 친화적인 한국어 인증/네트워크 오류 문구로 치환하고, 지갑 상태 배너 문구도 의미가 더 명확하도록 조정했다.

# File & Class Change Log

- `FE-ssatto/src/pages/LottoPage.tsx`
  - 지갑 미보유 상태에서 로또 CTA 클릭 시 onboarding modal을 띄우는 흐름 추가
- `FE-ssatto/src/components/lotto/HexPicker.tsx`
  - 로또 참여 가드 로직을 helper 기반으로 분리하고 `onRequireWallet` 이벤트 추가
- `FE-ssatto/src/services/lottoParticipationGuard.ts`
  - 로또 참여 가능/차단 상태 계산 helper 추가
- `FE-ssatto/src/services/lottoParticipationGuard.test.ts`
  - 지갑 없음, POT 부족, 정상 참여 가능 케이스 테스트 추가
- `FE-ssatto/src/pages/WalletPage.tsx`
  - write error 분리
  - wallet auth/network 에러 메시지 매핑 적용
  - onboarding reward 성공 메시지 및 즉시 summary refetch 추가
  - 지갑 상태 배너 문구 개선
- `FE-ssatto/src/services/walletErrorMapper.ts`
  - raw `Failed to fetch`를 한국어 안내 문구로 변환하는 mapper 추가
- `FE-ssatto/src/services/walletErrorMapper.test.ts`
  - 인증/등록 에러 메시지 매핑 테스트 추가
- `FE-ssatto/src/hooks/useWalletSummaries.ts`
  - 생성 직후 즉시 반영을 위한 `refetch` 노출
- `FE-ssatto/src/services/walletService.ts`
  - `grantOnboardingReward` 요청 필드 및 onboarding reward 응답 필드 추가

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/dto/CreateWalletRequest.java`
  - onboarding reward 요청 여부 필드 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/dto/CreateWalletResponse.java`
  - onboarding reward 지급 결과 필드 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/entity/Wallet.java`
  - onboarding reward 지급 상태/txId/시각 컬럼 및 갱신 메서드 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - create wallet 시 onboarding reward orchestration 추가
  - create 요청의 reward-aware idempotency 처리 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
  - onboarding reward RPC contract 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
  - `grantonboardingreward` RPC 파싱 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainOnboardingReward.java`
  - onboarding reward DTO 추가
- `BE-ssatto/src/main/resources/db/migration/V4__add_wallet_onboarding_reward_columns.sql`
  - wallet onboarding reward 상태 저장용 DB migration 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/LoggingEventType.java`
  - onboarding reward 완료 이벤트 타입 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java`
  - create+reward, idempotent retry, duplicate restore 테스트 추가/갱신
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
  - onboarding reward 응답 필드 검증 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClientTest.java`
  - onboarding reward RPC parsing 테스트 추가

- `blockchain/rpc/server.py`
  - `grantonboardingreward` RPC 메서드 추가
  - 노드 지갑 UTXO를 수수료 소스로 사용해 1 POT onboarding reward TX 생성/서명/멤풀 적재 흐름 추가
- `blockchain/tests/test_rpc_server_onboarding_reward.py`
  - onboarding reward RPC가 recipient POT output을 생성하는지 검증하는 테스트 추가

# Cross-Layer Impact Summary

- UI 계층:
  - 로또 CTA가 더 이상 단순 disabled 상태에 묶이지 않고, onboarding intent를 처리하는 명시적 UX 흐름을 갖게 되었다.
- FE 서비스/상태 계층:
  - 지갑 생성 응답 contract가 확장되었고, 생성 직후 wallet summary를 즉시 refetch 하도록 변경되었다.
  - raw transport error를 그대로 노출하지 않고 wallet-auth/write error mapper를 거치도록 바뀌었다.
- BE wallet 계층:
  - 단순 metadata 저장 API에서 onboarding reward orchestration이 포함된 create contract로 확장되었다.
  - duplicate create 재시도 시 기존 지갑 + reward 상태를 기준으로 idempotent success가 가능해졌다.
- Chain/RPC 계층:
  - backend가 직접 private key를 다루지 않으면서도 node wallet을 사용해 onboarding reward TX를 생성할 수 있도록 RPC 메서드가 추가되었다.

# Implemented Changes

- 로또 onboarding modal 구현
  - 지갑이 하나도 없을 때 `로또 추첨` 버튼을 눌러도 silent ignore 되지 않고 modal이 열리도록 변경했다.
  - modal에서 `/wallet`로 이동하게 하여 onboarding path를 끊김 없이 연결했다.

- 신규 지갑 1 POT 지급 구현
  - FE `registerWallet` 요청에 `grantOnboardingReward`를 추가했다.
  - BE `createWallet`은 신규 생성일 때 메타데이터를 저장하고, `grantOnboardingReward=true`인 경우 onboarding reward RPC를 호출한다.
  - 동일 주소로 create 요청이 재시도되더라도 이미 reward가 끝났으면 성공 응답을 반환해 중복 failure를 줄였다.
  - wallet 테이블에 onboarding reward 상태를 저장해 중복 지급 방지 기준을 남겼다.

- 지갑 생성 직후 에러 UX 개선
  - `WalletPage`의 auth recovery 실패 메시지를 mapper로 통일했다.
  - `TypeError: Failed to fetch`는 `지갑 인증 연결에 실패했습니다. 백엔드 또는 네트워크 연결을 확인해 주세요.`로 치환된다.
  - 잠금/잠금해제 상태 배너 문구를 더 직접적으로 바꿨다.

- 즉시성 보강
  - 지갑 생성 성공 후 wallet summary polling 결과를 기다리지 않도록 `useWalletSummaries().refetch()`를 호출해 잔액 반영을 앞당겼다.
  - reward 지급 성공 시 `1 POT이 지급되었습니다. 바로 로또에 참여할 수 있습니다.` 상태 메시지를 띄우도록 했다.

# Tests Run

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainHttpRpcClientTest'`
  - 결과: 통과
  - 비고: onboarding reward contract와 wallet create idempotency 관련 변경을 먼저 좁게 검증

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`
  - 결과: 통과 (`1 passed`)
  - 비고: chain RPC onboarding reward 메서드가 recipient POT output을 만드는지 확인

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - 결과: 통과
  - 통과 테스트:
    - `walletSessionService.test.ts`
    - `walletAuthFlowService.test.ts`
    - `readModelAdapters.test.ts`
    - `txBuilder.test.ts`
    - `writeFlowService.test.ts`
    - `lottoParticipationGuard.test.ts`
    - `walletErrorMapper.test.ts`
    - 그 외 기존 FE 단위 테스트 포함 총 `14 files / 33 tests`

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
  - 결과: 통과
  - 비고: 타입 체크와 production bundle 생성까지 완료

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
  - 결과: 통과
  - 비고: 전체 Spring Boot 테스트 스위트 기준 회귀 없음 확인

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test -- --runInBand`
  - 결과: 실패
  - 증상: `CACError: Unknown option --runInBand`
  - 재현성: 항상 재현
  - 원인: Vitest CLI는 Jest의 `--runInBand` 옵션을 지원하지 않음
  - 처리: 옵션 없이 `npm test`로 재실행하여 정상 통과 확인

# Failed Tests / Unresolved Issues

- 미해결 1: `docker-compose.local.yml` 실기동 기준 전체 사용자 시나리오 미검증
  - 무엇을 검증하려 했는가:
    - 최초 방문 -> 로또 CTA -> 지갑 생성 유도
    - 지갑 생성 -> 1 POT 지급 -> 즉시 로또 참여 가능
    - 지갑 생성 직후 auth banner 정상 문구 표시
  - 왜 완료하지 못했는가:
    - 현재 셸 환경에서 `docker` CLI를 사용할 수 없어 local compose stack 기동 및 로그 확인이 불가능했다.
  - 의심 원인:
    - 환경 제약이며 코드 자체 테스트 실패는 아님
  - 영향 범위:
    - 런타임 프록시/백엔드/노드 연결 상태, 실제 브라우저 네트워크 오류 원인 확정은 아직 남아 있다.
  - 다음 개선:
    - 브라우저 network 탭과 compose container logs 기준으로 `/api/v1/auth/challenge`, `/api/v1/auth/verify`, `grantonboardingreward` 응답을 실제 확인해야 한다.

- 미해결 2: onboarding reward는 node wallet JACK UTXO에 의존
  - 무엇을 검증했는가:
    - 단위 테스트에서는 funding UTXO가 있는 경우 onboarding reward TX 생성/멤풀 적재까지 확인했다.
  - 왜 리스크가 남는가:
    - 실제 로컬 노드 wallet에 `MIN_TX_FEE` 이상 JACK UTXO가 없으면 reward RPC는 실패한다.
  - 의심 원인:
    - 현재 onboarding reward TX는 수수료를 node wallet JACK input으로 부담하도록 설계했다.
  - 영향 범위:
    - 신규 지갑 생성은 성공하지만 onboarding reward는 실패할 수 있다.
  - 다음 개선:
    - 로컬/운영 노드 wallet bootstrap 정책을 명시하거나, onboarding funding source를 별도 운영 자산으로 분리하는 것이 필요하다.

- 미해결 3: `Failed to fetch`의 실제 런타임 원인 직접 확인 부족
  - 무엇을 테스트했는가:
    - 코드상 wallet auth recovery 경로에서 raw transport error가 사용자 메시지로 치환되는 것은 반영했다.
  - 왜 미해결인가:
    - 실제 브라우저에서 어떤 요청이 실패했는지 container log와 network trace로 교차 확인하지 못했다.
  - 의심 원인:
    - `/api/v1/auth/challenge` 또는 `/api/v1/auth/verify` fetch 실패 가능성이 가장 높음
  - 영향 범위:
    - UX는 개선되었지만, 근본 네트워크 장애가 남아 있다면 여전히 인증 복구는 실패한다.
  - 다음 개선:
    - compose 환경에서 auth API와 FE nginx proxy path를 직접 검증해야 한다.

# Risks / Assumptions

- 가정:
  - 신규 생성(create)만 onboarding reward 대상이고 restore는 대상이 아니다.
  - onboarding reward는 1회 지급이며 주소 기준 중복 지급을 허용하지 않는다.
  - 로컬/운영 노드 wallet은 onboarding reward TX fee를 감당할 JACK UTXO를 확보할 수 있다.

- 리스크:
  - node wallet funding 정책이 불명확하면 reward RPC가 운영 중 실패할 수 있다.
  - create 요청 idempotency는 wallet row의 reward 상태에 의존하므로, DB와 chain 간 partial failure 운영 대응이 추가로 필요할 수 있다.
  - 이번 변경은 raw `Failed to fetch` 노출은 막았지만, 실제 네트워크 단절을 복구하지는 않는다.

# Next Steps

1. `docker-compose.local.yml` 환경에서 브라우저 기준 E2E 수동 검증을 수행한다.
2. node wallet의 onboarding reward funding source를 명시하고, 부족 시 fallback/운영 runbook을 추가한다.
3. 필요하면 onboarding reward 실패 시 사용자가 수동 재시도할 수 있는 명시적 retry action을 FE/BE에 추가한다.
4. auth recovery failure의 실제 원인 API를 로그와 network trace로 확인하고, 프록시/쿠키/CORS 문제를 구분한다.

# Prompt for Next Fix

다음 작업을 이어서 수행해줘.

현재 상태:
- `FE-ssatto`에는 로또 CTA onboarding modal, wallet auth error mapper, wallet create 후 `1 POT` 지급 안내가 반영되어 있다.
- `BE-ssatto`에는 `POST /api/v1/wallet`의 onboarding reward-aware/idempotent create contract와 wallet onboarding reward 상태 컬럼이 추가되어 있다.
- `blockchain/rpc/server.py`에는 `grantonboardingreward` RPC가 추가되어 있다.

현재 남은 failing behavior / unresolved behavior:
- `docker-compose.local.yml` 실기동 기준으로 신규 지갑 생성 후 실제 `1 POT`가 지급되는지 아직 확인되지 않았다.
- 지갑 생성 직후 보이던 `Failed to fetch`는 한국어 문구로 치환됐지만, 실제 실패 요청이 `/api/v1/auth/challenge`인지 `/api/v1/auth/verify`인지 아직 확정되지 않았다.
- node wallet JACK UTXO가 부족하면 onboarding reward RPC가 실패할 가능성이 있다.

의심 원인:
- FE nginx proxy(`/api`) 또는 backend auth endpoint 연결 문제
- backend -> node RPC 호출 성공 후에도 node wallet funding 부족
- compose 환경에서 auth/session cookie 또는 network path mismatch

우선 확인할 파일/레이어:
- `FE-ssatto/src/pages/WalletPage.tsx`
- `FE-ssatto/src/pages/LottoPage.tsx`
- `FE-ssatto/src/services/walletErrorMapper.ts`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
- `blockchain/rpc/server.py`
- `docker-compose.local.yml`
- `FE-ssatto/nginx.conf`

필수 수정/검증 항목:
1. local compose를 실제로 띄우고 신규 지갑 생성 후 `1 POT`가 summary/lotto overview에 반영되는지 확인
2. onboarding reward 실패 시 backend/chain 로그를 분석하고 funding source 문제인지 API 문제인지 분리
3. wallet create 직후 auth flow에서 실패한 실제 요청 URL과 응답/네트워크 에러를 식별
4. 필요하면 onboarding reward retry endpoint 또는 FE retry action 추가
5. root cause가 proxy/auth/cookie 문제면 그 레이어에서 직접 수정

반드시 통과해야 할 테스트:
- `cd BE-ssatto && ./gradlew test`
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- `cd .. && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`

남은 spec 제약:
- private key는 절대 backend에 저장하거나 전달하지 말 것
- Controller는 request/response만 담당할 것
- onboarding reward는 중복 지급되면 안 됨
- user-facing FE 문구는 한국어 유지
- uncertain runtime 상태를 성공으로 위장하지 말 것
