# Redis, RabbitMQ 도입 관점 설계 점검 메모

> 작성일: 2026-03-20
> 기준 문서: `docs/reviews/architecture.md`
> 대상: `BE-ssatto`, `FE-ssatto`

---

## 결론

- `BE-ssatto`
  - Redis: 부분적으로 도입 친화적이다.
  - RabbitMQ: 의존성은 있으나, 실제 설계 경계는 아직 얇다.
- `FE-ssatto`
  - Redis/RabbitMQ 도입을 막는 구조는 아니다.
  - 다만 현재가 폴링 중심이라, 캐시/이벤트 기반 구조의 이점을 크게 받으려면 API 계약 보완이 필요하다.

즉, 지금 상태는 `Redis는 일부 준비됨`, `RabbitMQ는 방향만 있고 실제 도입용 구조는 보강 필요`로 보는 것이 정확하다.

---

## 1. architecture.md 기준 기대 구조

아키텍처 문서가 기대하는 방향은 명확하다.

- Redis
  - 조회 캐시
  - 짧은 TTL
  - 이벤트 기반 수동 무효화
  - 중복 요청 방지용 lock
- RabbitMQ
  - Node/Spring 운영 이벤트 비동기 처리
  - Outbox 패턴
  - 로그/알림/통계 적재 분리

즉, 핵심은 아래 두 가지다.

1. 조회 계층은 캐시 친화적으로 분리되어 있어야 한다.
2. 상태 변화 계층은 이벤트 발행 지점을 분리할 수 있어야 한다.

---

## 2. BE-ssatto 점검

### 2.1 Redis 준비도

준비된 부분:

- `spring-boot-starter-data-redis` 의존성 포함
- `application-local.yml`, `application-prod.yml`에 Redis 설정 존재
- `AuthChallengeRepository` 추상화 존재
- `RedisAuthChallengeRepository` 구현체 존재

판단:

- 인증 챌린지 저장소처럼 "짧은 TTL + 휘발성 데이터"는 Redis 친화적으로 잘 열려 있다.
- 즉, 저장소 인터페이스를 두고 구현체를 교체하는 방향은 맞다.

부족한 부분:

- 블록체인 조회 계층에는 캐시 추상화가 없다.
- `BlockchainQueryService`, `LottoService`, `ExchangeService`, `WalletService`가 RPC를 직접 호출한다.
- 캐시 키, TTL, eviction 지점이 코드 구조상 아직 드러나지 않는다.
- Redis lock을 적용할 커맨드 계층이 분리되어 있지 않다.

### 2.2 RabbitMQ 준비도

준비된 부분:

- `spring-boot-starter-amqp` 의존성 포함
- `application-local.yml`, `application-prod.yml`에 RabbitMQ 설정 존재

부족한 부분:

- `@RabbitListener`, `RabbitTemplate`, queue/exchange/binding 설정 없음
- outbox entity/repository/dispatcher 없음
- 도메인 이벤트 객체 없음
- 서비스 메서드가 이벤트 발행 없이 RPC와 DB 작업을 직접 끝낸다

판단:

- RabbitMQ는 "인프라 의존성만 추가된 상태"다.
- 아키텍처 문서의 `Outbox + Event Plane`까지는 아직 도달하지 못했다.

### 2.3 설계상 좋은 점

- 도메인별 패키지 구조가 분리되어 있다.
- 인증 영역은 repository abstraction이 있어 Redis 도입 방식의 좋은 예시가 이미 있다.
- 조회 서비스와 명령 서비스가 완전히 분리되진 않았지만, 서비스 계층이 있어 확장 포인트는 있다.

### 2.4 설계상 아쉬운 점

- RPC 호출이 서비스 내부에 직접 박혀 있어 캐시/이벤트 삽입 지점이 약하다.
- "조회 결과 조합"과 "외부 RPC 호출"이 같은 클래스에 섞여 있다.
- 상태 변화 후 후속 작업을 비동기로 넘길 도메인 이벤트 계층이 없다.
- Outbox를 붙이기 위한 트랜잭션 경계가 아직 없다.

