package ssatto.BE_ssatto.domain.lotto.dto;

import java.util.List;

/**
 * 로또 참여 내역 목록 응답이다.
 *
 * @param entries 로또 참여 목록
 */
public record LottoEntriesResponse(
    List<LottoEntrySummaryResponse> entries
) {
}
