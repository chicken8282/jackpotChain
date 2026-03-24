# Overview

이번 작업에서는 지갑 페이지의 `+` 버튼으로 여는 추가 등록 흐름을 안정화하고, `새 지갑 생성` 경로의 입력 구성을 최초 방문 시 지갑 생성 modal과 동일한 수준으로 맞췄다.

핵심 문제는 추가 지갑 생성 직후 `WalletInfo`가 아직 존재하지 않는 wallet index로 즉시 이동시키면서 렌더 도중 `activeWallet`이 `undefined`가 될 수 있다는 점이었다. 이 흐름을 제거하고, transient invalid index에도 안전하게 렌더되도록 보강했다.

# File & Class Change Log

- `docs/plans/wallet-add-modal-stability-and-create-flow-2026-03-21.md`
  - 본 작업의 구현 계획 문서 작성

- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
  - add-wallet modal create mode에 generated address/private key 표시 추가
  - invalid active index fallback 추가
  - add 완료 직후 out-of-range index로 이동시키던 흐름 제거
  - modal open/close/mode 전환 시 state reset 보강

- `FE-ssatto/src/services/walletAddFormService.ts`
  - create/restore modal submit 검증 및 payload 조립 helper 추가

- `FE-ssatto/src/services/walletAddFormService.test.ts`
  - create payload 생성, restore private key derivation, password validation 테스트 추가

# Cross-Layer Impact Summary

- FE component layer:
  - `WalletInfo` modal UX와 local state transition이 변경되었다.

- FE service/helper layer:
  - add-wallet form validation/payload assembly를 component 밖으로 분리했다.

- BE / RPC / schema:
  - 변경 없음

# Implemented Changes

- 페이지 멈춤 원인 제거
  - `WalletInfo`에서 add 완료 직후 `onChangeIndex(wallets.length)`를 호출하던 흐름을 제거했다.
  - 새 지갑이 실제 store에 반영되기 전 잘못된 index로 렌더 진입하는 문제를 차단했다.

- render safety 보강
  - `activeIndex`가 일시적으로 유효 범위를 벗어나더라도 `resolvedActiveIndex`를 사용해 첫 번째 유효 지갑으로 fallback 하도록 변경했다.
  - `activeTheme`, card visibility, carousel navigation, indicator highlight도 동일한 안전 index를 기준으로 계산한다.

- `+` modal create UX 개선
  - `새 지갑 생성` 선택 시 새 credentials를 미리 생성해 다음 정보를 표시하도록 변경했다.
    - 지갑 주소
    - 개인 키
    - 지갑 비밀번호
    - 비밀번호 확인
  - 최초 방문 시 `WalletCreate` modal과 동일한 핵심 정보를 보이도록 맞췄다.

- form validation 정리
  - create/restore submit 로직을 helper로 분리해 password length, password confirmation, restore private key 입력 여부, create credentials 존재 여부를 일관되게 검증하도록 변경했다.

# Tests Run

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm test`
  - 결과: 통과
  - passed tests:
    - 기존 FE 단위 테스트 전체
    - `src/services/walletAddFormService.test.ts`
  - failed tests: 없음

- `cd /Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto && npm run build`
  - 결과: 통과
  - passed checks:
    - TypeScript build
    - Vite production bundle build
  - failed tests/checks: 없음

# Failed Tests / Unresolved Issues

- 자동화 테스트 실패는 없었다.

- 미해결 수동 검증:
  - 무엇을 테스트했는가:
    - add-wallet modal state/validation logic
    - FE 전체 테스트 및 production build
  - 왜 남아 있는가:
    - 현재 셸 환경에서는 실제 브라우저 상호작용을 직접 재현하지 않았고, 사용자가 첨부한 화면과 동일한 수동 시나리오를 다시 클릭해보지는 못했다.
  - 의심 원인:
    - 기존 freeze는 invalid active index로 인한 FE 렌더 crash 가능성이 가장 높았고, 이번 수정이 그 경로를 제거했다.
  - 영향 범위:
    - 브라우저 수동 검증이 남아 있으므로 실제 사용자 환경에서 freeze가 완전히 사라졌는지는 추가 확인이 필요하다.
  - 다음 개선:
    - `/wallet` 페이지에서 `+ -> 새 지갑 생성 -> 비밀번호 입력 -> 완료` 경로를 브라우저에서 다시 재현해 freeze가 사라졌는지 확인해야 한다.

# Risks / Assumptions

- 가정:
  - `+` modal의 `새 지갑 생성` UX는 최초 방문 시 `WalletCreate` modal과 동일한 정보 구성이면 요구사항을 충족한다.
  - 새 지갑 추가 후 활성 지갑 전환은 parent의 `activeAddress` 동기화에 맡기는 것이 가장 안전하다.

- 리스크:
  - browser-only interaction issue가 다른 원인으로도 존재한다면, 이번 fix만으로 완전히 사라지지 않을 수 있다.
  - `WalletInfo`와 `WalletCreate` 사이의 UI parity는 맞췄지만, 완전한 공용 modal 컴포넌트로 통합하지는 않았기 때문에 장기적으로는 중복 유지 비용이 남는다.

# Next Steps

1. 브라우저에서 `/wallet`의 `+` modal create path를 실제로 다시 검증한다.
2. 필요하면 `WalletCreate`와 `WalletInfo`의 wallet form UI를 공용 컴포넌트로 통합해 중복을 줄인다.
3. 추가로 restore mode도 동일한 수동 경로로 검증해 modal reset 상태가 깨지지 않는지 확인한다.

# Prompt for Next Fix

다음 작업을 이어서 수행해줘.

현재 상태:
- `WalletInfo`의 add-wallet modal은 create mode에서 generated address/private key/password/passwordConfirm을 표시한다.
- add 완료 직후 invalid wallet index로 이동시키던 흐름은 제거되었고, `resolvedActiveIndex` fallback이 추가되었다.
- FE 자동화 테스트와 build는 통과했다.

현재 남은 확인 항목:
- 실제 브라우저에서 `/wallet` -> `+` -> `새 지갑 생성` -> 비밀번호 입력 -> 완료 시 freeze가 완전히 사라졌는지 수동 확인이 필요하다.
- restore path에서도 modal reset 및 submit behavior가 정상인지 수동 검증이 필요하다.

의심 원인:
- 기존 freeze는 `WalletInfo`가 존재하지 않는 active index로 즉시 이동하면서 발생한 렌더 crash였을 가능성이 높다.
- 만약 여전히 freeze가 남아 있다면, modal animation lifecycle 또는 parent async update timing을 추가로 봐야 한다.

우선 확인할 파일:
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- `FE-ssatto/src/services/walletAddFormService.ts`
- `FE-ssatto/src/pages/WalletPage.tsx`

필요한 수정 방향:
1. 브라우저 수동 재현 후 여전히 freeze가 남으면 정확한 클릭 시점과 콘솔 에러를 확인
2. 필요하면 add modal open/close animation과 async submit state를 분리
3. 장기적으로는 `WalletCreate`와 `WalletInfo`의 wallet form modal을 공용 컴포넌트로 통합

반드시 통과해야 할 테스트:
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`

남은 spec 제약:
- user-facing text는 한국어 유지
- private key는 FE 내부에서만 다룰 것
- raw mock data를 page component에 직접 넣지 말 것
- component/page/service 책임 경계를 유지할 것
