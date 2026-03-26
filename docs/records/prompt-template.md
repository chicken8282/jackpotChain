# Claude Code 작업 프롬프트 템플릿

> 이 파일은 Claude Code에 작업을 시킬 때 사용하는 범용 프롬프트 템플릿이다.
> 작업 유형(기능 구현, 리팩토링, QA/버그 수정, 인프라 등)에 관계없이 공통으로 사용한다.

---

## 프롬프트 구조

```
[Read first]
[작업 지시]
[결과 문서화]
```

---

## 실제 프롬프트

```
Read first:
- `docs/records/architecture.md`
- `docs/records/api.md`          ← API 변경이 있을 때만
- `docs/records/erd.md`          ← DB/엔티티 변경이 있을 때만
- `docs/reviews/auth.md`         ← 인증/세션 관련 작업 시
- `docs/reviews/fe-be-api.md`    ← FE-BE 연동/polling 관련 시
- `docs/reviews/monitoring.md`   ← 로깅/메트릭 관련 시
- `BE-ssatto/CLAUDE.md`          ← BE 작업 시
- `FE-ssatto/CLAUDE.md`          ← FE 작업 시
- `blockchain/CLAUDE.md`         ← blockchain 작업 시
- `nginx/CLAUDE.md`              ← infra 작업 시

Task:
- [ ]  보상정책
    - [ ]  상세보기 아이콘 제거
    - [ ]  보상 정책 컴포넌트 수정
        
        ## 컴포넌트 타이틀 변경
        
        - `"보상 정책"` → `"JackpotChain 정책"`
        - `eyebrow="정책"` 유지 or `"체인 정책"` 으로 변경
        
        ---
        
        ## 1번 — 블록 채굴 보상
        
        `eyebrow: "채굴 보상"
        title: "블록 채굴 보상"
        summary: "블록을 성공적으로 채굴하면 채굴자 주소로 JACK이 자동 지급됩니다."
        
        paragraphs:
          1. JackpotChain은 Proof-of-Work 방식으로 블록을 생성합니다. 채굴자는
             논스값을 탐색해 난이도 조건을 만족하는 해시를 찾으면 해당 블록의
             생성자로 기록되며, 코인베이스 트랜잭션을 통해 JACK이 지급됩니다.
        
          2. 블록 보상은 블록 높이와 난이도에 따라 결정되며, 블록이 메인 체인에
             확정된 이후 채굴 페이지의 '내가 채굴한 블록' 목록에 반영됩니다.
             확정 전 상태의 블록은 집계에 포함되지 않습니다.
        
          3. 블록 채굴 시 포함된 트랜잭션의 수수료 일부도 채굴자에게 합산 지급됩니다.
             따라서 블록당 실제 수령 보상은 기본 블록 보상과 수수료 보상의 합산입니다.
        
        bullets:
          - 지급 통화: JACK (블록 확정 후 코인베이스 트랜잭션으로 자동 지급)
          - 확인 위치: 채굴 페이지 → 내가 채굴한 블록 목록 및 총 채굴 보상
          - 정산 기준: 메인 체인 확정 블록만 집계 대상 (포크 블록 제외)`
        
        ---
        
        ## 2번 — 지갑 생성 시 1 POT 보상
        
        `eyebrow: "온보딩 보상"
        title: "지갑 생성 보상"
        summary: "신규 지갑을 생성하면 로또 참여를 위한 1 POT이 자동으로 지급됩니다."
        
        paragraphs:
          1. JackpotChain에서 지갑을 처음 생성하면 온보딩 보상으로 1 POT이 지급됩니다.
             이 POT은 바로 사용할 수 있는 것이 아니라, 트랜잭션이 블록에 포함되어
             체인에 기록된 후에야 지갑 잔액에 반영됩니다.
        
          2. 블록체인 특성상 트랜잭션은 채굴 주기에 따라 처리됩니다. 블록이 생성되기
             전까지는 트랜잭션이 mempool 대기 상태이며, 블록 채굴 후 확정되면
             지갑 잔액에 1 POT이 표시됩니다.
        
          3. 온보딩 보상은 지갑 주소당 최초 1회만 지급됩니다. 동일 주소로 재등록하거나
             기존 지갑을 등록하는 경우에는 이미 지급된 것으로 간주하여 중복 지급되지
             않습니다.
        
        bullets:
          - 지급 통화: 1 POT (최초 지갑 생성 시 1회 한정)
          - 지급 시점: 지갑 생성 직후가 아닌, 블록 채굴 완료 후 체인 확정 시
          - 사용처: POT은 로또 참여권으로 사용되며, JACK ↔ POT 교환으로 추가 획득 가능`
        
        ---
        
        ## 3번 — 로또 보상 (재작성)
        
        `eyebrow: "잭팟 보상"
        title: "로또 보상"
        summary: "16진수(0~F) 6자리를 선택해 로또에 참여하고, 일치하는 자리 수에 따라 JACK을 수령합니다."
        
        paragraphs:
          1. 로또 참여에는 1 POT이 필요합니다. 참여 시 16진수(0~F) 중 하나를
             6자리 순서대로 선택합니다. 참여 후 일정 블록이 채굴되면 해당 블록의
             해시값을 기반으로 당첨 번호가 결정되며, 선택한 숫자와 자리별로
             비교해 일치 개수에 따라 보상이 지급됩니다.
        
          2. 잭팟 풀은 블록이 채굴될 때마다 참여 수수료의 일부가 자동 적립됩니다.
             6자리를 모두 맞춘 1등은 당첨 시점 잭팟 풀의 50%를 수령하며,
             같은 블록에 복수의 1등이 나올 경우 해당 금액을 균등 분배합니다.
             나머지 잔여 풀은 이월되어 계속 누적됩니다.
        
          3. 당첨금은 블록 확정 후 당첨 트랜잭션이 체인에 기록되면 지갑 잔액에
             반영됩니다. 참여 내역과 당첨 결과는 로또 페이지의 '참여 내역'에서
             확인할 수 있습니다.
        
        bullets:
          - 참여 비용: 1 POT (100 JACK으로 교환 가능, 참여 시 소각)
          - 등수별 보상:
              1등 (6자리 일치) → 잭팟 풀의 50%
              2등 (5자리 일치) → 100,000 JACK
              3등 (4자리 일치) → 20,000 JACK
              4등 (3자리 일치) → 2,000 JACK
              5등 (2자리 일치) → 300 JACK
              6등 (1자리 일치) → 1 POT 환급
          - 당첨 기준: 블록 해시 기반 난수 결정 (순서 일치, 조작 불가)`
Before coding:
1. 영향받는 파일/레이어를 간단히 정리한다.
2. 모호한 점이나 가정을 짧게 적는다.
3. 수정 계획을 작성한다(docs/plans/): 원인 → 영향 레이어 → 변경 범위 → 실패 가능 지점

After implementation:
docker-compose.local.yml를 실행해서 테스트 검증한다
`docs/result/{task-name}-{date}.md`를 한국어로 작성한다:
- Overview: 무엇을 왜 했는지
- Changed Files: 변경한 파일과 이유
- Tests Run: 실행한 테스트 명령, 통과/실패 수, 핵심 에러
- Failed / Unresolved: 실패나 미해결 이슈, 원인 추정, 영향 범위
- Next Steps: 다음으로 권장하는 작업
```

