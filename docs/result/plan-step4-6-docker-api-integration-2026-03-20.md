# Overview

- `plan.md` 기준 4단계는 Docker 로컬 기동 안정화로 재검증 완료했다.
- 5단계는 핵심 REST API가 실제 node RPC와 연결되어 응답하는 것을 확인했고, `getpeerinfo` 파싱 버그를 수정해 정상화했다.
- 6단계는 FE path 라우팅 + `/api` 프록시 경로를 정상화하고, FE 프록시를 통한 읽기 API 연결까지 검증했다.
- 다만 FE의 서명 기반 `exchange` / `lotto commit` 쓰기 흐름은 여전히 UI에서 placeholder 상태다.

# File & Class Change Log

- `FE-ssatto/nginx.conf`
  - `/api/*` 프록시가 `/v1/*`로 잘못 rewrite되던 문제를 `/api/*` 유지 방식으로 수정했다.
- `docker-compose.local.yml`
  - backend host port를 `${LOCAL_BACKEND_PORT:-8080}:8080`로 변수화했다.
- `.env.local`
  - 로컬 포트 충돌 회피용 `LOCAL_BACKEND_PORT=18080`를 추가했다.
- `blockchain/network/node.py`
  - f-string 문법 오류를 수정했다.
- `jackpotchain/__init__.py`
  - 로컬 테스트에서 `jackpotchain.*` import를 사용할 수 있도록 alias package를 추가했다.
- `blockchain/rpc/server.py`
  - `getblockhash()` 결과를 `getblock()`에 그대로 넘겨도 조회되도록 hash byte order를 맞췄다.
  - `versionHex`, `difficultyDisplay`, `rewardJack`, `feeRewardJack`, `isMainChain` 필드를 `getblock()` 응답에 추가했다.
