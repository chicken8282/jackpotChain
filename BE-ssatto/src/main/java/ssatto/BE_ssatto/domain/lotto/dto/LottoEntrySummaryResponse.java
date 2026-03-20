package ssatto.BE_ssatto.domain.lotto.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 로또 참여 내역 단건 응답이다.
 *
 * @param entryId 엔트리 ID
 * @param commitHash 커밋 해시
 * @param chosenNumbers 선택 번호
 * @param status 상태
 * @param matchCount 일치 개수
 * @param rewardJack JACK 보상
 * @param claimed 보상 수령 여부
 * @param isClaimable 보상 수령 가능 여부
 * @param enteredAt 참여 시각
 */
public record LottoEntrySummaryResponse(
    Long entryId,
    String commitHash,
    List<Integer> chosenNumbers,
    String status,
    Integer matchCount,
    Long rewardJack,
    boolean claimed,
    boolean isClaimable,
    LocalDateTime enteredAt
) {
}
