package ssatto.BE_ssatto.domain.blockchain.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlockchainInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainPeerInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * RPC 클라이언트를 조합하는 서비스 계층 동작을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class JackpotChainNodeServiceTest {

    @Mock
    private JackpotChainRpcClient jackpotChainRpcClient;

    @InjectMocks
    private JackpotChainNodeService jackpotChainNodeService;

    /**
     * 노드 요약 조회는 블록체인 정보, 피어 수, mempool 크기를 합쳐 반환해야 한다.
     */
    @Test
    void fetchNodeStatusAggregatesRpcResponses() {
        given(jackpotChainRpcClient.getBlockchainInfo())
            .willReturn(new JackpotChainBlockchainInfo("jackpotchain", 120L, "best-hash", 65536L));
        given(jackpotChainRpcClient.getPeerInfo())
            .willReturn(List.of(
                new JackpotChainPeerInfo("node-1", 70015, "/JackpotChain:0.1.0/", false),
                new JackpotChainPeerInfo("node-2", 70015, "/JackpotChain:0.1.0/", true)
            ));
        given(jackpotChainRpcClient.getMempoolTransactionCount()).willReturn(7);

        JackpotChainNodeStatus status = jackpotChainNodeService.fetchNodeStatus();

        assertThat(status.chain()).isEqualTo("jackpotchain");
        assertThat(status.blockCount()).isEqualTo(120L);
        assertThat(status.bestBlockHash()).isEqualTo("best-hash");
        assertThat(status.difficulty()).isEqualTo(65536L);
        assertThat(status.peerCount()).isEqualTo(2);
        assertThat(status.mempoolTransactionCount()).isEqualTo(7);
    }

    /**
     * 서명된 트랜잭션 제출은 RPC 클라이언트에 위임해야 한다.
     */
    @Test
    void submitSignedTransactionDelegatesToRpcClient() {
        given(jackpotChainRpcClient.sendRawTransaction("signed-hex")).willReturn("tx-123");

        assertThat(jackpotChainNodeService.submitSignedTransaction("signed-hex")).isEqualTo("tx-123");
        verify(jackpotChainRpcClient).sendRawTransaction("signed-hex");
    }
}
