# JackpotChain — 로컬 UX QA/QC 프롬프트

> 기준 스택: `docker compose --env-file .env.local -f docker-compose.local.yml up -d`
> 대상 환경: Frontend `http://localhost:13000`, Backend `http://localhost:18080/api/v1`
> 최종 업데이트: 2026-03-24

---

## 이 문서의 사용법

이 문서는 AI에게 QA 작업을 지시하기 위한 **실행 가능한 프롬프트 세트**다.
각 섹션을 독립적으로 복사해 Claude Code에 붙여넣어 실행할 수 있다.

### QA 철학 (Web Service Best Practice)

| 원칙                       | 적용 방식                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Happy path first**       | 정상 흐름 전체를 먼저 통과시킨 뒤 예외를 검증한다                               |
| **Error boundary**         | 모든 에러 상태에 적절한 메시지·복구 경로가 있는지 확인한다                      |
| **State integrity**        | 새로고침·탭 전환·재방문 후에도 상태가 일관되는지 검증한다                       |
| **Idempotency guard**      | 같은 액션을 연속으로 2회 이상 실행해도 안전한지 확인한다                        |
| **Empty & boundary**       | 빈 상태, 0·최솟값·최댓값, 긴 텍스트를 반드시 포함한다                           |
| **Auth gate**              | 인증 없이 보호 리소스에 접근 시 올바른 UX(모달·리디렉션·에러)가 뜨는지 확인한다 |
| **Async UX**               | 로딩 스피너, 버튼 비활성화, 성공·실패 피드백이 있는지 확인한다                  |
| **Cross-wallet isolation** | 지갑 A의 토큰으로 지갑 B를 조작할 수 없음을 확인한다                            |

---

## 마스터 QA 프롬프트

아래 프롬프트를 Claude Code에 그대로 전달하면 전체 QA를 한 번에 수행한다.

