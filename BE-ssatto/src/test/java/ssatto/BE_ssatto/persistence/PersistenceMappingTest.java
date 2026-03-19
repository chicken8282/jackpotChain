package ssatto.BE_ssatto.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.blockchain.repository.BlockRepository;
import ssatto.BE_ssatto.domain.blockchain.repository.TransactionRepository;
import ssatto.BE_ssatto.domain.lotto.entity.JackpotPool;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.entity.LottoRanking;
import ssatto.BE_ssatto.domain.lotto.repository.JackpotPoolRepository;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.domain.lotto.repository.LottoRankingRepository;
import ssatto.BE_ssatto.domain.ops.entity.OutboxEvent;
import ssatto.BE_ssatto.domain.ops.entity.OutboxEventStatus;
import ssatto.BE_ssatto.domain.ops.repository.OutboxEventRepository;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivityType;
import ssatto.BE_ssatto.domain.wallet.repository.WalletActivityRepository;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ERD 기반 엔티티 매핑과 저장소 조회 규약을 검증한다.
 */
@DataJpaTest
@ActiveProfiles("test")
class PersistenceMappingTest {

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private BlockRepository blockRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private WalletActivityRepository walletActivityRepository;

    @Autowired
    private LottoEntryRepository lottoEntryRepository;

    @Autowired
    private JackpotPoolRepository jackpotPoolRepository;

    @Autowired
    private LottoRankingRepository lottoRankingRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private EntityManager entityManager;

    /**
     * 지갑 활동 조회가 최신순 정렬을 유지하고 연관 엔티티가 지연 로딩되는지 확인한다.
     */
    @Test
    @DisplayName("지갑 활동은 최신순 조회와 LAZY 연관관계를 지원한다")
    void walletActivityHistorySupportsLatestFirstAndLazyAssociations() {
        Wallet wallet = walletRepository.save(
            Wallet.create("wallet-address-1", "갑돌", "DEFAULT", LocalDateTime.of(2026, 3, 19, 9, 0))
        );
        Block block = blockRepository.save(
            Block.create(
                100L,
                "block-hash-100",
                "block-hash-099",
                "0x20000000",
                LocalDateTime.of(2026, 3, 19, 9, 1),
                15,
                "7.42T",
                99L,
                "wallet-address-1",
                10_000_000_000L,
                200L,
                2,
                true
            )
        );
        Transaction transaction = transactionRepository.save(
            Transaction.create(
                "tx-activity-1",
                block,
                2,
                "wallet-address-1",
                "wallet-address-2",
                1_000L,
                10L,
                LocalDateTime.of(2026, 3, 19, 9, 2)
            )
        );

        walletActivityRepository.save(
            WalletActivity.create(
                wallet,
                WalletActivityType.EXCHANGE,
                "JACK to POT 교환",
                -1_000L,
                10L,
                transaction,
                LocalDateTime.of(2026, 3, 19, 9, 2)
            )
        );
        walletActivityRepository.save(
            WalletActivity.create(
                wallet,
                WalletActivityType.MINING,
                "채굴 보상",
                10_000_000_000L,
                null,
                transaction,
                LocalDateTime.of(2026, 3, 19, 9, 3)
            )
        );

        entityManager.flush();
        entityManager.clear();

        List<WalletActivity> activities = walletActivityRepository
            .findByWalletAddressOrderByCreatedAtDesc(wallet.getAddress(), PageRequest.of(0, 10))
            .getContent();

        assertThat(activities).hasSize(2);
        assertThat(activities.get(0).getType()).isEqualTo(WalletActivityType.MINING);
        assertThat(activities.get(1).getType()).isEqualTo(WalletActivityType.EXCHANGE);

        assertLazyManyToOne(WalletActivity.class, "wallet");
        assertLazyManyToOne(WalletActivity.class, "transaction");
    }

    /**
     * backend spec에 맞는 논리 테이블명을 사용하고 있는지 확인한다.
     */
    @Test
    @DisplayName("블록체인 엔티티는 backend spec의 논리 테이블명을 따른다")
    void blockchainEntitiesUseBackendSpecTableNames() {
        assertThat(Block.class.getAnnotation(Table.class)).isNotNull();
        assertThat(Transaction.class.getAnnotation(Table.class)).isNotNull();
        assertThat(Block.class.getAnnotation(Table.class).name()).isEqualTo("block");
        assertThat(Transaction.class.getAnnotation(Table.class).name()).isEqualTo("\"transaction\"");
    }

