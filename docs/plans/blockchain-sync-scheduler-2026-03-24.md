# Plan: 블록체인 동기화 백그라운드 스케줄러 도입

> 작성일: 2026-03-24

---

## 원인

`GET /api/v1/wallet/{address}/activities` 호출 시마다 `WalletService.getActivities()` 내부에서
`blockchainReadModelSyncService.syncToTip()`이 실행된다.

`syncToTip()`은 `JackpotPool.lastSyncedHeight + 1`부터 현재 블록 높이까지 모든 미동기화 블록을
순회하며 `block`, `transaction`, `wallet_activity`, `lotto_entry` 를 DB에 적재한다.

백그라운드 스케줄러가 없어 블록이 쌓이면 한 번의 API 요청에서 수백~수천 블록을 처리하게 되며,
각 블록당 SELECT + INSERT 쿼리 수 발생 → Hibernate DEBUG/TRACE 로그 폭증 + 응답 지연.

FE는 이 API를 10초마다 polling하므로, 사용자 요청 스레드에서 동기화가 실행되는 한 지연이 반복된다.

---

## 영향 레이어

| 레이어 | 파일 | 변경 종류 |
|--------|------|---------|
| Application | `Application.java` | `@EnableScheduling` 추가 |
| Scheduler (신규) | `BlockchainSyncScheduler.java` | 신규 생성 |
| Service | `WalletService.java` | `syncToTip()` 호출 제거 |
| 문서 | `docs/adrs/`, `docs/troubleshootings/`, `docs/result/` | 신규 작성 |

---

## 변경 범위

### 1. Application.java
- `@EnableScheduling` 어노테이션 추가

### 2. BlockchainSyncScheduler.java (신규)
- 위치: `domain/blockchain/scheduler/`
- `@Scheduled(fixedDelay = 5000)` 로 5초마다 `syncToTip()` 호출
  - `fixedDelay`: 이전 실행 완료 후 N초 대기 → 동시 실행 방지
- RPC 장애 시 예외를 catch하고 ERROR 로그 후 다음 주기에 재시도
- 스케줄러 스레드 보호 목적으로 try-catch 필수

### 3. WalletService.java
- `getActivities()` 내부의 `blockchainReadModelSyncService.syncToTip()` 호출 제거
- 이후 DB 조회만 수행 → 응답 빠름

---

## 실패 가능 지점

| 지점 | 원인 | 대응 |
|------|------|------|
| RPC 장애 | `jackpotChainRpcClient.getBlockCount()` 실패 | try-catch → ERROR 로그 → 다음 주기 재시도 |
| 스케줄러 스레드 종료 | 예외 미처리 시 Spring 스케줄러 스레드 소멸 | `@Scheduled` + try-catch로 보호 |
| DB 트랜잭션 충돌 | sync 실행 중 API 요청이 같은 블록을 조회 | `REQUIRES_NEW` 트랜잭션 이미 적용되어 있어 격리됨 |
| 첫 실행 지연 | 앱 기동 시 쌓인 블록 수천 개 처리 | 정상 동작, 초기 sync 완료 후 안정화 |
