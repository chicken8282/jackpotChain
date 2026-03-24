package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 챌린지 발급 요청이 유효하지 않을 때 발생한다.
 */
public class InvalidAuthChallengeRequestException extends BusinessException {

    public InvalidAuthChallengeRequestException() {
        super(ErrorCode.COMMON_INVALID_REQUEST);
    }
}
