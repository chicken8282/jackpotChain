package ssatto.BE_ssatto.domain.lotto.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainJackpotPool;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoCommitRequest;
import ssatto.BE_ssatto.domain.lotto.exception.InvalidLottoNumbersException;
import ssatto.BE_ssatto.domain.lotto.exception.LottoEntryNotFoundException;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
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

    @Mock
    private WalletAuthCrypto walletAuthCrypto;

    @InjectMocks
    private LottoService lottoService;

    @Test
    @DisplayName("로또 개요에 지갑 잔액과 잭팟 풀 정보를 조합한다")
    void getOverviewCombinesRpcData() {
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(jackpotChainRpcClient.getBalances("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .willReturn(new JackpotChainBalances(12_500_000_000L, 300_000_000L));
        given(jackpotChainRpcClient.getJackpotPool())
            .willReturn(new JackpotChainJackpotPool(450_000_000_000L, 225_000_000_000L, 1_240L, 1_240L, 12L));
        given(jackpotChainRpcClient.getLottoInfo())
            .willReturn(new JackpotChainLottoInfo(450_000_000_000L, 225_000_000_000L, 1_240L, 3L));

        var response = lottoService.getOverview("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");

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
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            List.of(10, 1, 15, 3, 4, 14),
            "0300000001abcd"
        );

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(jackpotChainRpcClient.sendRawTransaction("0300000001abcd")).willReturn("tx-001");

        lottoService.commit(request);

        verify(jackpotChainRpcClient).sendRawTransaction("0300000001abcd");
    }

    @Test
    @DisplayName("로또 번호가 6개가 아니면 예외를 던진다")
    void commitThrowsWhenNumberCountInvalid() {
        LottoCommitRequest request = new LottoCommitRequest(
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            List.of(10, 1, 15),
            "0300000001abcd"
        );

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        assertThatThrownBy(() -> lottoService.commit(request))
            .isInstanceOf(InvalidLottoNumbersException.class);
    }

    @Test
    @DisplayName("로또 결과를 FE 상태값으로 변환한다")
    void getResultMapsStatus() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.now());
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

        given(lottoEntryRepository.findByCommitTransactionTxId("commit-001")).willReturn(java.util.Optional.of(entry));
        given(jackpotChainRpcClient.getBlockCount()).willReturn(120L);

        var response = lottoService.getResult("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "commit-001");

        assertThat(response.status()).isEqualTo("WINNING");
        assertThat(response.isClaimable()).isTrue();
        assertThat(response.rewardJack()).isEqualTo(2_000_000_000_000L);
    }

    @Test
    @DisplayName("클레임 만료 높이를 지나면 EXPIRED 상태를 반환한다")
    void getResultReturnsExpiredWhenClaimWindowPassed() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.now());
        Block block = Block.create(10L, "block-001", "prev-001", "0x1", LocalDateTime.now(), 12, "7.4T", 1L, "miner", 1L, 0L, 1, true);
        Transaction commitTransaction = Transaction.create("commit-002", block, 3, "from", "to", 0L, 100_000_000L, LocalDateTime.now());
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

        given(lottoEntryRepository.findByCommitTransactionTxId("commit-002")).willReturn(java.util.Optional.of(entry));
        given(jackpotChainRpcClient.getBlockCount()).willReturn(151L);

        var response = lottoService.getResult("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "commit-002");

        assertThat(response.status()).isEqualTo("EXPIRED");
        assertThat(response.isClaimable()).isFalse();
    }

    @Test
    @DisplayName("로또 참여 내역에 claimable 상태를 계산해 반환한다")
    void getEntriesReturnsClaimableStatus() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.now());
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

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(lottoEntryRepository.findByWalletAddressAndStatusOrderByCreatedAtDesc("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", LottoEntryStatus.WINNING))
            .willReturn(List.of(entry));
        given(jackpotChainRpcClient.getBlockCount()).willReturn(120L);

        var response = lottoService.getEntries("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "WINNING");

        assertThat(response.entries()).hasSize(1);
        assertThat(response.entries().getFirst().isClaimable()).isTrue();
        assertThat(response.entries().getFirst().entryId()).isEqualTo(42L);
    }

    @Test
    @DisplayName("로또 클레임은 claim 가능 엔트리의 서명된 트랜잭션을 제출하고 응답을 조합한다")
    void claimSubmitsSignedTransactionForClaimableEntry() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.now());
        Block block = Block.create(10L, "block-001", "prev-001", "0x1", LocalDateTime.now(), 12, "7.4T", 1L, "miner", 1L, 0L, 1, true);
        Transaction commitTransaction = Transaction.create("commit-claim-001", block, 3, "from", "to", 0L, 100_000_000L, LocalDateTime.now());
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

        LottoClaimRequest request = new LottoClaimRequest(
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "commit-claim-001",
            "0500000001abcd"
        );

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(lottoEntryRepository.findByCommitTransactionTxId("commit-claim-001")).willReturn(java.util.Optional.of(entry));
        given(jackpotChainRpcClient.getBlockCount()).willReturn(120L);
        given(jackpotChainRpcClient.sendRawTransaction("0500000001abcd")).willReturn("claim-tx-001");

        var response = lottoService.claim("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", request);

        assertThat(response.claimTxId()).isEqualTo("claim-tx-001");
        assertThat(response.matchCount()).isEqualTo(4);
        assertThat(response.rewardJack()).isEqualTo(2_000_000_000_000L);
        verify(jackpotChainRpcClient).sendRawTransaction("0500000001abcd");
    }

    @Test
    @DisplayName("로또 클레임은 존재하지 않는 commitHash면 예외를 던진다")
    void claimThrowsWhenEntryMissing() {
        LottoClaimRequest request = new LottoClaimRequest(
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "missing-commit",
            "0500000001abcd"
        );

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(lottoEntryRepository.findByCommitTransactionTxId("missing-commit")).willReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> lottoService.claim("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", request))
            .isInstanceOf(LottoEntryNotFoundException.class);
    }
}
