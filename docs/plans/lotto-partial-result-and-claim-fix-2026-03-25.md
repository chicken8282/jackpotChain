# Plan: 로또 부분 결과 표시 & 수령 버튼 수정

> 기준일: 2026-03-25

---

## 원인 분석

### Issue 1: 참여내역 상세 비교 모달 — 블록 결과 번호 부분 표시

**원인**:
- `lottocheckresult` RPC는 비교 블록 6개(N+3, N+6, …, N+18) **전부** 채굴된 후에만 `result_digits` 반환
- DRAWING 상태에서 DB `entry.resultNumbers` = null → FE에서 전부 `"-"` 표시
- 현재 FE는 모달 열릴 때 `getLottoEntryResult` 1회 호출하는 구조는 이미 구현됨 → BE만 수정하면 됨

**가정**:
- 블록 해시 마지막 hex 문자 (`hash[-1] & 0x0f`) = 결과 숫자 (blockchain CLAUDE.md 근거)
- `getBlockHash(height)` RPC는 존재하는 블록 높이에 대해서만 성공 반환
- 비교 오프셋: [3, 6, 9, 12, 15, 18]

### Issue 2: 수령 버튼 미작동

**원인 1 (BE)**: `getClaimContext()` 에서 `!chainResult.claimable()` 체크
- `lottocheckresult` Python 구현이 `claimable` 필드를 **반환하지 않음**
- `payload.path("claimable").asBoolean(false)` → 항상 false
- 결과: `getClaimContext` 가 항상 `InvalidLottoRequestException` 를 던짐 → 수령 TX 빌드 불가

**원인 2 (BE)**: jackpot 보상 금액 오류
- `lottocheckresult` 는 `calculate_payout(prize, 0)` 에 `pool_snapshot=0` 하드코딩
- Jackpot 1등: `pool_snapshot * 50 // 100 = 0` → payoutJack = 0 반환 → 클레임 TX에 보상 0 포함
- DB `entry.getRewardJack()` 은 webhook 처리 시 정확히 계산돼 저장됨

**원인 3 (FE)**: HistoryModal 클레임 버튼 흐름
- `onClaim(entry.id)` 를 await 하지 않고 즉시 `onClose()` 호출
- 수령 성공/실패 피드백 없음
- "수령되었습니다" 알림 모달 미구현
- 리스트 뷰에서 수령 후 버튼 상태 미변경

---

## 영향 레이어

| 레이어 | 파일 |
|--------|------|
| BE Service | `BE-ssatto/.../lotto/service/LottoService.java` |
| FE Component | `FE-ssatto/src/components/lotto/HexPicker.tsx` |

---

## 변경 범위

### BE - `LottoService.java`

1. **`getResult()`**: DRAWING + resultNumbers null 일 때 부분 결과 계산
   - 비교 높이 [N+3, N+6, N+9, N+12, N+15, N+18] 중 `height <= currentHeight` 인 것들에 대해
   - `getBlockHash(height)` 호출 → 마지막 hex 문자 파싱 → 결과 숫자
   - RPC 실패 시 해당 위치에서 break (안전)
   - 결과가 빈 배열이면 null 반환 (기존과 동일)

2. **`getClaimContext()`**:
   - `!chainResult.claimable()` 조건 제거 (DB 기준 isClaimable 이미 검증됨)
   - rewardJack: `entry.getRewardJack()` 우선, null 이면 `chainResult.payoutJack()` fallback
   - `chainResult.paid()` 체크는 유지

### FE - `HexPicker.tsx`

1. **`HistoryModal` 컴포넌트**:
   - `claimState: "idle" | "claiming" | "done"` 로컬 상태 추가
   - 수령 버튼: claiming 중 "수령중...", done 시 "수령완료" (회색 비활성)
   - `onClaim` 반환 타입 `Promise<void> | void` 로 변경
   - `onClose()` 를 즉시 호출하지 않고 claim 완료 후 사용자가 "닫기" 로 닫게

2. **`HexPicker` 컴포넌트**:
   - `showClaimSuccessModal` 상태 추가
   - `handleClaim` 성공 시 `showClaimSuccessModal = true` 설정
   - `ClaimSuccessModal` 컴포넌트 추가 ("수령되었습니다" 알림, 2초 후 자동 닫힘)

3. **히스토리 리스트 수령 버튼**:
   - `claimedEntryIds.has(entry.id)` 면 "수령완료" (회색, disabled) 표시

4. **부분 결과 번호 패딩**:
   - `resultNumbers` 가 null 이 아니지만 6개 미만이면 `"-"` 로 패딩해서 6개로 표시

---

## 실패 가능 지점

| 지점 | 위험 | 대응 |
|------|------|------|
| `getBlockHash()` RPC 실패 | 블록 미채굴 or 포크 | try-catch로 break, null 반환 |
| jackpot entry.getRewardJack() null | 드물지만 가능 | chainResult.payoutJack() fallback |
| HistoryModal claim 중 모달 닫기 | 상태 불일치 | claimState 리셋 로직 불필요 (컴포넌트 unmount) |
| 수령 TX 이미 클레임됨 | `InvalidLottoRequestException` | FE에서 에러 메시지 showNotice |
