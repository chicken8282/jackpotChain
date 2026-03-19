package ssatto.BE_ssatto.domain.blockchain.dto;

import java.time.LocalDateTime;

/**
 * 대시보드 최근 블록 목록의 단일 블록 응답이다.
 *
 * @param height 블록 높이
 * @param hash 블록 해시
 * @param txCount 포함 트랜잭션 수
 * @param minedAt 채굴 시각
 * @param minerLabel 채굴자 라벨
 * @param rewardJack 블록 보상
 * @param confirmations 확인 수
 */
public record BlockchainDashboardBlockResponse(
    long height,
    String hash,
    int txCount,
    LocalDateTime minedAt,
    String minerLabel,
    long rewardJack,
    int confirmations
) {
}
