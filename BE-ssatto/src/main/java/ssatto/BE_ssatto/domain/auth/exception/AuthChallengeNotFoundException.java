package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 챌린지가 없거나 만료되었을 때 발생한다.
 */
public class AuthChallengeNotFoundException extends BusinessException {

    public AuthChallengeNotFoundException() {
        super(ErrorCode.AUTH_CHALLENGE_NOT_FOUND);
    }
}