```
Read first:
- `docs/records/architecture.md`
- `docs/records/api.md`
- `docs/reviews/auth.md`
- `docs/reviews/funtional-spec.md`
- `FE-ssatto/CLAUDE.md`
- `docs/reviews/local-stack-qa-checklist-2026-03-22.md`

Task:
docker-compose.local.yml 스택이 기동된 상태(localhost:13000)에서
아래 QA 체크리스트 전 항목을 순서대로 실행하고 결과를 기록한다.

각 시나리오마다:
1. 실제 브라우저에서 해당 화면을 연다 (또는 curl/fetch로 API를 직접 호출한다)
2. 예상 동작과 실제 동작을 비교한다
3. 불일치가 있으면 콘솔 에러, 네트워크 응답, 화면 상태를 함께 기록한다

--- SECTION 1: 지갑 온보딩 ---
[WALLET-ONBOARD-01] 신규 지갑 생성 — 행복 경로
[WALLET-ONBOARD-02] 지갑 복원 (개인키 입력)
[WALLET-ONBOARD-03] 잘못된 개인키로 복원 시도
[WALLET-ONBOARD-04] 중복 지갑 복원 (동일 주소 재등록)

--- SECTION 2: 지갑 잠금·세션 ---
[WALLET-LOCK-01] 잠금 상태에서 지갑 페이지 진입
[WALLET-LOCK-02] 잠금 해제 (올바른 비밀번호)
[WALLET-LOCK-03] 잠금 해제 (틀린 비밀번호)
[WALLET-LOCK-04] 컨테이너 재시작 후 세션 만료 → 자동 모달
[WALLET-LOCK-05] 5분 유휴 후 자동 잠금 확인
[WALLET-LOCK-06] 다중 지갑 전환 시 각 잠금 상태 독립 유지

--- SECTION 3: 지갑 교환 ---
[WALLET-EXCHANGE-01] JACK → POT 교환 성공 (funded wallet)
[WALLET-EXCHANGE-02] JACK 잔액 부족 상태에서 교환 시도
[WALLET-EXCHANGE-03] 지갑 잠긴 상태에서 교환 버튼 클릭
[WALLET-EXCHANGE-04] 교환 제출 중 버튼 연속 클릭 (중복 제출 방지)

--- SECTION 4: 대시보드 ---
[DASH-01] 블록 높이·잭팟 풀 표시
[DASH-02] 최근 블록 목록 카드
[DASH-03] 없는 경로(/unknown) → SPA 404 처리

--- SECTION 5: 로또 ---
[LOTTO-01] 로또 페이지 진입 — 잔액·엔트리 표시
[LOTTO-02] Commit 참여 성공 (1 POT 보유 신규 지갑)
[LOTTO-03] POT 잔액 0 상태에서 Commit 시도
[LOTTO-04] 지갑 잠금 상태에서 Commit 시도
[LOTTO-05] Commit 중 버튼 연속 클릭 (중복 방지)
[LOTTO-06] 엔트리 DRAWING 상태 표시
[LOTTO-07] 엔트리 WINNING 상태 + Claim 버튼 표시
[LOTTO-08] 엔트리 LOSING 상태 표시
[LOTTO-09] 엔트리 EXPIRED 상태 표시
[LOTTO-10] Claim 성공 (claimable entry 존재 시)
[LOTTO-11] 이미 claimed 엔트리에 Claim 재시도

--- SECTION 6: 채굴 ---
[MINING-01] 채굴 블록 목록 표시 (빈 상태 포함)
[MINING-02] 채굴 가이드 텍스트 렌더링

--- SECTION 7: 인증 경계 ---
[AUTH-01] 토큰 없이 보호 API 직접 호출 → 401 처리
[AUTH-02] 다른 지갑 주소로 보호 API 호출 → 403 처리
[AUTH-03] Refresh 토큰으로 세션 갱신
[AUTH-04] Logout 후 refresh 시도 → 실패
[AUTH-05] 만료된 challengeId 재사용 → 거부

--- SECTION 8: UX 공통 ---
[UX-01] 모든 페이지 로딩 중 스피너/스켈레톤 표시
[UX-02] API 에러 시 사용자 친화적 메시지 표시
[UX-03] 새로고침 후 상태 복원 (지갑·세션)
[UX-04] 탭 비활성화 시 폴링 일시정지 확인
[UX-05] 지갑 없는 상태에서 로또/교환 페이지 진입
[UX-06] 네비게이션 활성 탭 하이라이트

Before recording:
각 항목에 대해 PASS / FAIL / BLOCKED 중 하나로 결과를 표기하고,
FAIL·BLOCKED의 경우 재현 단계, 실제 동작, 예상 동작, 콘솔 에러를 기록한다.

After implementation:
`docs/result/ux-qa-full-{date}.md`를 한국어로 작성한다:
- Overview: 실행 환경·날짜·스택 버전
- Results Table: 시나리오 ID | 결과 | 비고
- Critical Issues: UX 관점 심각도 HIGH 이슈 목록
- Failed / Unresolved: 원인·영향·재현 단계
- Next Steps: 우선순위 순 수정 권고
```

---

## 섹션별 세부 시나리오 — AI 실행 가이드

### SECTION 1: 지갑 온보딩

| ID                | 시나리오           | 진입 경로                  | 예상 동작                                                    | 검증 포인트                               |
| ----------------- | ------------------ | -------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| WALLET-ONBOARD-01 | 신규 지갑 생성     | `/wallet` → 지갑 없음 상태 | WalletCreate 컴포넌트 표시, 생성 후 잔액 0 JACK + 1 POT 표시 | 온보딩 보상 반영 여부, 카드 슬라이더 정상 |
| WALLET-ONBOARD-02 | 개인키로 지갑 복원 | WalletCreate → 복원 탭     | 기존 지갑 주소로 복원 성공, 해당 지갑 카드 표시              | 주소 일치, 잔액 조회                      |
| WALLET-ONBOARD-03 | 잘못된 개인키 복원 | WalletCreate → 복원 탭     | 에러 메시지 표시, 지갑 카드 생성 안 됨                       | 에러 문구 명확성                          |
| WALLET-ONBOARD-04 | 중복 복원          | 이미 등록된 주소 재등록    | 409 응답, "이미 등록된 지갑" 안내                            | UX 에러 문구, 기존 지갑 데이터 보존       |

