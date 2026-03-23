package ssatto.BE_ssatto.global.exception;

import lombok.Getter;

/**
 * 비즈니스 규칙 위반을 표현하는 공통 런타임 예외이다.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    /**
     * 기본 에러 메시지를 사용하는 비즈니스 예외를 생성한다.
     *
     * @param errorCode 에러 코드
     */
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * 사용자 지정 메시지를 사용하는 비즈니스 예외를 생성한다.
     *
     * @param errorCode 에러 코드
     * @param detailMessage 클라이언트에 노출할 상세 메시지
     */
    public BusinessException(ErrorCode errorCode, String detailMessage) {
        super(detailMessage);
        this.errorCode = errorCode;
    }

    /**
     * 다른 예외를 감싸는 비즈니스 예외를 생성한다.
     *
     * @param errorCode 에러 코드
     * @param cause 원인 예외
     */
    public BusinessException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
