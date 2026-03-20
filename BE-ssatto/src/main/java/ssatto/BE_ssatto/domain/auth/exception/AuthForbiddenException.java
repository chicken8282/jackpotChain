package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 인증 지갑 주체와 요청 대상 지갑이 다를 때 발생한다.
 */
public class AuthForbiddenException extends BusinessException {

    public AuthForbiddenException() {
        super(ErrorCode.AUTH_FORBIDDEN);
    }
}
