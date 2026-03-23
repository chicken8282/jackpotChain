package ssatto.BE_ssatto.domain.mining.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 채굴 조회 요청 값이 잘못된 경우의 예외다.
 */
public class InvalidMiningRequestException extends BusinessException {

    public InvalidMiningRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
