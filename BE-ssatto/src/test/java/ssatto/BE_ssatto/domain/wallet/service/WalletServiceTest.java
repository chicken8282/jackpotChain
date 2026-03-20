package ssatto.BE_ssatto.domain.wallet.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletRequest;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivityType;
import ssatto.BE_ssatto.domain.wallet.exception.InvalidWalletRequestException;
import ssatto.BE_ssatto.domain.wallet.exception.WalletAddressDuplicatedException;
import ssatto.BE_ssatto.domain.wallet.repository.WalletActivityRepository;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 지갑 메타데이터와 RPC 조합 서비스를 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private JackpotChainRpcClient jackpotChainRpcClient;

    @Mock
    private WalletActivityRepository walletActivityRepository;

    @Mock
    private WalletAuthCrypto walletAuthCrypto;

    @InjectMocks
    private WalletService walletService;

    @Test
    @DisplayName("지갑 메타데이터를 저장한다")
    void createWalletSavesMetadata() {
        CreateWalletRequest request = new CreateWalletRequest("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE");
        Wallet wallet = Wallet.create(
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "내 지갑",
            "BLUE",
            LocalDateTime.of(2026, 3, 20, 9, 0)
        );

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.empty());
        given(walletRepository.save(any(Wallet.class))).willReturn(wallet);

        var response = walletService.createWallet(request);

        assertThat(response.address()).isEqualTo("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");
        assertThat(response.walletColor()).isEqualTo("BLUE");
        verify(walletRepository).save(any(Wallet.class));
    }

    @Test
    @DisplayName("이미 등록된 지갑 주소면 예외를 던진다")
    void createWalletThrowsWhenDuplicated() {
        CreateWalletRequest request = new CreateWalletRequest("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE");

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .willReturn(Optional.of(Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.now())));

        assertThatThrownBy(() -> walletService.createWallet(request))
            .isInstanceOf(WalletAddressDuplicatedException.class);
    }

    @Test
    @DisplayName("블록체인 주소 형식이 아니면 예외를 던진다")
    void createWalletThrowsWhenAddressFormatInvalid() {
        CreateWalletRequest request = new CreateWalletRequest("invalid-address", "내 지갑", "BLUE");
        given(walletAuthCrypto.isValidAddress("invalid-address")).willReturn(false);

        assertThatThrownBy(() -> walletService.createWallet(request))
            .isInstanceOf(InvalidWalletRequestException.class);
    }

    @Test
    @DisplayName("지갑 목록에 메타데이터와 on-chain 잔액을 함께 반환한다")
    void getWalletsReturnsBalances() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.of(2026, 3, 20, 9, 0));

        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.of(wallet));
        given(jackpotChainRpcClient.getBalances("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .willReturn(new JackpotChainBalances(12_500_000_000L, 300_000_000L));

        WalletListResponse response = walletService.getWallets("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");

        assertThat(response.wallets()).hasSize(1);
        assertThat(response.wallets().getFirst().jackBalance()).isEqualTo(12_500_000_000L);
        assertThat(response.wallets().getFirst().potBalance()).isEqualTo(300_000_000L);
    }

    @Test
    @DisplayName("활동 내역을 커서 기준으로 조회한다")
    void getActivitiesReturnsCursorPage() {
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "내 지갑", "BLUE", LocalDateTime.of(2026, 3, 20, 9, 0));
        Block block = Block.create(10L, "block-001", "prev-001", "0x1", LocalDateTime.now(), 12, "7.4T", 1L, "miner", 1L, 0L, 1, true);
        Transaction transaction = Transaction.create("tx-001", block, 3, "from", "to", 0L, 100_000_000L, LocalDateTime.now());
        WalletActivity activity = WalletActivity.create(
            wallet,
            WalletActivityType.LOTTO_COMMIT,
            "로또 참여 (1 POT)",
            null,
            -100_000_000L,
            transaction,
            LocalDateTime.of(2026, 3, 20, 9, 30)
        );
        ReflectionTestUtils.setField(activity, "id", 20L);

        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.of(wallet));
        given(walletActivityRepository.findByWalletAddressAndTypeOrderByCreatedAtDesc(
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            WalletActivityType.LOTTO_COMMIT,
            PageRequest.of(0, 2)
        )).willReturn(new PageImpl<>(java.util.List.of(activity), PageRequest.of(0, 2), 3));

        var response = walletService.getActivities("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", null, 2, "LOTTO_COMMIT");

        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isEqualTo(20L);
        assertThat(response.activities()).hasSize(1);
        assertThat(response.activities().getFirst().txId()).isEqualTo("tx-001");
        assertThat(response.activities().getFirst().potAmount()).isEqualTo(-100_000_000L);
    }

    @Test
    @DisplayName("다른 지갑의 활동 내역을 조회하려 하면 권한 예외를 던진다")
    void getActivitiesThrowsWhenWalletSubjectDiffers() {
        assertThatThrownBy(() -> walletService.getActivities(
            "wallet-a",
            "wallet-b",
            null,
            20,
            null
        )).isInstanceOf(ssatto.BE_ssatto.global.exception.BusinessException.class);
    }
}
