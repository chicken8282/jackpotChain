package ssatto.BE_ssatto.domain.wallet.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 지갑 메타데이터가 존재하지 않을 때 발생한다.
 */
public class WalletNotFoundException extends BusinessException {

    public WalletNotFoundException() {
        super(ErrorCode.WALLET_NOT_FOUND);
    }
}
