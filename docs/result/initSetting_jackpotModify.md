# 작업 결과

## 작업명

JackpotChain 초기 세팅 및 Docker/RPC 실행 경로 정합화 1차 구현

## 변경 요약

- Backend Java 기준을 21로 상향했다.
- JackpotChain node 컨테이너 이미지를 새로 정의했다.
- Compose 환경변수가 실제 CLI 인자로 연결되도록 entrypoint를 추가했다.
- RPC host bind를 명시적으로 제어할 수 있게 `--rpc-host`를 추가했다.
- wallet 경로를 파일 단위로 고정하고 local/prod volume에 반영했다.

## File & Class Change Log

| 파일 | 변경 내용 |
|---|---|
| `BE-ssatto/build.gradle` | Java toolchain을 21로 변경 |
| `BE-ssatto/Dockerfile` | builder/runtime 이미지를 JDK/JRE 21 기준으로 변경 |
| `jackpotchain/cli/main.py` | `node` 커맨드에 `--rpc-host` 추가, 기동 로그 보강 |
| `jackpotchain/cli/__init__.py` | `main` 지연 로딩으로 런타임 경고 제거 |
| `jackpotchain/Dockerfile` | Python 기반 node 이미지 정의 추가 |
| `jackpotchain/entrypoint.sh` | 환경변수 → CLI 인자 연결 로직 추가 |
| `jackpotchain/.dockerignore` | node 이미지 빌드 컨텍스트 최소화 |
| `docker-compose.local.yml` | node build context, wallet volume, `NODE_WALLET_FILE` 반영 |
| `docker-compose.prod.yml` | wallet volume, `NODE_WALLET_FILE` 반영 |

## 검증 결과

- `docker compose -f docker-compose.local.yml config` 성공
- `docker compose --env-file .env.prod -f docker-compose.prod.yml config` 성공
- JackpotChain Docker 이미지 빌드 성공
- 테스트 컨테이너 기동 후 `RPC bind: http://0.0.0.0:8332` 확인
- Backend Gradle 테스트는 Java 21 미설치로 미완료

## 후속 작업

- Java 21 런타임 설치 후 백엔드 테스트 재검증
- backend와 jackpotchain-node를 함께 띄우는 compose 스모크 테스트
- Backend RPC 클라이언트 범위 확정 및 다음 구현 단위 착수
