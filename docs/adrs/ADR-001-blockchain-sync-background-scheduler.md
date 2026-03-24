# ADR-001: 블록체인 read-model 동기화를 백그라운드 스케줄러로 이관

- **상태**: 채택 (Accepted)
- **날짜**: 2026-03-24
- **결정자**: BE팀

---

## 컨텍스트

JackpotChain 백엔드는 블록체인 노드의 데이터를 PostgreSQL에 인덱싱하는 read-model을 유지한다.
이 동기화 작업(`BlockchainReadModelSyncService.syncToTip()`)은 마지막으로 동기화된 블록 높이부터
현재 블록 높이까지 누락된 블록을 순서대로 처리한다.

**기존 설계:** `GET /api/v1/wallet/{address}/activities` 요청 시마다 `syncToTip()`을 인라인 호출.

**발생한 문제:**
- FE가 10초마다 해당 API를 polling하고, 노드는 계속 채굴 중
- 블록이 쌓이면 한 번의 API 요청에서 수백~수천 블록을 순회
- 블록당 SELECT + INSERT가 반복되어 Hibernate 쿼리 로그 폭증 및 응답 지연
- 사용자 요청 스레드에서 장시간 트랜잭션이 점유됨

---

## 결정

**`syncToTip()`을 사용자 요청 스레드에서 분리하고, 백그라운드 스케줄러가 5초마다 독립 실행하도록 변경한다.**

### 대안으로 검토한 방식

#### 대안 A: FE polling 기점 throttle 방식
- API 호출 시 마지막 sync로부터 10초 이상 지났으면 syncToTip() 실행, 아니면 스킵
- **기각 이유**: sync가 여전히 사용자 요청 스레드에서 실행됨. 오랫동안 접속이 없다가 재접속 시
  수천 블록을 첫 요청에서 처리해야 하는 문제가 그대로 존재. API 응답 지연 근본 해결 불가.

#### 대안 B: Webhook 기반 실시간 동기화
- 블록체인 노드가 새 블록 수신 시 Backend로 `POST /internal/new-block` Webhook 발송
- **기각 이유**: 아키텍처상 Webhook은 이미 설계되어 있으나, 로컬 환경에서 노드→백엔드 Webhook
  연결이 안정적으로 동작하는지 검증되지 않았고, Webhook 누락 시 복구 메커니즘이 없음.
  현재 단계에서는 polling 기반 백그라운드 스케줄러가 더 단순하고 신뢰성 높음.

#### 채택: 백그라운드 스케줄러
- 사용자 요청 스레드와 완전히 분리
- `fixedDelay = 5000ms`로 이전 실행 완료 후 5초 대기 → 동시 실행 방지
- RPC 장애 시 try-catch로 스케줄러 스레드 보호, 다음 주기에 자동 재시도

---

## 결과

### 변경 파일

| 파일 | 변경 내용 |
|------|---------|
| `Application.java` | `@EnableScheduling` 추가 |
| `domain/blockchain/scheduler/BlockchainSyncScheduler.java` | 신규 생성 — 5초마다 syncToTip() 호출 |
| `domain/wallet/service/WalletService.java` | `getActivities()` 내 syncToTip() 호출 제거 |

### 기대 효과

- `GET /activities` 응답에서 블록 동기화 지연 제거
- Hibernate 쿼리 로그 폭증 해소
- 동기화 주기가 5초로 고정되어 FE polling(10초)보다 빠른 데이터 갱신 보장

### 트레이드오프

- 사용자 접속 여부와 무관하게 스케줄러가 5초마다 RPC를 호출함
  - 노드가 정상 동작 중이면 큰 문제 없음
  - 노드 장애 시 ERROR 로그가 5초마다 발생 → 로그 알림 임계값 고려 필요
- 앱 최초 기동 시 쌓인 블록 전체를 처음 syncToTip() 호출에서 처리 → 초기 sync 완료까지 수분 소요 가능

### 미해결 사항

- 향후 Webhook 연동이 안정화되면 스케줄러를 제거하고 Webhook 기반으로 전환 가능
- `syncToTip()` 내 `refreshLottoEntries()`가 전체 LottoEntry를 순회하므로,
  엔트리가 많아지면 별도 최적화 필요
