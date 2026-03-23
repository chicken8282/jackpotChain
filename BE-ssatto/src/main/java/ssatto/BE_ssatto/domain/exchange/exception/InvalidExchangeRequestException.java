package ssatto.BE_ssatto.domain.exchange.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 교환 요청의 주소, 수량, 서명 트랜잭션이 유효하지 않을 때 발생한다.
 */
public class InvalidExchangeRequestException extends BusinessException {

    public InvalidExchangeRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
