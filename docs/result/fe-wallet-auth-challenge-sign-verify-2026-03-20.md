# Overview

- FE 지갑 생성/복구를 mock `0x...` 방식에서 blockchain 규칙 기반 주소 생성으로 전환했다.
- `WalletPage` 로그인 흐름을 `POST /v1/auth/token`에서 `challenge -> sign -> verify` 방식으로 전환했다.
- `docs/reviews/auth.md`를 현재 구조 기준으로 다시 작성했다.
- `AGENTS.md`는 워크스페이스에 없어서 적용하지 못했다.

# File & Class Change Log

- `FE-ssatto/package.json`
  - `@noble/curves`, `@noble/hashes`, `@scure/base`, `vitest` 추가
- `FE-ssatto/src/lib/crypto/hash.ts`
  - SHA-256, double SHA-256, HASH160 유틸 추가
- `FE-ssatto/src/lib/crypto/base58.ts`
  - Base58Check 인코딩/디코딩 유틸 추가
- `FE-ssatto/src/lib/crypto/address.ts`
  - compressed public key -> JackpotChain 주소 변환 추가
- `FE-ssatto/src/lib/crypto/signature.ts`
  - private key 정규화, 공개키 유도, auth 메시지 DER 서명 추가
- `FE-ssatto/src/lib/crypto/wallet.ts`
  - 지갑 생성/복구용 credential 파생 추가
- `FE-ssatto/src/services/walletAuthFlowService.ts`
  - challenge 요청, FE 서명, verify 호출 흐름 캡슐화
- `FE-ssatto/src/components/wallet/WalletCreate.tsx`
  - 실제 지갑 생성/복구 UI로 전환
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
  - 지갑 추가 모달을 실제 생성/복구 흐름으로 전환
- `FE-ssatto/src/pages/WalletPage.tsx`
  - 활성 지갑 변경 시 challenge-sign-verify 로그인 적용
- `FE-ssatto/src/stores/useWalletStore.ts`
  - mock fallback 제거
- `FE-ssatto/src/lib/crypto/wallet.test.ts`
  - 주소 파생 및 DER 서명 테스트 추가
- `FE-ssatto/src/services/walletAuthFlowService.test.ts`
  - challenge -> verify 연결 테스트 추가
- `docs/reviews/auth.md`
  - 새 인증 구조와 설계 이유 기준으로 재작성

# Cross-Layer Impact Summary

- FE
  - Wallet 생성/복구 UI, 상태 저장, 인증 API 호출 흐름 변경
- BE
  - 기존 challenge/verify 계약을 그대로 사용했고 코드 변경은 없었다
- Blockchain
  - 주소 규칙과 서명 규칙을 FE에서 동일하게 따르도록 맞췄다

# Implemented Changes

- FE에서 private key로 compressed public key와 Base58Check 주소를 계산하도록 변경했다.
- 지갑 복구는 address 직접 입력 대신 private key만 받아 주소를 재계산하도록 바꿨다.
- `WalletPage`는 활성 지갑 변경 시 `walletAuthFlowService.loginWithWallet()`을 호출해 challenge 발급, 메시지 서명, verify를 수행한다.
- 인증 중/실패 상태를 한국어 메시지로 노출하도록 추가했다.
- FE 테스트를 추가해 고정 private key 기준 주소 파생과 verify 요청 연결을 검증했다.
- 설계 문서 `docs/reviews/auth.md`를 현재 운영 흐름 기준으로 간결하게 다시 작성했다.

# Tests Run

