# Overview

이번 작업은 두 가지 문제를 함께 수정했다.

1. 다중 지갑 생성 후 다른 탭으로 이동했다가 다시 `지갑` 탭으로 돌아오면 페이지가 비정상 상태에 빠지는 문제
2. 새 지갑 생성 시 지급되어야 하는 onboarding `1 POT`가 즉시 보이지 않고 바로 로또 참여에도 사용할 수 없던 문제

첫 번째 문제는 프론트엔드 지갑 store가 기존 지갑 메타데이터를 업데이트할 때 배열 순서를 뒤로 재배치하는 동작 때문에 발생했다. 이로 인해 `activeAddress`와 `activeWalletIndex`가 반복적으로 어긋나며 세션 복구 루프가 불안정해질 수 있었다.

두 번째 문제는 onboarding reward 트랜잭션이 mempool에는 정상 추가되더라도, 체인 read model(`getbalances`, `listunspent`)이 확정 UTXO만 읽고 있어서 즉시 잔액과 사용 가능 UTXO에 반영되지 않던 구조적 문제였다.

# File & Class Change Log

- `docs/plans/wallet-reentry-stability-and-onboarding-reward-visibility-2026-03-21.md`
  - 이번 작업의 범위, 실패 지점, 테스트 순서를 문서화했다.
- `FE-ssatto/src/stores/useWalletStore.ts`
  - 기존 지갑 `upsert` 시 배열 순서를 유지하도록 수정했다.
- `FE-ssatto/src/stores/useWalletStore.test.ts`
  - 기존 지갑 업데이트 시 순서가 유지되는지 검증하는 테스트를 추가했다.
- `FE-ssatto/src/pages/WalletPage.tsx`
  - 세션 복구 응답의 `refreshSessionHandle`이 실제로 변경된 경우에만 store를 업데이트하도록 수정했다.
- `blockchain/rpc/server.py`
  - 주소별 visible UTXO 계산 로직을 추가하고, `getbalances`/`listunspent`가 mempool의 미확인 onboarding reward 출력도 반영하도록 수정했다.
- `blockchain/tests/test_rpc_server_onboarding_reward.py`
  - onboarding reward가 블록 확정 전에도 잔액/UTXO 조회에 보이는지 검증하는 테스트를 추가했다.

# Cross-Layer Impact Summary

- Frontend state layer
  - 세션 복구 성공 시 지갑 배열 순서가 바뀌지 않도록 수정하여 다중 지갑 재진입 안정성을 높였다.
- Blockchain RPC read model
  - onboarding reward가 mempool 단계에서도 잔액/UTXO에 반영되도록 변경했다.
- Backend/API contract
  - 별도 DTO 변경 없이 기존 wallet summary / utxo 경로가 새 read model 동작을 그대로 받도록 유지했다.
- Write flow usability
  - `GET /wallet/{address}/utxos`가 미확인 reward 출력도 반환하게 되면서 지갑 생성 직후 로또 참여 가능성 요구사항에 맞는 방향으로 정렬되었다.

# Implemented Changes

- 다중 지갑 상태 안정화
  - `useWalletStore.upsertWallet()`가 기존 지갑을 찾으면 해당 위치에서 덮어쓰도록 변경했다.
  - 기존처럼 배열 마지막으로 이동시키지 않으므로 `activeWalletIndex`와 `activeAddress`의 불필요한 교란을 줄였다.
  - `WalletPage`에서는 세션 복구 성공 후 `refreshSessionHandle`이 실제로 달라질 때만 `upsertWallet()`을 호출하도록 추가 방어 로직을 넣었다.

- onboarding reward 가시성 개선
  - blockchain RPC 서버에 `_get_visible_utxos()`를 추가했다.
  - 이 helper는:
    - 확정 UTXO 중 mempool에서 이미 소비된 것은 제외
    - mempool에서 생성된 미확인 출력 중 현재 주소 소유인 것은 포함
  - `getbalances()`와 `listunspent()`가 위 helper를 사용하도록 바꿨다.
  - 결과적으로 onboarding reward `1 POT`가 블록 확정 전에도 FE summary/UTXO 기반 흐름에서 보이고 사용 가능한 상태로 계산된다.

