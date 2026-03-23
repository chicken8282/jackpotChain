# Overview

로컬 `docker-compose.local.yml` 환경에서 다음 목표를 end-to-end로 검증했다.

- 인증된 지갑 생성 및 초기 `1 POT` 지급
- `100 JACK` 이상 funded wallet 기반 교환 성공
- 커밋 블록 높이 기록 후 `N+18` 경과에 따른 결과 확정
- `GET /lotto/entries`, `GET /lotto/entries/{commitHash}/result`의 `resultNumbers`, `matchCount`, `claimable` 반영
- 체인 상태 기준 claim 가능 여부 계산
- 클라이언트/테스트 하네스 signed tx 제출 방식의 실제 claim 성공

최종 결과:

- `API-EXCHANGE-SUCCESS`: PASS
- `API-LOTTO-CLAIM-SUCCESS`: PASS
- 신규 `GET /lotto/entries/{commitHash}/claim-context` 경로 추가 및 PASS
- 로컬 스택 헬스체크, API 시나리오, 프론트엔드 테스트, 블록체인 테스트 모두 PASS

# File & Class Change Log

- `blockchain/mempool/pool.py`
  - `add_tx(..., blockchain=None)`로 claim validation에 체인 컨텍스트 전달
- `blockchain/rpc/server.py`
  - `sendrawtransaction` 계열 mempool 검증에 blockchain 전달
  - local QA 헬퍼 `grantlocaljack`, `listpoolunspent`, `mineqablocks` 유지/활용
