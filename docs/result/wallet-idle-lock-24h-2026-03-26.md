# 지갑 유휴 잠금 타임아웃 24시간 변경

> 작성일: 2026-03-26

## Overview

지갑 잠금 해제 후 30분이 지나면 자동으로 지갑이 잠기고 잠금 해제 모달이 표시되는 문제를 개선했다.
요구사항: 지갑 잠금 해제 후 **24시간** 동안 비활성 상태여야 모달이 표시되도록 변경.

**원인 파악:**
- 모달 트리거는 BE 토큰 만료가 아니라 FE idle lock 타이머였음
- Access token (15분) 만료 → refresh cookie로 자동 갱신 → 모달 미표시
- Refresh token (14일) 만료 → 이미 24시간보다 훨씬 길어 변경 불필요
- `WALLET_IDLE_LOCK_MS = 30 * 60 * 1000` (30분 비활성) → `lockExpiredWallets()` 호출 → 모달 표시

## Changed Files

| 파일 | 변경 내용 | 이유 |
|------|----------|------|
| `FE-ssatto/src/stores/useWalletSessionStore.ts` | `WALLET_IDLE_LOCK_MS = 30 * 60 * 1000` → `24 * 60 * 60 * 1000` | 유휴 잠금 기준 시간을 30분에서 24시간으로 변경 |

## Tests Run

docker-compose.local.yml 테스트 미실행 (단순 상수 변경으로 로직 변화 없음).

수동 확인 사항:
- `WALLET_IDLE_LOCK_MS = 24 * 60 * 60 * 1000` (86400000ms = 24시간) 로 변경됨
- `lockExpiredWallets()` 는 `Date.now() - lastInteractionAt >= maxIdleMs` 조건으로 잠금 결정 → 24시간 비활성 시에만 모달 표시

## Failed / Unresolved

없음.

## Next Steps

- 필요시 BE access token TTL 조정 (현재 15분이나 자동 갱신으로 사용자 경험에 영향 없음)
- 보안 정책에 따라 24시간이 너무 길다면 이 상수만 조정하면 됨
