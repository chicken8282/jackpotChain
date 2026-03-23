package ssatto.BE_ssatto.domain.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.auth.model.AuthRefreshSession;

import java.util.Optional;

/**
 * refresh 세션 영속화를 담당한다.
 */
public interface AuthRefreshSessionRepository extends JpaRepository<AuthRefreshSession, Long> {

    /**
     * 세션 핸들로 refresh 세션을 조회한다.
     *
     * @param sessionHandle 세션 핸들
     * @return refresh 세션
     */
    Optional<AuthRefreshSession> findBySessionHandle(String sessionHandle);
}
