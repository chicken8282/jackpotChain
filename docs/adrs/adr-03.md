# ADR-03: Backend 내부 구조 설계 — 모듈러 모놀리식(Modular Monolith)

| 항목 | 내용 |
|------|------|
| 상태 | ✅ 채택 |
| 날짜 | 2026-03-19 |
| 결정자 | 백엔드 팀 |

---

## 결정 주제

Spring Boot Backend 내부를 어떻게 구조화할 것인가.
전통적 레이어드 모놀리식(Layered Monolith) / 모듈러 모놀리식(Modular Monolith) / MSA(Microservices Architecture) 중 선택한다.

---

## 상황 / 문제

JackpotChain 시스템은 이미 인프라 레벨에서 여러 컴포넌트로 분리되어 있다.

```
[Frontend (React)]  ←HTTP→  [Nginx]  ←HTTP→  [Spring Backend]
                                                      ↕ RPC
                                              [Server Node (Python)]
                                                      ↕ P2P
                                              [TUI Mining Nodes]
```

Spring Backend 내부에는 다음 6개의 명확히 구분되는 도메인이 존재한다.

| 도메인 | 주요 책임 |
|--------|-----------|
| `blockchain` | 블록 수신·파싱·저장, RPC 클라이언트 |
| `wallet` | 지갑 생성·잔액 조회·상태 전이 |
| `exchange` | 코인 ↔ 포인트 환전, 환율 조회 |
| `lotto` | 로또 참여·번호 추첨·당첨 처리 |
| `mining` | 채굴 보상 계산·지급 |
| `ops` | Outbox Dispatcher, 헬스체크, 내부 운영 API |

문제는 **Backend 내부를 어떤 구조로 구성할 것인가**이다.
명확한 도메인 경계 없이 개발하면 도메인 간 의존성이 뒤엉키는 스파게티 구조가 되기 쉽다.
반면 MSA로 분리하면 단일 팀·단기 프로젝트에서 운영 오버헤드가 과도하게 발생한다.

---

## 선택지

### A. 전통적 레이어드 모놀리식 (Layered Monolith)

Controller / Service / Repository 3계층으로만 구분하고, 도메인 간 경계를 별도로 강제하지 않는다.

```
com.jackpotchain
  ├── controller
  │   ├── WalletController.java
  │   ├── LottoController.java
  │   └── BlockchainController.java
  ├── service
  │   ├── WalletService.java
  │   ├── LottoService.java
  │   └── BlockchainService.java
  └── repository
      ├── WalletRepository.java
      └── LottoRepository.java
```

### B. 모듈러 모놀리식 (채택)

도메인별로 패키지를 분리하고, 각 모듈은 자체 Controller / Service / Repository / Domain 객체를 갖는다.
모듈 간 직접 Repository 호출을 금지하고, 인터페이스(내부 API / 이벤트)로만 통신한다.

```
com.jackpotchain
  ├── common          # 공통 예외, 응답 형식, 유틸
  ├── blockchain      # 블록 수신, RPC 클라이언트, Webhook 핸들러
  │   ├── controller
  │   ├── service
  │   ├── repository
  │   └── domain
  ├── wallet          # 지갑 CRUD, 잔액 상태 전이
  ├── exchange        # 환전 로직, 환율
  ├── lotto           # 로또 참여, 추첨, 당첨
  ├── mining          # 채굴 보상 계산·지급
  └── ops             # Outbox Dispatcher, 헬스체크
```

모듈 간 통신 원칙:
- 같은 트랜잭션 내 협력 → `internal` 서비스 인터페이스 호출 (Java 메서드 수준)
- 비동기 협력 → RabbitMQ 메시지 또는 Outbox 이벤트 발행

### C. MSA (Microservices Architecture)

각 도메인을 독립 서비스로 분리하고 HTTP(REST) 또는 gRPC로 통신한다.

```
[wallet-service   :8081]
[exchange-service :8082]
[lotto-service    :8083]
[mining-service   :8084]
[blockchain-service :8085]
[ops-service      :8086]
  ↕ HTTP / gRPC / RabbitMQ
[API Gateway (Nginx / Spring Cloud Gateway)]
```

---

## 비교 기준

### 성능

