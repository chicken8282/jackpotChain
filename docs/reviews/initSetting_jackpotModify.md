# Implementation Summary

- `BE-ssatto`의 Java toolchain과 Docker base image를 Java 21 기준으로 정렬했다.
- `jackpotchain`에 Dockerfile, entrypoint, `.dockerignore`를 추가해 node 이미지를 실제로 빌드하고 기동할 수 있는 기반을 만들었다.
- `jackpotchain/cli/main.py`에 `--rpc-host`를 추가해 compose 환경의 `NODE_RPC_HOST=0.0.0.0`가 실제 RPC bind에 반영되도록 수정했다.
- local/prod compose에 wallet volume과 `NODE_WALLET_FILE` 기반 실행 계약을 반영했다.
- `jackpotchain.cli` 패키지 초기화 시 불필요한 선행 import가 일으키던 런타임 경고를 제거했다.

# Checklist Results

- [x] Java 21 기준 정렬이 계획에 맞게 반영되었다.
- [x] `jackpotchain-node` 단일 실행 계약을 local/prod compose에 공통 반영했다.
- [x] `jackpotchain/Dockerfile`, `jackpotchain/entrypoint.sh`, `jackpotchain/.dockerignore`가 추가되었다.
- [x] `node --rpc-host` 지원이 추가되었다.
- [x] wallet/data persistence 경로가 compose volume으로 명시되었다.
- [x] admin 페이지나 miner 컨테이너를 새로 도입하지 않았다.
- [ ] Backend 테스트 전체 통과 확인
  - 로컬에 Java 21 런타임이 없어 미완료

# Test Results

- 성공: `docker compose -f docker-compose.local.yml config`
- 성공: `docker compose --env-file .env.prod -f docker-compose.prod.yml config`
- 성공: `docker build -t jackpotchain-node-local-test -f C:\Users\SSAFY\S14P21E202\jackpotchain\Dockerfile C:\Users\SSAFY\S14P21E202\jackpotchain`
- 성공: 테스트 컨테이너 기동 후 로그에서 `RPC bind: http://0.0.0.0:8332` 확인
- 실패: `BE-ssatto\gradlew.bat test`
  - 원인: 로컬 머신에 Java 21 설치가 없어 Gradle toolchain을 만족하지 못함

# Remaining Risks

- 현재 개발 환경에는 Java 21이 없어 백엔드 테스트와 빌드 검증이 완료되지 않았다.
- `jackpotchain` 컨테이너는 기동 시 외부 피어와 즉시 동기화를 시도하므로, 로컬 스모크 테스트에서 네트워크 의존성이 생긴다.
- 로또/지갑 전용 RPC를 백엔드에서 어디까지 래핑할지는 `docs/specs/backend-spec.md`와 계획 문서 간 추가 정렬이 필요하다.
- `docker-compose.prod.yml`은 정적 검증만 수행했고, 실제 운영 이미지 기동까지는 검증하지 않았다.

# Additional Improvements Needed

- Java 21 설치 후 `BE-ssatto\gradlew.bat test` 재실행
- local compose 전체 `up -d` 기준 backend 연동 스모크 테스트 수행
- node 기동 시 외부 피어 자동 연결을 제어할 로컬 전용 옵션 검토
- Backend RPC 범위를 계획 문서와 `backend-spec.md` 기준으로 다시 확정
