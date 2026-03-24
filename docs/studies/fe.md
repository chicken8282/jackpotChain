# 프론트엔드 학습 — React SPA (FE-ssatto)

> 작성일: 2026-03-24
> 목적: FE 구조 이해 + 브라우저 암호화 / 서명 / Polling 패턴

---

## 1. 디렉토리 구조

```
src/
├── components/        ← UI 컴포넌트
│   ├── dashboard/     ← BlockchainVisualizer, JackpotPool 등
│   ├── wallet/        ← 지갑 생성/연결, 교환, 활동 내역
│   ├── lotto/         ← HexPicker, LottoTierRanking
│   ├── mining/        ← MinedBlocks, MiningGuide
│   └── learning/      ← 학습 모듈 (블록체인 교육용 인터랙티브 UI)
├── pages/             ← 라우트 단위 페이지
├── hooks/             ← 데이터 훅 (usePollingQuery, useDashboardData 등)
├── services/          ← 비즈니스 로직
│   ├── tx/            ← txBuilder.ts, txCodec.ts
│   ├── authService.ts
│   ├── walletAuthFlowService.ts
│   ├── walletRegistrationFlowService.ts
│   └── writeFlowService.ts
├── stores/            ← Zustand 상태 관리
│   ├── useWalletStore.ts
│   └── useWalletSessionStore.ts
├── lib/
│   ├── api.ts         ← Axios 인스턴스 + interceptor
│   ├── crypto/        ← address.ts, signature.ts, encryption.ts 등
│   └── constants.ts
└── types/             ← 공통 타입 정의
```

---

## 2. 상태 관리 — Zustand

### useWalletStore

지갑 목록과 선택된 지갑 관리.
개인키는 **암호화된 상태로 IndexedDB에 저장**되며, Zustand에는 메타데이터만.

```
useWalletStore
  ├── wallets: WalletMeta[]        ← 주소, 이름 등 공개 정보
  ├── selectedAddress: string
  └── unlock(password) → 복호화 후 세션에 임시 보관
```

### useWalletSessionStore

잠금 해제 후 세션 동안만 살아있는 민감 상태.
탭을 닫거나 세션 종료 시 자동 소멸.

```
useWalletSessionStore
  ├── privateKey: string | null    ← 복호화된 개인키 (메모리에만)
  └── accessToken: string | null   ← JWT access token
```

### 공부할 것

- [ ] Zustand 기본 — create, subscribe, persist 미들웨어
- [ ] zustand/persist vs sessionStorage vs IndexedDB 차이
- [ ] 민감 데이터를 메모리에만 두는 이유 (XSS 대응)

---

## 3. 브라우저 암호화 — IndexedDB + AES

### 개인키 저장 흐름

```
지갑 생성
    │
    ▼
lib/crypto/wallet.ts — generateKeyPair()
    │  privateKey (평문)
    ▼
lib/crypto/encryption.ts — encrypt(privateKey, password)
    │  AES-GCM 암호화 (브라우저 Web Crypto API)
    ▼
services/keystoreRepository.ts — save(address, encryptedKey)
    │
    ▼
IndexedDB (영속 저장)
```

### 잠금 해제 흐름

```
unlock(password)
    │
    ▼
keystoreRepository.get(address) → encryptedKey
    │
    ▼
encryption.decrypt(encryptedKey, password)
    │
    ▼
useWalletSessionStore.setPrivateKey(plainKey)  ← 메모리에만
```

### 공부할 것

- [ ] Web Crypto API — `SubtleCrypto.encrypt()`, AES-GCM
- [ ] AES-GCM: IV(초기화 벡터) 역할, 태그 검증
- [ ] IndexedDB 기본 — IDBObjectStore, 트랜잭션
- [ ] 왜 localStorage가 아닌가? (XSS 취약점)

---

## 4. 브라우저 서명 — secp256k1

### 인증 서명

```
walletAuthFlowService.ts
    ├── challenge 발급 요청 (POST /auth/challenge)
    ├── lib/crypto/signature.ts — sign(message, privateKey)
    │   └── secp256k1 ECDSA 서명 (DER 인코딩)
    └── verify 요청 (POST /auth/verify, {signature, publicKey})
```

### TX 서명 (txBuilder.ts)

```
서명 대상 데이터 직렬화 → SHA-256 해시 → secp256k1 서명
    │
    ▼
raw tx hex (version + inputs + outputs + signatures)
    │
    ▼
POST /lotto/commit 또는 /lotto/claim 에 hex 포함해서 전송
```

**TX 버전별 차이**

