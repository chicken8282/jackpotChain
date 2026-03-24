package ssatto.BE_ssatto.domain.blockchain.service;

/**
 * 백엔드가 서버 노드에서 조회한 상태 요약을 보관한다.
 *
 * @param chain 체인 이름
 * @param blockCount 현재 블록 수
 * @param bestBlockHash 최상단 블록 해시
 * @param difficulty 현재 난이도
 * @param peerCount 연결 피어 수
 * @param mempoolTransactionCount mempool 트랜잭션 수
 */
public record JackpotChainNodeStatus(
    String chain,
    long blockCount,
    String bestBlockHash,
    long difficulty,
    int peerCount,
    int mempoolTransactionCount
) {
}
