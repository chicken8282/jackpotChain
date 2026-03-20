# Overview

- 채굴 페이지의 자동 이어불러오기에 고정 상한을 도입해 large viewport에서 cursor 요청이 연속으로 이어지는 문제를 제거했다.
- `WalletPage` 내부 섹션과 모달을 nested lazy loading으로 분리해 wallet route chunk를 더 줄였다.
- 변경된 frontend build가 Docker 이미지에서도 동일하게 통과하는지 `docker-compose.local.yml` 기준으로 다시 검증했다.

# File & Class Change Log

- `docs/plans/fe-mining-wallet-bounded-pagination-2026-03-21.md`
  - bounded auto-append와 wallet nested split 구현 계획 문서 추가
- `FE-ssatto/src/hooks/miningPaginationHelpers.ts`
  - auto-append 가능 여부 계산 helper 추가
- `FE-ssatto/src/hooks/miningPaginationHelpers.test.ts`
  - auto-append 상한 helper 테스트 추가
- `FE-ssatto/src/hooks/useMiningBlocks.ts`
  - auto/manual append 분리
  - `MAX_AUTO_APPEND_PAGES`
  - `autoAppendCount`
  - `isAutoAppendBlocked`
  - `maxAutoAppendPages` 노출 추가
- `FE-ssatto/src/components/mining/MinedBlocks.tsx`
  - auto-append 상한 상태 배지
  - observer 차단 조건
  - 수동 fallback CTA 문구 추가
- `FE-ssatto/src/pages/MiningPage.tsx`
  - bounded auto-append 상태를 mining widget에 연결
- `FE-ssatto/src/pages/WalletPage.tsx`
  - `WalletCreate`, `WalletInfo`, `ActivityList`, `WalletMigrationModal`, `WalletUnlockModal` nested lazy loading 추가
  - wallet section fallback UI 추가

# Cross-Layer Impact Summary

- FE
  - mining read UX는 첫 페이지 polling을 유지한 채 auto append가 고정 회수 내에서만 동작하도록 바뀌었다.
  - wallet route는 내부 섹션과 modal chunk가 분리돼 route payload가 더 작아졌다.
- BE
  - 이번 턴에서 API 계약, mining read flow, backend 로직은 변경하지 않았다.
- Infra
  - frontend build 결과가 바뀌었으므로 local compose build와 기동을 다시 확인했다.

# Implemented Changes

- bounded mining auto-append
  - auto append는 최대 2회까지만 실행되도록 제한했다.
  - 상한에 도달하면 observer 기반 자동 로드는 중단되고, 사용자는 “이전 채굴 블록 직접 더 보기” 버튼으로만 이어서 조회한다.
  - UI에는 “자동 이어보기 n/2” 상태와 “자동 이어보기 한도에 도달했습니다” 문구를 추가했다.
  - 첫 페이지 polling, 중복 block dedupe, manual load more는 그대로 유지했다.
- wallet nested lazy loading
  - `WalletPage`에서 secondary section과 modal import를 lazy화했다.
  - 초기 route chunk에서 분리된 결과:
    - `WalletPage` 86.38 kB → 54.59 kB
    - `WalletInfo` 13.75 kB
    - `WalletCreate` 9.73 kB
    - `ActivityList` 2.16 kB
    - `WalletUnlockModal` 2.72 kB
    - `WalletMigrationModal` 3.22 kB
  - route-level split 이후 다음 큰 page chunk였던 `WalletPage`를 추가로 줄였고, shared vendor 중에서는 `motion` chunk가 가장 큰 상태로 남았다.
- 관련 spec 체크
  - `frontend-spec.md`: 사용자 문구는 한국어를 유지했고 page/hook/widget 분리를 유지했다.
  - `backend-spec.md`: mining query는 read-only 상태를 유지했고 miner control이나 backend contract 변경은 하지 않았다.
  - `infra-spec.md`: local compose 정적 검증과 image build를 다시 수행했고 miner 컨테이너는 추가하지 않았다.
  - `blockchain.md`: 채굴 실행이 아닌 체인 반영 결과 조회 UX만 보강했다.

# Tests Run

- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && cd FE-ssatto && npm test`
  - 통과
  - passed tests
    - 10개 test file
    - 22개 test
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - 로컬에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && cd FE-ssatto && npm run build`
  - 통과
  - passed tests
    - TypeScript build
    - Vite production build
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - wallet nested lazy loading 후 chunk가 추가 분리되었고 large chunk warning은 발생하지 않았다
  - whether failures are reproducible or environment-dependent
    - 로컬에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml config`
  - 통과
  - passed tests
    - compose 정적 검증
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
  - 통과
  - passed tests
    - frontend image build
    - backend image build
    - jackpotchain-node image build
    - container startup
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - FE image build에서도 lazy-split된 bundle이 정상 생성됨
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml ps`
  - 통과
  - passed tests
    - backend healthy
    - jackpotchain-node healthy
    - frontend container started and HTML serving 가능
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - `ps` 확인 시점에는 frontend health가 `starting` 상태였지만 즉시 HTML 응답은 정상 확인됨
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능
- `curl -sf http://localhost:3000/ | head -n 5`
  - 통과
  - passed tests
    - frontend index HTML 응답 확인
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - local compose 환경 의존
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml down`
  - 통과
  - passed tests
    - 검증 후 컨테이너 및 네트워크 정리 완료
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능

# Failed Tests / Unresolved Issues

- 최종 실패 테스트는 없다.
- 미해결 이슈도 없다.

# Risks / Assumptions

- 없음

# Next Steps

- 없음

# Prompt for Next Fix

- 없음
