package ssatto.BE_ssatto.domain.lotto.dto;

import java.util.List;

/**
 * 클라이언트 signed claim TX 구성에 필요한 컨텍스트 응답이다.
 *
 * @param commitHash 커밋 해시
 * @param matchCount 일치 개수
 * @param rewardJack JACK 보상 satoshi
 * @param rewardPot POT 보상 satoshi
 * @param claimable 현재 클레임 가능 여부
 * @param poolUtxos 잭팟 풀 UTXO 목록
 */
public record LottoClaimContextResponse(
    String commitHash,
    Integer matchCount,
    Long rewardJack,
    Long rewardPot,
    boolean claimable,
    List<LottoClaimPoolUtxoResponse> poolUtxos
) {
}
