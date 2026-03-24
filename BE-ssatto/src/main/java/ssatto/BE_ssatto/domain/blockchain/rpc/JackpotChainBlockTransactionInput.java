package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 블록 상세 내 트랜잭션 입력 DTO다.
 *
 * @param txId 이전 트랜잭션 해시
 * @param vout 이전 출력 인덱스
 */
public record JackpotChainBlockTransactionInput(
    String txId,
    long vout
) {
}
