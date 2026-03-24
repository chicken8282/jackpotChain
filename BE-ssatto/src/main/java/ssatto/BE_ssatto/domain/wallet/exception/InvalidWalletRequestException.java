package ssatto.BE_ssatto.domain.wallet.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 지갑 주소, 조회 조건, 페이지 값 등 요청 값이 유효하지 않을 때 발생한다.
 */
public class InvalidWalletRequestException extends BusinessException {

    public InvalidWalletRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
