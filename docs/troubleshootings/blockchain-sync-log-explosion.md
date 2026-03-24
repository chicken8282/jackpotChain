# Troubleshooting: 백엔드 컨테이너 Hibernate 쿼리 로그 폭증

- **발생일**: 2026-03-24
- **환경**: docker-compose.local.yml 로컬 스택
- **증상 컨테이너**: `jc-backend-local`

---

## 증상

`jc-backend-local` 컨테이너 로그에 다음 패턴이 무수히 반복됨.

```
jc-backend-local | 2026-03-24 01:59:48.720 TRACE [...] - binding parameter (1:VARCHAR) <- [4fe44afe...]
jc-backend-local | Hibernate:
jc-backend-local |     select t1_0.id, t1_0.block_id, ... from "transaction" t1_0 where t1_0.tx_id=?
jc-backend-local | Hibernate:
jc-backend-local |     insert into "transaction" (block_id, ...) values (?, ?, ?, ?, ?, ?, ?, ?)
jc-backend-local | Hibernate:
jc-backend-local |     select b1_0.id, b1_0.difficulty, ... from block b1_0 where b1_0.height=?
jc-backend-local | Hibernate:
jc-backend-local |     insert into block (difficulty, ...) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

동시에 노드 로그에는 계속 채굴 진행:

```
jc-node-local | [Miner] Mining block 2882...
```

---

## 원인 분석

### 직접 원인

`GET /api/v1/wallet/{address}/activities` 핸들러가 `BlockchainReadModelSyncService.syncToTip()`을 인라인 호출.

```java
// WalletService.getActivities() — 문제 코드
blockchainReadModelSyncService.syncToTip();  // ← 여기서 폭발
```

### syncToTip() 동작

```java
for (long height = lastSyncedHeight + 1; height <= currentHeight; height++) {
    syncBlock(height);  // 블록당: SELECT block + INSERT block + SELECT tx + INSERT tx
}
refreshLottoEntries();  // 전체 LottoEntry RPC 조회
syncJackpotPool(currentHeight);  // JackpotPool 갱신
```

### 쌓이는 구조

| 상황 | 결과 |
|------|------|
| 백그라운드 스케줄러 없음 | 블록이 API 호출 전까지 계속 쌓임 |
| FE가 10초마다 activities polling | 요청 시점에 쌓인 블록 전체를 한 번에 처리 |
| 블록 1개당 쿼리 4회 이상 | 블록 1000개 → 쿼리 4000회 이상 한 요청에서 발생 |

### 로그가 많이 찍히는 이유

`application.yml`에서 Hibernate 로그 레벨이 DEBUG/TRACE로 설정되어 있어 모든 쿼리와 바인딩 파라미터가 출력됨:

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

---

## 해결

### 적용한 조치

1. **백그라운드 스케줄러 도입** (`BlockchainSyncScheduler.java`)
   - 5초마다 `syncToTip()` 독립 실행
   - `fixedDelay` 사용으로 동시 실행 방지

2. **WalletService에서 syncToTip() 제거**
   - `getActivities()` 내 인라인 sync 호출 삭제
   - API는 DB 조회만 수행 → 응답 빠름

3. **@EnableScheduling 활성화** (`Application.java`)

### 관련 파일

| 파일 | 변경 |
|------|------|
| `Application.java` | `@EnableScheduling` 추가 |
| `domain/blockchain/scheduler/BlockchainSyncScheduler.java` | 신규 생성 |
| `domain/wallet/service/WalletService.java` | `syncToTip()` 호출 제거 |

---

## 재발 방지

### 유사 패턴 금지

API 핸들러에서 블록체인 RPC를 통한 대량 데이터 동기화를 인라인으로 호출하지 않는다.
사용자 요청 스레드에서 실행 시간이 예측 불가한 작업은 반드시 백그라운드 작업으로 분리한다.

### 확인 방법

정상 동작 시 백엔드 로그에 다음이 5초마다 보이면 스케줄러가 동작 중:

```
# 새 블록이 있을 때 (INSERT 로그)
Hibernate: insert into block ...

# 동기화 완료 후 (API 응답 로그만 있어야 함, 대량 쿼리 없음)
GET /api/v1/wallet/{address}/activities → 200 OK (빠른 응답)
```

### 스케줄러 장애 감지

스케줄러에서 RPC 장애가 발생하면 ERROR 레벨로 기록됨:

```
ERROR [BlockchainSyncScheduler] 블록체인 동기화 중 오류 발생. 다음 주기에 재시도합니다.
```

이 로그가 반복 출력되면 노드 컨테이너(`jc-node-local`) 상태를 먼저 확인한다:

```bash
docker compose -f docker-compose.local.yml ps
docker compose -f docker-compose.local.yml logs jc-node-local --tail 50
```

---

## 참고

- [ADR-001](../adrs/ADR-001-blockchain-sync-background-scheduler.md) — 백그라운드 스케줄러 도입 결정
- `BlockchainReadModelSyncService.syncToTip()` — 동기화 로직 본체
- `BlockchainSyncScheduler.syncBlockchain()` — 스케줄러 진입점
