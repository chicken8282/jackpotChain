## 날짜

| 날짜 | 작업 |
| --- | --- |
| 2026-03-19 | 예외 처리 ADR/Spec/코드 정렬 |

## 구현 항목

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| ADR-04 포맷 정렬 | 완료 | 기존 ADR-03 구조에 맞춰 `결정 주제 / 상황 / 선택지 / 비교 기준 / 최종 선택 / 선택 이유 / 감수할 단점 / 재검토 조건 / 면접용 3줄 요약` 순서로 재작성했다. |
| backend-spec 예외 처리 규칙 반영 | 완료 | `ErrorCode + GlobalExceptionHandler`를 표준 예외 처리 방식으로 명시하고 패키지 구조 및 로깅 규칙을 갱신했다. |
| 한국어 에러 메시지 적용 | 완료 | `ErrorCode`의 기본 메시지를 한국어로 통일했다. |
| 도메인 예외 래퍼 예시 추가 | 완료 | `domain/auth/exception/EmailDuplicateException`을 추가해 얇은 도메인 래퍼 패턴을 반영했다. |
| 예외 패키지 구조 확장 | 완료 | 각 도메인에 `exception/` 하위 패키지를 추가했고 `auth` 모듈 패키지 골격도 함께 생성했다. |
| 테스트 갱신 | 완료 | 글로벌 예외 처리 테스트를 한국어 메시지와 도메인 예외 래퍼 기준으로 갱신했고 패키지 구조 테스트에 `auth` 및 `exception/` 디렉터리를 반영했다. |

## 테스트 결과

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `./gradlew.bat test --no-daemon` | 통과 | 예외 처리 정렬 이후 전체 테스트 통과 |
| `GlobalExceptionHandlerTest` | 통과 | 한국어 에러 메시지, `AUTH_EMAIL_DUPLICATE`, 전역 예외 매핑 검증 |
| `PackageStructureTest` | 통과 | `auth` 포함 도메인 패키지 및 `exception/` 하위 패키지 검증 |
| `ApplicationContextTest` | 통과 | 컨텍스트 로드 성공 |
| `HealthEndpointIntegrationTest` | 통과 | actuator health 노출 정상 |

## Swagger 확인

| 확인 항목 | 결과 | 비고 |
| --- | --- | --- |
| Swagger 설정 유지 | 통과 | 예외 처리 정렬 과정에서 Swagger 설정 영향 없음 |
| 신규 API 추가 여부 | 해당 없음 | 이번 작업은 문서/예외 처리 구조 정렬이 중심이며 신규 엔드포인트를 추가하지 않았다. |

## 요청 대비 체크리스트

| 요청 사항 | 결과 | 비고 |
| --- | --- | --- |
| ADR-04를 기존 ADR 포맷에 맞게 수정 | 완료 | `docs/adrs/adr-04.md` 반영 완료 |
| ADR-04 기반으로 backend-spec 업데이트 | 완료 | `docs/specs/backend-spec.md` 반영 완료 |
| backend-spec와 ADR-04 기반으로 예외 처리 코드 수정 | 완료 | `ErrorCode`, `GlobalExceptionHandler`, 도메인 래퍼 예외 반영 완료 |
| 에러 메시지 한글화 | 완료 | `ErrorCode` 기본 메시지 한국어 적용 완료 |
| 폴더 구조 수정 | 완료 | `auth` 모듈 및 각 도메인 `exception/` 패키지 추가 완료 |

## 남은 리스크

| 리스크 | 영향도 | 후속 조치 |
| --- | --- | --- |
| 도메인 수 증가 시 `ErrorCode` enum 비대화 가능성 | 중간 | 도메인별 에러 코드 분리 전략을 추후 검토 |
| 현재는 예외 래퍼 예시가 제한적 | 낮음 | 실제 서비스 구현 시 반복 사용되는 예외만 얇은 래퍼로 추가 |
| backend-spec 전반 개정 후 실제 API 구현과의 차이 발생 가능성 | 중간 | 도메인 API 구현 시 spec과 코드의 정합성을 계속 검증 |
