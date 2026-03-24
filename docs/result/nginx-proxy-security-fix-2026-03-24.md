# Nginx 프록시 복구 및 보안 설정 누락 수정

> 작업일: 2026-03-24

---

## Overview

### 무엇을

- `FE-ssatto/nginx.conf`에 `/api/` → `http://backend:8080/` 프록시 블록 복구
- `SecurityConfig.java`에서 `/v1/lotto/claim`, `/v1/lotto/entries/*/claim-context` 인증 요구 누락 추가

### 왜

직전 커밋 `[FIX] BE controller에 api 제거` (f817d81)에서 두 가지 작업이 동시에 이루어졌다:

1. 모든 BE 컨트롤러의 `@RequestMapping` 경로에서 `/api` 프리픽스 제거 (`/api/v1/...` → `/v1/...`)
2. `FE-ssatto/nginx.conf`의 `/api/` 프록시 블록 **삭제**

그런데 기존 nginx 프록시는 `/api/` → `http://backend:8080/api/` (동일 경로 유지)로 설정되어 있었다.
BE 경로가 `/v1/...`로 바뀌면서 nginx에서 `/api/` → `http://backend:8080/` (프리픽스 제거)로 재설정했어야 했으나,
프록시 블록 자체가 삭제되어 프론트엔드 컨테이너에서 백엔드로 가는 모든 API 요청이 차단됐다.

---

## Changed Files

| 파일 | 변경 내용 | 이유 |
|------|-----------|------|
| `FE-ssatto/nginx.conf` | `/api/` 프록시 블록 추가: `proxy_pass http://backend:8080/;` | nginx가 `/api/*` 요청을 백엔드로 전달해야 브라우저의 API 호출이 성공함 |
| `BE-ssatto/.../SecurityConfig.java` | `/v1/lotto/claim`, `/v1/lotto/entries/*/claim-context`를 `.authenticated()` 목록에 추가 | 두 엔드포인트가 누락되어 비인증 요청 시 NPE → 500 에러 발생 |

### 변경 전 nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    ...
}
```

### 변경 후 nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080/;   # /api/ 제거하고 /v1/... 으로 전달
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
    ...
}
```

---

## 사용자 플로우 분석 및 수정 근거

```
지갑 생성/연결   → POST /api/v1/wallet        [PUBLIC]  ← 프록시 없으면 404
잔액 조회        → GET  /api/v1/wallet         [PUBLIC]  ← 프록시 없으면 404
Auth 인증        → POST /api/v1/auth/challenge [PUBLIC]  ← 프록시 없으면 404
                → POST /api/v1/auth/verify    [PUBLIC]  ← 프록시 없으면 404
교환             → POST /api/v1/exchange/*     [AUTH]    ← 프록시 없으면 404
대시보드         → GET  /api/v1/blockchain/... [PUBLIC]  ← 프록시 없으면 404
로또 커밋        → POST /api/v1/lotto/commit   [AUTH]    ← 프록시 없으면 404
로또 클레임      → POST /api/v1/lotto/claim    [AUTH]    ← SecurityConfig 누락 → NPE 500
클레임 컨텍스트  → GET  /api/v1/lotto/entries/*/claim-context [AUTH] ← SecurityConfig 누락 → NPE 500
```

nginx 프록시 누락은 모든 API 호출에 영향을 미치는 **전체 장애** 수준이었다.
SecurityConfig 누락은 Claim 단계(로또 클레임, 클레임 컨텍스트)에서 인증 오류 시 400/401 대신 500을 반환하는 문제였다.

---

## Tests Run

```bash
# 컨테이너 재빌드 및 실행
docker compose --env-file .env.local -f docker-compose.local.yml build --no-cache backend frontend
docker compose --env-file .env.local -f docker-compose.local.yml up -d
```

| 테스트 항목 | 명령 | 결과 |
|------------|------|------|
| 대시보드 API | `curl -s http://localhost:13000/api/v1/blockchain/dashboard` | ✅ 200, 블록 데이터 정상 |
| 블록 상세 API | `curl -s http://localhost:13000/api/v1/blockchain/blocks/3480` | ✅ 200, 블록 상세 정상 |
| 지갑 조회 API | `curl -s http://localhost:13000/api/v1/wallet?addresses=...` | ✅ 404 (미등록 지갑, 프록시 통과 확인) |
| 백엔드 에러 로그 | `docker logs jc-backend-local` | ✅ ERROR/WARN 없음 |
| 프론트엔드 에러 로그 | `docker logs jc-frontend-local` | ✅ 에러 없음, 200/404 정상 기록 |

---

## Failed / Unresolved

### 미해결 없음

위 수정으로 주요 문제는 해결됐다.

### 참고: 지갑 잔액 404의 의미

`GET /api/v1/wallet?addresses=X5vtXAzMJH2waSQhcb5adfVH7jN4aExSM5` → 404

이는 해당 주소가 **백엔드 DB에 등록되지 않은** 상태이기 때문이다.
지갑 잔액 조회는 DB 등록 + on-chain 잔액 RPC 조합이라, DB에 없으면 404다.
새로운 지갑을 `POST /api/v1/wallet`으로 등록하면 정상 조회된다.

---

## Next Steps

1. **FE 폴링 미구현 API 추가** (`docs/reviews/fe-be-api.md` 기준)
   - `GET /wallet?addresses=...` — 10초 polling 미구현
   - `GET /wallet/{address}/activities` — 10초 polling 미구현
   - `GET /lotto/entries` — 10초 polling 미구현

2. **docker-compose.local.yml에 nginx 서비스 추가 검토**
   - 현재 FE 컨테이너의 nginx가 프록시 역할을 겸하고 있어, 프론트엔드 컨테이너 빌드 시마다 nginx 설정도 같이 빌드된다.
   - 독립 nginx 컨테이너로 분리하면 FE 재빌드 없이 프록시 설정 변경 가능.

3. **SecurityConfig의 `/v1/lotto/claim`, `/v1/lotto/entries/*/claim-context` 인증 테스트** 추가
   - 현재 `LottoControllerTest`에서 비인증 요청 시 401 반환 여부 검증 케이스 추가 권장