# Tests Run

- 실패 확인 단계
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test -- useWalletStore.test.ts`
  - 결과: 실패
  - failed tests:
    - `src/stores/useWalletStore.test.ts > preserves existing wallet order when updating wallet metadata`
  - 증상:
    - 기대 순서 `["JackpotAddressA", "JackpotAddressB"]`
    - 실제 순서 `["JackpotAddressB", "JackpotAddressA"]`
  - 재현성:
    - 재현 가능, 코드 로직 기반

- 실패 확인 단계
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`
  - 결과: 실패
  - failed tests:
    - `test_grantonboardingreward_is_visible_in_balances_before_confirmation`
    - `test_grantonboardingreward_is_visible_in_listunspent_before_confirmation`
  - 증상:
    - `pot_satoshi == 0`
    - `utxos == []`
  - 재현성:
    - 재현 가능, 코드 로직 기반

- 수정 후 focused verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test -- useWalletStore.test.ts`
  - 결과: 통과
  - passed tests:
    - `src/stores/useWalletStore.test.ts`

- 수정 후 focused verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`
  - 결과: 통과
  - passed tests:
    - onboarding reward 생성
    - balances 반영
    - listunspent 반영

- broader frontend verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - 결과: 통과
  - passed tests:
    - `16 files, 37 tests passed`
  - failed tests:
    - 없음
  - 참고 증상:
    - zustand persist middleware가 테스트 환경 storage 미가용 경고를 출력했으나 테스트 실패는 아님
  - 재현성:
    - 환경 의존 경고, 테스트 성공에는 영향 없음

- broader frontend build verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
  - 결과: 통과
  - passed tests:
    - production build completed
  - failed tests:
    - 없음

- backend regression verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainHttpRpcClientTest'`
  - 결과: 통과
  - passed tests:
    - wallet service onboarding reward 관련 테스트
    - RPC client parsing 관련 테스트
  - failed tests:
    - 없음

- compose/runtime verification 시도
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker --version && docker compose version`
  - 결과: 실패
  - failed tests:
    - 환경 명령 실행 실패
  - 증상:
    - `zsh:1: command not found: docker`
  - 재현성:
    - 현재 실행 환경 의존

- compose config verification 시도
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker compose -f docker-compose.local.yml config >/tmp/jc-compose-config.out && echo OK`
  - 결과: 실패
  - failed tests:
    - 환경 명령 실행 실패
  - 증상:
    - `zsh:1: command not found: docker`
  - 재현성:
    - 현재 실행 환경 의존

# Failed Tests / Unresolved Issues

- `docker-compose.local.yml` 직접 실행 및 브라우저 기반 다중 지갑 재현 검증
  - 무엇을 테스트했는가:
    - local compose 실행 가능 여부 및 compose config 검증
  - 왜 실패했는가:
    - 현재 Codex shell 환경에 `docker` 바이너리가 없다
  - 추정 원인:
    - 실행 환경 제한
  - 영향 범위:
    - 사용자가 요구한 “compose를 직접 띄우고 여러 지갑을 등록한 뒤 탭 이동 재현”은 이 셸에서 완료하지 못했다
  - 다음 개선:
    - Docker 사용 가능한 환경에서 `docker-compose.local.yml`을 실제 기동하고 브라우저 자동화 또는 수동 검증을 추가해야 한다

