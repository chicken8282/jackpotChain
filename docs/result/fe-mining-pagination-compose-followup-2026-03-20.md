# Overview

- `MiningPage`에 cursor 기반 “더 불러오기”를 추가해 첫 페이지 polling과 추가 페이지 append를 함께 지원하도록 바꿨다.
- `docker-compose.local.yml` smoke verification을 실제 Docker 환경에서 다시 수행했다.
- compose 재시도 과정에서 FE Docker build가 테스트 파일 포함 문제로 실패하는 것을 확인했고, `tsconfig.app.json`에서 테스트 파일을 빌드 대상에서 제외해 해결했다.

# File & Class Change Log

- `docs/plans/fe-mining-pagination-compose-followup-2026-03-20.md`
  - follow-up scope, failure modes, validation plan 문서 추가
- `FE-ssatto/src/hooks/miningPaginationHelpers.ts`
  - mining page cursor slice 매핑과 block dedupe merge helper 추가
- `FE-ssatto/src/hooks/miningPaginationHelpers.test.ts`
  - mining pagination helper 테스트 추가
- `FE-ssatto/src/hooks/useMiningBlocks.ts`
  - 첫 페이지 polling + 추가 페이지 append + `hasNext` + `loadMore` + `isLoadingMore` 지원 추가
- `FE-ssatto/src/components/mining/MinedBlocks.tsx`
  - “이전 채굴 블록 더 보기” 버튼, local error 표시, 누적 보상 props 확장
- `FE-ssatto/src/pages/MiningPage.tsx`
  - mining hook의 pagination 상태를 UI에 연결
- `FE-ssatto/tsconfig.app.json`
  - production build에서 `*.test.ts(x)` 제외 추가

# Cross-Layer Impact Summary

- FE
  - mining read flow가 단순 첫 페이지 조회에서 cursor append 가능한 상태로 확장됐다.
  - 첫 페이지는 계속 polling되고, 추가 페이지는 수동 fetch 후 dedupe merge된다.
- BE
  - 이번 턴에서는 mining API 계약 변경이 없었다.
- Infra
  - Docker compose 정적 검증, build, 기동, health, 보호 API smoke call까지 실제로 수행했다.

# Implemented Changes

- `useMiningBlocks`를 단순 polling hook wrapper에서 mining-specific stateful hook으로 확장했다.
  - first page polling 유지
  - appended page state 보관
  - `nextCursor`, `hasNext`, `loadMore`, `isLoadingMore` 지원
  - `blockId` 기준 dedupe merge 적용
- `MinedBlocks`에 더보기 CTA를 추가했다.
  - 더 불러올 데이터가 있으면 “이전 채굴 블록 더 보기”
  - 없으면 종료 상태 문구 표시
  - 추가 fetch 실패 시 한국어 오류 박스 표시
- Docker compose 재검증 중 FE image build가 실패한 원인을 수정했다.
  - 원인: `src/lib/crypto/wallet.test.ts`가 production TypeScript build에 포함되며 컨테이너 밖 경로 `docs/fixtures/wallet_vectors.json`을 참조
  - 조치: `tsconfig.app.json`에서 `src/**/*.test.ts`, `src/**/*.test.tsx`를 제외
- 관련 spec 체크
  - `frontend-spec.md`: page/component/hook/service 분리를 유지했고 사용자 텍스트는 한국어로 유지했다.
  - `backend-spec.md`: miner control, private key 저장, controller -> RPC direct call은 추가하지 않았다.
  - `infra-spec.md`: `docker-compose.local.yml` 검증과 기동을 수행했고 miner 컨테이너를 추가하지 않았다.
  - `blockchain.md`: 채굴은 조회만 유지하고 실행 제어는 하지 않았다.

# Tests Run

- `cd FE-ssatto && npm test -- src/hooks/miningPaginationHelpers.test.ts`
  - 통과
  - passed tests
    - `src/hooks/miningPaginationHelpers.test.ts`
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - 로컬에서 재현 가능
- `cd FE-ssatto && npm test`
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
- `cd FE-ssatto && npm run build`
  - 통과
  - passed tests
    - TypeScript build
    - Vite production build
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - build는 성공, main chunk size warning만 존재
  - whether failures are reproducible or environment-dependent
    - 로컬에서 재현 가능
