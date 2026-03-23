package ssatto.BE_ssatto.domain.exchange.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainExchangeInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeRequest;
import ssatto.BE_ssatto.domain.exchange.exception.ExchangeBelowMinimumException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 교환 direct-pull 서비스 로직을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class ExchangeServiceTest {

    @Mock
    private JackpotChainRpcClient jackpotChainRpcClient;

    @Mock
    private WalletAuthCrypto walletAuthCrypto;

    @InjectMocks
    private ExchangeService exchangeService;

    @Test
    @DisplayName("교환 정보 조회 시 잔액과 비율을 조합한다")
    void getExchangeInfoCombinesBalances() {
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(jackpotChainRpcClient.getBalances("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .willReturn(new JackpotChainBalances(12_500_000_000L, 300_000_000L));
        given(jackpotChainRpcClient.getExchangeInfo())
            .willReturn(new JackpotChainExchangeInfo(100, 100));

        var response = exchangeService.getExchangeInfo("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");

        assertThat(response.jackBalance()).isEqualTo(12_500_000_000L);
        assertThat(response.potBalance()).isEqualTo(300_000_000L);
    }

    @Test
    @DisplayName("교환 제출은 서명된 트랜잭션을 그대로 전파한다")
    void exchangeSubmitsSignedTransaction() {
        ExchangeRequest request = new ExchangeRequest("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", 10_000_000_000L, "0200000001abcd");

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(jackpotChainRpcClient.getExchangeInfo()).willReturn(new JackpotChainExchangeInfo(100, 100));
        given(jackpotChainRpcClient.sendRawTransaction("0200000001abcd")).willReturn("tx-001");

        var response = exchangeService.exchangeJackToPot(request);

        assertThat(response.txId()).isEqualTo("tx-001");
        assertThat(response.receivedPot()).isEqualTo(100_000_000L);
        verify(jackpotChainRpcClient).sendRawTransaction("0200000001abcd");
    }

    @Test
    @DisplayName("최소 교환 수량 미만이면 예외를 던진다")
    void exchangeThrowsWhenBelowMinimum() {
        ExchangeRequest request = new ExchangeRequest("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", 1L, "0200000001abcd");

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(jackpotChainRpcClient.getExchangeInfo()).willReturn(new JackpotChainExchangeInfo(100, 100));

        assertThatThrownBy(() -> exchangeService.exchangeJackToPot(request))
            .isInstanceOf(ExchangeBelowMinimumException.class);
    }
}
