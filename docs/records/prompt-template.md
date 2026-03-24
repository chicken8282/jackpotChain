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
