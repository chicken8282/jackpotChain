package ssatto.BE_ssatto.domain.lotto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.lotto.entity.JackpotPool;

/**
 * 잭팟 풀 캐시 저장소다.
 */
public interface JackpotPoolRepository extends JpaRepository<JackpotPool, Long> {
}
