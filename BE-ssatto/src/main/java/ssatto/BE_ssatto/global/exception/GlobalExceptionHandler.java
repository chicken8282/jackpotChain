package ssatto.jackpotchain.global.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ssatto.jackpotchain.global.response.ApiResponse;

import java.util.stream.Collectors;

/**
 * 전역 예외 핸들러
 *
 * <p>애플리케이션에서 발생하는 모든 예외를 잡아 클라이언트에게 일관된 에러 응답을 반환한다.
 * Controller 레이어에서 try-catch를 직접 작성하지 않고 이 클래스가 중앙에서 처리한다.</p>
 *
 * <p>처리 예외 유형:
 * - {@link BusinessException}: Service 레이어 비즈니스 규칙 위반
 * - {@link MethodArgumentNotValidException}: @Valid 검증 실패 (Bean Validation)
 * - {@link Exception}: 그 외 미처리 예외 (500 반환)
 * </p>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 비즈니스 예외 처리
     *
     * <p>Service에서 BusinessException이 throw되면 ErrorCode에 정의된
     * HTTP 상태 코드와 메시지로 응답한다.</p>
     *
     * @param e BusinessException 인스턴스
     * @return 에러 응답 (HTTP 상태 코드 + ApiResponse)
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        // 비즈니스 예외는 WARN 레벨로 로깅 (스택트레이스 불필요)
        log.warn("[BusinessException] code={}, message={}", errorCode.name(), e.getMessage());
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode.name(), e.getMessage()));
    }

    /**
     * Bean Validation 실패 처리 (@Valid, @Validated)
     *
     * <p>DTO 필드 검증 실패 시 어떤 필드가 왜 유효하지 않은지 메시지로 반환한다.</p>
     *
     * @param e MethodArgumentNotValidException 인스턴스
     * @return 400 Bad Request + 필드별 검증 에러 메시지
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        // 검증 실패한 모든 필드의 에러 메시지를 ", "로 합쳐서 반환
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));

        log.warn("[ValidationException] message={}", message);
        return ResponseEntity
            .status(ErrorCode.COMMON_INVALID_REQUEST.getHttpStatus())
            .body(ApiResponse.error(ErrorCode.COMMON_INVALID_REQUEST.name(), message));
    }

    /**
     * 미처리 예외 처리 (최후 방어선)
     *
     * <p>위의 핸들러에서 처리되지 않은 모든 예외를 500 Internal Server Error로 반환한다.
     * 실제 예외 정보는 로그에만 남기고 클라이언트에게는 일반적인 메시지만 노출한다.</p>
     *
     * @param e 미처리 예외
     * @return 500 Internal Server Error + 일반 에러 메시지
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // 내부 예외는 ERROR 레벨로 스택트레이스 포함하여 로깅
        log.error("[UnhandledException] 미처리 예외 발생", e);
        return ResponseEntity
            .status(ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getHttpStatus())
            .body(ApiResponse.error(
                ErrorCode.COMMON_INTERNAL_SERVER_ERROR.name(),
                ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getMessage()
            ));
    }
}
