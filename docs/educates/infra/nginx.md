# Nginx — 리버스 프록시와 Blue-Green 배포

> 대상: 면접관 / 포트폴리오 설명
> 범위: Nginx 역할 선택 이유 → 라우팅 구조 → Blue-Green 무중단 배포 → 트레이드오프

---

## 왜 Nginx가 필요한가

JackpotChain은 세 개의 서비스가 하나의 EC2 위에서 동작한다: React SPA(프론트엔드), Spring Boot(백엔드), JackpotChain Node(블록체인). 외부에서 들어오는 모든 HTTP 요청이 각 서비스의 포트로 직접 접근하게 두면 문제가 생긴다.

> **리버스 프록시(Reverse Proxy):** 클라이언트와 서버 사이에 위치해, 클라이언트의 요청을 받아 내부 서버로 전달하는 중간 서버. 포워드 프록시(클라이언트 대신 요청)의 반대 개념이다.

첫째, 포트를 외부에 직접 노출하면 각 서비스를 독립적으로 관리하기 어렵다. SSL 인증서를 서비스마다 각각 관리해야 하고, 포트 번호가 URL에 노출된다. 둘째, 보안상 민감한 엔드포인트(블록체인 Webhook `/internal/*`)를 외부에서 차단할 방법이 없다. 셋째, 배포 시 서비스를 재시작하면 그 순간 모든 요청이 끊긴다.

Nginx를 단일 진입점으로 두면 이 세 가지가 모두 해결된다. 클라이언트는 443(HTTPS) 하나만 알면 되고, 내부 라우팅은 Nginx가 담당한다.

---

## 실제 라우팅 구조

```nginx
# nginx/jackpotchain.conf
server {
    listen 80;
    server_name ssatto777.site;

    # /api/ → Spring Boot (active_spring 업스트림 — blue 또는 green)
    location /api/ {
        proxy_pass http://active_spring/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # / → React SPA (FE nginx 컨테이너 8010)
    location / {
        proxy_pass http://127.0.0.1:8010;
        ...
    }
}
```

`/api/`로 시작하는 요청은 Spring Boot로, 나머지는 FE 컨테이너로 간다. `active_spring`이라는 업스트림 이름에 주목해야 한다. 이것이 Blue-Green 전환의 핵심이다.

```nginx
# /etc/nginx/conf.d/upstream.conf (동적으로 교체되는 파일)
upstream active_spring {
    server 127.0.0.1:8090;   # blue 활성 시
}
# 또는
upstream active_spring {
    server 127.0.0.1:8092;   # green 활성 시
}
```

`/internal/*`은 어떤 location 블록에도 매핑되지 않는다. Nginx에서 명시적으로 차단하지 않아도 매핑이 없으면 404가 반환된다. 블록체인 Node가 BE에 보내는 Webhook POST `/internal/new-block`은 Docker 내부 네트워크를 통해 직접 접근하므로 외부 Nginx를 거치지 않는다.

> **upstream 블록:** Nginx에서 하나 이상의 백엔드 서버를 묶어 이름을 붙이는 설정. `proxy_pass http://업스트림명`으로 참조하며, 업스트림 내 서버를 바꾸면 모든 location 블록이 새 서버로 요청을 보낸다.

---

## Blue-Green 배포 — 왜 이 방식인가

서비스를 새 버전으로 배포할 때 가장 단순한 방법은 기존 컨테이너를 내리고 새 컨테이너를 올리는 것이다. 그런데 이 순간 수십 초 동안 서비스가 중단된다. 새 버전에 버그가 있으면 롤백하는 데도 시간이 걸린다.

> **Blue-Green 배포:** 동일한 운영 환경을 두 개(Blue, Green)로 유지하는 배포 전략. 한쪽이 라이브(active), 다른 쪽은 대기(standby) 상태다. 새 버전을 대기 쪽에 배포하고 검증한 뒤 트래픽을 전환하면 무중단 배포가 가능하다.

