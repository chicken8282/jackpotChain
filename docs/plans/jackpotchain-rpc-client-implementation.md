# Goal

백엔드가 `jackpotchain-node` 서버 노드와 JSON-RPC로 통신해 체인 정보를 조회하고 서명된 트랜잭션을 제출할 수 있도록 RPC 클라이언트 계층을 구현한다. 채굴 실행은 백엔드와 Docker Compose 범위에서 제외하고, 외부 TUI 클라이언트 사용자 행위로 경계를 재정의한다.

# Scope

- `docs/specs/backend-spec.md` 업데이트
- `docs/specs/infra-spec.md` 업데이트
- `BE-ssatto`에 JackpotChain RPC 프로퍼티, 클라이언트, 서비스 추가
- `docker-compose.local.yml`에서 miner 서비스 제거
- 테스트 추가 및 수정
- 결과 문서 작성

# Reference Specs

- `AGENTS.md`
- `docs/reviews/api.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- 사용자 피드백: 서버 노드는 정보 조회와 commit 용도, 채굴은 TUI 실행파일 사용자 행위

# Impacted Layers

- Controller: 직접 수정 없음
- Service: 직접 수정
- Repository: 직접 수정 없음
- RPC Client: 직접 수정
- MQ: 직접 수정 없음
- Infra / Compose: 직접 수정

# Failure Points

- JackpotChain RPC 엔드포인트 미기동 또는 타임아웃
- JSON-RPC 응답 포맷 불일치
- Docker Compose에 채굴 컨테이너가 남아 방향성과 충돌
- 설정 프로퍼티 누락으로 애플리케이션 기동 실패

# Implementation Steps

1. 명세 문서를 서버 노드 단일 운영 / 외부 TUI 채굴 기준으로 갱신한다.
2. RPC 클라이언트와 서비스 요구를 테스트로 먼저 표현한다.
3. 테스트 실패를 확인한다.
4. RPC 프로퍼티, 클라이언트, 서비스, 설정을 구현한다.
5. 로컬 compose에서 miner 서비스를 제거한다.
6. 테스트 재실행 후 결과 문서를 작성한다.

# Test Checklist

- [ ] 패키지 구조 테스트에 `blockchain/rpc` 계층 반영
- [ ] RPC 클라이언트 성공 응답 파싱 테스트
- [ ] RPC 클라이언트 실패 응답 예외 변환 테스트
- [ ] 서비스 조합 로직 테스트
- [ ] `./gradlew test` 전체 통과

# Observability Checklist

- [ ] 조회 호출에는 `INFO` 로그 없음
- [ ] 서명 TX 제출 성공 시에만 `INFO`
- [ ] RPC 실패 시 `ERROR`
- [ ] 로그 메시지는 고정 문자열 + placeholder 사용

# Done Criteria

- 백엔드에서 재사용 가능한 JackpotChain RPC 클라이언트가 추가된다.
- 채굴은 인프라와 백엔드 범위 밖이라는 경계가 명세에 반영된다.
- 로컬 compose에서 miner 컨테이너가 제거된다.
- 테스트와 결과 문서가 함께 정리된다.
