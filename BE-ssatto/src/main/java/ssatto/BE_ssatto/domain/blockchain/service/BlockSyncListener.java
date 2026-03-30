package ssatto.BE_ssatto.domain.blockchain.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import ssatto.BE_ssatto.global.config.RabbitMQConfig;

/**
 * Node가 발행한 node.block.created 이벤트를 소비해 Read-Model 동기화를 트리거한다.
 *
 * <p>block.sync.queue → syncToTip() 호출.
 * 처리 실패 시 Spring AMQP가 자동으로 block.sync.queue.dlq로 라우팅한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BlockSyncListener {

    private final BlockchainReadModelSyncService syncService;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_BLOCK_SYNC)
    public void onBlockCreated(String message) {
        log.info("[BlockSyncListener] node.block.created 수신 — syncToTip 트리거. payload={}", message);
        syncService.syncToTip();
    }
}
