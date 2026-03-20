package ssatto.BE_ssatto.domain.mining.dto;

import java.util.List;

/**
 * 채굴 블록 커서 페이지 응답이다.
 *
 * @param hasNext 다음 페이지 존재 여부
 * @param nextCursor 다음 커서
 * @param totalRewardJack 누적 보상
 * @param blocks 블록 목록
 */
public record MiningBlockCursorResponse(
    boolean hasNext,
    Long nextCursor,
    Long totalRewardJack,
    List<MiningBlockItemResponse> blocks
) {
}
