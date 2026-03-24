package ssatto.BE_ssatto.domain.lotto.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 로또 참여 내역을 찾지 못한 경우의 예외다.
 */
public class LottoEntryNotFoundException extends BusinessException {

    public LottoEntryNotFoundException() {
        super(ErrorCode.LOTTO_ENTRY_NOT_FOUND);
    }
}
