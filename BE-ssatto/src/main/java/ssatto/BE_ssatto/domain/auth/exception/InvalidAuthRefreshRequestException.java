package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * refresh 또는 logout 요청이 유효하지 않을 때 발생한다.
 */
public class InvalidAuthRefreshRequestException extends BusinessException {

    public InvalidAuthRefreshRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
