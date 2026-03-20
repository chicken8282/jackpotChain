package ssatto.BE_ssatto.domain.lotto.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 로또 번호 개수 또는 범위가 유효하지 않을 때 발생한다.
 */
public class InvalidLottoNumbersException extends BusinessException {

    public InvalidLottoNumbersException() {
        super(ErrorCode.LOTTO_INVALID_NUMBERS);
    }
}
