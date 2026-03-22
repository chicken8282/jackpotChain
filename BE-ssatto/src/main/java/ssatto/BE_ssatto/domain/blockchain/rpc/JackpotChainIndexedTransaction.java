package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.List;

/**
 * JackpotChain 블록 상세 내 인덱싱용 트랜잭션 DTO다.
 *
 * @param txId 트랜잭션 해시
 * @param version 트랜잭션 버전
 * @param inputs 입력 목록
 * @param outputs 출력 목록
 */
public record JackpotChainIndexedTransaction(
    String txId,
    int version,
    List<JackpotChainBlockTransactionInput> inputs,
    List<JackpotChainBlockTransactionOutput> outputs
) {
}
