package ssatto.BE_ssatto.domain.auth.repository;

import ssatto.BE_ssatto.domain.auth.model.AuthChallenge;

import java.util.Optional;

/**
 * 인증 챌린지 저장소다.
 */
public interface AuthChallengeRepository {

    /**
     * 챌린지를 저장한다.
     *
     * @param challenge 저장할 챌린지
     */
    void save(AuthChallenge challenge);

    /**
     * 챌린지 ID로 챌린지를 조회한다.
     *
     * @param challengeId 챌린지 식별자
     * @return 챌린지
     */
    Optional<AuthChallenge> findById(String challengeId);

    /**
     * 챌린지를 삭제한다.
     *
     * @param challengeId 챌린지 식별자
     */
    void delete(String challengeId);
}