- `blockchain/network/node.py`
  - 네트워크 경유 TX 처리 시 mempool 검증에 blockchain 전달
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
  - `listPoolUnspent()` 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
  - `listpoolunspent` RPC 파싱 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainPoolUnspentOutput.java`
  - 잭팟 풀 UTXO DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
  - `GET /api/v1/lotto/entries/{commitHash}/claim-context` 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
  - 체인 기준 claim 컨텍스트 조회 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/dto/LottoClaimContextResponse.java`
  - claim 서명용 payout/pool UTXO 응답 DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/dto/LottoClaimPoolUtxoResponse.java`
  - claim pool UTXO 응답 DTO 추가
- `FE-ssatto/src/services/lottoService.ts`
  - `getLottoClaimContext()` 추가
- `FE-ssatto/src/services/tx/txBuilder.ts`
  - signed `version=5` claim TX builder 추가
  - generic UTXO selection으로 pool UTXO 빌드 지원
- `FE-ssatto/src/services/writeFlowService.ts`
  - claim write flow를 실제 signed tx 제출 방식으로 변경
- `FE-ssatto/src/pages/LottoPage.tsx`
  - claim 제출 중 중복 클릭 방지 및 상태 메시지 추가
- `scripts/local_stack_qa.py`
  - claim 성공 시나리오를 backend claim-context 기반으로 재구성
  - `API-LOTTO-CLAIM-CONTEXT` 시나리오 추가
- `docs/reviews/api.md`
  - claim-context API 문서 추가
- `docs/reviews/local-stack-qa-checklist-2026-03-22.md`
  - 기존 `BLOCKED` 항목을 `PASS`로 갱신

# Cross-Layer Impact Summary

- Blockchain
  - claim validation이 mempool 단계에서도 온체인 컨텍스트를 사용하도록 정합성을 보강했다.
- Backend
  - 서버는 claim tx를 생성하지 않고, 체인에서 읽은 payout/pool UTXO만 노출하는 read-only contract를 추가했다.
- Frontend
  - 지갑 UTXO + claim context를 사용해 브라우저/클라이언트가 직접 signed `version=5` claim tx를 생성하도록 변경했다.

# Implemented Changes

- 로컬 QA funding 경로
  - `grantlocaljack` 기반으로 authenticated wallet에 local-only JACK funding을 주입해 교환 성공 경로를 재현했다.
- 체인 기준 claimable 경로
  - mined commit, `N+18` 비교 블록, 결과 확정, claimable 판정을 모두 체인 상태 기준으로 검증했다.
- claim-context API 추가
  - 클라이언트가 claim tx를 직접 만들 수 있도록 `rewardJack`, `rewardPot`, `poolUtxos`를 backend가 read-only로 제공한다.
- 프론트 claim write flow 구현
  - 기존 “자동 지급 방식이라 claim 불가” 예외를 제거하고 signed tx relay 구조를 유지했다.
- QA harness 정합화
  - `scripts/local_stack_qa.py`가 실제 frontend/backed contract와 동일한 claim-context 경로를 사용하도록 변경했다.

# QA/QC Checklist

| 시나리오명 | 목적 | 사전 조건 | 절차 | 기대 결과 | 실제 결과 | Pass/Fail |
|---|---|---|---|---|---|---|
| Environment Boot | 로컬 의존성 부팅 상태 확인 | `.env.local`, Docker Desktop, compose 사용 가능 | `docker compose ... up -d --build`, `docker compose ps` 확인 | postgres/redis/rabbitmq/node/backend/frontend healthy | 6개 서비스 모두 healthy 확인 | PASS |
| FE Routes | 웹 진입 경로 확인 | frontend 기동 | `/`, `/wallet`, `/lotto`, `/mining`, `/unknown-route` 요청 | SPA shell 응답 | 모든 경로 200 + SPA shell 반환 | PASS |
| Dashboard Read | 공개 체인 대시보드 확인 | backend/node healthy | `GET /blockchain/dashboard` | 현재 높이 포함 정상 응답 | height=101로 정상 응답 | PASS |
| Dashboard Invalid | 경계값 검증 | 동일 | `GET /blockchain/dashboard?limit=0` | 400 reject | 400 확인 | PASS |
| Block Detail | 공개 블록 상세 확인 | 대시보드 높이 확보 | `GET /blockchain/blocks/{height}` | tip 블록 상세 반환 | height=101 블록 조회 성공 | PASS |
| Wallet Create | 지갑 생성 및 등록 검증 | backend healthy | `POST /wallet` | 신규 지갑 생성, onboarding reward 지급 | 신규 지갑 생성 및 reward grant=true | PASS |
| Initial 1 POT | 초기 보상 검증 | 생성된 지갑 존재 | `GET /wallet/{address}/utxos` | 1 POT + fee buffer JACK 확인 | 1 POT과 즉시 write 가능한 JACK 확인 | PASS |
| Auth Verify | challenge/verify 정상 경로 | 신규 지갑 keypair | challenge 생성 후 클라이언트 서명 verify | access token 발급 | 정상 인증 완료 | PASS |
| Auth Negative | malformed/stale 인증 차단 | 인증 API 사용 가능 | 잘못된 challengeId/signature 전송 | 400 또는 401 | bounded failure 확인 | PASS |
| Unauthorized Wallet Read | 무인증 접근 차단 | 보호 API 존재 | bearer 없이 `/wallet/{address}/utxos` 호출 | 401 | 401 확인 | PASS |
| Forbidden Wallet Read | 타인 리소스 접근 차단 | 서로 다른 두 지갑 | A 토큰으로 B 지갑 조회 | 403 | 403 확인 | PASS |
| Wallet List | 지갑 목록 조회 | 지갑 등록 완료 | `GET /wallet?addresses=...` | 목록 반환 | 요약 정보 반환 | PASS |
| Wallet List Invalid | 잘못된 쿼리 차단 | 동일 | 빈 `addresses` 전달 | 400 | 400 확인 | PASS |
| Wallet Activities | 활동 내역 조회 | 지갑 존재 | `GET /wallet/{address}/activities` | 정상 응답 | 정상 조회 | PASS |
| Wallet Activities Invalid | page size 경계 검증 | 동일 | `size=101` | 400 | 400 확인 | PASS |
| Error Banner Mapping | 에러 배너 재현/복구 로직 확인 | FE 테스트 가능 | `walletAddFormService`, `walletRegistrationFlowService`, `walletErrorMapper` 테스트 실행 | 에러 상태가 의도된 메시지로 매핑되고 복구 가능 | 관련 Vitest 통과 | PASS |
| Lotto Overview | 로또 개요 조회 | 인증 지갑 존재 | `GET /lotto?address=...` | 초기 잔액 반영 | onboarding balance 반영 | PASS |
| Lotto Commit | 즉시 참여 가능 여부 | onboarding reward 확보 | signed commit 생성 후 `POST /lotto/commit` | 정상 제출 | 즉시 성공 | PASS |
| Lotto Commit Repeat | 중복 제출 bounded failure | 동일 signed tx | 같은 commit 재전송 | 성공으로 오인하지 않음 | 503 RPC failure로 bounded 처리 | PASS |
| Lotto Entries Read | 참여 내역 조회 | commit 1건 이상 | `GET /lotto/entries` | 엔트리 목록 반환 | 정상 조회 | PASS |
| Lotto Result Negative | 존재하지 않는 결과 조회 차단 | 임의 commitHash | `/lotto/entries/{hash}/result` | 404 | 404 확인 | PASS |
| Lotto Claim Negative | 잘못된 claim 차단 | claim API 존재 | invalid request body 전송 | 400/404 | reject 확인 | PASS |
| Exchange Info Read | 교환 정보 조회 | 인증 지갑 존재 | `GET /exchange/info?address=...` | 정상 응답 | 정상 조회 | PASS |
| Exchange Forbidden | 타 지갑 교환 정보 차단 | 서로 다른 지갑 존재 | A 토큰으로 B 정보 조회 | 403 | 403 확인 | PASS |
| Exchange Invalid | malformed 교환 요청 차단 | exchange API 존재 | invalid body 전송 | 400 | 400 확인 | PASS |
| Mining Blocks Read | 채굴 조회 API 확인 | 인증 지갑 존재 | `GET /mining/blocks?address=...` | 정상 응답 | 빈 목록 포함 정상 응답 | PASS |
| Mining Blocks Invalid | 채굴 page size 경계 검증 | 동일 | `size=0` | 400 | 400 확인 | PASS |
| Exchange Success | funded wallet 교환 성공 | local JACK funding, 인증 지갑 | `grantlocaljack` -> signed exchange -> confirm block | JACK->POT 교환 성공 | funded wallet로 실제 교환 성공 | PASS |
| Claimable Entry Reproduction | mined/indexed claimable entry 생성 | QA miner 주소, commit 다건 생성 가능 | commit 반복 제출 후 비교 블록 18개 채굴 | winning + claimable entry 1건 이상 생성 | `matchCount=1`, `isClaimable=true` 엔트리 생성 | PASS |
| Claim Context Read | claim 서명 컨텍스트 검증 | claimable entry 존재 | `GET /lotto/entries/{commitHash}/claim-context` | payout/pool UTXO 반환 | chain-derived payout/pool inputs 정상 반환 | PASS |
| Claim Success | signed claim relay 성공 | claimable entry, wallet key, claim context | client-side signed `version=5` claim tx 생성 후 `POST /lotto/claim` | claim tx relay 및 반영 성공 | 실제 claim 성공, read model `claimed=true` 반영 | PASS |
| Claim Read Model Sync | claim 후 조회 모델 정합성 | claim 성공 후 | entries/result/activities 재조회 | claimable=false, claimed=true, activity 기록 | 모두 정상 반영 | PASS |
| Refresh Logout | 세션 회전/폐기 검증 | 로그인 세션 존재 | refresh -> logout -> refresh 재시도 | logout 이후 refresh 실패 | 정상 동작 | PASS |
| Duplicate Restore | 중복 복구 경로 검증 | 기존 지갑 존재 | 중복 restore 시도 | 409 | 409 확인 | PASS |
| FE Claim Write Flow | 브라우저 claim write 경로 검증 | FE test/build 가능 | full Vitest + production build | client가 signed claim tx 생성 가능 | `writeFlowService`, `txBuilder`, `npm run build` 모두 통과 | PASS |

# Tests Run

| 명령어 | Passed Tests | Failed Tests | 실패 증상/메시지 | 재현성 |
|---|---|---|---|---|
| `/usr/local/bin/docker compose --env-file .env.local -f docker-compose.local.yml up -d --build` | local stack boot | 0 | 없음 | 환경 재현 가능 |
| `/usr/local/bin/docker compose --env-file .env.local -f docker-compose.local.yml up -d --build backend frontend` | rebuilt backend/frontend images | 0 | 최초 시도 시 FE TypeScript build error 발생, 수정 후 재실행 성공 | 재현 가능 |
| `./gradlew test` | full backend test suite | 0 | 없음 | 재현 가능 |
| `./gradlew test --tests 'ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainHttpRpcClientTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest'` | targeted backend RPC/service/controller tests | 0 | 없음 | 재현 가능 |
| `npm test -- src/services/tx/txBuilder.test.ts src/services/writeFlowService.test.ts` | claim builder/write-flow FE tests | 0 | 초기 TDD 단계에서 API/함수 미구현 실패 후 수정 완료 | 재현 가능 |
| `npm test` | 17 files / 40 FE tests | 0 | `zustand persist` test 환경 경고만 존재, 실패 아님 | 재현 가능 |
| `npm run build` | FE production build | 0 | 최초 시도 시 generic typing mismatch, 수정 후 통과 | 재현 가능 |
| `python3 -m pytest blockchain/tests/test_local_onboarding_bootstrap.py blockchain/tests/test_local_qa_claim_flow.py blockchain/tests/test_rpc_server_onboarding_reward.py -q` | 12 blockchain tests | 0 | 없음 | 재현 가능 |
| `python3 scripts/local_stack_qa.py` | 30 scenario-based local QA checks | 0 | 없음 | 재현 가능 |

# Test Results Summary

- Backend targeted tests: PASS
- Backend full test suite: PASS
- Frontend unit/integration tests: PASS
- Frontend production build: PASS
- Blockchain regression tests: PASS
- Local compose end-to-end QA harness: PASS
- 최종 compose 상태: backend/frontend/node/postgres/rabbitmq/redis healthy

# Failed Tests / Unresolved Issues

최종 미해결 이슈는 없다.

수정 과정에서 해결한 실패 항목:

| 테스트/시나리오 | 실패 원인 | 확인된 원인 | 영향 범위 | 조치 내용 | 현재 상태 |
|---|---|---|---|---|---|
| local claim success 초기 재현 | claim mempool 검증 실패 | mempool `add_tx` 경로에 blockchain context 미전달 | node claim validation, `sendrawtransaction` | `blockchain/mempool/pool.py`, `blockchain/rpc/server.py`, `blockchain/network/node.py` 수정 | 해결 |
| backend read-model sync | coinbase input `vout=4294967295` 파싱 실패 | `int` 범위 초과 DTO 설계 | indexed block 파싱, 활동/동기화 | block input `vout`를 `long`으로 변경 | 해결 |
| backend read-only transaction 오류 | read-only 트랜잭션 안에서 sync insert 발생 | sync service propagation 부적절 | lotto/wallet/mining read path | `BlockchainReadModelSyncService.syncToTip()`를 `REQUIRES_NEW`로 조정 | 해결 |
| FE claim build docker build 실패 | pool UTXO 타입이 `selectUtxos` 제네릭과 불일치 | helper가 `WalletUtxo` 전용 타입으로 고정 | FE production build | `selectUtxos<T>` generic화 | 해결 |

# Risks / Assumptions

- `grantlocaljack`, `mineqablocks`는 local QA 전용 경로이며 운영 환경 계약으로 간주하지 않는다.
- `claim-context`는 private key를 다루지 않으며, 인증된 엔트리 소유자에게만 claim 서명에 필요한 체인 상태를 노출한다.
- 브라우저 수준 수동 클릭 자동화(예: Playwright)는 이번 저장소/도구 범위에 없어서, FE claim write path는 Vitest + production build + local API harness 조합으로 검증했다.
- 잭팟 풀 UTXO는 체인 공개 상태이므로 민감정보로 보지 않았지만, 응답 범위는 claim 가능한 엔트리 소유자 기준으로 제한했다.

# Next Steps

- browser automation 도입이 가능해지면 `/lotto` 페이지의 실제 클릭 흐름을 Playwright로 추가 검증한다.
- local-only QA RPC (`grantlocaljack`, `mineqablocks`) 사용 절차를 runbook으로 분리해 운영 경로와 명확히 구분한다.
- claim-context 응답에 대한 rate limiting/observability를 추가해 과도한 polling을 추적할 수 있게 한다.
