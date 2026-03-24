# AUTH-04: 요청 본문 누락 시 500 → 400 수정

> 날짜: 2026-03-24
> 브랜치: BE

---

## Overview

`POST /v1/auth/refresh`와 `POST /v1/auth/logout`에 Content-Type 헤더 없이 body를 누락한 요청을 보내면
500 "서버 내부 오류가 발생했습니다."가 반환되는 버그를 수정했다.

**원인**: Spring이 body를 읽지 못할 때 던지는 `HttpMessageNotReadableException`이
`GlobalExceptionHandler`에 등록된 핸들러가 없어 제일 마지막의 `Exception.class` 핸들러로
fall-through되어 500으로 응답하고 있었다.

**수정**: `GlobalExceptionHandler`에 `HttpMessageNotReadableException` 전용 핸들러를 추가해
400 `COMMON_INVALID_REQUEST`로 매핑했다.

같은 문제가 발생할 수 있는 다른 모든 `@RequestBody` 엔드포인트도 함께 커버된다:
- `POST /v1/auth/challenge`
- `POST /v1/auth/verify`
- `POST /v1/wallet`
- `POST /v1/lotto/commit`
- `POST /v1/lotto/claim`
- `POST /v1/exchange/jack-to-pot`
- `POST /v1/learning/{module}/complete`

---

## Changed Files

| 파일 | 변경 내용 |
|------|---------|
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandler.java` | `HttpMessageNotReadableException` import 추가 + 전용 핸들러 메서드 추가 (400 반환) |

변경량: import 1줄, 핸들러 메서드 27줄 추가. 컨트롤러·서비스·엔티티·DB 스키마 변경 없음.

---

## Tests Run

### /auth/refresh — 본문 누락

```bash
curl -s -X POST http://localhost:8080/v1/auth/refresh
```

| 구분 | HTTP 코드 | 응답 본문 |
|------|-----------|---------|
| 수정 전 | 500 | `{"code":500,"message":"서버 내부 오류가 발생했습니다.","data":null}` |
| 수정 후 | **400** | `{"code":400,"message":"잘못된 요청입니다.","data":null}` |

### /auth/logout — 본문 누락

```bash
curl -s -X POST http://localhost:8080/v1/auth/logout
```

| 구분 | HTTP 코드 | 응답 본문 |
|------|-----------|---------|
| 수정 전 | 500 | `{"code":500,"message":"서버 내부 오류가 발생했습니다.","data":null}` |
| 수정 후 | **400** | `{"code":400,"message":"잘못된 요청입니다.","data":null}` |

### 정상 요청 영향 없음 확인

```bash
# body 형식 오류(정상 Content-Type 있지만 validation 실패) → 여전히 400
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/auth/challenge \
  -H 'Content-Type: application/json' -d '{"address":"XB2T67y"}'
# → 400 (주소 유효성 오류, 기존과 동일)
```

---

## Failed / Unresolved

없음.

---

## Next Steps

없음.
