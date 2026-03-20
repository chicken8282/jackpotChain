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
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimRequest;
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
        log.info("LOTTO_COMMIT_SUBMITTED txId={} address={}", txId, request.fromAddress());
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

        log.info("LOTTO_CLAIM_SUBMITTED txId={} address={} commitHash={}", claimTxId, request.fromAddress(), request.commitHash());

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

        LottoEntry entry = lottoEntryRepository.findByCommitTransactionTxId(commitHash)
            .orElseThrow(LottoEntryNotFoundException::new);
        validateWalletSubject(authenticatedWalletAddress, entry.getWallet().getAddress());
        Long currentHeight = jackpotChainRpcClient.getBlockCount();
        String status = resolveResultStatus(entry, currentHeight);
        boolean isClaimable = isClaimable(entry, currentHeight, status);

        return new LottoResultResponse(
            commitHash,
            parseNumbers(entry.getChosenNumbers()),
            parseNullableNumbers(entry.getResultNumbers()),
            entry.getMatchCount(),
            isClaimable,
            status,
            resolveRewardJack(status, entry.getMatchCount(), entry.getRewardJack())
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
