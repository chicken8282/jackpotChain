package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.List;

/**
 * JackpotChain 블록 read-model 동기화용 상세 DTO다.
 *
 * @param hash 블록 해시
 * @param confirmations 확인 수
 * @param height 블록 높이
 * @param versionHex 블록 버전 hex
 * @param time 블록 타임스탬프 epoch second
 * @param nonce 논스
 * @param difficultyDisplay 난이도 표시 문자열
 * @param previousBlockHash 이전 블록 해시
 * @param rewardJack 기본 보상 JACK satoshi
 * @param feeRewardJack 수수료 보상 JACK satoshi
 * @param minerAddress 채굴자 주소
 * @param isMainChain 메인 체인 여부
 * @param transactions 포함 트랜잭션 목록
 */
public record JackpotChainIndexedBlock(
    String hash,
    int confirmations,
    long height,
    String versionHex,
    long time,
    long nonce,
    String difficultyDisplay,
    String previousBlockHash,
    long rewardJack,
    long feeRewardJack,
    String minerAddress,
    boolean isMainChain,
    List<JackpotChainIndexedTransaction> transactions
) {
}
