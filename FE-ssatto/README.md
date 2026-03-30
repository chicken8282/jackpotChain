# FE-ssatto — React 프론트엔드

JackpotChain 서비스의 웹 프론트엔드입니다. 지갑 생성·관리부터 로또 참여, 채굴 모니터링, 블록 탐색기, 블록체인 학습까지 제공합니다.

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| React | 19 |
| TypeScript | 5.7 (strict) |
| Vite | 6 |
| Zustand | 5 |
| Tailwind CSS | 4 |
| React Router | 7 |
| Recharts | 3 |
| @noble/curves | - (브라우저 암호화) |

---

## 주요 화면

| 화면 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 블록체인 현황, 잭팟 풀, 최근 블록 |
| 지갑 | `/wallet` | 지갑 생성/연결, 잔액, 트랜잭션 내역, 교환 |
| 로또 | `/lotto` | 번호 선택, Commit, 결과 확인 및 Claim |
| 채굴 | `/mining` | 내 채굴 블록 목록, 채굴 보상 통계 |
| 학습 | `/learn` | 블록체인 동작 원리 인터랙티브 학습 |

---

## 지갑 보안 모델

개인키는 서버에 절대 전송되지 않습니다.

```
[브라우저 IndexedDB]
  └── 개인키 (암호화 저장, 잠금 해제 시만 메모리에 올라옴)

[메모리 (Zustand - 미영속)]
  └── 복호화된 개인키, Access Token

[서버]
  └── 공개키, 지갑 주소만 저장
```

**로그인 플로우**
```
1. 지갑 잠금 해제 (비밀번호로 IndexedDB에서 개인키 복호화)
2. GET /auth/challenge → nonce 수신
3. 개인키로 nonce 서명 (브라우저)
4. POST /auth/verify → JWT 수신
```

---

## 디렉토리 구조

```
src/
├── pages/          라우트 단위 컴포넌트
│   ├── DashboardPage.tsx
│   ├── WalletPage.tsx
│   ├── LottoPage.tsx
│   ├── MiningPage.tsx
│   └── Learn*.tsx
├── components/     재사용 UI 컴포넌트 (비즈니스 로직 없음)
├── hooks/          데이터 패칭 및 UI 상태 훅
├── services/       API 호출 순수 함수
├── stores/         Zustand 전역 상태
│   ├── useWalletStore         (지갑 메타데이터, 영속)
│   └── useWalletSessionStore  (복호화 키·토큰, 미영속)
├── types/          공유 TypeScript 타입
└── lib/            유틸 및 암호화 헬퍼
```

---

## 폴링 전략

블록체인 상태는 외부(채굴)에서 변경되므로 주요 데이터를 주기적으로 폴링합니다.

| 엔드포인트 | 주기 | 중단 조건 |
|-----------|------|-----------|
| 지갑 잔액/활동 | 10초 | 페이지 이탈 |
| 로또 참여 목록 | 10초 | 페이지 이탈 |
| 로또 결과 (개별) | 10초 | `status !== DRAWING` |
| 채굴 블록 | 15초 | 페이지 이탈 |

- 탭 비활성화(`visibilityState !== visible`) 시 폴링 일시정지

---

## 로컬 개발

```bash
cd FE-ssatto
npm install

# 개발 서버 (백엔드 로컬 서버 필요)
npm run dev

# 빌드
npm run build

# 테스트
npm run test
```

### 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | 백엔드 API 기본 URL (예: `/api`) |
| `VITE_GMS_API_KEY` | 지도/외부 서비스 API 키 |

---

## Docker (로컬 전체 스택)

```bash
# 루트 디렉토리에서
docker compose -f docker-compose.local.yml --env-file .env.local up -d

# 프론트엔드 단독 빌드
docker build -f Dockerfile.local \
  --build-arg VITE_API_BASE_URL=/api \
  -t jackpotchain-fe:local .
```

접속: `http://localhost:13000`

---

## 빌드 출력

프로덕션 빌드는 `dist/`에 생성되며, `nginx.deploy.conf`를 사용하는 nginx 컨테이너로 서빙됩니다.

- SPA 라우팅: 모든 경로를 `index.html`로 fallback
- `/api/*` 요청은 nginx가 Spring 백엔드로 프록시
