package ssatto.BE_ssatto.domain.outbox.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ssatto.BE_ssatto.domain.outbox.entity.OutboxEvent;
import ssatto.BE_ssatto.domain.outbox.entity.OutboxEventStatus;
import ssatto.BE_ssatto.domain.outbox.repository.OutboxEventRepository;
import ssatto.BE_ssatto.global.config.RabbitMQConfig;

import java.util.List;

/**
 * Outbox 테이블의 PENDING 이벤트를 RabbitMQ에 발행하는 스케줄러.
 *
 * <p>1초마다 PENDING 레코드를 최대 100건 조회해 Exchange로 발행한다.
 * 발행 성공 시 PROCESSED, 실패 시 FAILED로 마킹한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxDispatcher {

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void dispatch() {
        List<OutboxEvent> pending =
                outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEventStatus.PENDING);

        if (pending.isEmpty()) {
            return;
        }

        for (OutboxEvent event : pending) {
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.EXCHANGE,
                        event.getRoutingKey(),
                        event.getPayload()
                );
                event.markProcessed();
                log.debug("[OutboxDispatcher] 발행 완료: eventType={}, routingKey={}",
                        event.getEventType(), event.getRoutingKey());
            } catch (Exception e) {
                event.markFailed();
                log.error("[OutboxDispatcher] 발행 실패: eventType={}, id={}, reason={}",
                        event.getEventType(), event.getId(), e.getMessage());
            }
        }
    }
}
