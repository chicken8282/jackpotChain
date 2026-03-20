# Overview

- `MiningPage`의 cursor append UX를 보강해 수동 버튼만 있던 흐름을 자동 이어불러오기 보조 + 최신 위치 복귀 흐름으로 확장했다.
- 프론트 라우트를 `React.lazy`로 분리하고 Vite manual chunk를 추가해 기존 단일 main chunk 경고 패턴을 해소했다.
- 변경된 build 설정이 Docker 이미지에서도 깨지지 않는지 `docker-compose.local.yml` 기준으로 다시 검증했다.

# File & Class Change Log

- `docs/plans/fe-mining-ux-chunk-splitting-2026-03-21.md`
  - 이번 follow-up 작업의 범위, 실패 모드, 검증 기준 문서 추가
- `FE-ssatto/src/hooks/useMiningBlocks.ts`
  - `appendedBlockCount`, `latestBlockHeight` 상태 노출 추가
- `FE-ssatto/src/components/mining/MinedBlocks.tsx`
  - 자동 이어불러오기 sentinel, 최신 위치 복귀 CTA, pagination 상태 문구 추가
- `FE-ssatto/src/pages/MiningPage.tsx`
  - mining hook 확장 상태를 mining widget에 연결
- `FE-ssatto/src/App.tsx`
  - page route를 lazy import + `Suspense` fallback 구조로 변경
- `FE-ssatto/vite.config.ts`
  - `react`, `motion`, `crypto` manual chunk 분리 추가

# Cross-Layer Impact Summary

- FE
  - mining read flow는 첫 페이지 polling을 유지하면서 UX만 개선됐다.
  - route-level lazy loading으로 초기 진입 번들이 줄었다.
- BE
  - 이번 턴에서 API 계약과 mining 조회 로직은 변경하지 않았다.
- Infra
  - 프론트 build 설정이 바뀌었으므로 local compose build를 다시 수행해 이미지 생성과 기동을 확인했다.

# Implemented Changes

- mining pagination UX 개선
  - 하단 sentinel이 보이면 이전 채굴 블록을 자동으로 이어서 불러오도록 했다.
  - 수동 버튼은 fallback으로 유지해 자동 append 실패나 사용자의 명시적 상호작용도 지원한다.
  - “최신 1페이지 자동 동기화”, “최신 높이”, “이전 블록 n개 이어서 확인 중” 상태 배지를 추가했다.
  - append된 페이지를 보고 있을 때 “최신 블록 위치로 이동” 버튼으로 좌측 최신 영역으로 복귀할 수 있게 했다.
- frontend bundle 분할
  - `App.tsx`에서 `DashboardPage`, `LottoPage`, `WalletPage`, `MiningPage`를 lazy import로 전환했다.
  - `Suspense` fallback을 추가해 route chunk loading 중 빈 화면이 나오지 않도록 했다.
  - `vite.config.ts`에서 `react`, `motion`, `crypto` manual chunk를 분리했다.
  - 결과적으로 기존 `dist/assets/index-*.js` 단일 541kB 경고 패턴이 `index 221kB + route/vendor chunk` 구성으로 바뀌었다.
- 관련 spec 체크
  - `frontend-spec.md`: 사용자 문구는 한국어를 유지했고 page/widget/hook/build 책임을 분리했다.
  - `backend-spec.md`: mining API 계약, miner control, private key 저장, controller 경계는 건드리지 않았다.
  - `infra-spec.md`: local compose 정적 검증과 재기동을 수행했고 miner 컨테이너는 추가하지 않았다.
  - `blockchain.md`: 채굴 실행 제어 없이 체인 반영 결과 조회 UX만 개선했다.

# Tests Run

- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && cd FE-ssatto && npm test`
  - 통과
  - passed tests
    - 10개 test file
    - 21개 test
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
    - 기존 large main chunk warning이 더 이상 출력되지 않았고 route/vendor split 결과가 생성됨
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
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml ps`
  - 통과
  - passed tests
    - backend healthy
    - jackpotchain-node healthy
    - frontend container started and serving HTML
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - `ps` 시점에는 frontend health가 `starting` 상태였지만 곧바로 정적 HTML 응답은 정상 확인됨
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
    - local 검증 후 컨테이너 및 네트워크 정리 완료
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능

# Failed Tests / Unresolved Issues

- 최종 실패 테스트는 없다.
- 남은 개선 포인트
  - what was tested
    - mining append UX와 frontend build chunk split
  - why it failed
    - 실패는 없었음
  - suspected root cause
    - 해당 없음
  - impact scope
    - 해당 없음
  - what should be improved next
    - 자동 append가 사용자의 viewport 높이에 따라 연속으로 여러 페이지를 가져올 수 있으므로, 필요하면 “한 번에 n페이지까지만 자동 로드” 같은 상한을 둘 수 있다.

# Risks / Assumptions

- 자동 append는 sentinel이 계속 화면 안에 있으면 연속으로 다음 cursor를 요청할 수 있다. 현재는 `isLoadingMore`, `hasNext`, `nextCursor` 가드로 중복 요청은 막지만, 매우 큰 화면에서는 여러 페이지가 빠르게 이어서 열릴 수 있다.
- 첫 페이지 polling과 과거 페이지 append를 병행하므로, 체인 상태가 빠르게 변하면 사용자가 보는 과거 페이지 경계가 약간 달라질 수 있다. 현재는 `blockId` dedupe로 중복 노출만 방지한다.
- manual chunk 전략은 현재 의존성 규모에 맞춘 보수적 분리다. 추후 페이지별 도메인 코드가 더 커지면 추가 route split 또는 vendor regrouping이 필요할 수 있다.

# Next Steps

- `MinedBlocks` auto append에 회수 제한 또는 사용자 설정 토글 추가
- `WalletPage`, `LottoPage`에서도 heavy widget 단위 split이 필요한지 build report 기준으로 추가 확인
- populated mining data 시나리오에서 append UX를 실제 데이터로 한번 더 확인

# Prompt for Next Fix

`Read AGENTS.md if present, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, docs/reviews/api.md, docs/reviews/blockchain.md, and docs/result/fe-mining-ux-chunk-splitting-2026-03-21.md first.

Task:
Refine the mining append UX and continue frontend bundle optimization with real usage constraints. Focus on adding bounded auto-append behavior and identifying the next largest FE chunk after route splitting.

Likely files/layers involved:
- FE-ssatto/src/components/mining/MinedBlocks.tsx
- FE-ssatto/src/hooks/useMiningBlocks.ts
- FE-ssatto/vite.config.ts
- FE-ssatto/src/App.tsx
- FE-ssatto/src/pages/WalletPage.tsx

Current failing behavior:
- Mining auto-append can keep requesting additional pages while the sentinel remains visible on large screens.
- The main entry chunk warning is gone, but `WalletPage` and `motion` chunks are still relatively large.

Suspected cause:
- The current auto-append trigger does not enforce a per-viewport or per-session cap.
- Route splitting alone does not reduce heavy page internals.

Required fixes:
- Add a bounded auto-append policy with a clear Korean UX fallback.
- Profile the remaining larger frontend chunks and split only where it is safe.
- Keep mining API contracts unchanged.
- Keep user-facing text in Korean.

Tests that must pass:
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- If build config changes affect Docker output:
  - `docker compose --env-file .env.local -f docker-compose.local.yml config`
  - `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`

Remaining spec constraints:
- Frontend page/widget/service separation must remain clear
- No raw mock data directly in page components
- Backend remains read-only for mining queries
- Never control miner processes
- Do not treat uncertain RPC results as success`
