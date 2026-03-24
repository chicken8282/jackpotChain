package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain `getblockchaininfo` 응답 중 백엔드가 사용하는 핵심 필드만 보관한다.
 *
 * @param chain 체인 이름
 * @param blocks 현재 블록 수
 * @param bestBlockHash 최상단 블록 해시
 * @param difficulty 현재 난이도
 */
public record JackpotChainBlockchainInfo(
    String chain,
    long blocks,
    String bestBlockHash,
    long difficulty
) {
}
