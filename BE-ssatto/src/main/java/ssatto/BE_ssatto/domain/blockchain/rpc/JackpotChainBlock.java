package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 단일 블록 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param hash 블록 해시
 * @param confirmations 확인 수
 * @param height 블록 높이
 * @param version 블록 버전 정수값
 * @param versionHex 블록 버전 hex 문자열
 * @param merkleRoot 머클 루트
 * @param timestamp 채굴 시각 Unix epoch seconds
 * @param nonce 논스
 * @param difficulty 난이도 원시값
 * @param difficultyDisplay 난이도 표시용 문자열
 * @param transactionCount 포함 트랜잭션 수
 * @param previousBlockHash 이전 블록 해시
 * @param rewardJack 기본 블록 보상
 * @param feeRewardJack 수수료 보상
 * @param minerAddress 채굴자 주소
 * @param mainChain 메인 체인 여부
 */
public record JackpotChainBlock(
    String hash,
    int confirmations,
    long height,
    int version,
    String versionHex,
    String merkleRoot,
    long timestamp,
    long nonce,
    long difficulty,
    String difficultyDisplay,
    int transactionCount,
    String previousBlockHash,
    long rewardJack,
    long feeRewardJack,
    String minerAddress,
    boolean mainChain
) {
}
