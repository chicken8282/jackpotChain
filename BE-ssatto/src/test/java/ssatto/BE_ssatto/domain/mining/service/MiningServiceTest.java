package ssatto.BE_ssatto.domain.mining.service;

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
import ssatto.BE_ssatto.domain.blockchain.repository.BlockRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

/**
 * 채굴 블록 조회 서비스 로직을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class MiningServiceTest {

    @Mock
    private BlockRepository blockRepository;

    @Mock
    private WalletAuthCrypto walletAuthCrypto;

    @InjectMocks
    private MiningService miningService;

    @Test
    @DisplayName("특정 지갑의 채굴 블록 내역을 커서 기준으로 조회한다")
    void getMinedBlocksReturnsCursorPage() {
        String address = "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82";
        Block latest = Block.create(
            1042L,
            "block-1042",
            "block-1041",
            "0x20000000",
            LocalDateTime.of(2026, 3, 20, 10, 30),
            12,
            "7.42T",
            11L,
            address,
            10_000_000_000L,
            0L,
            3,
            true
        );
        Block older = Block.create(
            1041L,
            "block-1041",
            "block-1040",
            "0x20000000",
            LocalDateTime.of(2026, 3, 20, 10, 10),
            14,
            "7.41T",
            12L,
            address,
            10_000_000_000L,
            0L,
            2,
            true
        );
        ReflectionTestUtils.setField(latest, "id", 1042L);
        ReflectionTestUtils.setField(older, "id", 1041L);

        given(walletAuthCrypto.isValidAddress(address)).willReturn(true);
        given(blockRepository.findByMinerAddressAndIsMainChainTrueOrderByIdDesc(address, PageRequest.of(0, 2)))
            .willReturn(new PageImpl<>(List.of(latest, older), PageRequest.of(0, 2), 3));
        given(blockRepository.sumRewardJackByMinerAddressAndIsMainChainTrue(address)).willReturn(20_000_000_000L);

        var response = miningService.getMinedBlocks(address, address, null, 2);

        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isEqualTo(1041L);
        assertThat(response.totalRewardJack()).isEqualTo(20_000_000_000L);
        assertThat(response.blocks()).hasSize(2);
        assertThat(response.blocks().getFirst().height()).isEqualTo(1042L);
    }

    @Test
    @DisplayName("다른 지갑 주소를 조회하면 권한 예외를 던진다")
    void getMinedBlocksThrowsWhenWalletSubjectDiffers() {
        assertThatThrownBy(() -> miningService.getMinedBlocks(
            "wallet-a",
            "wallet-b",
            null,
            10
        )).isInstanceOf(ssatto.BE_ssatto.global.exception.BusinessException.class);
    }
}