- `cd BE-ssatto && ./gradlew test`
  - 통과
  - passed tests
    - backend 전체 테스트 스위트
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
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
  - 최초 실패 후 재통과
  - passed tests
    - jackpotchain-node image build
    - backend image build
    - frontend image build
    - container startup
  - failed tests
    - 최초 시도 1회
  - brief failure symptoms/messages
    - 최초 실패: `src/lib/crypto/wallet.test.ts`가 FE Docker production build에 포함되며 `../../../../docs/fixtures/wallet_vectors.json` import 실패
    - 수정 후 재시도에서는 `frontend`, `backend`, `jackpotchain-node` 포함 전체 stack 기동 성공
  - whether failures are reproducible or environment-dependent
    - 최초 실패는 코드/설정 문제로 재현 가능
    - 최종 통과는 Docker가 있는 환경에서 재현 가능
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml ps`
  - 통과
  - passed tests
    - `jc-backend-local` healthy
    - `jc-frontend-local` healthy
    - `jc-node-local` healthy
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능
- `curl -sf http://localhost:18080/actuator/health`
  - 통과
  - passed tests
    - backend actuator health `{"status":"UP"}`
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - local compose 환경 의존
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
- `curl -sf -X POST http://localhost:8332 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"getblockcount","id":1}'`
  - 통과
  - passed tests
    - node RPC 응답 `result: 1985`
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - local compose 환경 의존
- protected API smoke calls
  - 준비 단계
    - 테스트용 JWT를 로컬 secret으로 생성
    - `POST /api/v1/wallet`로 smoke wallet 등록
  - `GET /api/v1/wallet/{address}/activities`
    - 통과, `200`, 빈 목록 응답
  - `GET /api/v1/lotto/entries?address=...`
    - 통과, `200`, 빈 목록 응답
  - `GET /api/v1/mining/blocks?address=...`
    - 통과, `200`, `totalRewardJack: 0`, 빈 목록 응답
- `export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH && docker compose --env-file .env.local -f docker-compose.local.yml down`
  - 통과
  - passed tests
    - local smoke 후 컨테이너 및 네트워크 정리 완료
  - failed tests
    - 없음
  - brief failure symptoms/messages
    - 없음
  - whether failures are reproducible or environment-dependent
    - Docker가 있는 환경에서 재현 가능

# Failed Tests / Unresolved Issues

- 최종 실패 테스트는 없다.
- 이번 턴에서 실제로 발견하고 수정한 이슈
  - what was tested
    - Docker compose FE image build
  - why it failed
    - FE production TypeScript build가 test file까지 포함했고, 해당 test가 컨테이너 빌드 context 밖 fixture를 import했다.
  - suspected root cause
    - `tsconfig.app.json`이 `src` 전체를 include하면서 test 파일을 exclude하지 않았다.
  - impact scope
    - Docker 기반 FE image build가 실패해 compose 전체 기동이 막혔다.
  - what should be improved next
    - production/test TypeScript 경계를 더 명확히 분리하고, 필요하면 별도 `tsconfig.test.json` 또는 Vitest 전용 설정으로 분리한다.
- 남은 이슈
  - `npm run build`와 Docker FE build는 성공하지만 Vite main chunk size warning은 여전히 남아 있다.

# Risks / Assumptions

- mining pagination은 첫 페이지 polling + 추가 페이지 append 모델이다. 새 블록이 많이 들어오는 상황에서 추가 페이지 커서는 first page refresh 이후 의미가 조금 바뀔 수 있지만, `blockId` dedupe로 중복 노출은 막는다.
- `hasNext`는 가장 최근 fetch 결과를 기준으로 갱신되므로, 체인 상태가 크게 변하는 경우 사용자가 보는 페이지 경계가 미세하게 달라질 수 있다.
- smoke call은 빈 데이터 응답 기준으로 API 연결성/보호 경로를 확인한 것이다. 실제 mined block / lotto entry 데이터가 존재하는 시나리오까지 검증한 것은 아니다.

# Next Steps

- `MiningPage`에 무한 스크롤 또는 append 후 자동 포커스 이동 같은 UX 보강
- Vite main chunk 분리
- compose smoke를 실제 데이터가 있는 시나리오로 확장해 mined block / lotto entry populated case까지 검증

# Prompt for Next Fix

`Read AGENTS.md if present, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, docs/reviews/api.md, docs/reviews/blockchain.md, and docs/result/fe-mining-pagination-compose-followup-2026-03-20.md first.

Task:
Improve the next operational gap after mining pagination and compose smoke verification. Focus on two areas: FE mining UX after append pagination, and production build chunk splitting for the frontend bundle.

Likely files/layers involved:
- FE-ssatto/src/pages/MiningPage.tsx
- FE-ssatto/src/components/mining/MinedBlocks.tsx
- FE-ssatto/src/hooks/useMiningBlocks.ts
- FE-ssatto/vite.config.ts
- FE-ssatto/src/app/router/* or route entry files if route-level splitting is introduced

Current failing behavior:
- Mining pagination works, but the UX is still manual and basic.
- FE production build still emits a Vite large-chunk warning around the main JS bundle.

Suspected cause:
- Mining UI only exposes a button-based append flow without richer interaction handling.
- The app is still bundled mostly into one large entry chunk.

Required fixes:
- Improve mining pagination UX without breaking first-page polling.
- Add safe code splitting or manual chunking to reduce the main bundle size warning.
- Keep user-facing text in Korean.
- Do not change mining API contracts unless strictly necessary.

Tests that must pass:
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- If routing/build config changes affect compose, re-run:
  - `docker compose --env-file .env.local -f docker-compose.local.yml config`
  - `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`

Remaining spec constraints:
- Frontend page/widget/service separation must remain clear
- No raw mock data directly in page components
- Backend must remain read-only for mining queries
- Never control miner processes
- Do not treat uncertain RPC results as success`