| 선택지 | 평가 |
|--------|------|
| A. 레이어드 모놀리식 | 단일 JVM, 인메모리 호출. 성능 우수하나 도메인 간 결합이 심해지면 트랜잭션이 길어지고 DB 잠금 경합 증가 |
| **B. 모듈러 모놀리식** | **단일 JVM, 인메모리 호출로 A와 동일한 성능. 모듈 경계로 트랜잭션 범위를 명시적으로 제어 가능** |
| C. MSA | 서비스 간 HTTP 호출 오버헤드 발생. 분산 트랜잭션(Saga)이 필요해 지연 시간 증가 |

### 단순성

| 선택지 | 평가 |
|--------|------|
| A. 레이어드 모놀리식 | 구조 단순. 그러나 기능이 늘수록 Service가 타 도메인의 Repository를 직접 주입해 의존성 그래프가 복잡해짐 |
| **B. 모듈러 모놀리식** | **패키지 구조를 명시적으로 설계해야 하는 초기 비용이 있으나, 이후 기능 추가 시 어느 모듈에 위치할지 즉시 판단 가능** |
| C. MSA | Docker Compose 서비스 수 6배 증가. Service Discovery, 분산 트레이싱, Saga 등 추가 인프라 필수 |

### 유지보수성

| 선택지 | 평가 |
|--------|------|
| A. 레이어드 모놀리식 | 초기 개발 속도 빠르나 기능 추가 시 의존성 파악이 어려움. 리팩토링 비용이 시간에 따라 급증 |
| **B. 모듈러 모놀리식** | **모듈 단위 변경 영향 범위가 명확. 추후 MSA 전환 시 모듈이 서비스 경계가 되므로 마이그레이션 비용 최소화** |
| C. MSA | 서비스 단위 독립 배포 가능. 단, API 계약 변경 시 다수 서비스를 동시에 배포해야 하는 조율 비용 발생 |

### 운영성

| 선택지 | 평가 |
|--------|------|
| A. 레이어드 모놀리식 | 단일 배포 단위. 롤백·장애 분리 쉬움 |
| **B. 모듈러 모놀리식** | **단일 배포 단위 유지. Blue/Green 배포 1회로 전체 반영. 장애 발생 시 로그 1곳만 확인** |
| C. MSA | 서비스별 독립 배포 가능하지만, 6개 서비스를 5명 이하 팀이 운영하는 것은 운영 부담 과중 |

### 팀 숙련도

| 선택지 | 평가 |
|--------|------|
| A. 레이어드 모놀리식 | SSAFY 수업에서 학습한 구조. 팀 전원 즉시 적용 가능 |
| **B. 모듈러 모놀리식** | **패키지 설계 원칙만 공유하면 팀원이 즉시 기여 가능. Spring 추가 프레임워크 불필요** |
| C. MSA | Spring Cloud, Service Mesh, 분산 트레이싱 등 추가 학습 항목이 많아 프로젝트 기간 내 숙련 어려움 |

---

## 최종 선택

**B. 모듈러 모놀리식 (Modular Monolith)**

---

## 선택 이유

1. **도메인 경계가 이미 명확하다**: 기능 명세서, ERD, API 명세서에서 `blockchain / wallet / exchange / lotto / mining / ops` 6개 도메인이 이미 분리되어 있다. 모듈러 모놀리식은 이 경계를 코드 구조로 그대로 반영한다. 레이어드 모놀리식으로 개발하면 반드시 Service 레이어에서 도메인 간 의존성이 뒤엉키는 문제가 발생한다.

2. **MSA의 이점은 현재 규모에서 필요하지 않다**: MSA의 핵심 이점은 서비스별 독립 확장·독립 배포다. 현재 프로젝트는 단일 팀, 단일 EC2, 단일 DB 환경이므로 이 이점이 발현되지 않는다. 오히려 서비스 간 HTTP 호출 오버헤드, 분산 트랜잭션(Saga) 복잡도, 6개 서비스 독립 배포 관리 부담이 프로젝트 완성도를 낮춘다.

3. **단일 JVM 성능과 모듈 경계를 동시에 확보**: 모듈러 모놀리식은 MSA와 달리 서비스 간 HTTP 호출 오버헤드가 없다. 같은 JVM 내 메서드 호출로 도메인 간 협력이 이루어지므로 레이어드 모놀리식과 성능이 동일하면서도 의존성 경계를 강제할 수 있다.

