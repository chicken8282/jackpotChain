package ssatto.BE_ssatto.domain.exchange.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 교환 요청 수량이 최소 교환 기준보다 작을 때 발생한다.
 */
public class ExchangeBelowMinimumException extends BusinessException {

    public ExchangeBelowMinimumException() {
        super(ErrorCode.EXCHANGE_BELOW_MINIMUM);
    }
}
