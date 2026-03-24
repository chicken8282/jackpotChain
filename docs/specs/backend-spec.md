# Backend Spec - JackpotChain

> Source of truth: `docs/reviews/api.md`, `docs/reviews/erd.md`, `AGENTS.md`

---

## 1. Hard Rules

- 백엔드는 API 조합, 영속화, 캐시, JackpotChain RPC 어댑터를 담당한다.
- 백엔드는 체인 합의, 채굴 실행, 개인키 보관을 담당하지 않는다.
- 서버 인프라에서는 `jackpotchain-node`만 운영 대상으로 본다.
- 채굴은 사용자가 별도 TUI 실행파일로 참여하는 외부 행위다.
- 백엔드는 서버 노드 RPC로 체인 정보를 조회하고, 이미 서명된 트랜잭션만 제출한다.

금지 규칙:

- private key 저장 금지
- 백엔드에서 miner 프로세스 제어 금지
- Controller에서 RPC 직접 호출 금지
- cross-module Repository 직접 주입 금지
- 불확실한 RPC 결과를 성공으로 위장 금지

---

## 2. Touched Layers 기본 경계

- Controller: 요청/응답 변환만 담당
- Service: 유즈케이스 조합, 트랜잭션 경계, 로그 정책 담당
- Repository: 로컬 프로젝션/조회 담당
- RPC Client: JackpotChain JSON-RPC 어댑터 담당
- MQ: 이번 범위에서는 선택 사항이며 RPC 조회/제출의 대체 수단이 아님

---

## 3. Node Integration Rules

백엔드와 JackpotChain 간 기본 흐름:

```text
Controller -> Service -> RpcClient -> jackpotchain-node(JSON-RPC)
```

허용 RPC 범위:

- 조회: `getblockchaininfo`, `getblockcount`, `getpeerinfo`, `getmempoolinfo`
- 제출: `sendrawtransaction`

불허 범위:

- `startmining`, `stopmining` 같은 서버 측 채굴 제어
- 백엔드에서 miner node/worker 기동

제출 규칙:

- 백엔드는 `signedTxHex`를 그대로 서버 노드에 제출한다.
- 서명이 비어 있거나 포맷이 잘못되면 `COMMON_INVALID_REQUEST`
- RPC 실패, 타임아웃, HTTP 실패, JSON-RPC error, 응답 파싱 실패는 `BLOCKCHAIN_RPC_FAILED`

조회 규칙:

- 조회 RPC는 재시도 없이 단발 호출을 기본으로 한다.
- 조회 실패 시에는 `BLOCKCHAIN_RPC_FAILED`
- 조회 메서드는 `INFO` 로그를 남기지 않는다.

---

## 4. Mining Boundary

- `jackpotchain-node`는 서버 노드다.
- 서버 노드는 네트워크 참여, 정보 조회, 트랜잭션 전파 대상이다.
- 채굴은 `docker-compose.local.yml`이나 백엔드가 제공하지 않는다.
- 사용자가 채굴에 참여하려면 별도 TUI 실행파일 또는 클라이언트를 사용한다.
- `GET /mining/blocks`가 유지되더라도 의미는 “체인에 반영된 채굴 결과 조회”이며, 채굴 실행 제어가 아니다.

---

## 5. Package Structure

기본 패키지:

```text
src/main/java/ssatto/BE_ssatto/
  global/
    config/
    exception/
    response/
    util/
  domain/
    blockchain/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
      rpc/
    wallet/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    lotto/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    auth/
      controller/
      service/
      dto/
      exception/
    exchange/
      controller/
      service/
      dto/
      exception/
    mining/
      controller/
      service/
      dto/
      exception/
```

`blockchain/rpc`는 필수다.

---

## 6. Development Standards

### TDD Cycle

```text
Write test -> ./gradlew test -> confirm failure -> implement -> re-run -> confirm pass
```

필수 원칙:

- 테스트 없이 핵심 로직 구현 시작 금지
- 실패 확인 없이 구현 완료 처리 금지
- 성공/실패 경계 모두 테스트

권장 테스트 레벨:

- RPC Client: 단위 테스트 필수
- Service: 단위 테스트 필수
- Controller: 엔드포인트 추가 시 MockMvc 테스트
- Repository: 복잡한 쿼리일 때만 `@DataJpaTest`

### Comments

- 모든 클래스와 public 메서드는 한국어 설명 주석을 가진다.
- DTO/record도 역할이 불명확하면 주석을 붙인다.

### Result Documentation

- 작업 종료 시 `docs/result/{task-name}.md` 작성
- 반드시 `File & Class Change Log` 포함

---

## 7. Logging

로그 정책:

| Level | 사용 기준 |
|---|---|
| `INFO` | 핵심 비즈니스 이벤트 완료 시점만 |
| `ERROR` | RPC/인프라 실패 |
| `WARN` | 비즈니스 예외, 점진적 저하 |
| `DEBUG` | 로컬 디버깅 전용 |

필수 규칙:

- `log.info()`를 request entry에 두지 않는다.
- `log.info()`를 query 호출에 두지 않는다.
- variable data를 message 본문에 이어붙이지 않고 placeholder 사용
- RPC 실패는 `ERROR`로 남긴다.

예시:

```java
log.info("JACKPOTCHAIN_TRANSACTION_SUBMITTED txId={}", txId);
log.error("JACKPOTCHAIN_RPC_FAILURE method={} message={}", method, exception.getMessage(), exception);
```

---

## 8. Error Handling

- 단일 에러 계약은 `ErrorCode + BusinessException + GlobalExceptionHandler`
- RPC 계층 예외는 서비스/클라이언트 경계에서 `BusinessException`으로 변환

사용 에러 코드:

- `COMMON_INVALID_REQUEST`
- `BLOCKCHAIN_RPC_FAILED`
- `BLOCKCHAIN_BLOCK_NOT_FOUND`
- `BLOCKCHAIN_TX_NOT_FOUND`

---

## 9. Config Rules

필수 프로퍼티:

```yaml
jackpotchain:
  rpc:
    url: ${JACKPOTCHAIN_RPC_URL:http://localhost:8332}
    connect-timeout-ms: 2000
    read-timeout-ms: 5000
```

설정 파일:

- `application.yml`
- `application-local.yml`
- `application-prod.yml`
- `application-test.yaml`

---

## 10. Checklist

- [ ] 서버 노드와 채굴 클라이언트 경계가 명확하다
- [ ] `blockchain/rpc` 패키지가 존재한다
- [ ] 핵심 RPC 조회/제출 로직에 단위 테스트가 있다
- [ ] 테스트를 먼저 쓰고 실패를 확인했다
- [ ] 제출 성공 시에만 `INFO` 로그가 있다
- [ ] RPC/인프라 실패는 `ERROR` 로그다
- [ ] request entry / query `log.info()`가 없다
- [ ] 결과 문서가 작성되었다
