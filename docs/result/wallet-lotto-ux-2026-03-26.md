# 지갑/로또 UX 개선 — 2026-03-26

## Overview

지갑 잠금 정책·UI 개선, 상단 배너 정리, 1 POT 메시지 설명 추가, 지갑·활동기록 동기 폴링, 로또 POT 부족 상황별 분기 처리를 구현했다.

**왜 했는가:** 기존 UX에서 지갑 잠금 상태 표시가 상단 텍스트 배너뿐이어서 직관성이 낮았고, 로또 참여 시 POT 부족 이유(잭 부족 vs 교환 필요 vs 지갑 잠김)를 구분하지 않아 사용자가 다음 행동을 알기 어려웠다.

---

## Changed Files

| 파일 | 변경 이유 |
|------|-----------|
| `FE-ssatto/src/stores/useWalletSessionStore.ts` | 유휴 잠금 타임아웃 5분 → 30분 |
| `FE-ssatto/src/hooks/useWalletActivities.ts` | `intervalMs` 파라미터 추가, `refetch` 반환 추가 (동기 폴링 지원) |
| `FE-ssatto/src/pages/WalletPage.tsx` | 상단 배너 제거, 자물쇠 UI 연동, 1 POT 블록체인 설명 추가, POT 수신 시 메시지 자동 닫기, 지갑+활동기록 동기 10s 폴링, 로또 페이지에서 navigate state로 잠금해제 모달 자동 표시 |
| `FE-ssatto/src/components/wallet/WalletInfo.tsx` | `isLocked`/`onLockRequest` prop 추가, 잠금 시 자물쇠 오버레이 표시, 모달 X버튼 `absolute` 위치 버그 수정 (`relative` 누락) |
| `FE-ssatto/src/services/lottoParticipationGuard.ts` | `wallet-locked`, `insufficient-pot-exchange`, `insufficient-pot-mine` 상태 추가, `isWalletLocked`·`jackBalance` 입력 추가 |
| `FE-ssatto/src/services/lottoParticipationGuard.test.ts` | 새 상태(wallet-locked, exchange, mine)에 맞게 테스트 업데이트 |
| `FE-ssatto/src/components/lotto/HexPicker.tsx` | `isWalletLocked`, `onWalletLocked`, `onInsufficientJack` prop 추가, 새 상태별 핸들러 연결 |
| `FE-ssatto/src/pages/LottoPage.tsx` | `WalletRequiredModal` → 범용 `AlertModal`로 교체, 잭 부족/지갑 잠김/미등록 케이스별 모달+네비게이션 추가 |

---

## Tests Run

```
npx tsc --noEmit           → 통과 (에러 0건)
npx vitest run src/services/lottoParticipationGuard.test.ts → 5 tests passed
```

---

## Failed / Unresolved

없음.

---

## Next Steps

- `docker-compose.local.yml`로 실제 기동 후 아래 시나리오를 수동 검증:
  1. 지갑 생성 → 1 POT 메시지 표시 → 블록 채굴 후 메시지 자동 소멸
  2. 30분 유휴 후 자동 잠금 → 자물쇠 오버레이 표시 → 클릭 시 잠금해제 모달
  3. 로또 페이지: 지갑 없음 / 잠김 / JACK < 100 / JACK >= 100 케이스 각각
  4. 교환 실행 후 지갑 잔액·활동기록이 동일 폴링 틱에 업데이트되는지 확인
- WalletCreate.tsx 모달 X버튼은 이미 `handleClose`로 작동 중이므로 별도 수정 불필요 확인됨
