package ssatto.BE_ssatto.domain.auth.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 토큰 발급 대상 지갑이 등록되지 않았을 때 발생한다.
 */
public class AuthWalletNotFoundException extends BusinessException {

    public AuthWalletNotFoundException() {
        super(ErrorCode.WALLET_NOT_FOUND);
    }
}
