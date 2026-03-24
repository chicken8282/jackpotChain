package ssatto.BE_ssatto.domain.wallet.exception;

import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 이미 등록된 지갑 주소를 다시 등록하려 할 때 발생한다.
 */
public class WalletAddressDuplicatedException extends BusinessException {

    public WalletAddressDuplicatedException() {
        super(ErrorCode.WALLET_ADDRESS_DUPLICATED);
    }
}
