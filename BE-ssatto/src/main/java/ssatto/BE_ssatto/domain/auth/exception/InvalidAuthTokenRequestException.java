package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 토큰 발급 요청의 지갑 주소가 유효하지 않을 때 발생한다.
 */
public class InvalidAuthTokenRequestException extends BusinessException {

    public InvalidAuthTokenRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
