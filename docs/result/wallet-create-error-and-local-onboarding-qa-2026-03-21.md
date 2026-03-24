# Overview

이번 작업은 새 지갑 등록 직후 상단에 오류 배너가 뜨고 onboarding `1 POT`가 보이지 않던 문제를 함께 수정했다.

핵심 원인은 두 가지였다.

1. 프론트엔드가 백엔드 지갑 등록 성공 전에 로컬 keystore와 wallet store를 먼저 커밋하고 있었기 때문에, reward RPC 실패 시 FE에는 지갑이 남고 BE에는 없는 orphan wallet 상태가 발생했다.
2. 로컬 observer node 기본 지갑에는 onboarding reward relay fee를 낼 JACK UTXO가 없어 `grantonboardingreward` RPC 자체가 실패할 수 있었다.

이를 해결하기 위해:

- FE create flow를 rollback 가능한 registration service로 분리했다.
- local node에 development-only onboarding bootstrap funding을 명시적으로 추가했다.
- 기존 onboarding reward visibility 로직과 함께 summary/UTXO 흐름이 즉시 `1 POT`를 보이도록 유지했다.
- 로컬 수동 검증 시나리오를 QA/QC 체크리스트 형태의 plan 문서로 정리했다.

# File & Class Change Log

- `docs/plans/wallet-create-error-and-local-onboarding-qa-2026-03-21.md`
  - 구현 범위와 local QA/QC 체크리스트를 추가했다.
- `FE-ssatto/src/services/walletRegistrationFlowService.ts`
  - 지갑 등록 create/restore 흐름을 service로 분리하고 실패 시 keystore rollback을 담당하게 했다.
- `FE-ssatto/src/services/walletRegistrationFlowService.test.ts`
  - create 실패 rollback, restore duplicate keep 동작을 검증하는 테스트를 추가했다.
- `FE-ssatto/src/pages/WalletPage.tsx`
  - 페이지가 직접 등록 순서를 처리하지 않고 registration flow service를 사용하도록 수정했다.
- `blockchain/bootstrap/__init__.py`
  - local bootstrap helper export를 추가했다.
- `blockchain/bootstrap/local_onboarding_reward.py`
  - local-only onboarding reward fee funding helper를 추가했다.
- `blockchain/tests/test_local_onboarding_bootstrap.py`
  - bootstrap helper의 idempotency와 reward RPC 성공 경로를 검증하는 테스트를 추가했다.
- `blockchain/cli/main.py`
  - node 실행 옵션에 local onboarding bootstrap flag를 추가했다.
- `blockchain/entrypoint.sh`
  - `NODE_BOOTSTRAP_ONBOARDING_REWARD=true`일 때 node 실행 플래그를 전달하도록 수정했다.
- `.env.local`
  - local onboarding bootstrap env를 활성화했다.

# Cross-Layer Impact Summary

- Frontend
  - create flow가 backend registration 이전에 UI state를 커밋하지 않게 바뀌어 orphan wallet을 방지한다.
- Backend/API
  - 별도 API contract 변경 없이 기존 `POST /wallet` 응답을 그대로 사용한다.
- Blockchain local runtime
  - local node startup 시 reward fee funding을 준비할 수 있게 되어 onboarding reward RPC 성공 가능성이 생긴다.
- Infra/local config
  - `.env.local`에서 local onboarding bootstrap을 명시적으로 켜서 local stack의 동작 목적을 드러냈다.

# Implemented Changes

- FE create flow 정합성 수정
  - 새 `walletRegistrationFlowService`를 추가했다.
  - service는:
    - 먼저 local keystore를 준비
    - backend registration 호출
    - 실패 시 새로 만든 keystore를 rollback
    - restore duplicate(409)는 rollback 없이 허용
  - `WalletPage`는 service 성공 후에만 `upsertWallet()`과 `unlockWallet()`을 실행한다.
  - 결과적으로 reward RPC 실패나 backend registration 실패 시 깨진 지갑 카드가 FE에 남지 않는다.

