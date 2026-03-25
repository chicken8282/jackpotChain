# 챗봇 연결 오류 및 대시보드 네트워크 요청 폭주 수정

- 날짜: 2026-03-25
- 대상 환경: `docker-compose.local.yml`

---

## Overview

**무엇을**: 로컬 Docker 환경에서 두 가지 문제를 수정했다.

1. **챗봇 "연결 오류"**: 싸또 AI 챗봇에서 메시지를 보내면 "⚠️ 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요." 메시지가 표시됨.
2. **대시보드 네트워크 요청 폭주**: 대시보드 탭 진입 시 BE에 `/v1/blockchain/blocks/{height}` 요청이 반복적으로 발생함.

**왜**: `nginx.conf`를 `nginx.local.conf` / `nginx.deploy.conf`로 분리하면서 GMS 프록시 블록(`/gms-proxy/`)이 누락되었고, `Dockerfile.local`에 `VITE_GMS_API_KEY` 빌드 인수가 빠졌다. 대시보드는 폴링 루프 안에서 블록 상세를 무조건 호출하는 구조로 인해 페이지 진입마다 최대 5개의 `blocks/{height}` 요청을 발생시켰다.

---

## Changed Files

| 파일 | 변경 내용 | 이유 |
|------|----------|------|
| `FE-ssatto/nginx.local.conf` | `/gms-proxy/` location 블록 추가 | 챗봇이 GMS API로 요청을 프록시하려면 nginx에서 라우팅해야 함 |
| `FE-ssatto/nginx.deploy.conf` | `/gms-proxy/` location 블록 추가 | dev/prod 배포 이미지에서도 챗봇이 동작하도록 |
| `FE-ssatto/Dockerfile.local` | `ARG VITE_GMS_API_KEY=` / `ENV VITE_GMS_API_KEY=` 추가 | docker-compose에서 전달한 빌드 인수가 Vite 빌드에 반영되지 않았음 |
| `FE-ssatto/Dockerfile.local` | healthcheck URL `localhost:80` → `127.0.0.1:80` | Alpine wget이 `localhost` 호스트명을 resolve 못해 healthcheck가 항상 unhealthy로 표시됨 |
| `docker-compose.local.yml` | frontend healthcheck URL `localhost:80` → `127.0.0.1:80` | 동일한 이유 |
| `FE-ssatto/src/hooks/useDashboardData.ts` | `blocks/{height}` 호출 제거, summary 매핑만 수행 | 폴링 루프에서 블록 상세를 무조건 호출하는 것이 요청 폭주 원인 |
| `FE-ssatto/src/hooks/dashboardDataHelpers.ts` | `formatDateTime` 함수 export 추가 | `useDashboardData`에서 외부 사용 |
| `FE-ssatto/src/components/dashboard/BlockchainVisualizer.tsx` | 블록 클릭 시 `blocks/{height}` 지연 호출 구현 | 모달 열릴 때만 상세 fetch, 불필요한 폴링 제거 |
| `FE-ssatto/src/components/dashboard/BlockDetailModal.tsx` | `isDetailLoading` prop 추가, 로딩 상태 표시 | 상세 데이터가 로딩 중일 때 `...` 및 spinner 표시 |

---

## 수정 상세

### 챗봇 수정

챗봇은 `/gms-proxy/api.openai.com/v1/chat/completions`로 요청을 보낸다.
- **개발 서버**: `vite.config.ts`의 `gmsProxyPlugin`이 프록시 처리
- **Docker 컨테이너**: nginx가 `/gms-proxy/` → `https://gms.ssafy.io/gmsapi/`로 프록시해야 함

`nginx.conf` 분리 시 이 블록이 두 신규 파일에 포함되지 않아 nginx가 404를 반환했다.

```nginx
location /gms-proxy/ {
    resolver 8.8.8.8 valid=300s;
    resolver_timeout 5s;
    proxy_ssl_server_name on;
    proxy_pass https://gms.ssafy.io/gmsapi/;
    proxy_set_header Host gms.ssafy.io;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
}
```

또한 `Dockerfile.local`에 `VITE_GMS_API_KEY` ARG/ENV가 없어서 API 키가 빌드에 포함되지 않았다.

### 대시보드 폴링 수정

**기존 동작**: `useDashboardData` 폴링 루프
1. `/v1/blockchain/dashboard` 호출 (10초마다)
2. 대시보드에 포함된 블록 목록에서 캐시에 없는 높이마다 `/v1/blockchain/blocks/{height}` 호출
→ 페이지 첫 진입 시 최대 6개 요청, 페이지를 나갔다 돌아올 때마다 캐시 초기화로 반복

**수정 후 동작**:
- `useDashboardData`: `/v1/blockchain/dashboard`만 호출, summary 데이터로 블록 목록 구성
- `BlockchainVisualizer.handleSelect`: 블록 클릭 시 해당 블록의 `blocks/{height}`를 1회만 호출
- `BlockDetailModal`: 로딩 중엔 상세 필드 자리에 `...` / 로딩 표시

블록 상세(version, previousHash, nonce, difficulty 등)는 모달 열릴 때만 필요하므로 조건부 호출이 맞다. (`docs/reviews/fe-be-api.md` 권장안과 일치)

### healthcheck 수정

`nginx:1.27-alpine` 이미지에서 `wget`은 `localhost` 호스트명 해석에 실패한다. `127.0.0.1`을 직접 사용하면 정상 동작한다.

---

## Tests Run

| 명령 | 결과 |
|------|------|
| `docker compose -f docker-compose.local.yml up -d --build` | 전체 서비스 정상 기동 |
| `docker compose -f docker-compose.local.yml ps` | 전체 6개 컨테이너 `healthy` |
| `curl http://localhost:13000/` | 200 OK |
| `curl http://localhost:13000/api/v1/blockchain/dashboard` | 200 OK |
| `curl -X POST http://localhost:13000/gms-proxy/api.openai.com/v1/chat/completions` | 401 (GMS 서버 도달 확인 — API 키 없이 호출했기 때문에 401은 정상) |
| `npx tsc --noEmit` (FE-ssatto) | 오류 없음 |

---

## Failed / Unresolved

없음. 모든 수정이 성공적으로 검증됨.

---

## Next Steps

1. **챗봇 API 키 확인**: `.env.local`의 `VITE_GMS_API_KEY` 값이 유효한지 확인 필요. 값이 없거나 만료된 경우 챗봇 응답이 401로 실패함.
2. **`nginx.deploy.conf` API 프록시**: 현재 `nginx.deploy.conf`에는 `/api/` 프록시 블록이 없다. dev/prod 환경에서는 외부 nginx/리버스 프록시가 API를 처리하는 것으로 추정되나, 해당 설정 확인 필요.
3. **다른 페이지 폴링 구현**: `docs/reviews/fe-be-api.md`에 따르면 wallet, lotto, mining 페이지도 polling이 필요하나 미구현 상태. 특히 wallet balance가 stale 될 수 있음.
