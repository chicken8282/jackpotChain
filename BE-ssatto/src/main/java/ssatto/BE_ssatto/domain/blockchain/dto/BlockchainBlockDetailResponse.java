package ssatto.BE_ssatto.domain.blockchain.dto;

import java.time.LocalDateTime;

/**
 * 블록 상세 조회 응답이다.
 *
 * @param height 블록 높이
 * @param hash 블록 해시
 * @param reward 기본 블록 보상
 * @param feeReward 수수료 보상
 * @param txCount 포함 트랜잭션 수
 * @param confirmations 확인 수
 * @param minedAt 채굴 시각
 * @param miningElapsed 이전 블록 대비 채굴 소요 초
 * @param version 블록 버전 hex 문자열
 * @param previousHash 이전 블록 해시
 * @param nonce 논스
 * @param difficulty 표시용 난이도 문자열
 * @param minerName 채굴자 라벨 또는 주소
 * @param isMainChain 메인 체인 여부
 */
public record BlockchainBlockDetailResponse(
    long height,
    String hash,
    long reward,
    long feeReward,
    int txCount,
    int confirmations,
    LocalDateTime minedAt,
    int miningElapsed,
    String version,
    String previousHash,
    long nonce,
    String difficulty,
    String minerName,
    boolean isMainChain
) {
}