---

## Read first 선택 가이드

작업 범위에 해당하는 것만 남기고 나머지는 제거한다.

| 작업 유형              | 읽을 파일                                                    |
| ---------------------- | ------------------------------------------------------------ |
| BE 기능/버그           | `architecture.md`, `BE-ssatto/CLAUDE.md`                     |
| BE API 변경            | + `api.md`, `docs/reviews/auth.md`                           |
| BE DB 변경             | + `erd.md`                                                   |
| FE 기능/버그           | `architecture.md`, `FE-ssatto/CLAUDE.md`                     |
| FE-BE 연동/polling     | + `api.md`, `docs/reviews/fe-be-api.md`                      |
| FE 인증 흐름           | + `docs/reviews/auth.md`                                     |
| blockchain 노드        | `blockchain/CLAUDE.md`                                       |
| infra / Docker / Nginx | `architecture.md`, `nginx/CLAUDE.md`                         |
| CI/CD (Jenkins)        | `architecture.md`, `nginx/CLAUDE.md`, `docs/records/plan.md` |
| 모니터링               | `architecture.md`, `docs/reviews/monitoring.md`              |
| 성능 테스트            | `architecture.md`, `docs/records/plan.md`                    |
| QA / 버그 재현         | 해당 레이어 CLAUDE.md + 관련 review 문서                     |

