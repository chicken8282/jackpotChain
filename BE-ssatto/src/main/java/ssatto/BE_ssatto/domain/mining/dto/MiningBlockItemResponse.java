package ssatto.BE_ssatto.domain.mining.dto;

import java.time.LocalDateTime;

/**
 * 채굴 블록 단건 응답이다.
 *
 * @param blockId 블록 DB 식별자
 * @param height 블록 높이
 * @param hash 블록 해시
 * @param rewardJack 채굴 보상
 * @param txCount 트랜잭션 수
 * @param minedAt 채굴 시각
 */
public record MiningBlockItemResponse(
    Long blockId,
    Long height,
    String hash,
    Long rewardJack,
    Integer txCount,
    LocalDateTime minedAt
) {
}
