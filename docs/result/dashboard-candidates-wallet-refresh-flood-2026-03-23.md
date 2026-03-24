# Overview

대시보드 후보 블록·노드 네트워크를 하드코딩에서 동적 생성으로 전환하고,
WalletPage의 `restoreWalletSession` useEffect가 무한 루프를 일으키던 문제를 수정했다.

---

# Changed Files

| 파일 | 변경 내용 |
|------|---------|
| `FE-ssatto/src/components/dashboard/BlockchainVisualizer.tsx` | `candidateBlocks` import 제거, `useMemo`로 확정 블록 height 오름차순 정렬, `activeNodes`·`currentHeight` 기반 후보 블록 동적 생성, candidate 블록 클릭 시 모달 열지 않도록 처리 |
| `FE-ssatto/src/components/dashboard/NodeNetwork.tsx` | 하드코딩된 `nodes`·`links` 제거, `useMemo`로 `activeNodes` 기반 원형 배치 nodes 동적 생성 및 links 동적 생성 |
| `FE-ssatto/src/pages/WalletPage.tsx` | `activeWalletRef`·`activeAccessSessionRef` 추가, useEffect deps에서 `accessToken`·`accessTokenExpiresAt`·`activeWallet` 객체 제거 → `activeWallet?.walletId` + `activeUnlockedPrivateKey`만 reactive dep으로 유지 |

---

# Detail

## BlockchainVisualizer

- `sortedBlocks`: `[...blocks].sort((a, b) => a.height - b.height)` — API 응답 순서에 무관하게 왼→오 오름차순 보장
- `dynamicCandidates`: `Array.from({ length: activeNodes }, ...)` — `currentHeight+1`부터 시작, `status: "candidate"`, `minerLabel: "Pending Queue"`, 클릭 시 `handleSelect` 조기 반환
- `dashboardMockData.ts`의 `candidateBlocks`는 더 이상 import하지 않음 (export는 유지됨)

## NodeNetwork

- `nodes` useMemo: center 1개 + `Math.min(activeNodes, 8)`개 peripheral, 반지름 (rx=95, ry=75) 원형 배치
- `links` useMemo: center→각 peripheral + 인접 peripheral 연결
- `NodeDef` 인터페이스 도입 (`getCurve` 파라미터 타입으로 사용)

## WalletPage — 무한 루프 수정

루프 경로:
`effect` → `setAccessSession` → `accessSessions` 새 reference → `activeAccessSession` 새 reference → dep 변경 → effect 재실행 → 무한 반복

수정:
- `activeWalletRef.current = activeWallet` (렌더 시마다 최신값 반영)
- `activeAccessSessionRef.current = activeAccessSession` (렌더 시마다 최신값 반영)
- effect 내부에서는 ref를 통해 `wallet`·`currentToken`·`currentExpiry` 읽음
- deps: `[activeWallet?.walletId, activeUnlockedPrivateKey, clearAccessSession, setAccessSession, setActiveAddress, upsertWallet]`
  - `walletId`가 같으면 지갑 객체 reference가 달라져도 effect 재실행 없음
  - `accessToken`/`accessTokenExpiresAt`은 deps에서 제거 → refresh 후 루프 불발

---

# Tests Run

```bash
cd FE-ssatto && npx tsc --noEmit
# → 출력 없음 (타입 에러 0)
```

---

# Failed / Unresolved

없음.

---

# Next Steps

- 로컬 Docker 스택 기동 후 대시보드에서 `activeNodes` 값에 따라 후보 블록 개수가 올바르게 표시되는지 육안 확인
- 지갑 페이지에서 지갑 선택 변경 시 refresh 요청이 1회만 발생하는지 Network 탭으로 확인