---

## 3. FE-ssatto 점검

### 3.1 현재 구조

- `lib/api.ts` 기반 fetch 공통화
- `usePollingQuery` 기반 폴링
- dashboard, lotto overview 등 주요 화면이 주기적 조회 중심
- Zustand store는 세션/지갑 상태 관리용

### 3.2 Redis 도입 관점

프론트는 Redis를 직접 알 필요는 없다. 대신 아래 조건이 필요하다.

- 캐시된 응답과 원본 응답을 동일한 계약으로 받을 수 있어야 한다.
- 캐시 stale 여부를 표현할 수 있어야 한다.
- fallback 응답이 와도 UI가 깨지지 않아야 한다.

현재 구조는 기본 fetch/polling이라 이 자체가 Redis 도입을 막지는 않는다. 다만 아래 메타 정보가 없어서 "캐시 응답"을 더 잘 활용하기 어렵다.

- `cached`
- `stale`
- `cachedAt`
- `lastSyncedAt`

### 3.3 RabbitMQ 도입 관점

프론트는 RabbitMQ를 직접 붙이지 않는다. 보통은 아래 둘 중 하나가 필요하다.

1. 백엔드가 MQ 이벤트를 받아 상태를 갱신하고, 프론트는 계속 조회
2. 백엔드가 SSE/WebSocket으로 프론트에 변경 이벤트를 푸시

현재 FE는 1번 구조에는 맞는다. 하지만 2번으로 확장하려면 준비가 거의 없다.

부족한 부분:

- SSE/WebSocket 구독 계층 없음
- "명령 제출 후 pending 상태를 기다리는 UI" 패턴이 약함
- eventual consistency를 표현하는 공통 상태 모델이 없음

---

## 4. 도입하기 쉽게 바꿔야 할 핵심 지점

### 4.1 BE: 조회 계층에 캐시 경계 추가

지금은 서비스가 RPC를 직접 호출한다. 아래처럼 한 단계 감싸는 것이 좋다.

- `BlockchainReadService`
- `LottoReadService`
- `ExchangeReadService`
- `WalletReadService`

그리고 내부에서 아래처럼 분리한다.

- `JackpotChainRpcClient`: 원본 조회
- `...CacheService` 또는 `...QueryRepository`: Redis 캐시 조회/저장

핵심은 "서비스가 캐시 구현을 직접 모르고", 조회 포트만 호출하게 만드는 것이다.

### 4.2 BE: 명령 후 후속 작업을 이벤트로 분리

현재 `ExchangeService`, `LottoService`, `WalletService`는 성공 후 바로 끝난다. 여기에 아래 개념이 필요하다.

- domain event
  - `WalletRegisteredEvent`
  - `ExchangeSubmittedEvent`
  - `LottoCommitSubmittedEvent`
- outbox 저장
- dispatcher 발행

이 구조가 있어야 RabbitMQ를 붙여도 서비스 메서드가 오염되지 않는다.

### 4.3 BE: Redis lock 적용 지점 명확화

아키텍처 문서상 Redis lock은 commit/claim 중복 방지용이다. 그러면 커맨드 서비스가 아래처럼 분리되어야 한다.

- `LottoCommandService`
- `ExchangeCommandService`

여기서만 lock을 잡고, 조회 서비스는 lock을 모르게 두는 편이 깔끔하다.

### 4.4 BE: Health/운영 설정 정리

현재 `application.yml`에서는 `management.health.redis.enabled=false`, `management.health.rabbit.enabled=false`다.

아키텍처 문서상 Redis/RabbitMQ를 운영 핵심 컴포넌트로 볼 거면, 운영 profile에서는 최소한 아래는 다시 정리해야 한다.

- health check 포함 여부
- 장애 시 readiness 영향 범위
- degraded mode 허용 여부

