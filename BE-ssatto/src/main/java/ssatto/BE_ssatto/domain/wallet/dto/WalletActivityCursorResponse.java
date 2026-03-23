package ssatto.BE_ssatto.domain.wallet.dto;

import java.util.List;

/**
 * 지갑 활동 커서 페이지 응답이다.
 *
 * @param hasNext 다음 페이지 존재 여부
 * @param nextCursor 다음 페이지 커서
 * @param activities 활동 목록
 */
public record WalletActivityCursorResponse(
    boolean hasNext,
    Long nextCursor,
    List<WalletActivityItemResponse> activities
) {
}
