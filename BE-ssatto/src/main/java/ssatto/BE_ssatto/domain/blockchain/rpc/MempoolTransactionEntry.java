package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain getrawmempool(verbose=true) 응답의 단일 트랜잭션 항목이다.
 *
 * @param fee 수수료 (satoshi)
 * @param size 트랜잭션 크기 (bytes)
 * @param time 멤풀 등록 시각 (epoch seconds)
 */
public record MempoolTransactionEntry(
    long fee,
    int size,
    long time
) {
}
