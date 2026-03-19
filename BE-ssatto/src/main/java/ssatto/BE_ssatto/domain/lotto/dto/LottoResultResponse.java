package ssatto.BE_ssatto.domain.lotto.dto;

import java.util.List;

/**
 * 특정 로또 커밋 결과 조회 응답이다.
 *
 * @param commitHash 커밋 해시
 * @param chosenNumbers 선택 숫자 배열
 * @param resultNumbers 결과 숫자 배열
 * @param matchCount 일치 개수
 * @param isClaimable 클레임 가능 여부
 * @param status FE 상태값
 * @param rewardJack JACK 보상 satoshi
 */
public record LottoResultResponse(
    String commitHash,
    List<Integer> chosenNumbers,
    List<Integer> resultNumbers,
    Integer matchCount,
    boolean isClaimable,
    String status,
    Long rewardJack
) {
}
