package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 인증 서명 검증에 실패했을 때 발생한다.
 */
public class InvalidAuthSignatureException extends BusinessException {

    public InvalidAuthSignatureException() {
        super(ErrorCode.AUTH_SIGNATURE_INVALID);
    }
}
