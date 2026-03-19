package ssatto.BE_ssatto.domain.exchange.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainExchangeInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeInfoResponse;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeRequest;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeResponse;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

/**
 * 교환 direct-pull 조회와 제출을 담당하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeService {

    private final JackpotChainRpcClient jackpotChainRpcClient;

    /**
     * 교환 화면에 필요한 현재 잔액을 조회한다.
     *
     * @param address 지갑 주소
     * @return 교환 정보 응답
     */
    @Transactional(readOnly = true)
    public ExchangeInfoResponse getExchangeInfo(String address) {
        validateAddress(address);
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
        validateAddress(request.fromAddress());
        if (!StringUtils.hasText(request.signedTxHex()) || request.jackAmount() == null || request.jackAmount() <= 0) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        JackpotChainExchangeInfo exchangeInfo = jackpotChainRpcClient.getExchangeInfo();
        long minimumSatoshi = exchangeInfo.minJack() * 100_000_000L;
        if (request.jackAmount() < minimumSatoshi) {
            throw new BusinessException(ErrorCode.EXCHANGE_BELOW_MINIMUM);
        }

        String txId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
        long receivedPot = request.jackAmount() / exchangeInfo.jackPerPot();

        log.info("EXCHANGE_TRANSACTION_SUBMITTED txId={} address={}", txId, request.fromAddress());

        return new ExchangeResponse(
            txId,
            request.jackAmount(),
            receivedPot,
            exchangeInfo.jackPerPot()
        );
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }
}
