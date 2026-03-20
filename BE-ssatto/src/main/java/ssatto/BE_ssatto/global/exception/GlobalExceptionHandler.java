package ssatto.BE_ssatto.global.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ssatto.BE_ssatto.global.response.ApiResponse;

import java.util.stream.Collectors;

/**
 * 애플리케이션 전역의 REST 예외를 중앙에서 처리한다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 스택 트레이스 없이 비즈니스 예외를 처리한다.
     *
     * @param exception 비즈니스 예외
     * @return 공통 포맷으로 감싼 에러 응답
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        log.warn("BUSINESS_EXCEPTION errorCode={} message={}", errorCode.name(), exception.getMessage());
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode.getHttpStatus().value(), exception.getMessage()));
    }

    /**
     * 요청 본문 검증 실패를 처리한다.
     *
     * @param exception 검증 예외
     * @return 공통 포맷으로 감싼 에러 응답
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));

        log.warn("BUSINESS_EXCEPTION errorCode={} message={}",
            ErrorCode.COMMON_INVALID_REQUEST.name(),
            message
        );

        return ResponseEntity
            .status(ErrorCode.COMMON_INVALID_REQUEST.getHttpStatus())
            .body(ApiResponse.error(ErrorCode.COMMON_INVALID_REQUEST.getHttpStatus().value(), message));
    }

    /**
     * 쿼리 파라미터 제약 조건과 같은 본문 외 검증 실패를 처리한다.
     *
     * @param exception 제약 조건 위반 예외
     * @return 공통 포맷으로 감싼 에러 응답
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
        ConstraintViolationException exception
    ) {
        String message = exception.getConstraintViolations().stream()
            .map(violation -> violation.getMessage())
            .collect(Collectors.joining(", "));

        log.warn("BUSINESS_EXCEPTION errorCode={} message={}",
            ErrorCode.COMMON_INVALID_REQUEST.name(),
            message
        );

        return ResponseEntity
            .status(ErrorCode.COMMON_INVALID_REQUEST.getHttpStatus())
            .body(ApiResponse.error(ErrorCode.COMMON_INVALID_REQUEST.getHttpStatus().value(), message));
    }

    /**
     * 예기치 않은 예외를 처리하고 전체 스택 트레이스를 기록한다.
     *
     * @param exception 예기치 않은 예외
     * @return 공통 포맷으로 감싼 에러 응답
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception) {
        log.error("UNHANDLED_EXCEPTION errorCode={} message={}",
            ErrorCode.COMMON_INTERNAL_SERVER_ERROR.name(),
            exception.getMessage(),
            exception
        );

        return ResponseEntity
            .status(ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getHttpStatus())
            .body(ApiResponse.error(
                ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getHttpStatus().value(),
                ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getMessage()
            ));
    }
}