JackpotChain은 Spring Boot 컨테이너를 Blue(8090 포트)와 Green(8092 포트) 두 슬롯으로 운영한다. Jenkins가 master 브랜치에 push를 감지하면 항상 Green 슬롯에 배포한다.

```
배포 전:
  active_spring → blue (8090)  ← 라이브 트래픽
  green (8092)                 ← 없거나 이전 버전

배포 중:
  active_spring → blue (8090)  ← 라이브 트래픽 유지
  spring-green 컨테이너 시작    ← 새 버전 기동
  health check (최대 100초)    ← /actuator/health 200 확인

배포 완료:
  active_spring → green (8092) ← upstream.conf 교체 + nginx reload
  blue (8090)                  ← standby (즉시 롤백 가능)
```

트래픽 전환은 upstream.conf 파일 하나를 교체하고 `nginx reload`를 실행하는 것으로 끝난다.

```bash
# scripts/switch-color.sh
TARGET_COLOR="${1:-}"
UPSTREAM_FILE="/etc/nginx/conf.d/upstream.conf"

if [ "${TARGET_COLOR}" = "green" ]; then
  sudo tee "${UPSTREAM_FILE}" > /dev/null <<'EOF'
upstream active_spring {
    server 127.0.0.1:8092;
}
EOF
fi

sudo nginx -t           # 설정 검증 (문법 오류 시 중단)
sudo systemctl reload nginx  # 무중단 reload (기존 연결 유지)
echo "switched active color to ${TARGET_COLOR}"
```

`nginx reload`와 `nginx restart`의 차이가 여기서 중요하다.

> **nginx reload vs restart:** `restart`는 프로세스를 완전히 종료했다 재시작해 기존 연결이 끊긴다. `reload`는 마스터 프로세스는 유지하면서 워커 프로세스를 graceful하게 교체한다. 진행 중인 요청을 처리한 뒤 종료하므로 연결이 끊기지 않는다.

롤백도 동일한 스크립트로 즉시 가능하다:

```bash
bash scripts/rollback.sh blue   # upstream.conf를 blue(8090)로 되돌리고 reload
```

---

## Jenkins CI/CD 파이프라인과의 연계

Jenkins는 전체 배포를 자동화한다. GitLab의 master 브랜치에 push가 감지되면:

```
GitLab push
  └─► Jenkins
        ├─ Checkout
        ├─ Build: ./gradlew clean build -x test
        ├─ Docker Build + Push (tag: BUILD_NUMBER)
        └─ SSH → EC2
              ├─ docker compose pull (새 이미지)
              ├─ spring-green 기동
              ├─ health-check.sh (최대 100초 대기)
              └─ switch-color.sh green (성공 시에만)
```

health check가 실패하면 `set -euo pipefail`에 의해 파이프라인이 중단되고 switch-color가 실행되지 않는다. Blue가 계속 라이브 트래픽을 받는다.

```bash
# scripts/health-check.sh
# 최대 20회 × 5초 = 100초 대기
for i in $(seq 1 20); do
    if curl -sf "http://127.0.0.1:${PORT}/actuator/health" | grep -q '"status":"UP"'; then
        echo "health check passed"
        exit 0
    fi
    sleep 5
done
exit 1   # 실패 → deploy-prod.sh 전체 중단
```

---

## 트레이드오프 — 정직하게 말할 것들

**자원 사용**: Blue와 Green 두 슬롯을 유지하므로 메모리가 두 배 필요하다. Spring Boot 컨테이너 하나가 512MB~1GB를 쓴다면, 배포 중에는 두 컨테이너가 동시에 실행된다. EC2 인스턴스 스펙에 여유가 있어야 한다.

**세션 상태**: Blue와 Green이 서로 다른 JVM 인스턴스이므로, 인메모리 세션을 쓰는 애플리케이션이라면 전환 시 세션이 끊긴다. JackpotChain은 stateless JWT를 쓰기 때문에 이 문제가 없다. JWT는 토큰 자체에 인증 정보가 있어 서버 인스턴스에 묶이지 않는다.

