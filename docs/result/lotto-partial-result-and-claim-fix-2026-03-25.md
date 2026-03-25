# 결과 보고서: 로또 부분 결과 표시 & 수령 버튼 수정

> 작성일: 2026-03-25

---

## Overview

### 무엇을 했는가

**Issue 1 — 참여내역 상세 비교 모달: 블록 결과 번호 부분 표시**

로또 commit 후 결과는 비교 블록 N+3, N+6, N+9, N+12, N+15, N+18 각각에서 결정된다 (블록당 약 1.5분). 기존 구현은 6개 블록이 모두 채굴된 후에야 결과 번호가 표시됐다. 상세 비교 모달을 열면 현재까지 채굴된 블록의 결과 숫자만 표시하도록 수정했다.

**Issue 2 — 수령 버튼 미작동 및 UX 개선**

`getClaimContext` BE 엔드포인트가 `!chainResult.claimable()` 조건으로 항상 예외를 던지는 버그가 있었다. 블록체인 노드의 `lottocheckresult` RPC가 `claimable` 필드를 반환하지 않기 때문이다. 이 버그를 수정하고, 수령 UX(수령완료 버튼 상태, 수령되었습니다 모달)를 구현했다.

### 왜 했는가

- 사용자가 수령 버튼을 클릭해도 아무 반응이 없었음 (BE 버그)
- 추첨 중인 항목의 비교 모달에서 진행 상황 확인 불가 (UX 미구현)
- 수령 후 버튼이 그대로 남아 있어 중복 클릭 혼란 발생 (FE 미구현)

---

## Changed Files

### BE

| 파일 | 변경 이유 |
|------|---------|
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java` | `getResult()` 부분 결과 계산, `getClaimContext()` claimable 버그 수정 |

**`getResult()` 변경사항:**
- `entry.getResultNumbers()` 가 null (DRAWING) 일 때 `computePartialResultNumbers()` 호출
- 각 비교 높이 (N+3, N+6, …, N+18) ≤ currentHeight 인 블록의 해시 마지막 hex 문자를 결과 숫자로 반환
- RPC 실패 시 안전하게 break

**`getClaimContext()` 변경사항:**
- `!chainResult.claimable()` 조건 제거 (DB 기준 isClaimable 이미 앞에서 검증됨)
- `rewardJack`: DB `entry.getRewardJack()` 우선 → null 이면 RPC 값 fallback (jackpot 1등 pool_snapshot=0 버그 우회)
- `matchCount`: DB `entry.getMatchCount()` 우선 → null 이면 RPC 값 fallback

### FE

| 파일 | 변경 이유 |
|------|---------|
| `FE-ssatto/src/components/lotto/HexPicker.tsx` | 수령 UX 전면 개선 |

**`HistoryModal` 컴포넌트:**
- `claimState: "idle" | "claiming" | "done"` 로컬 상태 추가
- 수령 버튼: claiming 중 "수령중..." (비활성), done 시 "수령완료" (회색 비활성)
- `onClaim` 타입: `(entryId) => void` → `(entryId) => Promise<void> | void`
- `onClaim()` await 후 `setClaimState("done")` 처리 (기존: await 없이 즉시 `onClose()`)
- 부분 결과 번호 패딩: `resultNumbers` 가 6개 미만이면 `"-"` 로 채워 6개 표시
- 미채굴 슬롯: 투명한 스타일로 구분

**`HexPicker` 컴포넌트:**
- `showClaimSuccessModal` 상태 추가 (2초 자동 닫힘)
- `ClaimSuccessModal` 컴포넌트 추가 ("수령되었습니다" + 설명 텍스트)
- `handleClaim` 성공 시 `setShowClaimSuccessModal(true)`, `throw error` 로 HistoryModal에도 에러 전파
- 리스트 뷰 수령 버튼: `claimedEntryIds.has(entry.id)` 이면 "수령완료" (회색, disabled) 표시

---

## Tests Run

| 테스트 | 결과 |
|--------|------|
| `tsc --noEmit` (FE 타입 체크) | 통과 (오류 0) |
| `./gradlew compileJava` (BE 컴파일) | 통과 (경고: deprecated API, 기존과 동일) |
| `docker compose build backend frontend` | 통과 |
| `docker compose up -d` 컨테이너 헬스 | backend: healthy, frontend: unhealthy (nginx healthcheck 설정 문제, 기존과 동일) |
| `/api/v1/blockchain/dashboard` 응답 확인 | 200 OK |
| `/api/v1/blockchain/blocks/3910` 블록 조회 | 200 OK, 해시 마지막 문자 `0` 확인 |

---

## Failed / Unresolved

### 수동 수령 E2E 테스트 미실시

WINNING 상태 로또 엔트리가 없어 실제 수령 버튼 클릭 → TX 제출 → 완료 플로우를 Docker 환경에서 직접 검증하지 못했다.

- **원인**: 로컬 환경에서 로또 commit → 18블록 대기 → WINNING 판정까지 약 27분 소요
- **영향 범위**: 수령 버튼이 예상대로 동작하지 않을 경우 다음 항목이 추가 원인일 수 있음:
  - `lottocheckresult` 가 `success: False` 를 반환하면 `chainResult.paid()` 체크가 올바르지 않을 수 있음 (성공 시 `paid` 필드 포함)
  - jackpot 1등 수령 시 `rewardJack = 0` 이면 빈 TX 빌드 문제 가능 (단, DB 값 fallback으로 해결됨)

### frontend unhealthy

nginx healthcheck가 unhealthy지만 nginx 자체는 정상 서빙 중 (포트 13000 응답 확인). 기존 환경 문제이며 이번 작업과 무관.

---

## Next Steps

1. **WINNING 항목으로 수령 E2E 검증**: 실제 WINNING 엔트리로 수령 버튼 → 트랜잭션 제출 → 잔액 반영 확인
2. **부분 결과 표시 시각 검증**: DRAWING 상태 항목 모달에서 1~5개 블록 결과 숫자가 올바르게 표시되는지 확인
3. **getClaimContext RPC 검증**: `chainResult.paid()` 가 이미 지급된 항목에서 정상적으로 true 반환하는지 확인
