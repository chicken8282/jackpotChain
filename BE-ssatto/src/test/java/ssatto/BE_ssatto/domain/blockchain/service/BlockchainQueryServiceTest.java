package ssatto.BE_ssatto.domain.blockchain.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainBlockDetailResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardResponse;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlock;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlockchainInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainPeerInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

/**
 * 블록체인 조회 서비스가 RPC 응답을 REST 응답 모델로 조합하는지 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class BlockchainQueryServiceTest {

    @Mock
    private JackpotChainRpcClient jackpotChainRpcClient;

    @InjectMocks
    private BlockchainQueryService blockchainQueryService;

    /**
     * 대시보드 조회는 체인 요약, 피어 수, 멤풀 수, 최근 블록 목록을 합쳐 반환해야 한다.
     */
    @Test
    void getDashboardAggregatesRpcResponses() {
        given(jackpotChainRpcClient.getBlockchainInfo())
            .willReturn(new JackpotChainBlockchainInfo("jackpotchain", 11L, "best-hash", 65536L));
        given(jackpotChainRpcClient.getPeerInfo())
            .willReturn(List.of(
                new JackpotChainPeerInfo("10.0.0.1:8333", 70015, "/JackpotChain:0.1.0/", false),
                new JackpotChainPeerInfo("10.0.0.2:8333", 70015, "/JackpotChain:0.1.0/", true)
            ));
        given(jackpotChainRpcClient.getMempoolTransactionCount()).willReturn(4);
        given(jackpotChainRpcClient.getBlockHash(11L)).willReturn("hash-11");
        given(jackpotChainRpcClient.getBlockHash(10L)).willReturn("hash-10");
        given(jackpotChainRpcClient.getBlock("hash-11")).willReturn(block(11L, "hash-11", "hash-10", 1_710_811_400L, 2));
        given(jackpotChainRpcClient.getBlock("hash-10")).willReturn(block(10L, "hash-10", "hash-9", 1_710_811_370L, 1));

        BlockchainDashboardResponse response = blockchainQueryService.getDashboard(2);

        assertThat(response.isOn()).isTrue();
        assertThat(response.height()).isEqualTo(11L);
        assertThat(response.bestBlockHash()).isEqualTo("best-hash");
        assertThat(response.difficulty()).isEqualTo(65536L);
        assertThat(response.connections()).isEqualTo(2);
        assertThat(response.pooledTxCount()).isEqualTo(4);
        assertThat(response.blocks()).hasSize(2);
        assertThat(response.blocks().get(0).height()).isEqualTo(11L);
        assertThat(response.blocks().get(0).rewardJack()).isEqualTo(5_000_000_000L);
        assertThat(response.nodes()).containsExactly(1, 2);
    }

    /**
     * 블록 상세 조회는 이전 블록 시간 차이까지 계산해 반환해야 한다.
     */
    @Test
    void getBlockDetailBuildsResponseFromCurrentAndPreviousBlock() {
        given(jackpotChainRpcClient.getBlockHash(11L)).willReturn("hash-11");
        given(jackpotChainRpcClient.getBlock("hash-11"))
            .willReturn(block(11L, "hash-11", "hash-10", 1_710_811_400L, 2));
        given(jackpotChainRpcClient.getBlock("hash-10"))
            .willReturn(block(10L, "hash-10", "hash-9", 1_710_811_388L, 1));

        BlockchainBlockDetailResponse response = blockchainQueryService.getBlockDetail(11L);

        assertThat(response.height()).isEqualTo(11L);
        assertThat(response.hash()).isEqualTo("hash-11");
        assertThat(response.reward()).isEqualTo(5_000_000_000L);
        assertThat(response.feeReward()).isEqualTo(300_000_000L);
        assertThat(response.txCount()).isEqualTo(2);
        assertThat(response.confirmations()).isEqualTo(8);
        assertThat(response.minedAt()).isEqualTo(LocalDateTime.of(2024, 3, 19, 1, 23, 20));
        assertThat(response.miningElapsed()).isEqualTo(12);
        assertThat(response.version()).isEqualTo("0x00000001");
        assertThat(response.previousHash()).isEqualTo("hash-10");
        assertThat(response.nonce()).isEqualTo(12345L);
        assertThat(response.difficulty()).isEqualTo("0x1E100000");
        assertThat(response.minerName()).isEqualTo("JACK_TEST_ADDRESS");
        assertThat(response.isMainChain()).isTrue();
        assertThat(response.merkleRoot()).isEqualTo("merkle");
        assertThat(response.jackpotContribution()).isEqualTo(90_000_000L);
    }

    private JackpotChainBlock block(
        long height,
        String hash,
        String previousHash,
        long timestamp,
        int transactionCount
    ) {
        return new JackpotChainBlock(
            hash,
            8,
            height,
            1,
            "0x00000001",
            "merkle",
            timestamp,
            12345L,
            504365056L,
            "0x1E100000",
            transactionCount,
            previousHash,
            5_000_000_000L,
            300_000_000L,
            "JACK_TEST_ADDRESS",
            true
        );
    }
}
