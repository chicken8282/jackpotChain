# Goal

실제 코드베이스를 기준으로 `BE-ssatto`, `FE-ssatto`, `jackpotchain`의 Docker 실행 구성을 추가하고, 루트에 로컬/프로덕션 Compose 파일을 정리한다. 단, 기존 `jackpotchain` 소스 코드 수정이 필요한 부분은 직접 수정하지 않고 `docs/reviews/modify.md`에 수정 방안을 기록한다.

# Scope

- 루트 `docker-compose.local.yml` 생성
- 루트 `docker-compose.prod.yml` 생성
- `BE-ssatto/Dockerfile`, `BE-ssatto/.dockerignore` 생성
- `FE-ssatto/Dockerfile`, `FE-ssatto/.dockerignore`, `FE-ssatto/nginx.conf` 생성
- `jackpotchain/Dockerfile`, `jackpotchain/.dockerignore`, `jackpotchain/entrypoint.sh` 생성
- `.env.prod.example` 생성 및 `.env.prod` 로컬 템플릿 생성
- `docs/reviews/modify.md`에 `jackpotchain` 코드 수정 필요 사항 추가

# Reference Specs

- `AGENTS.md`
- 사용자 제공 "Docker 구성 구현 계획서 — v2"
- `docs/specs/infra-spec.md`
- `docs/reviews/architecture.md`
- `docs/reviews/modify.md`

# Impacted Layers

- 인프라/배포: 직접 수정
- Backend 애플리케이션 코드: 직접 수정 없음
- Frontend 애플리케이션 코드: 직접 수정 없음
- JackpotChain 애플리케이션 코드: 직접 수정 없음
- 문서: 직접 수정

# Failure Points

- `jackpotchain` 실제 소스는 계획서보다 더 많은 누락 모듈을 참조하고 있어 컨테이너 런타임이 실패할 수 있다.
- `cli/main.py`는 `--rpc-host` 인자를 받지 않아 Docker 외부 RPC 노출이 불완전하다.
- Docker 빌드는 외부 이미지/패키지 다운로드가 필요해 로컬 Docker 환경 상태에 영향을 받는다.
- 루트 `.gitignore`가 `jackpotchain` 전체를 무시하고 있어 신규 Docker 관련 파일이 추적되지 않을 수 있다.

# Implementation Steps

1. 실제 코드베이스를 기준으로 Docker 산출물과 문서 수정 범위를 확정한다.
2. 추적 가능한 파일 배치를 위해 루트 ignore 규칙을 조정한다.
3. BE/FE/jackpotchain Dockerfile 및 보조 파일을 생성한다.
4. 루트 compose 파일과 prod 환경 템플릿을 생성한다.
5. `jackpotchain` 코드 수정 필요 사항을 `docs/reviews/modify.md`에 문서화한다.
6. `docker compose config`로 정적 검증을 수행하고 결과 문서를 작성한다.

# Test Checklist

- [ ] `docker compose -f docker-compose.local.yml config` 성공
- [ ] `docker compose -f docker-compose.prod.yml config` 성공
- [ ] Docker 산출물 경로가 실제 디렉터리 구조와 일치함
- [ ] `jackpotchain` 코드 수정 필요 사항이 `modify.md`에 기록됨

# Observability Checklist

- [ ] Spring / FE / JackpotChain 컨테이너 healthcheck 정의
- [ ] 프로덕션 환경변수 분리 경로 정의
- [ ] 로그 폭증을 유발하는 불필요한 도커 레벨 설정 없음

# Done Criteria

- 루트 compose 파일 2종이 추가된다.
- 각 서비스별 Dockerfile 및 보조 파일이 추가된다.
- `jackpotchain` 소스 직접 수정 없이 필요한 수정 포인트가 문서화된다.
- 정적 검증 결과와 잔여 위험이 결과 문서에 정리된다.