- Local onboarding reward bootstrap 추가
  - deterministic private key/address 기반 bootstrap helper를 추가했다.
  - helper는 local node wallet에 bootstrap address를 import하고, deterministic JACK UTXO를 준비한다.
  - 이 JACK은 onboarding reward relay fee를 위한 local development bootstrap purpose에만 사용된다.
  - helper는 idempotent하게 동작한다.

- 기존 reward visibility 유지
  - 이전에 반영한 visible UTXO/read-model 경로와 결합되어 onboarding reward `1 POT`가 summary/UTXO 경로에 즉시 보이도록 유지된다.

- 관련 spec/review 체크
  - FE user-facing text는 한국어 유지
  - Controller -> RPC direct call 추가 없음
  - private key는 FE keystore에만 저장, backend 저장 없음
  - local bootstrap은 infra/local runtime 경로에 한정
  - backend/blockchain 변경은 test-first 방식으로 진행

# Tests Run

- 실패 확인 단계
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test -- walletRegistrationFlowService.test.ts`
  - 결과: 실패
  - failed tests:
    - `src/services/walletRegistrationFlowService.test.ts`
  - 증상:
    - `Cannot find module './walletRegistrationFlowService'`
  - 재현성:
    - 재현 가능, 구현 전 상태

- 실패 확인 단계
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_local_onboarding_bootstrap.py -q`
  - 결과: 실패
  - failed tests:
    - `test_local_onboarding_bootstrap.py` collect 단계 실패
  - 증상:
    - `ModuleNotFoundError: No module named 'blockchain.bootstrap'`
  - 재현성:
    - 재현 가능, 구현 전 상태

- focused frontend verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test -- walletRegistrationFlowService.test.ts`
  - 결과: 통과
  - passed tests:
    - create failure rollback
    - restore duplicate keep
  - failed tests:
    - 없음

- focused blockchain verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_local_onboarding_bootstrap.py -q`
  - 결과: 통과
  - passed tests:
    - bootstrap idempotency
    - reward RPC success after bootstrap
  - failed tests:
    - 없음