**데이터베이스 마이그레이션**: 새 버전이 스키마 변경을 동반할 때 Blue와 Green이 동시에 실행되는 순간에 문제가 생길 수 있다. Flyway 마이그레이션이 Green 시작 시 실행되면, Blue는 아직 이전 스키마를 기대하는 코드를 실행 중이다. 이를 방지하려면 "하위 호환 마이그레이션" 원칙을 지켜야 한다: 컬럼 삭제는 두 단계로 나눠서(먼저 코드에서 참조 제거 → 다음 배포에서 컬럼 삭제).

> **Rolling vs Blue-Green vs Canary:** Rolling은 인스턴스를 하나씩 교체해 자원을 아끼지만 롤백이 복잡하다. Blue-Green은 전체를 교체하지만 즉각 롤백이 가능하다. Canary는 소수 트래픽만 새 버전으로 보내 A/B 테스트에 유리하지만 구성이 복잡하다.

---

## 면접 Q&A

**Q. Blue-Green 배포를 선택한 이유는?**

롤백이 즉각 가능하기 때문입니다. nginx upstream.conf를 이전 색상으로 바꾸고 reload하면 수 초 안에 롤백됩니다. Rolling 배포는 여러 버전이 동시에 운영되는 혼재 상태가 있어 버그 추적이 복잡하고, 롤백도 모든 인스턴스를 다시 교체해야 합니다. 소수 서버 환경에서 "배포 후 확인 → 문제 시 즉각 롤백" 사이클을 빠르게 돌리려면 Blue-Green이 적합합니다.

**Q. `nginx reload`가 왜 무중단인가?**

reload는 마스터 프로세스를 종료하지 않고 새 설정을 적용한다. 새 워커 프로세스가 새 설정으로 시작하고, 기존 워커 프로세스는 처리 중인 요청을 마저 완료한 뒤 graceful하게 종료된다. 새 요청은 새 워커가 받고, 진행 중인 요청은 기존 워커가 마무리하므로 연결이 끊기지 않는다.

**Q. `/internal/*`은 어떻게 외부에서 차단되는가?**

jackpotchain.conf에는 `/api/`와 `/` 두 가지 location 블록만 있다. `/internal/`에 매핑되는 location이 없으므로 외부에서 이 경로로 요청하면 404가 반환된다. 블록체인 Node → BE 간 Webhook은 Docker 내부 네트워크(컨테이너 간 통신)를 사용하므로 Host Nginx를 거치지 않는다.

**Q. health check가 실패하면 배포는 어떻게 되나?**

`deploy-prod.sh`는 `set -euo pipefail`로 시작한다. health-check.sh가 exit 1을 반환하면 파이프라인이 즉시 중단되고 switch-color.sh가 실행되지 않는다. upstream.conf는 여전히 blue를 가리키고, green 컨테이너는 기동 상태로 남아있다(nginx 라우팅에서만 제외). 수동으로 확인 후 정리하거나, Jenkins가 슬랙/메일로 알림을 보낸다.

**Q. SPA 라우팅은 어떻게 처리하나?**

React SPA는 클라이언트 사이드 라우팅을 사용한다. `/lotto`나 `/wallet` 같은 경로로 직접 접근하면 서버에는 해당 파일이 없어 404가 반환된다. FE nginx 컨테이너의 설정에서 `try_files $uri $uri/ /index.html`로 모든 경로를 `index.html`로 폴백시켜 React Router가 처리하게 한다.

**Q. Nginx와 API Gateway의 차이는?**

Nginx는 HTTP 레벨의 범용 프록시/로드밸런서다. 라우팅, SSL 종료, 정적 파일 서빙, rate limiting 등을 담당한다. API Gateway(AWS API Gateway, Kong 등)는 인증/인가, 요청 변환, API 버전 관리, 사용량 제한, 모니터링 통합 등 API 관리 기능에 특화되어 있다. 소규모 단일 서비스에서는 Nginx가 충분하고 운영 복잡도가 낮다.
