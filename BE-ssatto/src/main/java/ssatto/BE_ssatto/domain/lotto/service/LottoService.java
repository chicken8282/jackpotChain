package ssatto.BE_ssatto.domain.lotto.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.exception.AuthForbiddenException;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainJackpotPool;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoResult;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.blockchain.service.BlockchainReadModelSyncService;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimContextResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimPoolUtxoResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoCommitRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoEntriesResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoEntrySummaryResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoOverviewResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoResultResponse;
import ssatto.BE_ssatto.domain.lotto.exception.InvalidLottoNumbersException;
import ssatto.BE_ssatto.domain.lotto.exception.InvalidLottoRequestException;
import ssatto.BE_ssatto.domain.lotto.exception.LottoEntryMappingException;
import ssatto.BE_ssatto.domain.lotto.exception.LottoEntryNotFoundException;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.global.logging.BusinessEventLogger;
import ssatto.BE_ssatto.global.logging.LoggingEventType;
import ssatto.BE_ssatto.global.logging.LoggingFields;
import ssatto.BE_ssatto.global.logging.LoggingUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.time.LocalDateTime;

/**
 * 로또 direct-pull 조회와 제출을 담당하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LottoService {

    private final JackpotChainRpcClient jackpotChainRpcClient;
    private final LottoEntryRepository lottoEntryRepository;
    private final WalletAuthCrypto walletAuthCrypto;
    private final BlockchainReadModelSyncService blockchainReadModelSyncService;

    /**
     * 로또 페이지 통합 정보를 조회한다.
     *
     * @param address 지갑 주소
     * @return 로또 통합 응답
     */
    @Transactional(readOnly = true)
    public LottoOverviewResponse getOverview(String address) {
        return getOverview(address, address);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 로또 개요를 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @return 로또 통합 응답
     */
    @Transactional(readOnly = true)
    public LottoOverviewResponse getOverview(String authenticatedWalletAddress, String address) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);

        JackpotChainBalances balances = jackpotChainRpcClient.getBalances(address);
        JackpotChainJackpotPool jackpotPool = jackpotChainRpcClient.getJackpotPool();
        JackpotChainLottoInfo lottoInfo = jackpotChainRpcClient.getLottoInfo();

        return new LottoOverviewResponse(
            balances.jackSatoshi(),
            balances.potSatoshi(),
            jackpotPool.balanceSatoshi(),
            lottoInfo.totalEntries(),
            lottoInfo.payoutCount(),
            List.of()
        );
    }

    /**
     * 서명된 로또 참여 트랜잭션을 제출한다.
     *
     * @param request 로또 참여 요청
     * @return 제출된 트랜잭션 해시
     */
    public String commit(LottoCommitRequest request) {
        return commit(request.fromAddress(), request);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 서명된 로또 참여 트랜잭션을 제출한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param request 로또 참여 요청
     * @return 제출된 트랜잭션 해시
     */
    public String commit(String authenticatedWalletAddress, LottoCommitRequest request) {
        validateWalletSubject(authenticatedWalletAddress, request.fromAddress());
        validateCommitRequest(request);
        String txId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
        BusinessEventLogger.info(
            LoggingEventType.LOTTO_COMMIT_SUBMITTED,
            "lotto commit submitted",
            LoggingUtils.fields(
                LoggingFields.TX_ID, txId,
                LoggingFields.WALLET_ADDRESS, request.fromAddress()
            )
        );
        return txId;
    }

    /**
     * 서명된 로또 보상 수령 트랜잭션을 제출한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param request 클레임 요청
     * @return 클레임 응답
     */
    public LottoClaimResponse claim(String authenticatedWalletAddress, LottoClaimRequest request) {
        validateWalletSubject(authenticatedWalletAddress, request.fromAddress());
        validateAddress(request.fromAddress());
        blockchainReadModelSyncService.syncToTip();

        if (!StringUtils.hasText(request.commitHash()) || !StringUtils.hasText(request.signedTxHex())) {
            throw new InvalidLottoRequestException();
        }

        LottoEntry entry = lottoEntryRepository.findByCommitTransactionTxId(request.commitHash())
            .orElseThrow(LottoEntryNotFoundException::new);
        validateWalletSubject(authenticatedWalletAddress, entry.getWallet().getAddress());

        Long currentHeight = jackpotChainRpcClient.getBlockCount();
        String status = resolveResultStatus(entry, currentHeight);
        if (!isClaimable(entry, currentHeight, status)) {
            throw new InvalidLottoRequestException();
        }

        String claimTxId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
        LocalDateTime claimedAt = LocalDateTime.now();
        Long rewardJack = resolveRewardJack(status, entry.getMatchCount(), entry.getRewardJack());

        BusinessEventLogger.info(
            LoggingEventType.LOTTO_CLAIM_SUBMITTED,
            "lotto claim submitted",
            LoggingUtils.fields(
                LoggingFields.TX_ID, claimTxId,
                LoggingFields.WALLET_ADDRESS, request.fromAddress(),
                LoggingFields.COMMIT_HASH, request.commitHash()
            )
        );

        return new LottoClaimResponse(claimTxId, entry.getMatchCount(), rewardJack, claimedAt);
    }

    /**
     * 로또 커밋 결과를 조회한다.
     *
     * @param commitHash 커밋 해시
     * @return 로또 결과 응답
     */
    @Transactional(readOnly = true)
    public LottoResultResponse getResult(String authenticatedWalletAddress, String commitHash) {
        if (!StringUtils.hasText(commitHash)) {
            throw new InvalidLottoRequestException();
        }
        blockchainReadModelSyncService.syncToTip();

        LottoEntry entry = lottoEntryRepository.findByCommitTransactionTxId(commitHash)
            .orElseThrow(LottoEntryNotFoundException::new);
        validateWalletSubject(authenticatedWalletAddress, entry.getWallet().getAddress());
        Long currentHeight = jackpotChainRpcClient.getBlockCount();
        String status = resolveResultStatus(entry, currentHeight);
        boolean isClaimable = isClaimable(entry, currentHeight, status);

        List<Integer> resultNumbers = parseNullableNumbers(entry.getResultNumbers());
        if (resultNumbers == null && "DRAWING".equals(status)) {
            resultNumbers = computePartialResultNumbers(entry, currentHeight);
        }

        return new LottoResultResponse(
            commitHash,
            parseNumbers(entry.getChosenNumbers()),
            resultNumbers,
            entry.getMatchCount(),
            isClaimable,
            status,
            resolveRewardJack(status, entry.getMatchCount(), entry.getRewardJack())
        );
    }

    /**
     * 클라이언트 claim 서명에 필요한 체인 기준 컨텍스트를 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param commitHash 커밋 해시
     * @return 클레임 컨텍스트 응답
     */
    @Transactional(readOnly = true)
    public LottoClaimContextResponse getClaimContext(String authenticatedWalletAddress, String commitHash) {
        if (!StringUtils.hasText(commitHash)) {
            throw new InvalidLottoRequestException();
        }
        blockchainReadModelSyncService.syncToTip();

        LottoEntry entry = lottoEntryRepository.findByCommitTransactionTxId(commitHash)
            .orElseThrow(LottoEntryNotFoundException::new);
        validateWalletSubject(authenticatedWalletAddress, entry.getWallet().getAddress());

        Long currentHeight = jackpotChainRpcClient.getBlockCount();
        String status = resolveResultStatus(entry, currentHeight);
        if (!isClaimable(entry, currentHeight, status)) {
            throw new InvalidLottoRequestException();
        }

        JackpotChainLottoResult chainResult = jackpotChainRpcClient.checkLottoResult(commitHash);
        if (chainResult.paid()) {
            throw new InvalidLottoRequestException();
        }

        // DB 기준 rewardJack 우선 사용 (lottocheckresult RPC는 jackpot 1등 pool_snapshot=0 버그 있음)
        Long rewardJack = entry.getRewardJack() != null ? entry.getRewardJack() : chainResult.payoutJack();
        Integer matchCount = entry.getMatchCount() != null ? entry.getMatchCount() : chainResult.matches();

        return new LottoClaimContextResponse(
            commitHash,
            matchCount,
            rewardJack,
            chainResult.payoutPot(),
            true,
            jackpotChainRpcClient.listPoolUnspent().stream()
                .map(utxo -> new LottoClaimPoolUtxoResponse(
                    utxo.txId(),
                    utxo.vout(),
                    utxo.jackSatoshi(),
                    utxo.confirmations()
                ))
                .toList()
        );
    }

    /**
     * 특정 지갑의 로또 참여 내역을 조회한다.
     *
     * @param address 지갑 주소
     * @param status 상태 필터
     * @return 로또 참여 내역 응답
     */
    @Transactional(readOnly = true)
    public LottoEntriesResponse getEntries(String address, String status) {
        return getEntries(address, address, status);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 참여 내역을 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @param status 상태 필터
     * @return 로또 참여 내역 응답
     */
    @Transactional(readOnly = true)
    public LottoEntriesResponse getEntries(String authenticatedWalletAddress, String address, String status) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);
        blockchainReadModelSyncService.syncToTip();

        LottoEntryStatus entryStatus = parseEntryStatus(status);
        List<LottoEntry> entries = entryStatus == null
            ? lottoEntryRepository.findByWalletAddressOrderByCreatedAtDesc(address)
            : lottoEntryRepository.findByWalletAddressAndStatusOrderByCreatedAtDesc(address, entryStatus);
        Long currentHeight = jackpotChainRpcClient.getBlockCount();

        return new LottoEntriesResponse(entries.stream()
            .map(entry -> toEntrySummary(entry, currentHeight))
            .toList());
    }

    private void validateCommitRequest(LottoCommitRequest request) {
        validateAddress(request.fromAddress());

        if (!StringUtils.hasText(request.signedTxHex())) {
            throw new InvalidLottoRequestException();
        }

        if (request.chosenNumbers() == null || request.chosenNumbers().size() != 6) {
            throw new InvalidLottoNumbersException();
        }

        boolean invalidNumberExists = request.chosenNumbers().stream()
            .anyMatch(number -> number == null || number < 0 || number > 15);
        if (invalidNumberExists) {
            throw new InvalidLottoNumbersException();
        }
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address) || !walletAuthCrypto.isValidAddress(address)) {
            throw new InvalidLottoRequestException();
        }
    }

    private void validateWalletSubject(String authenticatedWalletAddress, String address) {
        if (!StringUtils.hasText(authenticatedWalletAddress) || !authenticatedWalletAddress.equals(address)) {
            throw new AuthForbiddenException();
        }
    }

    private String resolveResultStatus(LottoEntry entry, Long currentHeight) {
        if (entry.getStatus() == LottoEntryStatus.DRAWING || currentHeight < entry.getClaimableFromHeight()) {
            return "DRAWING";
        }
        boolean isClaimed = entry.getClaimTransaction() != null || entry.getClaimedAt() != null;
        if (!isClaimed && currentHeight > entry.getClaimableUntilHeight()) {
            return "EXPIRED";
        }
        return entry.getStatus().name();
    }

    private Long resolveRewardJack(String status, Integer matchCount, Long rewardJack) {
        if (!"WINNING".equals(status)) {
            return null;
        }
        if (matchCount != null && matchCount == 1) {
            return null;
        }
        return rewardJack;
    }

    private LottoEntrySummaryResponse toEntrySummary(LottoEntry entry, Long currentHeight) {
        boolean isClaimed = entry.getClaimTransaction() != null || entry.getClaimedAt() != null;
        boolean isClaimable = entry.getStatus() == LottoEntryStatus.WINNING
            && !isClaimed
            && currentHeight >= entry.getClaimableFromHeight()
            && currentHeight <= entry.getClaimableUntilHeight();

        return new LottoEntrySummaryResponse(
            entry.getId(),
            entry.getCommitHash(),
            parseNumbers(entry.getChosenNumbers()),
            entry.getStatus().name(),
            entry.getMatchCount(),
            entry.getRewardJack(),
            isClaimed,
            isClaimable,
            entry.getCreatedAt()
        );
    }

    private List<Integer> parseNumbers(String value) {
        if (!StringUtils.hasText(value)) {
            return List.of();
        }

        try {
            return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Integer::valueOf)
                .toList();
        } catch (NumberFormatException exception) {
            throw new LottoEntryMappingException();
        }
    }

    /**
     * DRAWING 상태에서 현재까지 채굴된 비교 블록들의 결과 숫자를 부분적으로 계산한다.
     * 비교 오프셋: N+3, N+6, N+9, N+12, N+15, N+18
     * 결과 숫자 = 블록 해시 마지막 hex 문자 (0~15)
     */
    private List<Integer> computePartialResultNumbers(LottoEntry entry, Long currentHeight) {
        int[] offsets = {3, 6, 9, 12, 15, 18};
        List<Integer> partial = new ArrayList<>();
        long commitHeight = entry.getCommitBlockHeight();

        for (int offset : offsets) {
            long targetHeight = commitHeight + offset;
            if (targetHeight > currentHeight) {
                break;
            }
            try {
                String blockHash = jackpotChainRpcClient.getBlockHash(targetHeight);
                if (blockHash == null || blockHash.isEmpty()) {
                    break;
                }
                // 마지막 hex 문자 = 마지막 바이트 하위 4비트 (block_hash[-1] & 0x0f)
                int digit = Integer.parseInt(blockHash.substring(blockHash.length() - 1), 16);
                partial.add(digit);
            } catch (Exception e) {
                break;
            }
        }

        return partial.isEmpty() ? null : partial;
    }

    private List<Integer> parseNullableNumbers(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return parseNumbers(value);
    }

    private boolean isClaimable(LottoEntry entry, Long currentHeight, String status) {
        boolean isClaimed = entry.getClaimTransaction() != null || entry.getClaimedAt() != null;
        return "WINNING".equals(status)
            && !isClaimed
            && currentHeight >= entry.getClaimableFromHeight()
            && currentHeight <= entry.getClaimableUntilHeight();
    }

    private LottoEntryStatus parseEntryStatus(String status) {
        if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status)) {
            return null;
        }

        try {
            return LottoEntryStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new InvalidLottoRequestException();
        }
    }
}