- reward regression verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py blockchain/tests/test_local_onboarding_bootstrap.py -q`
  - 결과: 통과
  - passed tests:
    - `4 passed`
  - failed tests:
    - 없음

- broader frontend verification
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - 결과: 통과
  - passed tests:
    - `17 files, 39 tests passed`
  - failed tests:
    - 없음
  - 참고 증상:
    - zustand persist middleware storage warning 출력
  - 재현성:
    - 테스트 환경 의존 경고, 테스트 실패는 아님

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
    - rpc client parsing 관련 테스트
  - failed tests:
    - 없음

- compose validation 시도
  - 명령어: `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker compose -f docker-compose.local.yml config`
  - 결과: 실패
  - failed tests:
    - 환경 명령 실행 실패
  - 증상:
    - `zsh:1: command not found: docker`
  - 재현성:
    - 현재 실행 환경 의존

# Failed Tests / Unresolved Issues

- `docker-compose.local.yml` 실제 실행 검증
  - 무엇을 테스트했는가:
    - compose config 및 local compose 실행 가능 여부
  - 왜 실패했는가:
    - 현재 Codex shell에 `docker` 바이너리가 없다
  - 추정 원인:
    - 실행 환경 제한
  - 영향 범위:
    - 사용자가 요구한 compose 직접 실행, 브라우저 수동 시나리오 반복, 컨테이너 로그 확인을 이 셸에서 완료할 수 없었다
  - 다음 개선:
    - Docker 사용 가능한 환경에서 동일 브랜치/워크스페이스로 compose를 실제 기동해야 한다

- local bootstrap은 development-only synthetic funding이다
  - 무엇을 테스트했는가:
    - local node onboarding reward fee funding 가능 여부
  - 왜 남아 있는가:
    - 이번 helper는 local development를 위한 deterministic bootstrap JACK UTXO를 준비하는 방식이다
  - 추정 원인:
    - observer node 기본 지갑에 spendable JACK이 전혀 없는 구조
  - 영향 범위:
    - local stack에서는 onboarding reward가 가능해지지만, production/real chain bootstrap 전략을 의미하지는 않는다
  - 다음 개선:
    - local-only bootstrap임을 runbook 또는 troubleshooting 문서로 분리하는 것이 좋다

# Risks / Assumptions

- FE orphan wallet 문제는 create flow ordering과 rollback으로 해결했다고 판단한다.
- local onboarding reward bootstrap은 local development 환경 한정 전제다.
- Docker 실행이 불가능했기 때문에 실제 컨테이너 조합에서 추가 runtime 이슈가 없는지는 이 셸에서 확정하지 못했다.
- `.env.local`의 bootstrap 활성화는 local stack 목적에 맞춘 설정이며, 운영 환경에 그대로 적용하면 안 된다.

# Next Steps

1. Docker 사용 가능한 환경에서 `docker-compose.local.yml`을 실제로 기동한다.
2. 새 지갑 생성 직후 상단 오류 배너가 재현되는지 확인한다.
3. 생성 직후 wallet card에 `1 POT`이 보이는지 확인한다.
4. `로또`, `대시보드`, `채굴` 탭을 왕복한 뒤 다시 `지갑`으로 돌아와도 오류가 없는지 확인한다.
5. 필요하면 local bootstrap 동작을 문서화하는 troubleshooting/runbook 문서를 추가한다.

# Prompt for Next Fix

다음 작업을 이어서 진행해줘.

목표:
- Docker 사용 가능한 환경에서 `docker-compose.local.yml`을 실제로 실행하고, 새 지갑 생성 직후 오류 배너와 onboarding `1 POT` 지급이 정상인지 끝까지 검증해줘.
- 컨테이너 로그와 브라우저 네트워크 기준으로 runtime 문제가 남아 있으면 수정해줘.

가능성이 높은 파일/레이어:
- FE: `FE-ssatto/src/pages/WalletPage.tsx`, `FE-ssatto/src/services/walletRegistrationFlowService.ts`, `FE-ssatto/src/hooks/useWalletSummaries.ts`, `FE-ssatto/src/hooks/useWalletActivities.ts`
- Blockchain: `blockchain/bootstrap/local_onboarding_reward.py`, `blockchain/cli/main.py`, `blockchain/entrypoint.sh`, `blockchain/rpc/server.py`
- Infra: `.env.local`, `docker-compose.local.yml`

현재 남아 있을 수 있는 failing behavior:
- compose runtime에서 local bootstrap env가 실제로 node 컨테이너에 반영되지 않을 수 있음
- frontend가 새 지갑 생성 후 polling race로 secondary error banner를 잠깐이라도 띄울 수 있음
- wallet create success 후 lotto entry write flow에서 추가 UTXO/인증 문제가 있을 수 있음

의심 원인:
- container start order 또는 persisted volume 상태
- 기존 node wallet volume에 이전 상태가 남아 bootstrap이 기대대로 동작하지 않는 경우
- UI polling timing과 backend metadata commit timing의 race

필수 수정 방향:
- `docker compose -f docker-compose.local.yml down -v` 후 재기동을 포함한 검증
- frontend/backend/node 로그를 함께 확인
- persisted volume과 bootstrap helper idempotency를 실제 컨테이너 상태로 검증
- 브라우저 네트워크 탭에서 `/api/v1/wallet`, `/api/v1/auth/challenge`, `/api/v1/wallet/{address}/activities`, `/api/v1/wallet/{address}/utxos` 응답을 확인

반드시 통과해야 하는 테스트:
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py blockchain/tests/test_local_onboarding_bootstrap.py -q`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker compose -f docker-compose.local.yml config`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker compose -f docker-compose.local.yml up -d`

남은 spec 제약:
- FE user-facing text는 한국어 유지
- Controller -> RPC direct call 금지
- private key backend 저장 금지
- miner process 제어 금지
- uncertain RPC result를 성공으로 처리 금지
- local-only bootstrap과 production behavior를 혼동하지 말 것