    /**
     * 로또 이력 조회와 청구 가능 엔트리 조회가 저장소 메서드로 표현되는지 확인한다.
     */
    @Test
    @DisplayName("로또 엔트리는 지갑별 최신순 조회와 청구 가능 조회를 지원한다")
    void lottoEntryRepositorySupportsHistoryAndClaimableSearch() {
        Wallet wallet = walletRepository.save(
            Wallet.create("wallet-address-3", "갑순", "BLUE", LocalDateTime.of(2026, 3, 19, 10, 0))
        );
        Block block = blockRepository.save(
            Block.create(
                200L,
                "block-hash-200",
                "block-hash-199",
                "0x20000000",
                LocalDateTime.of(2026, 3, 19, 10, 1),
                21,
                "8.11T",
                77L,
                "wallet-address-8",
                10_000_000_000L,
                0L,
                3,
                true
            )
        );
        Transaction commitTransactionOne = transactionRepository.save(
            Transaction.create(
                "tx-commit-1",
                block,
                3,
                "wallet-address-3",
                null,
                0L,
                100_000_000L,
                LocalDateTime.of(2026, 3, 19, 10, 2)
            )
        );
        Transaction commitTransactionTwo = transactionRepository.save(
            Transaction.create(
                "tx-commit-2",
                block,
                3,
                "wallet-address-3",
                null,
                0L,
                100_000_000L,
                LocalDateTime.of(2026, 3, 19, 10, 3)
            )
        );

        lottoEntryRepository.save(
            LottoEntry.create(
                commitTransactionOne,
                wallet,
                "[1,2,3,4,5,6]",
                123_456L,
                200L,
                null,
                null,
                LottoEntryStatus.DRAWING,
                null,
                null,
                218L,
                268L,
                LocalDateTime.of(2026, 3, 19, 10, 2),
                null
            )
        );
        lottoEntryRepository.save(
            LottoEntry.create(
                commitTransactionTwo,
                wallet,
                "[6,7,8,9,10,11]",
                223_456L,
                201L,
                "[6,7,8,9,10,12]",
                5,
                LottoEntryStatus.WINNING,
                10_000L,
                null,
                219L,
                269L,
                LocalDateTime.of(2026, 3, 19, 10, 3),
                null
            )
        );

        entityManager.flush();
        entityManager.clear();

        List<LottoEntry> history = lottoEntryRepository
            .findByWalletAddressOrderByCreatedAtDesc(wallet.getAddress(), PageRequest.of(0, 10))
            .getContent();
        List<LottoEntry> claimable = lottoEntryRepository
            .findByStatusAndClaimableFromHeightLessThanEqualOrderByClaimableFromHeightAsc(
                LottoEntryStatus.WINNING,
                220L,
                PageRequest.of(0, 10)
            )
            .getContent();

        assertThat(history).hasSize(2);
        assertThat(history.get(0).getCommitTransaction().getTxId()).isEqualTo("tx-commit-2");
        assertThat(history.get(0).getStatus()).isEqualTo(LottoEntryStatus.WINNING);
        assertThat(claimable).hasSize(1);
        assertThat(claimable.get(0).getClaimableFromHeight()).isEqualTo(219L);

        assertLazyManyToOne(LottoEntry.class, "wallet");
        assertLazyOneToOne(LottoEntry.class, "commitTransaction");
    }