### 4.5 FE: 캐시/비동기 상태를 표현할 응답 계약 보강

프론트가 크게 바뀔 필요는 없지만, 아래 필드는 있으면 좋다.

- `data`
- `meta.cached`
- `meta.stale`
- `meta.lastUpdatedAt`
- `meta.pending`

이 메타가 있으면 Redis fallback, MQ 비동기 반영, 재처리 중 상태를 UI에서 자연스럽게 표시할 수 있다.

### 4.6 FE: 폴링 전용 구조에서 한 단계 확장

지금은 전부 폴링이다. 1차는 유지해도 된다. 다만 아래 확장 포인트는 미리 두는 편이 좋다.

- `useServerEvents` 같은 SSE hook 추가 가능 구조
- "submit 후 완료 대기" 전용 hook 분리
- 폴링 interval을 화면별로 더 세밀하게 조정

---

## 5. 추천 변경안

### 5.1 BE 우선 변경

1. 조회 전용 계층과 명령 전용 계층을 더 분명히 나눈다.
2. Redis를 붙일 조회 포트를 만든다.
3. 도메인 이벤트와 outbox 테이블을 추가한다.
4. RabbitMQ 발행은 서비스 본문이 아니라 dispatcher가 담당하게 한다.
5. `claim`, `commit`, `exchange`에 idempotency/lock 지점을 명시한다.

### 5.2 FE 우선 변경

1. 응답 메타 모델을 받을 수 있게 공통 API 타입을 확장한다.
2. polling hook이 `stale`, `pending` 상태를 다룰 수 있게 한다.
3. 실시간이 꼭 필요한 화면만 나중에 SSE/WebSocket 확장을 고려한다.

---

## 6. 파일 단위로 보면 바꾸기 좋은 곳

### BE

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/BlockchainQueryService.java`
  - Redis 캐시 계층을 붙이기 좋도록 read facade로 분리 필요
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
  - read / command 분리 필요
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeService.java`
  - read / command 분리 필요
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - 조회/등록/활동 로직 분리 필요
- `BE-ssatto/src/main/resources/application.yml`
  - Redis/RabbitMQ health 정책 재정의 필요

추가 후보 파일:

- `global/cache/...`
- `global/messaging/...`
- `domain/.../event/...`
- `domain/.../outbox/...`

### FE

- `FE-ssatto/src/lib/api.ts`
  - 응답 메타 확장 지점
- `FE-ssatto/src/hooks/usePollingQuery.ts`
  - stale/pending 상태 수용 지점
- `FE-ssatto/src/hooks/useDashboardData.ts`
  - 캐시/실시간 반영 실험 시작점으로 적절
- `FE-ssatto/src/hooks/useLottoOverview.ts`
  - eventual consistency 반영 테스트 시작점으로 적절

---

## 7. 최종 판단

현재 설계는 Redis, RabbitMQ를 "나중에 도입 못 할 정도로 잘못된 구조"는 아니다. 하지만 아키텍처 문서 수준의 확장 설계를 이미 만족한다고 보기도 어렵다.

정리하면:

- Redis
  - 인증 챌린지 저장소처럼 일부는 이미 좋은 방향
  - 조회 캐시 계층은 아직 별도 설계가 필요
- RabbitMQ
  - 설정과 의존성만 있고, 실제 이벤트/Outbox 구조는 아직 없음
- FE
  - 폴링 기반이라 1차 연동은 가능
  - 캐시 메타와 비동기 상태 표현이 없어서 확장성은 보완 필요

가장 중요한 변경 포인트는 두 가지다.

1. BE에서 `조회/명령/이벤트 발행` 경계를 분리할 것
2. FE에서 `cached/stale/pending` 같은 비동기 상태를 받을 수 있게 할 것

이 두 가지만 먼저 정리하면 Redis와 RabbitMQ는 훨씬 쉽게 들어간다.