**추가 검증: 빈 상태**

- 지갑이 하나도 없을 때 로또·교환 페이지 진입 → "지갑을 먼저 생성해 주세요" 안내 또는 지갑 페이지 유도

---

### SECTION 2: 지갑 잠금·세션 — 핵심 UX

| ID             | 시나리오                     | 재현 방법                               | 예상 동작                                                     | 심각도       |
| -------------- | ---------------------------- | --------------------------------------- | ------------------------------------------------------------- | ------------ |
| WALLET-LOCK-01 | 잠금 상태 진입               | 지갑 페이지 재방문 (메모리 초기화)      | 잠금 상태 카드 + 잠금 해제 버튼                               | Medium       |
| WALLET-LOCK-02 | 올바른 비밀번호 해제         | 잠금 해제 버튼 → 비밀번호 입력          | 모달 닫힘, 지갑 활성화, 잔액 표시                             | High         |
| WALLET-LOCK-03 | 틀린 비밀번호 해제           | 잠금 해제 모달 → 오타 입력              | 에러 메시지, 모달 유지                                        | High         |
| WALLET-LOCK-04 | 컨테이너 재시작 후 세션 만료 | `docker compose restart` 후 지갑 페이지 | **자동으로 WalletUnlockModal이 열림** (에러 메시지 별도 없음) | **Critical** |
| WALLET-LOCK-05 | 5분 유휴 자동 잠금           | 5분 방치 후 동작 시도                   | 자동 잠금 → 잠금 해제 모달 또는 안내                          | High         |
| WALLET-LOCK-06 | 다중 지갑 독립 잠금          | 지갑 A 잠금 해제 후 지갑 B 확인         | 지갑 B는 여전히 잠금 상태                                     | Medium       |

**WALLET-LOCK-04 상세 검증 방법:**

```bash
# 1. 지갑 생성 후 잠금 해제 상태 확인
# 2. 컨테이너 재시작
docker compose --env-file .env.local -f docker-compose.local.yml restart backend

# 3. 브라우저에서 /wallet 페이지 새로고침
# 4. 예상: WalletUnlockModal이 자동으로 열림
# 5. 이전 동작(에러 배너만 표시)이 남아있으면 FAIL
```

---

### SECTION 3: 지갑 교환

| ID                 | 시나리오       | 선행 조건                              | 예상 동작                                    | 검증 포인트                         |
| ------------------ | -------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------- |
| WALLET-EXCHANGE-01 | 교환 성공      | ≥100 JACK 보유 (`grantlocaljack` 사용) | 교환 금액 입력 → 서명 → 제출 → POT 잔액 증가 | TX 제출 후 잔액 갱신 타이밍         |
| WALLET-EXCHANGE-02 | 잔액 부족      | JACK 0 상태                            | "JACK 잔액이 부족합니다" 안내, 제출 차단     | 클라이언트 사이드 검증 vs 서버 응답 |
| WALLET-EXCHANGE-03 | 잠긴 상태 교환 | 지갑 잠금 상태                         | 교환 버튼 비활성화 또는 잠금 해제 유도       | 버튼 상태 UI                        |
| WALLET-EXCHANGE-04 | 중복 제출      | 교환 제출 중 버튼 재클릭               | 버튼 비활성화 또는 로딩 표시, 중복 TX 없음   | 네트워크 탭에서 이중 요청 확인      |

---

### SECTION 4: 대시보드

