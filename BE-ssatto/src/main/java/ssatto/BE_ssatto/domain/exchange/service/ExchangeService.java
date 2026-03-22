package ssatto.BE_ssatto.domain.exchange.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.exception.AuthForbiddenException;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainExchangeInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeInfoResponse;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeRequest;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeResponse;
import ssatto.BE_ssatto.domain.exchange.exception.ExchangeBelowMinimumException;
import ssatto.BE_ssatto.domain.exchange.exception.InvalidExchangeRequestException;
import ssatto.BE_ssatto.global.logging.BusinessEventLogger;
import ssatto.BE_ssatto.global.logging.LoggingEventType;
import ssatto.BE_ssatto.global.logging.LoggingFields;
import ssatto.BE_ssatto.global.logging.LoggingUtils;

/**
 * 교환 direct-pull 조회와 제출을 담당하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeService {

    private final JackpotChainRpcClient jackpotChainRpcClient;
    private final WalletAuthCrypto walletAuthCrypto;

    /**
     * 교환 화면에 필요한 현재 잔액을 조회한다.
     *
     * @param address 지갑 주소
     * @return 교환 정보 응답
     */
    @Transactional(readOnly = true)
    public ExchangeInfoResponse getExchangeInfo(String address) {
        return getExchangeInfo(address, address);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 교환 정보를 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @return 교환 정보 응답
     */
    @Transactional(readOnly = true)
    public ExchangeInfoResponse getExchangeInfo(String authenticatedWalletAddress, String address) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);
        JackpotChainBalances balances = jackpotChainRpcClient.getBalances(address);
        jackpotChainRpcClient.getExchangeInfo();
        return new ExchangeInfoResponse(balances.jackSatoshi(), balances.potSatoshi());
    }

    /**
     * 서명된 교환 트랜잭션을 제출한다.
     *
     * @param request 교환 요청
     * @return 교환 완료 응답
     */
    public ExchangeResponse exchangeJackToPot(ExchangeRequest request) {
        return exchangeJackToPot(request.fromAddress(), request);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 서명된 교환 트랜잭션을 제출한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param request 교환 요청
     * @return 교환 완료 응답
     */
    public ExchangeResponse exchangeJackToPot(String authenticatedWalletAddress, ExchangeRequest request) {
        validateWalletSubject(authenticatedWalletAddress, request.fromAddress());
        validateAddress(request.fromAddress());
        if (!StringUtils.hasText(request.signedTxHex()) || request.jackAmount() == null || request.jackAmount() <= 0) {
            throw new InvalidExchangeRequestException();
        }

        JackpotChainExchangeInfo exchangeInfo = jackpotChainRpcClient.getExchangeInfo();
        long minimumSatoshi = exchangeInfo.minJack() * 100_000_000L;
        if (request.jackAmount() < minimumSatoshi) {
            throw new ExchangeBelowMinimumException();
        }

        String txId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
        long receivedPot = request.jackAmount() / exchangeInfo.jackPerPot();

        BusinessEventLogger.info(
            LoggingEventType.EXCHANGE_TRANSACTION_SUBMITTED,
            "exchange transaction submitted",
            LoggingUtils.fields(
                LoggingFields.TX_ID, txId,
                LoggingFields.WALLET_ADDRESS, request.fromAddress()
            )
        );

        return new ExchangeResponse(
            txId,
            request.jackAmount(),
            receivedPot,
            exchangeInfo.jackPerPot()
        );
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address) || !walletAuthCrypto.isValidAddress(address)) {
            throw new InvalidExchangeRequestException();
        }
    }

    private void validateWalletSubject(String authenticatedWalletAddress, String address) {
        if (!StringUtils.hasText(authenticatedWalletAddress) || !authenticatedWalletAddress.equals(address)) {
            throw new AuthForbiddenException();
        }
    }
}