- 브라우저 실사용 탭 이동 시나리오의 최종 E2E 확인
  - 무엇을 테스트했는가:
    - 코드 레벨 상태 재현과 unit/integration 수준 검증
  - 왜 남아 있는가:
    - 실제 브라우저/compose 런타임에서 동일 시나리오를 이 환경에서 실행할 수 없었다
  - 추정 원인:
    - Docker 및 브라우저 런타임 검증 수단 부재
  - 영향 범위:
    - 코드상 주요 원인은 제거했지만, 실환경에서 추가 레이아웃/라우팅/네트워크 요인이 있을 가능성은 완전히 배제하지 못한다
  - 다음 개선:
    - compose 환경에서 다중 지갑 생성 -> 로또/채굴/대시보드 이동 -> 지갑 복귀 플로우를 실제로 재확인해야 한다

# Risks / Assumptions

- 지갑 재진입 오류의 핵심 원인을 wallet array reorder와 unnecessary restore upsert로 판단하고 수정했다.
- onboarding reward는 여전히 mempool 기반 즉시 가시성에 의존한다. 즉, 사용 가능성은 확보되지만 블록 확정 전이므로 최종 확정 자산과는 의미가 다르다.
- 현재 변경은 기존 API contract를 깨지 않도록 내부 read model 계산만 보완했다.
- Docker 부재로 인해 사용자 요구의 compose 직접 검증은 이 셸에서 수행하지 못했다.

# Next Steps

1. Docker 사용 가능한 환경에서 `docker-compose.local.yml`을 기동한다.
2. 새 지갑 2개 이상 생성 후 `로또`, `채굴`, `대시보드`를 이동한 뒤 다시 `지갑`으로 복귀해 비정상 상태가 재현되는지 확인한다.
3. 새 지갑 생성 직후 wallet summary에 `1 POT`이 보이는지, 실제 로또 참여 트랜잭션 생성이 가능한지 확인한다.
4. 필요하면 브라우저 자동화 테스트를 추가해 다중 지갑 재진입 시나리오를 회귀 테스트로 고정한다.

# Prompt for Next Fix

다음 작업을 이어서 진행해줘.

목표:
- `docker-compose.local.yml`을 실제로 실행한 뒤 다중 지갑 생성 -> 탭 이동 -> 지갑 복귀 시나리오를 런타임에서 검증하고, 남은 오류가 있으면 수정해줘.
- 새 지갑 생성 직후 지급되는 onboarding `1 POT`가 실제 UI와 로또 참여 흐름에서 바로 사용 가능한지 확인하고, 추가 문제를 고쳐줘.

가능성이 높은 파일/레이어:
- FE: `FE-ssatto/src/pages/WalletPage.tsx`, `FE-ssatto/src/stores/useWalletStore.ts`, `FE-ssatto/src/hooks/useWalletSummaries.ts`, `FE-ssatto/src/services/writeFlowService.ts`
- BE: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`, `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
- Blockchain: `blockchain/rpc/server.py`
- Infra: `docker-compose.local.yml`

현재 남아 있을 수 있는 실패 동작:
- 실제 브라우저/compose 환경에서 지갑 탭 복귀 시 여전히 렌더/세션 복구 문제가 남아 있을 수 있음
- onboarding reward가 summary에는 보여도 실제 로또 참여 UTXO 선택 과정에서 추가 제약이 있을 수 있음

의심 원인:
- 런타임 환경에서의 추가 상태 복원 경로 또는 네트워크 응답 타이밍 이슈
- mempool 기반 UTXO가 FE write flow 또는 backend auth 흐름에서 일부 누락되는 경로

필수 수정 방향:
- compose 환경에서 실제 재현
- 브라우저 또는 API 로그 기준으로 실패 지점 특정
- 필요 시 page-level 회귀 테스트 또는 E2E 시나리오 추가
- API/RPC 실패를 성공으로 숨기지 말 것

반드시 통과해야 하는 테스트:
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker compose -f docker-compose.local.yml config`

남은 spec 제약:
- FE user-facing text는 한국어 유지
- Controller -> RPC direct call 금지
- private key 저장 금지, backend 보관 금지
- uncertain RPC result를 성공으로 처리 금지
- module responsibility 분리 유지
