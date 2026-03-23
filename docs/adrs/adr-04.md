# ADR-04: 백엔드 예외 처리 방식 설계 - ErrorCode + GlobalExceptionHandler

| 항목 | 내용 |
|------|------|
| 상태 | 채택 |
| 날짜 | 2026-03-19 |
| 결정자 | 백엔드 팀 |

---

## 결정 주제

Spring Boot 백엔드에서 비즈니스 예외와 공통 예외를 어떤 방식으로 모델링하고,
API 응답과 운영 로그로 일관되게 변환할 것인지 결정한다.

---

## 상황 / 문제

JackpotChain 백엔드는 프론트엔드와 명확한 API 계약을 유지해야 하며,
예외 처리도 다음 요구사항을 만족해야 한다.

- 프론트엔드는 메시지 문자열이 아니라 안정적인 에러 코드로 분기할 수 있어야 한다.
- 서비스 레이어는 비즈니스 의미 중심으로 예외를 던져야 하며, 컨트롤러에서 중복 처리하지 않아야 한다.
- 운영 로그에서 HTTP 상태 코드보다 세밀한 기준으로 예외를 검색할 수 있어야 한다.
- Swagger 문서, 테스트, 프론트 처리 규칙, 운영 로그가 동일한 에러 체계를 바라봐야 한다.
- 도메인(`auth`, `wallet`, `exchange`, `lotto`, `mining`, `blockchain`)이 확장되어도 예외 구조가 과도하게 비대해지지 않아야 한다.

현재 선택 가능한 대표적인 예외 처리 방식은 다음 두 가지다.

1. `ConflictGroupException`, `NotFoundGroupException`처럼 HTTP 상태 그룹 예외를 만들고,
   서비스별 예외가 이를 상속하는 방식
2. `ErrorCode`에 HTTP 상태, 코드, 메시지를 모으고,
   서비스는 `BusinessException(ErrorCode)` 또는 이를 상속한 얇은 래퍼 예외를 던진 뒤
   `GlobalExceptionHandler`가 공통 응답을 생성하는 방식

---

## 선택지

### A. HTTP 상태 그룹 예외 상속 방식

예외를 `ConflictGroupException`, `NotFoundGroupException`, `AuthGroupException`처럼
HTTP 상태 그룹 기준으로 분류한다.
도메인 예외는 해당 그룹 예외를 상속한다.

```java
public abstract class ConflictGroupException extends RuntimeException {
    protected ConflictGroupException(String message) {
        super(message);
    }
}

public class EmailDuplicateException extends ConflictGroupException {
    public EmailDuplicateException() {
        super("이미 사용 중인 이메일입니다.");
    }
}
```

`@RestControllerAdvice`는 그룹 예외 타입별로 핸들러 메서드를 둔다.

```java
@ExceptionHandler(ConflictGroupException.class)
@ResponseStatus(HttpStatus.CONFLICT)
public ResTemplate<?> handleConflict(RuntimeException e) {
    return ResTemplate.error(HttpStatus.CONFLICT, e.getMessage());
}
```

### B. ErrorCode + GlobalExceptionHandler 방식 (채택)

예외의 기준을 HTTP 상태가 아니라 비즈니스 의미로 정의한다.
`ErrorCode`가 `HttpStatus`, `message`를 소유하고,
서비스는 `BusinessException(ErrorCode)`를 던진다.
전역 핸들러는 해당 코드를 읽어 공통 응답 포맷으로 변환한다.

```java
public enum ErrorCode {
    AUTH_EMAIL_DUPLICATE(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    AUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다.");
}

public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
}
```

```java
throw new BusinessException(ErrorCode.AUTH_EMAIL_DUPLICATE);
```

```java
@ExceptionHandler(BusinessException.class)
public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
    ErrorCode errorCode = exception.getErrorCode();
    return ResponseEntity
        .status(errorCode.getHttpStatus())
        .body(ApiResponse.error(errorCode.name(), exception.getMessage()));
}
```

---

## 비교 기준

### 계약 안정성

| 선택지 | 평가 |
|--------|------|
| A. 그룹 예외 상속 | HTTP 상태는 안정적으로 유지되지만, 프론트엔드가 세부 원인을 구분하려면 예외 클래스명 또는 메시지 문자열에 의존하기 쉽다. |
| **B. ErrorCode + GlobalExceptionHandler** | **`AUTH_EMAIL_DUPLICATE`, `WALLET_NOT_FOUND` 같은 명시적 코드로 프론트, 테스트, 문서, 로그가 동일한 계약을 공유할 수 있다.** |

### 도메인 표현력

| 선택지 | 평가 |
|--------|------|
| A. 그룹 예외 상속 | 예외 계층의 기준이 HTTP 상태다. 비즈니스 의미보다 전송 계층 의미가 앞선다. |
| **B. ErrorCode + GlobalExceptionHandler** | **예외를 도메인 문제 단위로 표현할 수 있다. `LOTTO_NOT_CLAIMABLE`, `EXCHANGE_BELOW_MINIMUM`처럼 비즈니스 의미가 직접 드러난다.** |

### 확장성

| 선택지 | 평가 |
|--------|------|
| A. 그룹 예외 상속 | 서비스별 커스텀 예외가 계속 늘어나 파일 수가 빠르게 증가한다. 그룹 핸들러는 단순하지만 예외 클래스 관리 비용이 커진다. |
| **B. ErrorCode + GlobalExceptionHandler** | **핸들러는 거의 고정되고, 도메인 확장은 `ErrorCode` 추가 중심으로 관리할 수 있다. 필요 시에만 얇은 도메인 예외 래퍼를 둔다.** |

