package ssatto.BE_ssatto.domain.lotto.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainJackpotPool;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoResult;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.lotto.dto.LottoCommitRequest;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.global.exception.BusinessException;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 로또 direct-pull 서비스 로직을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class LottoServiceTest {

    @Mock
    private JackpotChainRpcClient jackpotChainRpcClient;

    @Mock
    private LottoEntryRepository lottoEntryRepository;

    @InjectMocks
    private LottoService lottoService;

    @Test
    @DisplayName("로또 개요에 지갑 잔액과 잭팟 풀 정보를 조합한다")
    void getOverviewCombinesRpcData() {
        given(jackpotChainRpcClient.getBalances("JackpotAddress01"))
            .willReturn(new JackpotChainBalances(12_500_000_000L, 300_000_000L));
        given(jackpotChainRpcClient.getJackpotPool())
            .willReturn(new JackpotChainJackpotPool(450_000_000_000L, 225_000_000_000L, 1_240L, 1_240L, 12L));
        given(jackpotChainRpcClient.getLottoInfo())
            .willReturn(new JackpotChainLottoInfo(450_000_000_000L, 225_000_000_000L, 1_240L, 3L));

        var response = lottoService.getOverview("JackpotAddress01");

        assertThat(response.jackBalance()).isEqualTo(12_500_000_000L);
        assertThat(response.poolBalanceJack()).isEqualTo(450_000_000_000L);
        assertThat(response.totalEntries()).isEqualTo(1_240L);
        assertThat(response.totalWinners()).isEqualTo(3L);
        assertThat(response.prizeTiers()).isEmpty();
    }

    @Test
    @DisplayName("로또 참여는 서명된 트랜잭션을 그대로 제출한다")
    void commitSubmitsSignedTransaction() {
        LottoCommitRequest request = new LottoCommitRequest(
            "JackpotAddress01",
            List.of(10, 1, 15, 3, 4, 14),
            "0300000001abcd"
        );

        given(jackpotChainRpcClient.sendRawTransaction("0300000001abcd")).willReturn("tx-001");

        lottoService.commit(request);

        verify(jackpotChainRpcClient).sendRawTransaction("0300000001abcd");
    }

    @Test
    @DisplayName("로또 번호가 6개가 아니면 예외를 던진다")
    void commitThrowsWhenNumberCountInvalid() {
        LottoCommitRequest request = new LottoCommitRequest(
            "JackpotAddress01",
            List.of(10, 1, 15),
            "0300000001abcd"
        );

        assertThatThrownBy(() -> lottoService.commit(request))
            .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("로또 결과를 FE 상태값으로 변환한다")
    void getResultMapsStatus() {
        given(jackpotChainRpcClient.checkLottoResult("commit-001"))
            .willReturn(new JackpotChainLottoResult(
                true,
                List.of(10, 1, 15, 3, 4, 14),
                List.of(10, 5, 15, 3, 9, 14),
                4,
                2_000_000_000_000L,
                0L,
                true,
                128L,
                "paid"
            ));

        var response = lottoService.getResult("commit-001");

        assertThat(response.status()).isEqualTo("WINNING");
        assertThat(response.isClaimable()).isFalse();
        assertThat(response.rewardJack()).isEqualTo(2_000_000_000_000L);
    }

    @Test
    @DisplayName("로또 참여 내역에 claimable 상태를 계산해 반환한다")
    void getEntriesReturnsClaimableStatus() {
        Wallet wallet = Wallet.create("JackpotAddress01", "내 지갑", "BLUE", LocalDateTime.now());
        Block block = Block.create(10L, "block-001", "prev-001", "0x1", LocalDateTime.now(), 12, "7.4T", 1L, "miner", 1L, 0L, 1, true);
        Transaction commitTransaction = Transaction.create("commit-001", block, 3, "from", "to", 0L, 100_000_000L, LocalDateTime.now());
        LottoEntry entry = LottoEntry.create(
            commitTransaction,
            wallet,
            "10,1,15,3,4,14",
            1L,
            100L,
            "10,5,15,3,9,14",
            4,
            LottoEntryStatus.WINNING,
            2_000_000_000_000L,
            null,
            110L,
            150L,
            LocalDateTime.of(2026, 3, 20, 10, 0),
            null
        );
        ReflectionTestUtils.setField(entry, "id", 42L);

        given(lottoEntryRepository.findByWalletAddressAndStatusOrderByCreatedAtDesc("JackpotAddress01", LottoEntryStatus.WINNING))
            .willReturn(List.of(entry));
        given(jackpotChainRpcClient.getBlockCount()).willReturn(120L);

        var response = lottoService.getEntries("JackpotAddress01", "WINNING");

        assertThat(response.entries()).hasSize(1);
        assertThat(response.entries().getFirst().isClaimable()).isTrue();
        assertThat(response.entries().getFirst().entryId()).isEqualTo(42L);
    }
}
