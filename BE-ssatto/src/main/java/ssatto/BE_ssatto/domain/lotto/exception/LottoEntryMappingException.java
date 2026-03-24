package ssatto.BE_ssatto.domain.lotto.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 저장된 로또 엔트리 데이터를 응답 형태로 변환하지 못할 때 발생한다.
 */
public class LottoEntryMappingException extends BusinessException {

    public LottoEntryMappingException() {
        super(ErrorCode.COMMON_INTERNAL_SERVER_ERROR);
    }
}