### 운영성

| 선택지 | 평가 |
|--------|------|
| A. 그룹 예외 상속 | 동일한 `409 CONFLICT` 안에 여러 비즈니스 실패가 섞여 운영 로그 분류력이 약하다. |
| **B. ErrorCode + GlobalExceptionHandler** | **로그에 `errorCode`를 구조화 필드로 남기기 쉬워 운영성이 높다. HTTP 상태보다 세밀한 기준으로 모니터링할 수 있다.** |

### 서비스 코드 가독성

| 선택지 | 평가 |
|--------|------|
| A. 그룹 예외 상속 | `throw new EmailDuplicateException()`처럼 읽기 쉽다. |
| B. ErrorCode + GlobalExceptionHandler | `throw new BusinessException(ErrorCode.AUTH_EMAIL_DUPLICATE)`가 다소 장황할 수 있다. 다만 필요하면 얇은 래퍼 예외로 보완할 수 있다. |

---

## 최종 선택

**B. ErrorCode + GlobalExceptionHandler 방식**

---

## 선택 이유

1. **에러 응답 계약을 안정적으로 유지할 수 있다.**  
   프론트엔드는 같은 `409` 안에서도 이메일 중복, 상태 충돌, 중복 처리 같은 세부 원인을 구분해야 한다.
   `ErrorCode` 중심 구조는 이 계약을 명시적으로 보장한다.

2. **도메인 중심 설계에 더 가깝다.**  
   `ConflictGroupException` 같은 구조는 HTTP 상태가 중심이고,
   `WALLET_NOT_FOUND`, `LOTTO_NOT_CLAIMABLE`는 비즈니스 의미가 중심이다.
   서비스 레이어는 전송 계층보다 도메인 의미를 중심으로 작성해야 한다.

3. **전역 처리 로직이 단순하고 일관된다.**  
   `GlobalExceptionHandler`는 `BusinessException`, 검증 예외, 미처리 예외만 공통 처리하면 된다.
   예외 그룹별 핸들러 메서드를 계속 늘릴 필요가 없다.

4. **로그, 테스트, 문서화에 유리하다.**  
   `errorCode`, `httpStatus`, `message`를 구조화하면 운영 로그 검색이 쉬워지고,
   테스트와 Swagger 문서도 같은 코드 체계를 재사용할 수 있다.

5. **필요 시 가독성 보완도 가능하다.**  
   반복 사용되는 케이스는 아래처럼 얇은 도메인 예외 래퍼를 둘 수 있다.
   다만 이 래퍼는 메인 구조가 아니라 가독성 보조 수단이다.

```java
public class EmailDuplicateException extends BusinessException {
    public EmailDuplicateException() {
        super(ErrorCode.AUTH_EMAIL_DUPLICATE);
    }
}
```

---

## 감수할 단점 (트레이드오프)

### 1. ErrorCode enum이 커질 수 있다

도메인이 늘어날수록 `ErrorCode` 항목 수가 증가한다.

**보완책:**  
도메인 규모가 커지면 `AuthErrorCode`, `WalletErrorCode`처럼 도메인별 코드 분리를 고려한다.

### 2. 서비스 코드가 다소 장황해질 수 있다

`throw new BusinessException(ErrorCode.AUTH_EMAIL_DUPLICATE)`는
예외 클래스를 직접 사용하는 방식보다 길다.

**보완책:**  
반복 사용되는 경우에만 얇은 도메인 래퍼 예외를 허용한다.
단, HTTP 상태 그룹 예외를 다시 중심 구조로 삼지는 않는다.

### 3. 초기 설계 규율이 필요하다

메시지 문구, 코드 네이밍, HTTP 상태 배정 기준이 흔들리면
enum 기반 구조도 일관성을 잃는다.

**보완책:**  
`backend-spec.md`에 정의된 네이밍 규칙과 HTTP 상태 매핑 규칙을 단일 기준으로 유지한다.

---

## 재검토 조건

아래 상황 중 하나가 발생하면 예외 처리 구조를 재검토한다.

| 조건 | 설명 |
|------|------|
| ErrorCode가 과도하게 비대해짐 | 도메인별 분리가 필요할 정도로 관리 비용이 증가한 경우 |
| 외부 공개 API와 내부 API의 에러 계약이 분리됨 | 외부/내부용 에러 코드 체계를 이원화해야 하는 경우 |
| 다국어 에러 메시지 지원 필요 | 메시지를 코드와 분리해 i18n 체계로 재구성해야 하는 경우 |
| RFC 7807 Problem Details 도입 | 표준 에러 응답 포맷으로 이관해야 하는 경우 |

---

## 면접용 3줄 요약

1. **백엔드 예외 처리의 기준을 HTTP 상태 그룹 예외 상속이 아니라 `ErrorCode` 중심으로 통일하고, 공통 변환은 `GlobalExceptionHandler`에서 처리합니다.**

2. **이 방식은 프론트엔드, 테스트, Swagger, 운영 로그가 동일한 에러 코드를 기준으로 동작할 수 있어 계약 안정성과 운영성이 높습니다.**

3. **서비스 코드 가독성이 필요한 경우에만 얇은 도메인 예외 래퍼를 보조적으로 허용하되, 메인 구조는 `BusinessException + ErrorCode + GlobalExceptionHandler`로 유지합니다.**
