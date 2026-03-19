package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.List;

/**
 * JackpotChain 서버 노드 JSON-RPC 호출을 추상화한다.
 */
public interface JackpotChainRpcClient {

    /**
     * 노드가 보유한 현재 블록 높이를 조회한다.
     *
     * @return 현재 블록 높이
     */
    long getBlockCount();

    /**
     * 노드의 체인 요약 정보를 조회한다.
     *
     * @return 체인 요약 정보
     */
    JackpotChainBlockchainInfo getBlockchainInfo();

    /**
     * 특정 높이의 블록 해시를 조회한다.
     *
     * @param height 블록 높이
     * @return 블록 해시
     */
    String getBlockHash(long height);

    /**
     * 블록 해시 기준으로 단일 블록 상세 정보를 조회한다.
     *
     * @param blockHash 블록 해시
     * @return 블록 상세 정보
     */
    JackpotChainBlock getBlock(String blockHash);

    /**
     * 노드가 연결한 피어 정보를 조회한다.
     *
     * @return 피어 목록
     */
    List<JackpotChainPeerInfo> getPeerInfo();

    /**
     * 노드 mempool에 적재된 트랜잭션 수를 조회한다.
     *
     * @return mempool 트랜잭션 수
     */
    int getMempoolTransactionCount();

    /**
     * 서명된 원시 트랜잭션을 체인 노드에 제출한다.
     *
     * @param signedTxHex 서명된 트랜잭션 hex
     * @return 노드가 반환한 txId
     */
    String sendRawTransaction(String signedTxHex);
}
