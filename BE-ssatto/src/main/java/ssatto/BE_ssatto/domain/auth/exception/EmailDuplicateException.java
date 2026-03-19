package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 이미 사용 중인 이메일로 회원가입이나 계정 연동을 시도할 때 발생하는 예외이다.
 */
public class EmailDuplicateException extends BusinessException {

    /**
     * 기본 이메일 중복 예외를 생성한다.
     */
    public EmailDuplicateException() {
        super(ErrorCode.AUTH_EMAIL_DUPLICATE);
    }

    /**
     * 사용자 지정 메시지를 사용하는 이메일 중복 예외를 생성한다.
     *
     * @param message 클라이언트에 노출할 메시지
     */
    public EmailDuplicateException(String message) {
        super(ErrorCode.AUTH_EMAIL_DUPLICATE, message);
    }
}
