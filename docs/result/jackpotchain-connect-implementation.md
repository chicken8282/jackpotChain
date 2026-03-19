# Implementation Summary

- Backend에 블록체인 대시보드 조회와 블록 상세 조회 REST API를 추가했다.
- Backend RPC 클라이언트에 `getblockhash`, `getblock` 래핑과 블록 상세 DTO 파싱을 추가했다.
- JackpotChain RPC 서버의 `getblock` 응답을 확장해 보상, 수수료 보상, 채굴자 주소, 표시용 버전/난이도, 메인 체인 여부를 함께 내리도록 보강했다.
- FE 대시보드가 mock 대신 Backend REST를 읽어 실제 블록/노드 상태를 표시하도록 연결했다.
- 로컬 `.env.local` 예시와 실행 계약 문서를 유지했다.

# Validation

- 성공: `cd BE-ssatto && ./gradlew --no-daemon test`
- 성공: `pytest blockchain/tests/test_cli_main.py blockchain/tests/test_rpc_server_block.py -q`
- 성공: `cd FE-ssatto && npm install`
- 성공: `cd FE-ssatto && npm run build`
- 성공: `docker compose -f docker-compose.local.yml config`

# Notes

- FE 빌드는 초기에는 `tsc: command not found`로 실패했고, 이는 의존성 미설치 상태였다. `npm install` 후 정상 빌드됐다.
- blockchain 변경은 `node.py`가 아니라 `rpc/server.py`와 `cli/main.py`에 한정했다.
- 따라서 기존 P2P 네트워크 처리 핫패스와 합의 로직 수정은 피했다.

# File & Class Change Log

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/controller/BlockchainController.java`
  - 블록체인 대시보드/블록 상세 REST API 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/BlockchainQueryService.java`
  - RPC 응답을 REST 응답으로 조합하는 조회 서비스 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClient.java`
  - `getBlockHash`, `getBlock` 메서드 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`
  - 블록 해시/블록 상세 RPC 호출과 에러 매핑 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainBlock.java`
  - 단일 블록 RPC DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/dto/BlockchainDashboardResponse.java`
  - 대시보드 응답 DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/dto/BlockchainDashboardBlockResponse.java`
  - 대시보드 블록 목록 응답 DTO 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/dto/BlockchainBlockDetailResponse.java`
  - 블록 상세 응답 DTO 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainRpcClientTest.java`
  - 신규 RPC 메서드와 블록 미존재 에러 매핑 테스트 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/service/BlockchainQueryServiceTest.java`
  - 조회 서비스 조합 테스트 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/controller/BlockchainControllerTest.java`
  - REST 엔드포인트 계약 테스트 추가
- `blockchain/rpc/server.py`
  - `getblock` 해시 입력 처리 수정, 응답 메타데이터 확장
- `blockchain/tests/test_rpc_server_block.py`
  - `getblockhash -> getblock` 연쇄와 확장 필드 테스트 추가
- `blockchain/cli/main.py`
  - `--rpc-host` 수용 및 실제 RPC bind 연결
- `blockchain/tests/test_cli_main.py`
  - `--rpc-host` 파서 테스트 추가
- `FE-ssatto/src/lib/api.ts`
  - FE 공통 GET API 헬퍼 추가
- `FE-ssatto/src/hooks/useDashboardData.ts`
  - 대시보드 REST 조회 훅 추가
- `FE-ssatto/src/pages/DashboardPage.tsx`
  - 대시보드 실제 API 데이터 주입
- `FE-ssatto/src/components/dashboard/BlockchainVisualizer.tsx`
  - 외부 데이터 주입 가능하도록 수정
- `FE-ssatto/src/components/dashboard/BlockHeight.tsx`
  - 현재 높이 prop 주입 지원
- `FE-ssatto/src/components/dashboard/NodeNetwork.tsx`
  - 활성 노드 수 prop 주입 지원
