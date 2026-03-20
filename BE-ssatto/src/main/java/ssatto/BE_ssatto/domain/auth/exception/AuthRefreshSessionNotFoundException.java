package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * refresh 세션이 없거나 만료되었을 때 발생한다.
 */
public class AuthRefreshSessionNotFoundException extends BusinessException {

    public AuthRefreshSessionNotFoundException() {
        super(ErrorCode.AUTH_REFRESH_SESSION_NOT_FOUND);
    }
}