- `blockchain/cli/main.py`
  - `node` 서브커맨드에 `--rpc-host`를 추가하고 RPC 서버 bind에 반영했다.
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
  - `getPeerInfo()`가 JSON-RPC 전체 응답이 아니라 `result` 배열을 기준으로 파싱하도록 수정했다.
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClientTest.java`
  - `getpeerinfo` 파싱 회귀 테스트를 추가했다.

# Cross-Layer Impact Summary

- FE -> Nginx -> BE -> Blockchain data flow가 `/api/v1/*` 기준으로 일관되게 동작하도록 맞췄다.
- Blockchain RPC `getblock` 응답이 BE DTO 계약과 맞도록 확장됐다.
- BE `getPeerInfo()` 파싱 버그 수정으로 `/api/v1/blockchain/dashboard`가 실제 node 응답을 반환하게 됐다.
- Compose 실행 시 `.env.local` 값이 interpolation에 반영되도록 `--env-file .env.local` 실행 기준을 사용했다.

# Implemented Changes

- FE path 기반 라우팅:
  - `/wallet` 직접 접근 시 SPA index fallback이 유지되는 것을 확인했다.
- FE API 프록시:
  - `/api/v1/blockchain/dashboard`가 프런트 경유로도 정상 응답하도록 수정했다.
- Blockchain 런타임:
  - Docker entrypoint가 요구하는 `--rpc-host`를 CLI가 실제로 지원하도록 수정했다.
  - `getblockhash -> getblock` 연결과 block 상세 응답 계약을 보완했다.
- Backend RPC adapter:
  - `getpeerinfo` result 배열 파싱 버그를 수정해 dashboard REST 실패를 해결했다.
- Docker local smoke:
  - backend host port 충돌을 피하기 위해 현재 로컬에서는 `18080 -> 8080`으로 검증했다.

# Tests Run

- Command: `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && cd FE-ssatto && npm run build`
  - Passed tests: production build 완료
  - Failed tests: 없음
  - Failure symptoms/messages: 없음
  - Reproducible/environment-dependent: 재현성 있음

- Command: `cd BE-ssatto && ./gradlew test`
  - Passed tests: backend 전체 테스트 통과
  - Failed tests: 없음
  - Failure symptoms/messages: 없음
  - Reproducible/environment-dependent: 재현성 있음

- Command: `export PATH=/Users/jangjooyoon/Library/Python/3.9/bin:$PATH && PYTHONPATH=. python3 -m pytest blockchain/tests/test_cli_main.py blockchain/tests/test_rpc_server_block.py -q`
  - Passed tests: `test_cli_main.py`, `test_rpc_server_block.py`
  - Failed tests: 없음
  - Failure symptoms/messages: 없음
  - Reproducible/environment-dependent: 재현성 있음

- Command: `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml config`
  - Passed tests: compose 정적 검증 통과
  - Failed tests: 없음
  - Failure symptoms/messages: 없음
  - Reproducible/environment-dependent: 재현성 있음

- Command: `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
  - Passed tests:
    - `frontend`, `backend`, `jackpotchain-node`, `postgres`, `redis`, `rabbitmq` 기동
    - `curl http://localhost:18080/actuator/health`
    - `curl http://localhost:18080/api/v1/blockchain/dashboard`
    - `curl http://localhost:3000/api/v1/blockchain/dashboard`
    - `curl -X POST http://localhost:8332/ ... getblockcount`
    - `curl http://localhost:3000/wallet`
    - wallet/auth/lotto/exchange/activity API smoke
  - Failed tests:
    - 초기 시도에서 `docker compose -f docker-compose.local.yml up -d --build`
  - Failure symptoms/messages:
    - `Bind for 0.0.0.0:8080 failed: port is already allocated`
    - `jackpotchain: error: unrecognized arguments: --rpc-host 0.0.0.0`
    - `BLOCKCHAIN_RPC_FAILED` on dashboard while `getpeerinfo` parsing failed
  - Reproducible/environment-dependent:
    - 포트 충돌은 로컬 환경 의존
    - `--rpc-host` 누락과 `getpeerinfo` 파싱 버그는 재현성 있음

- Command: `export PATH=/Users/jangjooyoon/Library/Python/3.9/bin:$PATH && PYTHONPATH=. python3 -m pytest blockchain/tests/test_e2e_lotto.py -q`
  - Passed tests: 첫 테스트 출력 `.` 확인
  - Failed tests: 정상 종료 전 장시간 정지
  - Failure symptoms/messages: 약 7분 이상 종료되지 않아 수동 종료
  - Reproducible/environment-dependent: 재현되며 원인 추가 확인 필요

# Failed Tests / Unresolved Issues

- 블록체인 `test_e2e_lotto.py`
  - what was tested: 로또 end-to-end Python 테스트 파일 전체
  - why it failed: 실패 메시지 없이 장시간 종료되지 않아 수동 종료했다.
  - suspected root cause: 대기 루프, 네트워크/채굴 종료 조건 누락, 또는 테스트 간 상태 공유 가능성이 있다.
  - impact scope: 블록체인 로또 시나리오의 완전한 회귀 검증 신뢰도가 낮다.
  - what should be improved next: 각 테스트별 timeout, 로그 포인트, hanging 위치 식별이 필요하다.

- FE 쓰기 흐름 미구현
  - what was tested: FE read flow와 프록시 경로, 지갑 등록/토큰/조회/로또 조회/교환 조회
  - why it failed: `WalletPage`, `LottoPage`의 교환/참여 액션은 아직 alert placeholder다.
  - suspected root cause: 클라이언트 사이드 서명, signedTxHex 생성, 상태 전이 UI가 구현되지 않았다.
  - impact scope: 6단계의 읽기 흐름은 검증됐지만 참여/교환의 실제 사용자 플로우는 미완료다.
  - what should be improved next: FE adapter + state + signing flow를 연결하고, 성공/실패 UI를 실제 API로 바꿔야 한다.

# Risks / Assumptions

- 로컬 검증은 `--env-file .env.local`을 사용했다. 같은 포트 변수는 plain `docker compose -f ...`만으로는 interpolation되지 않는다.
- 현재 로컬 backend host port는 다른 컨테이너 충돌 때문에 `18080`을 사용했다.
- `git status`에 보이는 `update_bc.sh` 변경은 이번 작업에서 만들지 않았고 건드리지 않았다.
- FE 페이지 자체는 아직 일부 mock/placeholder UI를 유지한다.

# Next Steps

- FE의 `lotto commit`, `exchange` 쓰기 흐름에 클라이언트 서명과 실제 상태 전이를 연결한다.
- `test_e2e_lotto.py` 정지 원인을 분리하고 timeout/diagnostic logging을 추가한다.
- 필요하면 compose interpolation을 위해 `.env.example` / 실행 스크립트를 정리한다.

# Prompt for Next Fix

`FE-ssatto`, `docs/specs/frontend-spec.md`, `docs/reviews/api.md`, `BE-ssatto`의 로또/교환 API 계약을 기준으로 FE의 서명 기반 쓰기 흐름을 완성해줘. 현재 실패 행동은 `WalletPage`와 `LottoPage`에서 교환/참여 버튼이 alert placeholder만 띄우는 것이고, 원인은 signedTxHex 생성과 상태 관리 어댑터가 비어 있기 때문이다. likely files/layers involved: `FE-ssatto/src/pages/WalletPage.tsx`, `FE-ssatto/src/pages/LottoPage.tsx`, `FE-ssatto/src/services/*`, `FE-ssatto/src/stores/*`, 필요하면 `BE-ssatto` DTO 확인. required fixes: 실제 exchange/lotto commit request adapter 추가, pending/success/error UI 전이 연결, raw mock 의존 제거, 사용자 문구는 모두 한국어 유지. tests that must pass: `cd FE-ssatto && npm run build`, 관련 FE 테스트가 있으면 통과, `curl http://localhost:3000/api/v1/lotto?...`, `curl http://localhost:3000/api/v1/exchange/info?...` 유지, Docker smoke 유지. remaining spec constraints: Controller->RPC direct call 금지, private key 서버 저장 금지, 클라이언트 사이드 서명 유지, page/widget/entity/service/adapter 분리 유지. 
