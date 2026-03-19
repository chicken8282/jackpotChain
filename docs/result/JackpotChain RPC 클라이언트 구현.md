# JackpotChain RPC 클라이언트 구현

## Implementation Summary

- `docs/specs/backend-spec.md`를 서버 노드 기반 RPC 연동 구조로 재정의했다.
- `docs/specs/infra-spec.md`를 서버 노드 단일 운영, 외부 TUI 채굴 참여 구조로 재정의했다.
- `BE-ssatto`에 JackpotChain JSON-RPC 클라이언트와 서비스 계층을 추가했다.
- `docker-compose.local.yml`에서 `jackpotchain-miner` 서비스를 제거해 백엔드가 채굴을 수행하지 않는 운영 방향을 반영했다.
- `jackpotchain` 원본 코드의 부팅 차단 이슈는 직접 수정하지 않고 [modify.md](/Users/SSAFY/S14P21E202/docs/reviews/modify.md)에 기록했다.

## Checklist Results

- [x] 백엔드는 `jackpotchain-node` RPC만 사용하도록 스펙을 정리했다.
- [x] `blockchain/rpc` 패키지를 추가했다.
- [x] RPC 조회와 `sendrawtransaction` 경로를 테스트 후 구현했다.
- [x] RPC 실패를 `BLOCKCHAIN_RPC_FAILED`로 변환했다.
- [x] 핵심 비즈니스 완료 이벤트만 `INFO` 로그를 남기도록 구현했다.
- [x] RPC 및 인프라 실패는 `ERROR` 로그로 남기도록 구현했다.
- [x] request entry 및 query 호출에 `log.info()`를 추가하지 않았다.
- [x] 결과 문서를 작성했다.

## Test Results

- TDD 순서:
  1. RPC 클라이언트/서비스 테스트와 패키지 구조 테스트를 먼저 추가했다.
  2. `GRADLE_USER_HOME=.gradle-home .\gradlew.bat test` 실행으로 초기 실패를 확인했다.
  3. RPC 설정, 클라이언트, 서비스, 테스트 보조 생성 경로를 구현했다.
  4. 같은 명령으로 전체 테스트 재실행 후 통과를 확인했다.
- 최종 결과: `BE-ssatto` 테스트 21개 전부 통과

## Remaining Risks

- 현재 `jc-node-local`은 `jackpotchain.core.block` 누락으로 부팅에 실패한다. 백엔드 RPC 클라이언트 구현은 완료됐지만 실제 연동 검증은 `jackpotchain` 원본 복구 전까지 제한된다.
- Spring Data Redis 자동 스캔 로그는 기능 장애는 아니지만 잡음이 크다. 추후 JPA/Redis repository 스캔 범위를 명시적으로 분리하는 편이 운영 로그 품질에 유리하다.
- 테스트에서는 RPC 노드를 Mock 서버로 검증했기 때문에 실제 JackpotChain 응답 스키마가 다르면 추가 매핑 보정이 필요할 수 있다.

## Additional Improvements Needed

- `jackpotchain/consensus/chain.py`, `jackpotchain/core/__init__.py`, `jackpotchain/core/block.py`를 복구해 서버 노드 부팅을 정상화해야 한다.
- 실제 노드가 기동되면 `docker compose -f docker-compose.local.yml up -d` 후 `backend -> jackpotchain-node` 연동 통합 테스트를 추가하는 것이 맞다.

## File & Class Change Log

- 스펙
  - [backend-spec.md](/Users/SSAFY/S14P21E202/docs/specs/backend-spec.md)
  - [infra-spec.md](/Users/SSAFY/S14P21E202/docs/specs/infra-spec.md)
- 문서
  - [jackpotchain-rpc-client-implementation.md](/Users/SSAFY/S14P21E202/docs/plans/jackpotchain-rpc-client-implementation.md)
  - [modify.md](/Users/SSAFY/S14P21E202/docs/reviews/modify.md)
  - [JackpotChain RPC 클라이언트 구현.md](/Users/SSAFY/S14P21E202/docs/result/JackpotChain%20RPC%20%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8%20%EA%B5%AC%ED%98%84.md)
- 인프라
  - [docker-compose.local.yml](/Users/SSAFY/S14P21E202/docker-compose.local.yml)
- 백엔드 설정
  - [Application.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/Application.java)
  - [application.yml](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/resources/application.yml)
  - [JackpotChainRpcConfig.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/JackpotChainRpcConfig.java)
  - [JackpotChainRpcProperties.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/JackpotChainRpcProperties.java)
- 백엔드 구현
  - [JackpotChainRpcClient.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java)
  - [JackpotChainHttpRpcClient.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java)
  - [JackpotChainBlockchainInfo.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainBlockchainInfo.java)
  - [JackpotChainPeerInfo.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainPeerInfo.java)
  - [JackpotChainNodeService.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/JackpotChainNodeService.java)
  - [JackpotChainNodeStatus.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/JackpotChainNodeStatus.java)
- 테스트
  - [PackageStructureTest.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/PackageStructureTest.java)
  - [JackpotChainRpcClientTest.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClientTest.java)
  - [JackpotChainNodeServiceTest.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/service/JackpotChainNodeServiceTest.java)
  - [GlobalExceptionHandlerTest.java](/Users/SSAFY/S14P21E202/BE-ssatto/src/test/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandlerTest.java)
  - [application-test.yaml](/Users/SSAFY/S14P21E202/BE-ssatto/src/test/resources/application-test.yaml)