    /**
     * 잭팟 풀, 랭킹, 아웃박스 이벤트 저장소가 기본 저장과 정렬 조회를 지원하는지 확인한다.
     */
    @Test
    @DisplayName("잭팟 풀, 랭킹, 아웃박스 저장소가 핵심 영속 동작을 지원한다")
    void auxiliaryRepositoriesSupportCorePersistenceUseCases() {
        Wallet wallet = walletRepository.save(
            Wallet.create("wallet-address-5", "순돌", "GREEN", LocalDateTime.of(2026, 3, 19, 11, 0))
        );
        Block block = blockRepository.save(
            Block.create(
                300L,
                "block-hash-300",
                "block-hash-299",
                "0x20000000",
                LocalDateTime.of(2026, 3, 19, 11, 1),
                18,
                "9.01T",
                55L,
                "wallet-address-5",
                10_000_000_000L,
                150L,
                2,
                true
            )
        );
        Transaction commitTransaction = transactionRepository.save(
            Transaction.create(
                "tx-ranking-commit",
                block,
                3,
                "wallet-address-5",
                null,
                0L,
                100_000_000L,
                LocalDateTime.of(2026, 3, 19, 11, 2)
            )
        );
        Transaction claimTransaction = transactionRepository.save(
            Transaction.create(
                "tx-ranking-claim",
                block,
                5,
                null,
                "wallet-address-5",
                500L,
                0L,
                LocalDateTime.of(2026, 3, 19, 11, 10)
            )
        );
        LottoEntry lottoEntry = lottoEntryRepository.save(
            LottoEntry.create(
                commitTransaction,
                wallet,
                "[0,1,2,3,4,5]",
                500_000L,
                300L,
                "[0,1,2,3,4,5]",
                6,
                LottoEntryStatus.WINNING,
                250_000L,
                claimTransaction,
                318L,
                368L,
                LocalDateTime.of(2026, 3, 19, 11, 2),
                LocalDateTime.of(2026, 3, 19, 11, 10)
            )
        );

        jackpotPoolRepository.save(
            JackpotPool.create(1L, 900_000L, 10L, 3L, 300L, LocalDateTime.of(2026, 3, 19, 11, 5))
        );
        lottoRankingRepository.save(
            LottoRanking.create(
                1,
                wallet,
                lottoEntry,
                6,
                250_000L,
                LocalDateTime.of(2026, 3, 19, 11, 10),
                LocalDateTime.of(2026, 3, 19, 11, 10)
            )
        );
        outboxEventRepository.save(
            OutboxEvent.create(
                "LOTTO",
                lottoEntry.getCommitHash(),
                "LOTTO_WIN_CONFIRMED",
                "{\"commitHash\":\"tx-ranking-commit\"}",
                OutboxEventStatus.PENDING,
                LocalDateTime.of(2026, 3, 19, 11, 11)
            )
        );
        outboxEventRepository.save(
            OutboxEvent.create(
                "LOTTO",
                "processed-entry",
                "LOTTO_CLAIMED",
                "{\"commitHash\":\"processed-entry\"}",
                OutboxEventStatus.PROCESSED,
                LocalDateTime.of(2026, 3, 19, 11, 12)
            ).markProcessed(LocalDateTime.of(2026, 3, 19, 11, 13))
        );

        entityManager.flush();
        entityManager.clear();

        assertThat(jackpotPoolRepository.findById(1L)).isPresent();
        assertThat(lottoRankingRepository.findByRank(1)).isPresent();
        assertThat(outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEventStatus.PENDING))
            .hasSize(1)
            .first()
            .extracting(OutboxEvent::getAggregateId)
            .isEqualTo("tx-ranking-commit");
    }

    /**
     * 다대일 연관관계가 지연 로딩으로 선언되었는지 확인한다.
     *
     * @param ownerType 연관관계 소유 엔티티 타입
     * @param fieldName 필드 이름
     */
    private void assertLazyManyToOne(Class<?> ownerType, String fieldName) {
        Field field = extractField(ownerType, fieldName);
        ManyToOne annotation = field.getAnnotation(ManyToOne.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.fetch()).isEqualTo(FetchType.LAZY);
    }

    /**
     * 일대일 연관관계가 지연 로딩으로 선언되었는지 확인한다.
     *
     * @param ownerType 연관관계 소유 엔티티 타입
     * @param fieldName 필드 이름
     */
    private void assertLazyOneToOne(Class<?> ownerType, String fieldName) {
        Field field = extractField(ownerType, fieldName);
        OneToOne annotation = field.getAnnotation(OneToOne.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.fetch()).isEqualTo(FetchType.LAZY);
    }

    /**
     * 리플렉션으로 엔티티 필드를 조회한다.
     *
     * @param ownerType 연관관계 소유 엔티티 타입
     * @param fieldName 필드 이름
     * @return 조회된 필드
     */
    private Field extractField(Class<?> ownerType, String fieldName) {
        try {
            return ownerType.getDeclaredField(fieldName);
        } catch (NoSuchFieldException exception) {
            throw new AssertionError(exception);
        }
    }
}