| version | 서명 구조 |
|---------|---------|
| 3 (commit) | 입력 UTXO들에 대한 서명 |
| 5 (claim) | Claim 출력 포함 서명 + 잭팟 풀 UTXO 참조 |

### 공부할 것

- [ ] ECDSA 서명 원리 (secp256k1 곡선)
- [ ] DER 인코딩 — 서명 바이트 직렬화 형식
- [ ] UTXO 모델에서 서명 범위 (Input 참조 + Output 잠금)
- [ ] `txCodec.ts` — raw bytes 직렬화 로직

---

## 5. HTTP 통신 — Axios + React Query

### Axios 인스턴스 (lib/api.ts)

```typescript
// 주요 interceptor
request interceptor: Authorization: Bearer {accessToken} 헤더 자동 추가
response interceptor:
    401 → POST /auth/refresh → 새 accessToken 발급 → 원 요청 재시도
    403 → 다른 지갑 접근 차단 처리
```

### React Query 사용 패턴

```typescript
// 조회 API
useQuery(['lotto-entries', address], () => lottoService.getEntries(address))

// 쓰기 API
useMutation(() => lottoService.commit(signedTx))
```

### 공부할 것

- [ ] React Query 기본 — useQuery, useMutation, QueryClient
- [ ] staleTime vs cacheTime 차이
- [ ] Axios interceptor 체이닝 — 401 retry 패턴
- [ ] AbortController — 요청 취소 패턴

---

## 6. Polling — usePollingQuery

BE가 Push를 지원하지 않으므로(WebSocket 없음) FE가 주기적으로 Pull한다.

```typescript
// hooks/usePollingQuery.ts
usePollingQuery({
  queryFn: () => dashboardService.getDashboard(),
  interval: 5000,       // 5초마다
  pauseOnHidden: true,  // 탭 비활성화 시 pause (document.visibilityState)
})
```

**핵심 구현**
- `document.visibilitychange` 이벤트 감지 → 백그라운드 탭에서 불필요한 요청 차단
- `AbortController` → 컴포넌트 언마운트 시 진행 중인 요청 취소

### 공부할 것

- [ ] Page Visibility API — `document.visibilityState`
- [ ] AbortController + fetch/Axios 취소
- [ ] Polling vs WebSocket vs SSE 비교
- [ ] React Query의 `refetchInterval` 과 커스텀 polling 훅의 차이

---

## 7. 페이지별 주요 흐름

### Dashboard (/dashboard)

```
useDashboardData()
    ├── GET /blockchain/dashboard (polling 5초)
    │   ├── 블록 높이, 잭팟 풀, 피어 수
    │   └── 최근 블록 목록
    └── GET /blockchain/blocks/{height} (블록 클릭 시)
```

### Wallet (/wallet)

```
지갑 생성 → walletRegistrationFlowService.register()
    ├── 키페어 생성 → 암호화 → IndexedDB 저장
    └── POST /wallet (주소 등록)

지갑 연결 → walletAuthFlowService.authenticate()
    ├── POST /auth/challenge
    ├── 서명
    └── POST /auth/verify → accessToken 발급

교환 → exchangeService.exchange()
    └── POST /exchange/jack-to-pot (BE가 서버 지갑으로 TX 빌드)
```

### Lotto (/lotto)

```
커밋 → writeFlowService.commitLotto()
    ├── GET /lotto (현재 잭팟 정보)
    ├── txBuilder.buildCommitTx(version=3)
    └── POST /lotto/commit

클레임 → writeFlowService.claimLotto()
    ├── GET /lotto/entries/{hash}/claim-context (UTXO 정보)
    ├── txBuilder.buildClaimTx(version=5)
    └── POST /lotto/claim
```

---

## 8. 테스트 구조

```
Vitest (40개 테스트)
├── lib/crypto/wallet.test.ts       ← 키 생성, 주소 파생
├── lib/crypto/encryption.test.ts  ← 암호화/복호화 왕복
├── services/tx/txBuilder.test.ts  ← TX 직렬화 검증
├── services/walletAuthFlowService.test.ts
├── services/walletAddFormService.test.ts
├── hooks/pollingHelpers.test.ts
├── hooks/dashboardDataHelpers.test.ts
└── hooks/miningPaginationHelpers.test.ts
```

### 공부할 것

- [ ] Vitest 기본 — describe, it, expect, vi.mock
- [ ] Web Crypto API 테스트 환경 설정 (JSDOM에서 SubtleCrypto)
- [ ] 순수 함수 단위 테스트 vs 훅 테스트 (@testing-library/react-hooks)
