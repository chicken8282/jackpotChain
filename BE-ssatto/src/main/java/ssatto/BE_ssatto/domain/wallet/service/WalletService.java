package ssatto.BE_ssatto.domain.wallet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.exception.AuthForbiddenException;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainOnboardingReward;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainUnspentOutput;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletRequest;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletActivityCursorResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletActivityItemResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletSummaryResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletUtxoItemResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletUtxoListResponse;
import ssatto.BE_ssatto.domain.wallet.exception.InvalidWalletRequestException;
import ssatto.BE_ssatto.domain.wallet.exception.WalletAddressDuplicatedException;
import ssatto.BE_ssatto.domain.wallet.exception.WalletNotFoundException;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivityType;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.repository.WalletActivityRepository;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;
import ssatto.BE_ssatto.global.logging.BusinessEventLogger;
import ssatto.BE_ssatto.global.logging.LoggingEventType;
import ssatto.BE_ssatto.global.logging.LoggingFields;
import ssatto.BE_ssatto.global.logging.LoggingUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * 지갑 메타데이터 저장과 on-chain 잔액 조회를 조합하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private static final long ONBOARDING_REWARD_POT_SATOSHI = 100_000_000L;

    private final WalletRepository walletRepository;
    private final WalletActivityRepository walletActivityRepository;
    private final JackpotChainRpcClient jackpotChainRpcClient;
    private final WalletAuthCrypto walletAuthCrypto;

    /**
     * 지갑 메타데이터를 저장한다.
     *
     * @param request 지갑 등록 요청
     * @return 저장된 지갑 정보
     */
    @Transactional
    public CreateWalletResponse createWallet(CreateWalletRequest request) {
        validateAddress(request.address());
        boolean grantOnboardingReward = Boolean.TRUE.equals(request.grantOnboardingReward());
        Wallet existingWallet = walletRepository.findByAddress(request.address()).orElse(null);
        if (existingWallet != null && !grantOnboardingReward) {
            throw new WalletAddressDuplicatedException();
        }
        Wallet wallet = existingWallet == null ? registerWalletMetadata(request) : existingWallet;

        JackpotChainOnboardingReward onboardingReward = null;
        if (grantOnboardingReward && !wallet.isOnboardingRewardGranted()) {
            onboardingReward = jackpotChainRpcClient.grantOnboardingPotReward(wallet.getAddress());
            wallet.markOnboardingRewardGranted(onboardingReward.txId(), LocalDateTime.now());

            BusinessEventLogger.info(
                LoggingEventType.WALLET_ONBOARDING_REWARD_GRANTED,
                "wallet onboarding reward granted",
                LoggingUtils.fields(
                    LoggingFields.WALLET_ADDRESS, wallet.getAddress(),
                    LoggingFields.TX_ID, onboardingReward.txId()
                )
            );
        }

        return new CreateWalletResponse(
            wallet.getAddress(),
            wallet.getNickname(),
            wallet.getWalletColor(),
            wallet.getCreatedAt(),
            wallet.isOnboardingRewardGranted(),
            wallet.getOnboardingRewardTxId(),
            onboardingReward == null
                ? (wallet.isOnboardingRewardGranted() ? ONBOARDING_REWARD_POT_SATOSHI : 0L)
                : onboardingReward.potSatoshi()
        );
    }

    private Wallet registerWalletMetadata(CreateWalletRequest request) {
        Wallet wallet = walletRepository.save(Wallet.create(
            request.address(),
            request.nickname(),
            request.walletColor(),
            LocalDateTime.now()
        ));

        BusinessEventLogger.info(
            LoggingEventType.WALLET_REGISTERED,
            "wallet registered",
            LoggingUtils.fields(
                LoggingFields.WALLET_ADDRESS, wallet.getAddress()
            )
        );

        return wallet;
    }

    /**
     * 지갑 메타데이터와 on-chain 잔액을 조합해 반환한다.
     *
     * @param addressesQuery 쉼표 구분 지갑 주소 목록
     * @return 지갑 목록 응답
     */
    @Transactional(readOnly = true)
    public WalletListResponse getWallets(String addressesQuery) {
        List<String> addresses = parseAddresses(addressesQuery);
        List<WalletSummaryResponse> wallets = addresses.stream()
            .map(addr -> walletRepository.findByAddress(addr)
                .map(this::loadWalletSummary)
                .orElse(null))
            .filter(Objects::nonNull)
            .toList();

        return new WalletListResponse(wallets);
    }

    /**
     * 특정 지갑의 활동 내역을 커서 기준으로 조회한다.
     *
     * @param address 지갑 주소
     * @param cursor 마지막으로 읽은 활동 ID
     * @param size 조회 개수
     * @param type 활동 타입
     * @return 활동 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public WalletActivityCursorResponse getActivities(String address, Long cursor, int size, String type) {
        return getActivities(address, address, cursor, size, type);
    }

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 활동 내역을 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @param cursor 마지막으로 읽은 활동 ID
     * @param size 조회 개수
     * @param type 활동 타입
     * @return 활동 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public WalletActivityCursorResponse getActivities(
        String authenticatedWalletAddress,
        String address,
        Long cursor,
        int size,
        String type
    ) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);
        validatePageSize(size);
        walletRepository.findByAddress(address)
            .orElseThrow(WalletNotFoundException::new);

        WalletActivityType activityType = parseActivityType(type);
        PageRequest pageRequest = PageRequest.of(0, size);
        Page<WalletActivity> page = loadActivities(address, cursor, pageRequest, activityType);
        List<WalletActivityItemResponse> activities = page.getContent().stream()
            .map(this::toActivityItem)
            .toList();
        Long nextCursor = page.hasNext() && !activities.isEmpty()
            ? activities.getLast().activityId()
            : null;

        return new WalletActivityCursorResponse(page.hasNext(), nextCursor, activities);
    }

    /**
     * 인증된 지갑 주소의 UTXO 목록을 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @return UTXO 목록 응답
     */
    @Transactional(readOnly = true)
    public WalletUtxoListResponse getUtxos(String authenticatedWalletAddress, String address) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);
        walletRepository.findByAddress(address)
            .orElseThrow(WalletNotFoundException::new);

        List<WalletUtxoItemResponse> utxos = jackpotChainRpcClient.listUnspent(address).stream()
            .map(this::toUtxoItem)
            .toList();

        return new WalletUtxoListResponse(utxos);
    }

    private WalletSummaryResponse loadWalletSummary(Wallet wallet) {
        JackpotChainBalances balances = jackpotChainRpcClient.getBalances(wallet.getAddress());

        return new WalletSummaryResponse(
            wallet.getAddress(),
            wallet.getNickname(),
            wallet.getWalletColor(),
            balances.jackSatoshi(),
            balances.potSatoshi(),
            wallet.getCreatedAt()
        );
    }

    private List<String> parseAddresses(String addressesQuery) {
        if (!StringUtils.hasText(addressesQuery)) {
            throw new InvalidWalletRequestException();
        }

        List<String> addresses = Arrays.stream(addressesQuery.split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .distinct()
            .toList();

        if (addresses.isEmpty()) {
            throw new InvalidWalletRequestException();
        }

        return addresses;
    }

    private Page<WalletActivity> loadActivities(
        String address,
        Long cursor,
        PageRequest pageRequest,
        WalletActivityType activityType
    ) {
        if (cursor == null) {
            return activityType == null
                ? walletActivityRepository.findByWalletAddressOrderByCreatedAtDesc(address, pageRequest)
                : walletActivityRepository.findByWalletAddressAndTypeOrderByCreatedAtDesc(address, activityType, pageRequest);
        }

        return activityType == null
            ? walletActivityRepository.findByWalletAddressAndIdLessThanOrderByCreatedAtDesc(address, cursor, pageRequest)
            : walletActivityRepository.findByWalletAddressAndTypeAndIdLessThanOrderByCreatedAtDesc(
                address,
                activityType,
                cursor,
                pageRequest
            );
    }

    private WalletActivityItemResponse toActivityItem(WalletActivity activity) {
        return new WalletActivityItemResponse(
            activity.getId(),
            activity.getType().name(),
            activity.getDescription(),
            activity.getTransaction() == null ? null : activity.getTransaction().getTxId(),
            activity.getJackAmount(),
            activity.getPotAmount(),
            activity.getCreatedAt()
        );
    }

    private WalletUtxoItemResponse toUtxoItem(JackpotChainUnspentOutput output) {
        return new WalletUtxoItemResponse(
            output.txId(),
            output.vout(),
            output.address(),
            output.jackSatoshi(),
            output.assets(),
            output.confirmations(),
            output.coinbase()
        );
    }

    private WalletActivityType parseActivityType(String type) {
        if (!StringUtils.hasText(type) || "ALL".equalsIgnoreCase(type)) {
            return null;
        }

        try {
            return WalletActivityType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new InvalidWalletRequestException();
        }
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address) || !walletAuthCrypto.isValidAddress(address)) {
            throw new InvalidWalletRequestException();
        }
    }

    private void validateWalletSubject(String authenticatedWalletAddress, String address) {
        if (!StringUtils.hasText(authenticatedWalletAddress) || !authenticatedWalletAddress.equals(address)) {
            throw new AuthForbiddenException();
        }
    }

    private void validatePageSize(int size) {
        if (size < 1 || size > 100) {
            throw new InvalidWalletRequestException();
        }
    }
}
