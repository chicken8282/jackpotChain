# Overview

이번 작업에서는 `/usr/local/bin/docker`로 `docker-compose.local.yml`을 실제 기동하고, 지갑 생성, onboarding `1 POT` 지급, 즉시 로또 참여 가능 여부, 인증/권한/반복 호출/잘못된 입력 등 API 및 사용자 행위 기반 QA를 수행했다.

실제 검증 중 두 가지 로컬 블록체인 문제를 재현했다.

1. onboarding reward 출력이 `1 POT / 0 JACK`이라서 신규 지갑이 즉시 로또 commit을 만들 수 없었다.
2. onboarding reward funding이 confirmed UTXO만 바라봐서, 미채굴 상태에서는 첫 reward 이후 두 번째 신규 지갑 생성이 `503 BLOCKCHAIN_RPC_FAILED`로 실패했다.

두 문제를 TDD로 수정한 뒤, `python3 scripts/local_stack_qa.py` 기준 체크리스트를 재실행해 PASS/BLOCKED 상태를 정리했다.

# File & Class Change Log

- `blockchain/rpc/server.py`
  - `RPCServer._grantonboardingreward`
  - confirmed-only funding 선택을 visible UTXO 기반으로 수정
  - recipient output에 로또 1회 수수료 버퍼 JACK을 동봉하도록 수정
- `blockchain/tests/test_rpc_server_onboarding_reward.py`
  - onboarding reward fee buffer 검증 테스트 추가
  - fragmented fee UTXO 집계 검증 테스트 추가
- `blockchain/tests/test_local_onboarding_bootstrap.py`
  - 미채굴 상태에서 연속 onboarding reward 지급 가능성 검증 테스트 추가
- `scripts/local_stack_qa.py`
  - 로컬 스택 API/UI smoke + abuse/security QA 자동화 스크립트 추가
- `docs/plans/local-compose-api-ui-qa-2026-03-22.md`
  - 본 작업 계획 문서 추가
- `docs/reviews/local-stack-qa-checklist-2026-03-22.md`
  - 실행 결과가 반영된 QA 체크리스트 추가
- `docs/result/local-compose-api-ui-qa-2026-03-22.md`
  - 본 결과 문서 추가

# Cross-Layer Impact Summary

- Infra:
  - 실제 기동은 `--env-file .env.local`을 함께 써야 `.env.local`의 `LOCAL_BACKEND_PORT=18080`이 반영된다.
  - `docker compose -f docker-compose.local.yml up ...`만 쓰면 백엔드가 `8080`으로 노출된다.
- Blockchain / RPC:
  - onboarding reward가 이제 `1 POT`와 함께 `MIN_TX_FEE`만큼의 JACK fee buffer를 제공한다.
  - onboarding reward funding이 mempool의 unconfirmed change까지 재사용 가능해져, 미채굴 상태에서도 연속 신규 지갑 생성 QA가 가능해졌다.
- Backend:
  - 별도 코드 수정은 없지만, `POST /wallet`의 RPC 의존 흐름이 위 수정으로 안정화됐다.
- Frontend / User Flow:
  - 신규 지갑 생성 직후 FE의 signed commit 빌더가 더 이상 `로또 참여 수수료를 위한 JACK UTXO가 부족합니다.`로 막히지 않는다.
  - 실제 API 레벨로 로또 commit 성공을 확인했다.

# Implemented Changes

- onboarding reward output에 `1 POT`만 넣던 기존 로직을 `1 POT + 0.01 JACK fee buffer` 구조로 변경했다.
- onboarding reward funding UTXO 선택 시 `blockchain.utxo_set`만 보던 로직을 `_get_visible_utxos()` 기반으로 바꿔 mempool unconfirmed change를 재사용하게 했다.
- 이로 인해 로컬 compose에서 신규 지갑 생성 -> 즉시 로또 참여 제출 시나리오가 실제로 성립하게 됐다.
- 반복 가능한 QA 실행을 위해 `scripts/local_stack_qa.py`를 추가했고, 체크리스트 문서에 결과를 정리했다.

# Tests Run

## Exact Commands

```bash
/usr/local/bin/docker compose -f docker-compose.local.yml config
/usr/local/bin/docker compose --env-file .env.local -f docker-compose.local.yml up -d --build
python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q
python3 -m pytest blockchain/tests/test_local_onboarding_bootstrap.py -q
python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py blockchain/tests/test_local_onboarding_bootstrap.py -q
python3 scripts/local_stack_qa.py
```

## Passed Tests

- `python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py blockchain/tests/test_local_onboarding_bootstrap.py -q`
  - `7 passed in 0.28s`
- `python3 scripts/local_stack_qa.py`
  - Frontend route shell reachability
  - dashboard/block detail public API
  - wallet create/onboarding/auth/protected read/duplicate restore
  - lotto overview/entries/commit/missing result/missing claim
  - exchange info/invalid request/forbidden access
  - mining reads/invalid size
  - refresh/logout/session revoke

## Failed Tests

- 초기 TDD 실패 1
  - command: `python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py -q`
  - symptom: `assert 0.0 >= (1000000 / 100000000)`
  - cause: onboarding reward recipient output에 JACK fee buffer가 없었다.
  - reproducibility: 재현 가능