- `cd FE-ssatto && npm test`
  - 최초 실패
  - 실패 테스트
    - `src/lib/crypto/wallet.test.ts`
    - `src/services/walletAuthFlowService.test.ts`
  - 실패 증상
    - 초기에는 `src/lib/crypto/wallet.ts`, `src/services/walletAuthFlowService.ts`가 없어 모듈 import 실패
    - 구현 후에는 ECDSA 서명을 고정 hex 값으로 가정한 테스트가 실패
  - 재현성
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm test`
  - 최종 통과
  - passed tests
    - `src/lib/crypto/wallet.test.ts`
    - `src/services/walletAuthFlowService.test.ts`
  - failed tests
    - 없음
  - 재현성
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm run build`
  - 최종 통과
  - passed tests
    - TypeScript build
    - Vite production build
  - failed tests
    - 없음
  - 참고 증상
    - bundle chunk size warning만 존재
  - 재현성
    - 로컬에서 재현 가능
- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest'`
  - 최종 통과
  - passed tests
    - `AuthControllerTest`
    - `AuthServiceTest`
  - failed tests
    - 없음
  - 재현성
    - 로컬에서 재현 가능

# Failed Tests / Unresolved Issues

- 최종 실패 테스트는 없음
- 남은 이슈
  - 무엇을 테스트했는지
    - FE 지갑 생성/복구, challenge-sign-verify 연계, FE build, BE auth 계약
  - 왜 아직 남는지
    - private key 저장은 아직 Zustand persist 기반이라 브라우저 저장 보호가 충분하지 않다
  - suspected root cause
    - 이번 작업 범위를 mock 제거와 실제 인증 전환에 한정했고, keystore 암호화 단계는 분리했다
  - impact scope
    - 브라우저 로컬 저장 보안
  - what should be improved next
    - private key를 암호화 keystore 또는 더 안전한 저장소 구조로 이전

# Risks / Assumptions

- FE는 현재도 private key를 클라이언트 저장소에 보관한다.
- 이번 작업은 소유권 증명 없는 로그인 문제를 우선 제거하는 단계다.
- ECDSA 서명 바이트열 자체는 구현별 차이가 있을 수 있으므로, 계약상 핵심은 고정 서명값 일치가 아니라 BE 검증 통과 여부라고 가정했다.

# Next Steps

- FE private key 저장 방식을 평문 persist에서 암호화 keystore로 전환
- access token 만료 시 refresh 전략 연결
- 교환/로또 쓰기 흐름에도 동일한 클라이언트 서명 패턴 적용

# Prompt for Next Fix

`Read AGENTS.md if present, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, and docs/reviews/auth.md first.

Task:
FE 지갑의 private key가 아직 Zustand persist에 평문으로 저장되고 있으니, FE-ssatto에서 암호화 keystore 기반 저장으로 전환해줘. WalletPage / wallet store / auth flow가 깨지지 않게 유지하고, challenge -> sign -> verify 로그인은 계속 동작해야 해.

Likely files/layers involved:
- FE-ssatto/src/stores/useWalletStore.ts
- FE-ssatto/src/components/wallet/WalletCreate.tsx
- FE-ssatto/src/components/wallet/WalletInfo.tsx
- FE-ssatto/src/pages/WalletPage.tsx
- FE-ssatto/src/lib/crypto/*
- FE-ssatto/src/services/walletAuthFlowService.ts

Current failing behavior:
- 로그인은 정상 동작하지만 private key가 브라우저 저장소에 그대로 남는다.

Suspected cause:
- 현재 store가 wallet 객체에 privateKey를 직접 넣고 persist middleware로 그대로 저장한다.

Required fixes:
- 사용자 비밀번호 또는 앱 전용 passphrase 기반 keystore 암호화 도입
- 복호화 후에만 서명 수행
- 페이지/컴포넌트에 raw private key 직접 전달 최소화
- mock 데이터 없이 기존 challenge-sign-verify 흐름 유지

Tests that must pass:
- FE crypto/address/auth flow tests
- keystore encrypt/decrypt unit tests
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- 필요 시 BE auth 관련 smoke test

Remaining spec constraints:
- 모든 사용자 노출 텍스트는 한국어
- private key는 서버로 보내지 않음
- page/widget/entity/service/adapter/mock 분리 유지
- raw mock data를 page에 직접 넣지 않음` 
