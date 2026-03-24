# Result: 블록체인 동기화 백그라운드 스케줄러 도입

- **작업일**: 2026-03-24
- **환경**: docker-compose.local.yml 로컬 스택
- **상태**: 완료 (PASS)

---

## Overview

### 무엇을 했는가

`GET /api/v1/wallet/{address}/activities` API 호출 시마다 `BlockchainReadModelSyncService.syncToTip()`이
사용자 요청 스레드에서 실행되던 구조를, **백그라운드 스케줄러가 5초마다 독립 실행**하는 구조로 변경했다.

### 왜 했는가

FE가 해당 API를 10초마다 polling하는 상황에서 블록체인 노드가 계속 채굴하면:
- 동기화 안 된 블록이 수백~수천 개 누적
- 한 번의 API 요청에서 블록당 SELECT + INSERT 반복 → Hibernate 쿼리 로그 폭증
- 사용자 응답 지연 발생

---

## Changed Files

| 파일 | 변경 이유 |
|------|---------|
| `Application.java` | `@EnableScheduling` 추가 — Spring 스케줄러 활성화 |
| `domain/blockchain/scheduler/BlockchainSyncScheduler.java` | 신규 생성 — 5초마다 syncToTip() 호출, try-catch로 스케줄러 스레드 보호 |
| `domain/wallet/service/WalletService.java` | `getActivities()` 내 `syncToTip()` 호출 및 관련 import/필드 제거 |
| `docs/plans/blockchain-sync-scheduler-2026-03-24.md` | 계획 문서 |
| `docs/adrs/ADR-001-blockchain-sync-background-scheduler.md` | 아키텍처 결정 기록 |
| `docs/troubleshootings/blockchain-sync-log-explosion.md` | 트러블슈팅 기록 |

---

## Tests Run

### 1. Docker 백엔드 단독 빌드

```bash
docker compose -f docker-compose.local.yml build backend
```

**결과**: BUILD SUCCESSFUL (Gradle 컴파일, 테스트 제외)

```
> Task :compileJava
> Task :bootJar
BUILD SUCCESSFUL in 33s
```

### 2. 전체 스택 기동

```bash
docker compose -f docker-compose.local.yml up -d
```

**결과**: 전 서비스 Healthy

```
jc-postgres-local  Healthy
jc-redis-local     Healthy
jc-rabbitmq-local  Healthy
jc-node-local      Healthy
jc-backend-local   Healthy
jc-frontend-local  Started
```

### 3. 스케줄러 스레드 분리 확인

백엔드 로그에서 sync 관련 쿼리의 스레드명 확인:

```
# 변경 전 (문제)
[http-nio-8080-exec-6] org.hibernate.SQL - insert into block ...

# 변경 후 (정상)
[scheduling-1] org.hibernate.SQL - insert into block ...
```

**결과**: 모든 sync 쿼리가 `[scheduling-1]` 스레드에서 실행됨 확인.
HTTP 요청 스레드(`http-nio-*`)에서는 sync 관련 쿼리가 더 이상 발생하지 않음.

### 4. JackpotPool lastSyncedHeight 갱신 확인

```
[scheduling-1] binding parameter (2:BIGINT) <- [2909]  ← height 진행 중
[scheduling-1] binding parameter (2:BIGINT) <- [2910]
```

5초마다 새 블록을 정상 적재 중.

---

## Failed / Unresolved

### 미해결: 초기 sync 지연

앱 최초 기동 시 쌓인 블록 전체를 첫 번째 스케줄러 실행에서 처리한다.
블록이 수천 개 쌓인 경우 초기 sync 완료까지 수분이 걸릴 수 있다.
이 시간 동안 `activities` API는 DB에 적재된 데이터만 반환하므로 빈 목록이 나올 수 있다.

- **영향 범위**: 앱 최초 기동 또는 장시간 중단 후 재기동 시 일시적 UX 저하
- **원인 추정**: 정상 동작이며 구조적 한계
- **회피**: 운영 환경에서는 Rolling 재배포로 짧은 중단만 발생하므로 영향 미미

### 미해결: refreshLottoEntries() 전체 순회

`syncToTip()` 내 `refreshLottoEntries()`가 `lottoEntryRepository.findAll()`로 전체 엔트리를 조회한 뒤
각 엔트리마다 RPC를 호출한다. 엔트리가 누적될수록 sync 주기가 길어질 수 있다.

- **영향 범위**: 로또 참여자가 많아지면 5초 안에 sync가 완료되지 않을 가능성
- **원인 추정**: `refreshLottoEntries()` 설계 문제, 본 작업 범위 외
- **권장 후속 작업**: DRAWING 상태인 엔트리만 조회하도록 필터 적용

---

## Next Steps

1. **refreshLottoEntries() 최적화**: `DRAWING` 상태 엔트리만 조회하여 RPC 호출 수 감소
2. **Webhook 연동 안정화**: 노드가 Webhook을 정상 발송하면 스케줄러 주기를 늘리거나 제거 가능
3. **스케줄러 메트릭 추가**: sync 소요 시간, 처리 블록 수를 INFO 로그로 기록하여 모니터링
4. **로그 레벨 조정**: 운영 환경에서는 Hibernate SQL/TRACE 로그 비활성화 권장
   (`org.hibernate.SQL: WARN`, `org.hibernate.orm.jdbc.bind: WARN`)