---

## 작업 지시 작성 팁

- **구체적으로**: "로또 claim 버튼 클릭 시 500 에러 발생"이 "claim이 안 됨"보다 낫다.
- **범위 명시**: "FE-ssatto/src/pages/LottoPage.tsx의 claim 흐름만 수정"
- **제약 명시**: "blockchain 코드는 건드리지 않는다", "새 테이블 추가 없이 해결"
- **참고 파일**: 관련 결과 문서가 있으면 함께 명시 (예: `docs/result/local-claimable-entry-qa-2026-03-22.md` 참고)

---

## 예시

### 예시 1 — BE 버그 수정

```
Read first:
- `docs/records/architecture.md`
- `BE-ssatto/CLAUDE.md`
- `docs/reviews/auth.md`

Task:
`POST /auth/verify`에서 이미 사용된 challengeId를 재사용했을 때
400이 아닌 500이 반환되는 버그를 수정한다.
BE-ssatto 레이어만 수정하고 DB 스키마 변경 없이 해결한다.

Before coding: ...
After implementation: docs/result/auth-challenge-reuse-fix-2026-03-23.md 작성
```

### 예시 2 — FE 기능 추가

```
Read first:
- `docs/records/api.md`
- `FE-ssatto/CLAUDE.md`
- `docs/reviews/fe-be-api.md`

Task:
LottoPage에서 claim 가능한 엔트리가 있을 때 뱃지 표시를 추가한다.
기존 GET /lotto/entries polling 응답의 isClaimable 필드를 활용하며
새로운 API 호출 추가 없이 구현한다.

Before coding: ...
After implementation: docs/result/lotto-claimable-badge-2026-03-23.md 작성
```

### 예시 3 — CI/CD 구축

```
Read first:
- `docs/records/architecture.md`
- `docs/records/plan.md`
- `nginx/CLAUDE.md`

Task:
docs/records/plan.md의 Phase 4-5 (Jenkinsfile 작성)를 구현한다.
Checkout → Build → Test → Build Image → Push Image → Deploy 단계로 구성하며
테스트 실패 시 배포 차단, 실패 알림, commit SHA 기반 이미지 태깅을 포함한다.

Before coding: ...
After implementation: docs/result/jenkins-pipeline-2026-03-23.md 작성
```

### 예시 5 — 로또 결과 번호 조회 구현 (LTO-01)

