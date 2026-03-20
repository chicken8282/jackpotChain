package ssatto.BE_ssatto.domain.lotto.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 로또 조회/참여 요청의 필수 값이 비어 있거나 형식이 맞지 않을 때 발생한다.
 */
public class InvalidLottoRequestException extends BusinessException {

    public InvalidLottoRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
