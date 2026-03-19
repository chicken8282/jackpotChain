package ssatto.BE_ssatto.domain.ops.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.ops.entity.OutboxEvent;
import ssatto.BE_ssatto.domain.ops.entity.OutboxEventStatus;

import java.util.List;
import java.util.UUID;

/**
 * 아웃박스 이벤트 저장소다.
 */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    /**
     * 처리 대기 이벤트를 생성 시각 오름차순으로 조회한다.
     *
     * @param status 이벤트 상태
     * @return 오래된 순서의 이벤트 목록
     */
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(OutboxEventStatus status);
}