```
Read first:
- `docs/records/architecture.md`
- `docs/records/api.md`
- `BE-ssatto/CLAUDE.md`
- `FE-ssatto/CLAUDE.md`
- `blockchain/CLAUDE.md`

Task:
LTO-01 — 로또 참여 내역 상세 비교 화면에서 "블록 결과 번호"가 표시되지 않는 문제를 수정한다.

## 현상

`HexPicker.tsx` 상세 모달("참여 내역 상세 비교")에서 블록 결과 번호 영역이
`["-", "-", "-", "-", "-", "-"]`로 표시된다.
`GET /v1/lotto/entries/{commitHash}/result` 응답의 `resultNumbers` 필드가 null이다.

## 사전 분석 (코드베이스에서 확인 완료)

구현 상태:
- FE: `LottoPage.handleLoadResult()` → `getLottoEntryResult(commitHash, token)` → BE API 호출 ✅
- FE: `mapLottoResult()` → `resultNumbers ? toHexDigits(resultNumbers) : null` 매핑 ✅
- BE: `GET /lotto/entries/{commitHash}/result` → `LottoService.getResult()` ✅
- BE: `getResult()`는 `syncToTip()` 호출 후 `entry.getResultNumbers()` DB 값 반환 ✅
- BE: `BlockchainReadModelSyncService.refreshLottoEntries()` → 모든 DRAWING 엔트리에 `checkLottoResult()` RPC 호출 ✅
- BE: `JackpotChainHttpRpcClient.checkLottoResult()` → blockchain RPC `lottocheckresult` → `result_digits` 필드 매핑 ✅
- DB: `LottoEntry.resultNumbers` 컬럼 존재 ✅, `updateResult()` 메서드 존재 ✅

의심 지점:
1. blockchain `lottocheckresult` RPC가 상태별(pending/losing/winning/expired)로 `result_digits`를 반환하는지 확인 필요
   - pending 상태에서는 미반환이 정상, 그 외 상태(losing 포함)에서도 result_digits가 있어야 함
2. `updateEntryFromChainResult()`: status가 "pending"이 아니어도 `chainResult.resultNumbers()`가 빈 리스트면 null로 저장
3. `refreshLottoEntries()`: `findAll()`로 전 엔트리 조회 → RPC N회 호출 중 예외 발생 시 트랜잭션 롤백되어 업데이트 미반영 가능성

## 수정 범위

### 1. blockchain 코드 확인 (읽기 전용)

`blockchain/` 디렉토리에서 `lottocheckresult` 핸들러를 찾아 다음을 확인한다:
- pending 상태 응답 예시: `{ "success": false, "status": "pending", "result_digits": null }`
- losing 상태 응답 예시: `{ "success": true, "status": "losing", "result_digits": [3,7,11,14,9,2] }`
- result_digits 필드명과 반환 조건 확인

### 2. BE 수정 (필요 시)

**케이스 A**: blockchain이 losing/expired에서 result_digits를 반환하지 않는 경우
→ blockchain 코드가 수정 가능하면 수정, 불가능하면 BE에서 블록 해시를 직접 조회해
  결과를 계산하는 대체 로직 추가

**케이스 B**: `refreshLottoEntries()` 중 단일 엔트리 RPC 실패가 전체 롤백을 유발하는 경우
→ 개별 엔트리 업데이트를 독립 트랜잭션으로 분리 (`REQUIRES_NEW` 또는 개별 save)

**케이스 C**: `result_digits` 필드명이 다를 경우
→ `JackpotChainHttpRpcClient.checkLottoResult()` 매핑 수정

### 3. FE 확인 (읽기 전용)

`resultNumbers`가 정상적으로 넘어오면 FE 코드 변경 없이 동작하는지 확인:
- `mapLottoResult()`: `result.resultNumbers ? toHexDigits(result.resultNumbers) : null`
- `HexPicker.HistoryModal`: `entry.resultNumbers ?? ["-", "-", "-", "-", "-", "-"]`

## 제약

- DB 스키마(`lotto_entry` 테이블) 변경 없음
- blockchain RPC 인터페이스(`JackpotChainRpcClient`) 시그니처 변경 최소화
- FE TypeScript strict 모드 유지

Before coding:
1. blockchain `lottocheckresult` RPC 핸들러 코드를 읽어 응답 스펙 확인
2. 실제 응답 예시와 `JackpotChainHttpRpcClient` 매핑 코드 비교
3. `refreshLottoEntries()` 예외 처리 구조 확인
4. 수정 계획을 `docs/plans/lotto-result-numbers-fix-{date}.md`에 작성

After implementation:
docker-compose.local.yml 로컬 스택으로 아래 시나리오를 검증한다:
- 로또 참여 후 N+18 블록 생성 대기 → DRAWING 상태에서 결과 번호 미표시 확인
- N+18 블록 생성 후 → LOSING/WINNING 상태에서 결과 번호 6개 정상 표시 확인
- "참여 내역 상세 비교" 모달 좌측(내 선택) / 우측(블록 결과) 비교 렌더링 확인
- 일치한 자리에 gold 하이라이트 정상 표시 확인

`docs/result/lotto-result-numbers-fix-{date}.md`를 한국어로 작성한다:
- Overview: 무엇을 왜 했는지
- Changed Files: 변경한 파일과 이유
- Tests Run: 시나리오별 Before/After
- Failed / Unresolved: 미해결 이슈
- Next Steps: 없으면 "없음"
```

