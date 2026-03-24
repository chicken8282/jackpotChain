# Overview

- FE Wallet/Lotto 화면에서 client-side private key로 signed TX를 생성한 뒤 BE write API로 제출하는 흐름을 추가했다.
- BE에 보호된 UTXO 조회 API를 추가해 FE가 address 기준 UTXO를 읽고 `version=2` 교환 TX, `version=3` 로또 참여 TX를 조립할 수 있게 했다.
- `version=5` 로또 claim은 현재 활성 blockchain 구현이 자동 지급 방식과 수동 claim 설계가 충돌해 end-to-end 구현이 불가능함을 코드 기준으로 확인했고, FE에서는 오동작 대신 명시적 오류로 차단했다.

# File & Class Change Log

- FE
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/pages/LottoPage.tsx`
  - `FE-ssatto/src/components/wallet/WalletInfo.tsx`
  - `FE-ssatto/src/components/lotto/HexPicker.tsx`
  - `FE-ssatto/src/services/walletService.ts`
  - `FE-ssatto/src/services/writeFlowService.ts`
  - `FE-ssatto/src/services/writeFlowService.test.ts`
  - `FE-ssatto/src/services/tx/txCodec.ts`
  - `FE-ssatto/src/services/tx/txBuilder.ts`
  - `FE-ssatto/src/services/tx/txBuilder.test.ts`
- BE
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainUnspentOutput.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/dto/WalletUtxoItemResponse.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/dto/WalletUtxoListResponse.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClientTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java`
- Blockchain
  - `blockchain/rpc/server.py`

# Cross-Layer Impact Summary

- FE page/widget
  - placeholder `window.alert(...)` 기반 write 버튼을 실제 async flow로 교체했다.
  - 사용자 문구는 모두 한국어로 유지했다.
- FE service/adapter
  - `walletService`에 보호된 UTXO 조회 어댑터를 추가했다.
  - `txCodec`와 `txBuilder`에서 JackpotChain 직렬화, P2PKH script, OP_RETURN, sighash, secp256k1 DER 서명을 구현했다.
  - `writeFlowService`에서 page와 low-level builder 의존성을 분리했다.
- BE API
  - `GET /api/v1/wallet/{address}/utxos` 추가
  - 인증 주체와 요청 address 일치 검증 유지
  - Controller -> Service -> RPC Client 경계를 유지
- Blockchain
  - `listunspent` 응답에 `is_coinbase`를 포함시켜 FE가 미성숙 coinbase 사용을 회피할 수 있게 했다.

# Implemented Changes

- Wallet 교환 흐름
  - 활성 지갑이 unlock + authenticated 상태일 때만 교환 요청 가능
  - 기본 교환 단위는 100 JACK
  - FE는 UTXO 조회 후 `version=2` TX를 생성하고 서명한 뒤 `POST /api/v1/exchange/jack-to-pot`로 전송
  - 성공/실패 상태를 Wallet 화면 한국어 문구로 노출
- Lotto 참여 흐름
  - 활성 지갑이 unlock + authenticated 상태일 때만 참여 가능
  - FE는 POT UTXO와 JACK fee UTXO를 분리 선택해 `version=3` TX 생성
  - 성공 시에만 성공 모달 표시
  - 실패는 컴포넌트 notice로 한국어 노출
- Claim 처리
  - FE는 claim 버튼 호출 시 즉시 “현재 체인 노드는 자동 지급 방식이라 수령 트랜잭션을 지원하지 않습니다.” 오류를 반환
  - 이유: 현재 `blockchain/rpc/server.py`에는 `lottoclaim` RPC가 없고, `blockchain/gacha/service.py`에도 `create_claim` 구현이 존재하지 않음

# Tests Run

