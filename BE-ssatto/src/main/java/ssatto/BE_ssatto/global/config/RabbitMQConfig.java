package ssatto.BE_ssatto.global.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * RabbitMQ Exchange / Queue / Binding 설정.
 *
 * <pre>
 * Exchange: jackpotchain.events (topic)
 *
 *   node.block.created  →  block.sync.queue   (Step 5: Node 이벤트 수신 후 동기화 트리거)
 *                              └─ DLQ: block.sync.queue.dlq
 *   node.#              →  ops.node.queue      (Node 운영 이벤트 전체)
 *   spring.#            →  ops.spring.queue    (Spring 내부 이벤트: OutboxDispatcher 발행)
 * </pre>
 */
@Configuration
public class RabbitMQConfig {

    // ── Exchange ────────────────────────────────────────────────────────────

    public static final String EXCHANGE = "jackpotchain.events";

    // ── Routing Keys ────────────────────────────────────────────────────────

    /** Node가 새 블록을 채굴/수신했을 때 발행하는 이벤트 */
    public static final String ROUTING_BLOCK_CREATED  = "node.block.created";
    /** Node 관련 이벤트 전체 (ops 로그용 wildcard) */
    public static final String ROUTING_NODE_WILDCARD  = "node.#";

    // ── Queue Names ─────────────────────────────────────────────────────────

    /** 블록 동기화 트리거 큐 (BlockchainReadModelSyncService Consumer) */
    public static final String QUEUE_BLOCK_SYNC       = "block.sync.queue";
    /** block.sync.queue 처리 실패 메시지 격리 큐 */
    public static final String QUEUE_BLOCK_SYNC_DLQ   = "block.sync.queue.dlq";
    /** Node 이벤트 전체 수신 큐 (운영 로그/알림 용도) */
    public static final String QUEUE_OPS_NODE         = "ops.node.queue";
    /** Spring 내부 이벤트 수신 큐 (OutboxDispatcher 발행 이벤트 수신) */
    public static final String QUEUE_OPS_SPRING       = "ops.spring.queue";
    /** Spring 이벤트 전체 wildcard (OutboxDispatcher 라우팅용) */
    public static final String ROUTING_SPRING_WILDCARD = "spring.#";

    // ── Exchange Bean ───────────────────────────────────────────────────────

    @Bean
    public TopicExchange jackpotchainEventsExchange() {
        return new TopicExchange(EXCHANGE, /* durable */ true, /* autoDelete */ false);
    }

    // ── Queue Beans ─────────────────────────────────────────────────────────

    /**
     * 블록 동기화 큐.
     * 처리 실패 시 DLQ(block.sync.queue.dlq)로 라우팅된다.
     */
    @Bean
    public Queue blockSyncQueue() {
        return QueueBuilder.durable(QUEUE_BLOCK_SYNC)
                .withArguments(Map.of(
                        "x-dead-letter-exchange",    "",                  // default exchange
                        "x-dead-letter-routing-key", QUEUE_BLOCK_SYNC_DLQ
                ))
                .build();
    }

    @Bean
    public Queue blockSyncDlq() {
        return QueueBuilder.durable(QUEUE_BLOCK_SYNC_DLQ).build();
    }

    @Bean
    public Queue opsNodeQueue() {
        return QueueBuilder.durable(QUEUE_OPS_NODE).build();
    }

    @Bean
    public Queue opsSpringQueue() {
        return QueueBuilder.durable(QUEUE_OPS_SPRING).build();
    }

    // ── Binding Beans ───────────────────────────────────────────────────────

    @Bean
    public Binding blockSyncBinding(Queue blockSyncQueue, TopicExchange jackpotchainEventsExchange) {
        return BindingBuilder.bind(blockSyncQueue)
                .to(jackpotchainEventsExchange)
                .with(ROUTING_BLOCK_CREATED);
    }

    @Bean
    public Binding opsNodeBinding(Queue opsNodeQueue, TopicExchange jackpotchainEventsExchange) {
        return BindingBuilder.bind(opsNodeQueue)
                .to(jackpotchainEventsExchange)
                .with(ROUTING_NODE_WILDCARD);
    }

    @Bean
    public Binding opsSpringBinding(Queue opsSpringQueue, TopicExchange jackpotchainEventsExchange) {
        return BindingBuilder.bind(opsSpringQueue)
                .to(jackpotchainEventsExchange)
                .with(ROUTING_SPRING_WILDCARD);
    }

    // ── MessageConverter / RabbitTemplate ───────────────────────────────────

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
