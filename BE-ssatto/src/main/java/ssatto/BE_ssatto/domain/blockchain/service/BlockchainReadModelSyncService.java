package ssatto.BE_ssatto.domain.blockchain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.blockchain.repository.BlockRepository;
import ssatto.BE_ssatto.domain.blockchain.repository.TransactionRepository;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlockTransactionOutput;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainIndexedBlock;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainIndexedTransaction;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainJackpotPool;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoResult;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.lotto.entity.JackpotPool;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.repository.JackpotPoolRepository;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.domain.lotto.service.LottoRankingService;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivityType;
import ssatto.BE_ssatto.domain.wallet.repository.WalletActivityRepository;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * 체인 상태를 기준으로 블록/트랜잭션/로또 read-model을 동기화한다.
 */
@Service
@RequiredArgsConstructor
public class BlockchainReadModelSyncService {

    private static final long LOTTO_CLAIMABLE_GAP = 18L;
    private static final long LOTTO_EXPIRE_GAP = 68L;
    private static final long LOTTO_COST_POT = 100_000_000L;
    private static final String LOTTO_PREFIX = "LOTTO";
    private static final String CLAIM_PREFIX = "CLAIM";
    private static final String POT_ASSET = "POT";

    private final JackpotChainRpcClient jackpotChainRpcClient;
    private final BlockRepository blockRepository;
    private final TransactionRepository transactionRepository;
    private final LottoEntryRepository lottoEntryRepository;
    private final JackpotPoolRepository jackpotPoolRepository;
    private final WalletRepository walletRepository;
    private final WalletActivityRepository walletActivityRepository;
    private final LottoRankingService lottoRankingService;