| ID      | 시나리오          | 예상 동작                     | 검증 포인트                                          |
| ------- | ----------------- | ----------------------------- | ---------------------------------------------------- | ------------------- |
| DASH-01 | 블록 높이·잭팟 풀 | 숫자 표시, 폴링으로 자동 갱신 | 0이거나 null이면 FAIL                                |
| DASH-02 | 최근 블록 목록    | 블록 카드 최소 1개 이상       | 빈 상태 처리 (`블록이 없습니다` 등)                  |
| DASH-03 | 없는 경로         | `/unknown-route` 진입         | SPA shell 로드, 404 안내 화면 또는 대시보드 리디렉션 | blank 화면이면 FAIL |

---

### SECTION 5: 로또 — 핵심 비즈니스 흐름

**선행 조건 설정:**

```bash
# 로컬 JACK 충전 (grantlocaljack RPC)
curl -X POST http://localhost:8332 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"grantlocaljack","params":["<wallet_address>", 200],"id":1}'
```

| ID       | 시나리오             | 예상 동작                                          | 심각도       |
| -------- | -------------------- | -------------------------------------------------- | ------------ |
| LOTTO-01 | 로또 페이지 진입     | POT 잔액·현재 블록 높이·엔트리 목록 표시           | High         |
| LOTTO-02 | Commit 성공          | 숫자 선택 → 서명 → 제출 → DRAWING 엔트리 등장      | High         |
| LOTTO-03 | POT 0 Commit         | 클라이언트 에러 "POT 잔액이 부족합니다", 제출 차단 | High         |
| LOTTO-04 | 잠금 상태 Commit     | 참여 버튼 비활성화 또는 잠금 해제 유도             | Medium       |
| LOTTO-05 | Commit 중복 클릭     | 버튼 비활성화, 중복 TX 없음                        | High         |
| LOTTO-06 | DRAWING 상태 표시    | 결과 숫자 없음, "추첨 중" 배지                     | Medium       |
| LOTTO-07 | WINNING + Claim 버튼 | "당첨" 배지 + Claim 버튼 활성화                    | **Critical** |
| LOTTO-08 | LOSING 상태          | "낙첨" 배지, Claim 버튼 없음                       | Medium       |
| LOTTO-09 | EXPIRED 상태         | "만료" 배지, 안내 문구                             | Medium       |
| LOTTO-10 | Claim 성공           | claimed=true 갱신, Claim 버튼 사라짐               | **Critical** |
| LOTTO-11 | 이미 Claimed 재시도  | 에러 응답, 중복 claim 차단                         | High         |

**Claim 시나리오 선행 조건 (N+18 블록 경과 필요):**

```bash
# mineqablocks RPC로 블록 강제 생성
curl -X POST http://localhost:8332 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"mineqablocks","params":[20],"id":1}'
```

---

### SECTION 6: 채굴

| ID        | 시나리오       | 예상 동작                                   | 검증 포인트        |
| --------- | -------------- | ------------------------------------------- | ------------------ |
| MINING-01 | 채굴 블록 목록 | 채굴 블록 카드 또는 "아직 없습니다" 빈 상태 | 페이지네이션 동작  |
| MINING-02 | 채굴 가이드    | TUI 연결 방법 안내 텍스트 렌더링            | 레이아웃 깨짐 없음 |

---

### SECTION 7: 인증 경계 (API 직접 호출)

```bash
BASE="http://localhost:18080/api/v1"

# AUTH-01: 토큰 없이 보호 API
curl -s "$BASE/wallet?addresses=test" | jq '.code'
# 예상: 401

# AUTH-02: 다른 지갑 주소로 접근
curl -s -H "Authorization: Bearer $TOKEN_A" \
  "$BASE/wallet/ADDRESS_B/activities" | jq '.code'
# 예상: 403

# AUTH-04: 로그아웃 후 refresh 시도
curl -s -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/auth/refresh" --cookie "refresh_token=$OLD_REFRESH" | jq '.code'
# 예상: 401

# AUTH-05: 만료된 challengeId 재사용
curl -s -X POST "$BASE/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{"challengeId":"old-id","address":"...","publicKey":"...","signature":"..."}' | jq '.code'
# 예상: 400 또는 401
```

