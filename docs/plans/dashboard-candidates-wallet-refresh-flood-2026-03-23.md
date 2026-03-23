# 플랜: 대시보드 후보 블록 동적화 + 지갑 페이지 refresh 폭주 수정

> 작성일: 2026-03-23

---

## 영향 파일

| 파일 | 변경 이유 |
|------|---------|
| `FE-ssatto/src/components/dashboard/BlockchainVisualizer.tsx` | 후보 블록 mockData 하드코딩 → 동적 생성, 확정 블록 정렬 |
| `FE-ssatto/src/components/dashboard/NodeNetwork.tsx` | 노드 하드코딩 → activeNodes 기반 동적 생성 |
| `FE-ssatto/src/pages/WalletPage.tsx` | refresh 무한 루프 방지 |

---

## Task 1: 대시보드 후보 블록 + 노드 네트워크 동적화

### 원인

- `BlockchainVisualizer`: `candidateBlocks` 배열이 `dashboardMockData.ts`에 하드코딩됨. `activeNodes`, `currentHeight` prop을 받지만 후보 블록 생성에 반영하지 않음.
- `BlockchainVisualizer`: `blocks` (확정) prop이 API 순서 그대로 사용되어 정렬 보장 없음.
- `NodeNetwork`: nodes 배열 (center + 7개)이 하드코딩. `activeNodes` prop은 표시 숫자에만 쓰이고 실제 노드 개수에 반영되지 않음.

### 수정 계획

**BlockchainVisualizer.tsx**
1. `useMemo`로 `blocks`를 height 오름차순 정렬 (확정 블록 왼→오 오름차순)
2. `useMemo`로 `activeNodes` + `currentHeight` 기반 후보 블록 생성
   - 개수: `activeNodes`개
   - height: `currentHeight+1`, `currentHeight+2`, ...
   - `minerLabel: "Pending Queue"`, `status: "candidate"`, 클릭 불가
3. `handleSelect`에서 `status === "candidate"` 블록은 모달 열지 않음
4. `candidateBlocks` import 제거

**NodeNetwork.tsx**
1. `useMemo`로 `activeNodes` 기반 nodes 동적 생성
   - center 노드: 1개 (서버 노드)
   - peripheral 노드: `Math.min(activeNodes, 8)`개, 원형 배치
2. links도 동적 생성: center→각 peripheral, peripheral 인접 연결

---

## Task 2: 지갑 페이지 refresh 무한 루프

### 원인

`WalletPage.tsx` useEffect (line 124) deps:
```
[activeAccessSession?.accessToken, activeAccessSession?.accessTokenExpiresAt, activeWallet, ...]
```

루프 경로:
1. Effect 실행 → `restoreWalletSession` → `/auth/refresh` → `newToken`
2. `setAccessSession(walletId, newToken, newExpiry)` → Zustand store 업데이트
3. `accessSessions` 객체 새 reference 생성 → 컴포넌트 리렌더
4. `activeAccessSession?.accessToken` = newToken (이전과 다른 값) → dep 변경
5. Effect 재실행 → 다시 `/auth/refresh` → 무한 반복

### 수정 계획

`activeAccessSession?.accessToken`과 `activeAccessSession?.accessTokenExpiresAt`을 deps에서 제거.
대신 `activeAccessSessionRef`로 현재 값을 effect 내부에서 읽음 (reactive dep 없이).

Effect는 오직 **지갑 자체가 바뀔 때만** (walletId, privateKey) 재실행:
```ts
// Before
}, [activeAccessSession?.accessToken, activeAccessSession?.accessTokenExpiresAt, activeWallet, ...])

// After
}, [activeWallet?.walletId, activeUnlockedPrivateKey, ...]
```

`activeWallet`을 `walletId`로 교체하는 이유:
- `upsertWallet` 후 `wallets` 배열이 새 reference → `activeWallet` 새 reference (내용 동일)
- object reference 변경으로 effect가 재실행되는 것을 막기 위해 primitive key 사용