- 명령어
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainHttpRpcClientTest'`
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 - <<'PY' ... pytest blockchain/tests/test_e2e_lotto.py::TestLottoE2E::test_exchange_jack_to_pot -q timeout=20s ... PY`
  - `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && docker --version`
- 통과한 테스트
  - FE vitest 12 files / 28 tests passed
  - FE production build passed
  - BE 전체 gradle test passed
  - BE 신규 UTXO contract/controller/rpc parsing targeted tests passed
- 실패한 테스트
  - docker 확인 실패: `zsh:1: command not found: docker`
  - blockchain pytest single scenario timeout: `TIMEOUT after 20s`
- 실패 증상 요약
  - docker는 실행 파일 자체가 없음
  - blockchain e2e는 채굴 루프 때문에 20초 제한 안에 종료되지 않음
- 재현성
  - docker 부재는 현재 환경에서 100% 재현 가능
  - blockchain pytest timeout은 현재 로컬 성능/난이도/채굴 루프 조건에서 재현 가능하며 환경 의존적임

# Failed Tests / Unresolved Issues

- 항목 1
  - 무엇을 테스트했는가: docker 기반 live write smoke 실행 가능 여부
  - 왜 실패했는가: 현재 실행 환경에 `docker` 바이너리가 없음
  - 의심 원인: Codex desktop 실행 환경이 container runtime을 제공하지 않음
  - 영향 범위: 실제 node + backend + frontend live HTTP write smoke 미실행
  - 다음 개선점: docker 사용 가능한 환경에서 compose/node 실행 후 curl 또는 스크립트 smoke 추가
- 항목 2
  - 무엇을 테스트했는가: blockchain exchange e2e pytest 단일 시나리오
  - 왜 실패했는가: 20초 제한 내 종료되지 않아 timeout
  - 의심 원인: 테스트가 110블록 이상 채굴을 포함하고 난이도/nonce 탐색 시간이 큼
  - 영향 범위: blockchain repo 내부 통합 시나리오를 현재 세션에서 완료 확인하지 못함
  - 다음 개선점: 테스트 전용 난이도/nonce 축소 fixture 또는 fast-mode 추가
- 항목 3
  - 무엇을 테스트했는가: FE claim signed TX end-to-end 구현 가능 여부
  - 왜 실패했는가: 활성 blockchain RPC에 `lottoclaim` 메서드가 없고 service 계층에도 `create_claim` 구현이 없음
  - 의심 원인: 문서/API는 수동 claim 계약을 유지하지만 실제 chain은 자동 지급 방식으로 이동한 뒤 정합성 정리가 끝나지 않음
  - 영향 범위: `version=5` claim TX 생성 및 `POST /api/v1/lotto/claim`의 실제 온체인 성공 여부를 보장할 수 없음
  - 다음 개선점: blockchain/BE/API 스펙을 한 방향으로 정리해야 함. 자동 지급 유지면 claim API 제거, 수동 claim 유지면 chain RPC/validation/create_claim 구현 필요

# Risks / Assumptions

- FE tx builder는 현재 node의 P2PKH/OP_RETURN/varint/signature hash 규칙을 기준으로 작성했다.
- FE는 asset가 섞인 JACK UTXO를 교환 입력으로 쓰지 않도록 제한했다. 이는 의도치 않은 asset 소실을 막기 위한 보수적 선택이다.
- coinbase maturity 회피를 위해 `listunspent.is_coinbase`를 사용하며, 현재 node 응답이 구버전이면 기본값 `false`로 처리된다.
- claim mismatch는 완전히 제거되지 않았다. 현재는 오동작 대신 명시적 차단 상태다.

# Next Steps

- docker 가능한 환경에서 node/backend/frontend를 함께 띄운 뒤 실제 write smoke를 추가한다.
- blockchain 테스트용 fast mining fixture를 만들어 20초 내 통합 시나리오가 끝나게 한다.
- claim 정책을 자동 지급 또는 수동 claim 중 하나로 확정하고, FE/BE/API/chain을 동일 계약으로 맞춘다.

# Prompt for Next Fix

다음 작업을 진행해줘.

목표:
- blockchain claim 정책 불일치를 제거하고 live write smoke까지 완료해줘.

현재 failing behavior:
- `blockchain/rpc/server.py`에는 `lottoclaim` RPC가 없고, `blockchain/gacha/service.py`에도 `create_claim` 구현이 없어 FE/BE claim write flow를 실제로 끝까지 검증할 수 없다.
- docker 실행 환경이 없어 live node smoke test가 비어 있다.
- `blockchain/tests/test_e2e_lotto.py`는 채굴 시간이 길어 현재 로컬 제한 시간 안에 끝나지 않는다.

Likely files/layers involved:
- `blockchain/rpc/server.py`
- `blockchain/gacha/service.py`
- `blockchain/validation/transaction.py`
- `blockchain/docs/adr/ADR-001-claim-validation.md`
- `docs/reviews/api.md`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
- `FE-ssatto/src/services/writeFlowService.ts`
- docker/compose 또는 smoke script 추가 위치

Suspected cause:
- API/BE는 수동 claim 계약을 유지하지만 실제 chain은 자동 지급 쪽으로 구현되어 있다.
- blockchain e2e는 테스트 전용 난이도/nonce 최적화가 없어 실행 시간이 길다.

Required fixes:
- claim 정책을 자동 지급 또는 수동 claim 중 하나로 확정
- 수동 claim 유지 시: `lottoclaim` RPC, `create_claim`, validation, payout path, FE/BE claim flow 전부 구현
- 자동 지급 유지 시: FE/BE/API에서 claim UI/API/DTO를 제거하거나 비활성 계약으로 정리
- docker 가능한 환경에서 실제 node/backend write smoke script 추가
- blockchain e2e를 빠르게 끝낼 수 있는 테스트 전용 설정 추가

Tests that must pass:
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto && ./gradlew test`
- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202 && python3 -m pytest blockchain/tests/test_e2e_lotto.py -q`
- docker 가능한 환경에서 write smoke command 또는 script pass

Remaining spec constraints:
- Controller -> RPC direct call 금지
- private key 저장 금지 / 서버 전송 금지
- uncertain RPC result를 성공으로 처리 금지
- FE user-facing text는 한국어 유지
- page/widget/entity/service/adapter/mock 분리 유지
