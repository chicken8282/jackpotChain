package ssatto.BE_ssatto.domain.outbox.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.outbox.entity.OutboxEvent;
import ssatto.BE_ssatto.domain.outbox.entity.OutboxEventStatus;

import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    /**
     * PENDING 상태 이벤트를 생성 시각 오름차순으로 최대 100건 조회한다.
     * Dispatcher가 주기적으로 호출한다.
     */
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(OutboxEventStatus status);
}