4. **Blue/Green 배포와 CI/CD 단순화**: 모놀리식 단위로 단 1개의 JAR 파일을 빌드하고 배포한다. Jenkins 파이프라인도 1개면 충분하다. MSA 채택 시 서비스 수만큼 파이프라인과 Docker 이미지가 늘어난다.

5. **추후 MSA 전환 경로 확보**: 모듈 간 인터페이스를 HTTP API 계약처럼 명확히 유지하면, 특정 모듈의 부하가 커졌을 때 해당 모듈만 별도 서비스로 추출하는 Strangler Fig 패턴을 적용할 수 있다. 모듈러 모놀리식은 MSA로의 전환 준비 단계이기도 하다.

---

## 감수한 단점 (트레이드오프)

### 1. 모듈 간 의존 방향 강제 필요

Java 패키지는 컴파일 타임에 모듈 간 접근을 제한하지 않는다. 개발자가 실수로 `lotto` 모듈에서 `wallet` 모듈의 Repository를 직접 주입할 수 있다.

**보완책**: 코드 리뷰 체크리스트에 "타 모듈의 Repository 직접 의존 금지" 항목을 추가한다. 빌드 단계에서 ArchUnit 라이브러리로 의존성 방향을 검증하는 테스트를 선택적으로 추가한다.

```java
// ArchUnit 적용 예시 (선택)
@ArchTest
static final ArchRule no_cross_module_repo = noClasses()
    .that().resideInAPackage("..lotto..")
    .should().dependOnClassesThat()
    .resideInAPackage("..wallet..repository..");
```

### 2. 단일 장애 지점(Single Point of Failure)

모든 도메인이 같은 프로세스에서 실행되므로, JVM OOM 등 치명적 장애 발생 시 전체 서비스가 중단된다.

**보완책**: Circuit Breaker(Resilience4j)로 외부 의존성(JackpotChain RPC) 장애를 격리하고, Blue/Green 배포로 무중단 업데이트를 보장한다. 모듈 자체의 버그에 의한 장애는 충분한 테스트로 예방한다.

### 3. 도메인별 독립 스케일링 불가

특정 도메인(예: `lotto`)의 요청이 급증해도 해당 도메인만 수평 확장할 수 없다. 전체 인스턴스를 증설해야 한다.

**보완책**: 현재 프로젝트 규모에서는 단일 EC2 내 성능 최적화(캐싱, DB 인덱스, 커넥션 풀 튜닝)로 충분히 대응 가능하다.

---

## 재검토 조건

아래 상황 중 하나라도 발생하면 MSA 전환을 검토한다.

| 조건 | 설명 |
|------|------|
| 특정 도메인 부하 집중 | `lotto` 또는 `exchange` 단독으로 전체 CPU의 70% 이상을 지속 점유할 경우 |
| 팀 규모 확장 | 도메인별로 독립 팀이 구성되어 배포 주기가 달라질 경우 |
| 모듈 간 의존 위반 반복 | 코드 리뷰·ArchUnit으로도 모듈 경계 위반이 반복 발생할 경우 |
| DB 분리 필요 | 특정 도메인의 DB 스케일링 요구가 발생해 단일 PostgreSQL로 처리가 어려울 경우 |

---

## 면접용 3줄 요약

1. **기능 명세와 ERD에서 이미 6개 도메인(blockchain/wallet/exchange/lotto/mining/ops)이 명확히 분리되어 있었기 때문에, 이 경계를 Java 패키지 구조로 그대로 반영한 모듈러 모놀리식을 채택했습니다.**

2. **MSA는 독립 배포·독립 확장이 핵심 이점인데, 단일 팀·단일 EC2 환경에서는 그 이점보다 서비스 간 HTTP 호출 오버헤드, 분산 트랜잭션 복잡도, 다중 파이프라인 운영 부담이 더 크다고 판단했습니다.**

3. **모듈 간 직접 Repository 접근을 금지하고 내부 인터페이스와 이벤트로만 통신하는 원칙을 지키면, 추후 특정 모듈이 독립 서비스로 분리되어야 할 시점에 Strangler Fig 패턴으로 MSA 전환이 가능한 구조입니다.**
