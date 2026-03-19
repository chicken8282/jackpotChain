package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.List;

/**
 * JackpotChain 로또 결과 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param success 결과 확정 여부
 * @param chosenNumbers 선택 숫자 배열
 * @param resultNumbers 추첨 결과 숫자 배열
 * @param matches 일치 개수
 * @param payoutJack JACK 보상 satoshi
 * @param payoutPot POT 보상 satoshi
 * @param paid 지급 여부
 * @param payoutBlock 결과 확정 블록 높이
 * @param status 체인 상태 문자열
 */
public record JackpotChainLottoResult(
    boolean success,
    List<Integer> chosenNumbers,
    List<Integer> resultNumbers,
    Integer matches,
    Long payoutJack,
    Long payoutPot,
    boolean paid,
    Long payoutBlock,
    String status
) {
}