---

### 예시 6 — LTO-02: 로또 UX 개선 3종

```
Read first:
- `FE-ssatto/CLAUDE.md`
- `docs/reviews/fe-be-api.md`

Task:
다음 3가지 로또 UX 개선을 FE-ssatto 레이어에서 구현한다.

## LTO-02-A: 커밋 후 즉시 참여 내역 탭 전환

현상: 로또 참여 성공 후 SuccessModal이 2초간 표시되다가 "참여 내역" 탭으로 전환된다.
      사용자는 2초 동안 방금 제출한 항목을 볼 수 없다.

수정: `HexPicker.handleParticipate()` 성공 후 `setShowSuccessModal(true)` 와 함께
      즉시 `setTab("history")`를 호출한다.
      SuccessModal은 fixed overlay이므로 탭 상태와 무관하게 표시된다.
      기존 useEffect (2초 후 모달 닫기)에서 `setTab("history")` 호출은 제거한다.

영향 파일: `FE-ssatto/src/components/lotto/HexPicker.tsx`

## LTO-02-B: 수령 후 버튼 즉시 숨김 + 잔액 즉시 갱신

현상: 수령 버튼 클릭 후 서버 폴링(10초)이 올 때까지 버튼이 사라지지 않는다.
      JACK/POT 잔액도 폴링 전까지 이전 값을 표시한다.

수정:
1. HexPicker에 `claimedEntryIds: Set<string>` 상태 추가
2. `handleClaim()` 성공 후 해당 entryId를 set에 추가
3. 히스토리 리스트 렌더링에서 `entry.claimable && !claimedEntryIds.has(entry.id)` 조건으로 버튼 표시
4. LottoPage.handleClaim()에서 성공 후 `refetchLottoOverview()` 호출 (이미 구현됨 — 확인 후 유지)

영향 파일: `FE-ssatto/src/components/lotto/HexPicker.tsx`

## LTO-02-C: 당첨 배지 옆 상금 금액 표시

현상: 히스토리 리스트에서 "당첨" 배지만 보이고 상금 액수가 표시되지 않는다.
      `entry.rewardLabel`은 이미 서버에서 반환되어 매핑되어 있다.

수정: 히스토리 리스트 각 항목에서 `statusLabel === "WINNING" && entry.rewardLabel`인 경우
      배지 바로 옆에 금액 span을 추가한다.

영향 파일: `FE-ssatto/src/components/lotto/HexPicker.tsx`

## 제약

- blockchain, BE 코드는 건드리지 않는다
- TypeScript strict 모드 유지
- Set 상태 변경 시 `new Set([...prev, id])` 패턴으로 불변성 유지

Before coding:
1. `HexPicker.tsx`의 `handleParticipate`, `handleClaim`, 히스토리 리스트 렌더링 부분을 확인한다
2. LottoPage.handleClaim()의 `refetchLottoOverview()` 호출 여부를 확인한다
3. `LottoHistoryEntry.rewardLabel` 타입을 `readModelAdapters.ts`에서 확인한다

After implementation:
`docs/result/lotto-ux-lto02-{date}.md`를 한국어로 작성한다:
- Overview, Changed Files, Tests Run (Before/After 시나리오), Failed/Unresolved, Next Steps
```

---

### 예시 4 — QA / 테스트

```
Read first:
- `docs/records/api.md`
- `docs/reviews/local-stack-qa-checklist-2026-03-22.md`
- `BE-ssatto/CLAUDE.md`

Task:
Exchange 교환 흐름에 대한 BE 통합 테스트를 추가한다.
성공 케이스 (정상 signed tx), 실패 케이스 (잔액 부족, invalid tx),
보안 케이스 (다른 지갑 주소로 교환 시도 403)를 커버한다.

Before coding: ...
After implementation: docs/result/exchange-integration-test-2026-03-23.md 작성
```