- 초기 TDD 실패 2
  - command: `python3 -m pytest blockchain/tests/test_local_onboarding_bootstrap.py -q`
  - symptom: second onboarding reward raised `Insufficient JACK balance for onboarding reward fee buffer`
  - cause: reward funding이 confirmed UTXO만 보고 mempool change를 재사용하지 못했다.
  - reproducibility: 재현 가능
- 초기 QA runner 실패
  - command: `python3 scripts/local_stack_qa.py`
  - symptom: `wallet register failed: {'code': 503, 'message': '블록체인 RPC 호출에 실패했습니다.'}`
  - cause: 위 두 번째 문제와 동일
  - reproducibility: 재현 가능

## Environment Dependency

- `docker compose` 포트 치환은 `.env.local`을 자동 반영하지 않으므로, 실제 검증은 `--env-file .env.local`과 함께 수행했다.
- 이 차이는 재현 가능하며 환경 의존이 아니라 compose invocation 방식 차이다.

# Failed Tests / Unresolved Issues

## 1. Positive Exchange Success Is Still Blocked In Local Compose

- what was tested:
  - `GET /exchange/info`
  - malformed `POST /exchange/jack-to-pot`
  - cross-wallet forbidden access
- why it failed:
  - 성공 교환 시나리오를 실행할 수 있는 authenticated user wallet에 `>=100 JACK`이 없다.
- suspected root cause:
  - local compose는 miner를 포함하지 않고, local bootstrap wallet도 onboarding relay fee 목적 수준의 JACK만 가진다.
- impact scope:
  - 교환 API의 성공 응답 계약은 현재 local compose alone으로는 end-to-end 검증이 불완전하다.
- what should be improved next:
  - local-only QA funding 전략 또는 외부 TUI miner 연동된 테스트 runbook이 필요하다.

## 2. Positive Lotto Claim Success Is Still Blocked In Local Compose

- what was tested:
  - missing commit result lookup
  - invalid claim request rejection
- why it failed:
  - 성공 claim에는 mined + indexed + claimable 상태의 lotto entry가 필요하지만 local compose는 miner 제어를 제공하지 않는다.
- suspected root cause:
  - infra spec상 miner container가 제외되고, 현재 자동 QA는 외부 채굴 경로를 포함하지 않는다.
- impact scope:
  - claim 성공 응답 계약은 negative coverage만 완료됐다.
- what should be improved next:
  - 외부 TUI miner 기반 runbook 또는 local QA용 mined fixture ingestion 경로가 필요하다.

# Risks / Assumptions

- `scripts/local_stack_qa.py`는 HTTP/API 및 서명 트랜잭션 제출까지는 자동화하지만, 실제 브라우저 렌더링 계층의 시각적 검증은 하지 않는다.
- `/unknown-route`는 SPA shell까지는 확인했지만, 실제 화면상 404 UX는 별도 브라우저 자동화가 없으면 보장되지 않는다.
- onboarding fee buffer는 local onboarding UX를 만족시키기 위한 로컬 체인 동작 변경이며, production economics를 의미하지 않는다.
- claim/validation ADR 경계는 이번 수정 범위에서 건드리지 않았다.

# Next Steps

1. local-only funded exchange success 경로를 정의해 `POST /exchange/jack-to-pot`의 성공 응답까지 자동 QA에 포함한다.
2. 외부 TUI miner 또는 fixture mining runbook을 연결해 claim success 시나리오를 실제로 검증한다.
3. 가능하면 브라우저 자동화까지 추가해 unknown route, error banner, modal, button spam UX를 시각적으로 검증한다.

# Prompt for Next Fix

다음 작업은 local compose 환경에서 아직 BLOCKED 상태인 교환 성공과 로또 claim 성공 QA를 실제 PASS로 만드는 것이다. likely files/layers involved: `blockchain/bootstrap/local_onboarding_reward.py`, `blockchain/rpc/server.py`, 필요 시 `docs/specs/infra-spec.md`, `docs/reviews/local-stack-qa-checklist-2026-03-22.md`, `scripts/local_stack_qa.py`. current failing behavior: local compose에는 authenticated user wallet 기준 `>=100 JACK` funded wallet이 없어 교환 성공을 검증할 수 없고, miner control이 없어 mined + claimable lotto entry를 만들 수 없어 claim 성공도 검증하지 못한다. suspected cause: infra spec상 miner container는 제외되어 있고 local bootstrap funding은 onboarding relay fee 수준만 고려되어 있다. required fixes: local-only QA funding strategy 또는 external TUI miner runbook을 도입해 funded wallet/claimable entry를 안정적으로 재현하고, QA script에 positive exchange/claim success 시나리오를 추가하라. tests that must pass: `python3 -m pytest blockchain/tests/test_rpc_server_onboarding_reward.py blockchain/tests/test_local_onboarding_bootstrap.py -q`, `python3 scripts/local_stack_qa.py`, 그리고 새로 추가하는 positive exchange/claim 성공 시나리오. remaining spec constraints: backend에서 private key 저장 금지, controller에서 RPC 직접 호출 금지, miner container를 기본 compose에 넣지 말 것, claim/validation 규칙을 건드리면 `blockchain/docs/adr/ADR-001-claim-validation.md`를 따를 것.