    /**
     * 현재 체인 팁까지 read-model을 동기화한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncToTip() {
        long currentHeight = jackpotChainRpcClient.getBlockCount();
        long lastSyncedHeight = jackpotPoolRepository.findById(1L)
            .map(JackpotPool::getLastSyncedHeight)
            .orElse(0L);

        for (long height = Math.max(1L, lastSyncedHeight + 1L); height <= currentHeight; height++) {
            syncBlock(height);
        }

        refreshLottoEntries();
        lottoRankingService.refreshTopRankings();
        syncJackpotPool(currentHeight);
    }

    private void syncBlock(long height) {
        String blockHash = jackpotChainRpcClient.getBlockHash(height);
        JackpotChainIndexedBlock indexedBlock = jackpotChainRpcClient.getIndexedBlock(blockHash);
        Block block = blockRepository.findByHeight(height)
            .orElseGet(() -> blockRepository.save(Block.create(
                indexedBlock.height(),
                indexedBlock.hash(),
                indexedBlock.previousBlockHash(),
                indexedBlock.versionHex(),
                toLocalDateTime(indexedBlock.time()),
                0,
                indexedBlock.difficultyDisplay(),
                indexedBlock.nonce(),
                indexedBlock.minerAddress(),
                indexedBlock.rewardJack(),
                indexedBlock.feeRewardJack(),
                indexedBlock.transactions().size(),
                indexedBlock.isMainChain()
            )));

        for (JackpotChainIndexedTransaction indexedTransaction : indexedBlock.transactions()) {
            Transaction transaction = ensureTransaction(block, indexedTransaction, indexedBlock.time());
            syncTransactionProjection(block, transaction, indexedTransaction, indexedBlock.time());
        }
    }

    private Transaction ensureTransaction(Block block, JackpotChainIndexedTransaction indexedTransaction, long blockTime) {
        return transactionRepository.findByTxId(indexedTransaction.txId())
            .orElseGet(() -> transactionRepository.save(Transaction.create(
                indexedTransaction.txId(),
                block,
                indexedTransaction.version(),
                resolvePrimaryAddress(indexedTransaction.outputs()),
                resolvePrimaryAddress(indexedTransaction.outputs()),
                indexedTransaction.outputs().stream().mapToLong(JackpotChainBlockTransactionOutput::jackValue).sum(),
                indexedTransaction.outputs().stream().mapToLong(output -> output.assets().getOrDefault(POT_ASSET, 0L)).sum(),
                toLocalDateTime(blockTime)
            )));
    }

    private void syncTransactionProjection(
        Block block,
        Transaction transaction,
        JackpotChainIndexedTransaction indexedTransaction,
        long blockTime
    ) {
        switch (indexedTransaction.version()) {
            case 2 -> syncExchangeActivity(transaction, indexedTransaction, blockTime);
            case 3 -> syncLottoCommit(block, transaction, indexedTransaction, blockTime);
            case 5 -> syncLottoClaim(transaction, indexedTransaction, blockTime);
            default -> {
            }
        }
    }

    private void syncExchangeActivity(Transaction transaction, JackpotChainIndexedTransaction indexedTransaction, long blockTime) {
        String walletAddress = indexedTransaction.outputs().stream()
            .filter(output -> output.assets().getOrDefault(POT_ASSET, 0L) > 0)
            .map(JackpotChainBlockTransactionOutput::address)
            .filter(address -> address != null && !address.isBlank())
            .findFirst()
            .orElse(null);
        if (walletAddress == null) {
            return;
        }

        Wallet wallet = walletRepository.findByAddress(walletAddress).orElse(null);
        if (wallet == null || walletActivityRepository.existsByWalletAddressAndTransactionTxId(walletAddress, transaction.getTxId())) {
            return;
        }

        long potAmount = indexedTransaction.outputs().stream()
            .mapToLong(output -> output.assets().getOrDefault(POT_ASSET, 0L))
            .sum();
        long jackAmount = (potAmount / LOTTO_COST_POT) * 100L * LOTTO_COST_POT;

        walletActivityRepository.save(WalletActivity.create(
            wallet,
            WalletActivityType.EXCHANGE,
            formatExchangeDescription(jackAmount, potAmount),
            -jackAmount,
            potAmount,
            transaction,
            toLocalDateTime(blockTime)
        ));
    }

    private void syncLottoCommit(Block block, Transaction transaction, JackpotChainIndexedTransaction indexedTransaction, long blockTime) {
        Optional<Wallet> wallet = walletRepository.findByAddress(resolvePrimaryAddress(indexedTransaction.outputs()));
        String chosenNumbers = extractChosenNumbers(indexedTransaction.outputs());
        if (wallet.isEmpty() || chosenNumbers == null) {
            return;
        }
        if (lottoEntryRepository.findByCommitTransactionTxId(transaction.getTxId()).isPresent()) {
            return;
        }

        LottoEntry entry = LottoEntry.create(
            transaction,
            wallet.get(),
            chosenNumbers,
            0L,
            block.getHeight(),
            null,
            null,
            LottoEntryStatus.DRAWING,
            null,
            null,
            block.getHeight() + LOTTO_CLAIMABLE_GAP,
            block.getHeight() + LOTTO_EXPIRE_GAP,
            toLocalDateTime(blockTime),
            null
        );
        lottoEntryRepository.save(entry);

        if (!walletActivityRepository.existsByWalletAddressAndTransactionTxId(wallet.get().getAddress(), transaction.getTxId())) {
            walletActivityRepository.save(WalletActivity.create(
                wallet.get(),
                WalletActivityType.LOTTO_COMMIT,
                "로또 참여 (1 POT)",
                null,
                -LOTTO_COST_POT,
                transaction,
                toLocalDateTime(blockTime)
            ));
        }
    }

    private void syncLottoClaim(Transaction transaction, JackpotChainIndexedTransaction indexedTransaction, long blockTime) {
        String commitHash = extractClaimCommitHash(indexedTransaction.outputs());
        if (commitHash == null) {
            return;
        }

        LottoEntry entry = lottoEntryRepository.findByCommitTransactionTxId(commitHash).orElse(null);
        if (entry == null) {
            return;
        }

        JackpotChainLottoResult chainResult = jackpotChainRpcClient.checkLottoResult(commitHash);
        updateEntryFromChainResult(entry, chainResult);
        entry.markClaimed(transaction, toLocalDateTime(blockTime));

        if (!walletActivityRepository.existsByWalletAddressAndTransactionTxId(entry.getWallet().getAddress(), transaction.getTxId())) {
            walletActivityRepository.save(WalletActivity.create(
                entry.getWallet(),
                WalletActivityType.LOTTO_CLAIM,
                formatClaimDescription(chainResult),
                chainResult.payoutJack(),
                chainResult.payoutPot(),
                transaction,
                toLocalDateTime(blockTime)
            ));
        }
    }

    private void refreshLottoEntries() {
        for (LottoEntry entry : lottoEntryRepository.findAll()) {
            JackpotChainLottoResult chainResult = jackpotChainRpcClient.checkLottoResult(entry.getCommitHash());
            updateEntryFromChainResult(entry, chainResult);
        }
    }

    private void updateEntryFromChainResult(LottoEntry entry, JackpotChainLottoResult chainResult) {
        if (!chainResult.success() && "pending".equalsIgnoreCase(chainResult.status())) {
            entry.updateResult(null, null, LottoEntryStatus.DRAWING, null);
            return;
        }

        String resultNumbers = chainResult.resultNumbers() == null || chainResult.resultNumbers().isEmpty()
            ? null
            : joinNumbers(chainResult.resultNumbers());
        Integer matches = chainResult.matches();
        Long rewardJack = matches != null && matches == 1 ? null : chainResult.payoutJack();

        LottoEntryStatus status = switch (chainResult.status().toLowerCase()) {
            case "pending" -> LottoEntryStatus.DRAWING;
            case "expired" -> LottoEntryStatus.EXPIRED;
            case "losing" -> LottoEntryStatus.LOSING;
            default -> matches != null && matches > 0 ? LottoEntryStatus.WINNING : LottoEntryStatus.LOSING;
        };

        entry.updateResult(resultNumbers, matches, status, rewardJack);
    }

    private void syncJackpotPool(long currentHeight) {
        JackpotChainJackpotPool chainPool = jackpotChainRpcClient.getJackpotPool();
        JackpotPool jackpotPool = jackpotPoolRepository.findById(1L)
            .orElseGet(() -> JackpotPool.create(1L, 0L, 0L, 0L, 0L, LocalDateTime.now()));
        jackpotPool.updateSnapshot(
            chainPool.balanceSatoshi(),
            chainPool.totalEntries(),
            lottoEntryRepository.findAll().stream().filter(entry -> entry.getMatchCount() != null && entry.getMatchCount() > 0).count(),
            currentHeight,
            LocalDateTime.now()
        );
        jackpotPoolRepository.save(jackpotPool);
    }

    private String resolvePrimaryAddress(List<JackpotChainBlockTransactionOutput> outputs) {
        return outputs.stream()
            .map(JackpotChainBlockTransactionOutput::address)
            .filter(address -> address != null && !address.isBlank())
            .findFirst()
            .orElse(null);
    }

    private String extractChosenNumbers(List<JackpotChainBlockTransactionOutput> outputs) {
        return outputs.stream()
            .map(JackpotChainBlockTransactionOutput::scriptPubKeyHex)
            .map(this::extractOpReturnData)
            .filter(data -> data != null && data.length >= LOTTO_PREFIX.length() + 6)
            .filter(data -> startsWithAscii(data, LOTTO_PREFIX))
            .map(data -> joinNumbers(List.of(
                data[LOTTO_PREFIX.length()] & 0xff,
                data[LOTTO_PREFIX.length() + 1] & 0xff,
                data[LOTTO_PREFIX.length() + 2] & 0xff,
                data[LOTTO_PREFIX.length() + 3] & 0xff,
                data[LOTTO_PREFIX.length() + 4] & 0xff,
                data[LOTTO_PREFIX.length() + 5] & 0xff
            )))
            .findFirst()
            .orElse(null);
    }

    private String extractClaimCommitHash(List<JackpotChainBlockTransactionOutput> outputs) {
        return outputs.stream()
            .map(JackpotChainBlockTransactionOutput::scriptPubKeyHex)
            .map(this::extractOpReturnData)
            .filter(data -> data != null && data.length >= CLAIM_PREFIX.length() + 32)
            .filter(data -> startsWithAscii(data, CLAIM_PREFIX))
            .map(data -> HexFormat.of().formatHex(slice(data, CLAIM_PREFIX.length(), 32)))
            .findFirst()
            .orElse(null);
    }

    private byte[] extractOpReturnData(String scriptPubKeyHex) {
        if (scriptPubKeyHex == null || scriptPubKeyHex.isBlank()) {
            return null;
        }
        byte[] script = HexFormat.of().parseHex(scriptPubKeyHex);
        if (script.length < 2 || script[0] != 0x6a) {
            return null;
        }
        int length = script[1] & 0xff;
        if (script.length < 2 + length) {
            return null;
        }
        return slice(script, 2, length);
    }

    private boolean startsWithAscii(byte[] value, String prefix) {
        byte[] prefixBytes = prefix.getBytes();
        if (value.length < prefixBytes.length) {
            return false;
        }
        for (int index = 0; index < prefixBytes.length; index++) {
            if (value[index] != prefixBytes[index]) {
                return false;
            }
        }
        return true;
    }

    private byte[] slice(byte[] value, int start, int length) {
        byte[] result = new byte[length];
        System.arraycopy(value, start, result, 0, length);
        return result;
    }

    private String joinNumbers(List<Integer> numbers) {
        return numbers.stream()
            .map(String::valueOf)
            .reduce((left, right) -> left + "," + right)
            .orElse("");
    }

    private String formatExchangeDescription(long jackAmount, long potAmount) {
        return "%d JACK → %d POT 교환".formatted(jackAmount / LOTTO_COST_POT, potAmount / LOTTO_COST_POT);
    }

    private String formatClaimDescription(JackpotChainLottoResult chainResult) {
        if (chainResult.matches() != null && chainResult.matches() == 1) {
            return "로또 1 POT 환불";
        }
        long rewardJack = chainResult.payoutJack() == null ? 0L : chainResult.payoutJack() / LOTTO_COST_POT;
        return "로또 보상 수령 (%s JACK)".formatted(rewardJack);
    }

    private LocalDateTime toLocalDateTime(long epochSeconds) {
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneOffset.UTC);
    }
}
