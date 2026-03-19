package ssatto.BE_ssatto.domain.blockchain.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlockchainInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;

/**
 * JackpotChain 서버 노드 RPC를 백엔드 유즈케이스에 맞게 조합한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JackpotChainNodeService {

    private final JackpotChainRpcClient jackpotChainRpcClient;

    /**
     * 서버 노드의 조회용 요약 정보를 반환한다.
     *
     * @return 노드 상태 요약
     */
    public JackpotChainNodeStatus fetchNodeStatus() {
        JackpotChainBlockchainInfo blockchainInfo = jackpotChainRpcClient.getBlockchainInfo();
        int peerCount = jackpotChainRpcClient.getPeerInfo().size();
        int mempoolTransactionCount = jackpotChainRpcClient.getMempoolTransactionCount();

        return new JackpotChainNodeStatus(
            blockchainInfo.chain(),
            blockchainInfo.blocks(),
            blockchainInfo.bestBlockHash(),
            blockchainInfo.difficulty(),
            peerCount,
            mempoolTransactionCount
        );
    }

    /**
     * 서명된 트랜잭션을 노드에 제출하고 txId를 반환한다.
     *
     * @param signedTxHex 서명된 트랜잭션 hex
     * @return 제출된 txId
     */
    public String submitSignedTransaction(String signedTxHex) {
        String txId = jackpotChainRpcClient.sendRawTransaction(signedTxHex);
        log.info("JACKPOTCHAIN_TRANSACTION_SUBMITTED txId={}", txId);
        return txId;
    }
}