---

### SECTION 8: UX 공통 체크리스트

| ID    | 항목                  | 검증 방법                                  | 통과 기준                                     |
| ----- | --------------------- | ------------------------------------------ | --------------------------------------------- |
| UX-01 | 로딩 스피너/스켈레톤  | 네트워크 속도 조절(Slow 3G) 후 페이지 로드 | 빈 화면 없이 로딩 표시                        |
| UX-02 | API 에러 메시지       | Backend 컨테이너 중지 후 페이지 조회       | "서버에 연결할 수 없습니다" 또는 동등한 안내  |
| UX-03 | 새로고침 후 상태 복원 | F5 후 지갑 목록·선택 상태 확인             | localStorage 기반 지갑 목록 유지              |
| UX-04 | 탭 비활성화 폴링 중지 | 다른 탭으로 이동 후 네트워크 탭 확인       | 폴링 요청 일시정지                            |
| UX-05 | 지갑 없는 상태 보호   | 지갑 없을 때 `/lotto`, `/mining` 진입      | "지갑 생성 필요" 안내 또는 자연스러운 빈 상태 |
| UX-06 | 네비게이션 활성 탭    | 각 페이지 방문 시 상단 네비 하이라이트     | 현재 페이지 탭 구분 표시                      |
| UX-07 | 긴 지갑 주소 표시     | 긴 주소 말줄임(...) 또는 줄바꿈            | 레이아웃 깨짐 없음                            |
| UX-08 | 숫자 단위 표시        | 큰 JACK 잔액 (예: 100억 satoshi) 표시      | 가독성 있는 단위 변환 또는 포맷팅             |
| UX-09 | 챗봇 버튼             | 우하단 챗봇 아이콘 → 열림/닫힘             | 동작 정상                                     |
| UX-10 | 학습 페이지           | `/learning` 경로 또는 네비 링크            | 콘텐츠 정상 렌더링                            |

---

## 결과 기록 템플릿

QA 실행 후 아래 형식으로 `docs/result/ux-qa-full-YYYY-MM-DD.md`에 저장한다.

```markdown
# UX QA 결과 — YYYY-MM-DD

## 환경

- 스택: docker-compose.local.yml
- Frontend: http://localhost:13000
- Backend: http://localhost:18080/api/v1
- 실행자:

## 결과 요약

| 시나리오 ID       | 결과              | 비고 |
| ----------------- | ----------------- | ---- |
| WALLET-ONBOARD-01 | PASS/FAIL/BLOCKED |      |
| ...               |                   |      |

## Critical Issues (심각도 HIGH 이상)

1. **[시나리오 ID]** 제목
   - 재현 단계:
   - 실제 동작:
   - 예상 동작:
   - 콘솔 에러:

## Next Steps (우선순위순)

1.
2.
3.
```

---

## 알려진 선행 이슈 (QA 전 확인 필요)

기존 QA에서 발견된 이슈로, 이번 QA 전에 수정되었는지 먼저 확인한다.

| 이슈                                                 | 상태               | 참조                                                                  |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| 세션 만료 시 에러 배너만 표시 (모달 자동 오픈 안 됨) | **수정 대상**      | `docs/result/wallet-session-expired-auto-unlock-modal-*.md`           |
| 온보딩 보상 POT만 지급 (JACK fee buffer 없음)        | FIXED (2026-03-22) | `docs/result/local-compose-api-ui-qa-2026-03-22.md`                   |
| 미채굴 상태 연속 지갑 생성 503 에러                  | FIXED (2026-03-22) | 상동                                                                  |
| Dashboard candidates 지갑 refresh flood              | FIXED (2026-03-23) | `docs/result/dashboard-candidates-wallet-refresh-flood-2026-03-23.md` |
