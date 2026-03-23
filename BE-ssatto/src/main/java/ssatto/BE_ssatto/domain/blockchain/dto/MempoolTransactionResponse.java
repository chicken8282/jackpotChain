package ssatto.BE_ssatto.domain.blockchain.dto;

/**
 * 멤풀 트랜잭션 단일 항목 응답이다.
 *
 * @param txId 트랜잭션 ID
 * @param fee 수수료 (satoshi)
 * @param size 트랜잭션 크기 (bytes)
 * @param time 멤풀 등록 시각 (epoch seconds)
 */
public record MempoolTransactionResponse(
    String txId,
    long fee,
    int size,
    long time
) {
}
