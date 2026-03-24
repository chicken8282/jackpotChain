package ssatto.BE_ssatto.domain.learning.service;

// [학습 프론트엔드 v2] 추가: 학습 서비스 (Decision Modal, 리포트 생성 포함)

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ssatto.BE_ssatto.domain.learning.dto.*;
import ssatto.BE_ssatto.domain.learning.dto.LearningOverviewResponse.*;
import ssatto.BE_ssatto.domain.learning.dto.StageProgressResponse.ModuleProgress;
import ssatto.BE_ssatto.domain.learning.entity.*;
import ssatto.BE_ssatto.domain.learning.repository.*;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningService {

    private final LearningProgressRepository progressRepo;
    private final LearningBadgeRepository badgeRepo;
    private final LearningRewardRepository rewardRepo;
    private final LearningReportRepository reportRepo;

    private static final String[] MODULE_ORDER = {"1.1","1.2","1.3","2.1","2.2","3.1","3.2","4.1","4.2","5.1","5.2"};

    public LearningOverviewResponse getOverview(String address) {
        List<LearningProgress> all = progressRepo.findByWalletAddress(address);
        List<LearningBadge> badges = badgeRepo.findByWalletAddress(address);
        long totalReward = rewardRepo.sumJackAmountByWalletAddress(address);

        int completed = (int) all.stream().filter(p -> p.getStatus() == LearningStatus.COMPLETED).count();
        double pct = LearningCurriculum.TOTAL_MODULES > 0
            ? Math.round((double) completed / LearningCurriculum.TOTAL_MODULES * 1000) / 10.0 : 0;

        List<StageOverview> stages = LearningCurriculum.STAGE_MODULES.entrySet().stream().map(e -> {
            int stage = e.getKey();
            List<String> mods = e.getValue();
            int sc = (int) all.stream().filter(p -> mods.contains(p.getModule()) && p.getStatus() == LearningStatus.COMPLETED).count();
            String st = sc == 0 ? "NOT_STARTED" : sc == mods.size() ? "COMPLETED" : "IN_PROGRESS";
            return new StageOverview(stage, LearningCurriculum.STAGE_TITLES.get(stage), mods.size(), sc, st);
        }).toList();

        List<BadgeItem> bi = badges.stream().map(b -> new BadgeItem(b.getBadgeType(), b.getEarnedAt().toString())).toList();
        return new LearningOverviewResponse(LearningCurriculum.TOTAL_MODULES, completed, pct, totalReward, stages, bi);
    }

    public StageProgressResponse getStageProgress(String address, int stage) {
        List<String> moduleIds = LearningCurriculum.STAGE_MODULES.get(stage);
        if (moduleIds == null) throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST, "유효하지 않은 단계입니다.");

        List<LearningProgress> sp = progressRepo.findByWalletAddressAndStage(address, stage);
        List<ModuleProgress> mods = moduleIds.stream().map(mid -> {
            LearningProgress p = sp.stream().filter(x -> x.getModule().equals(mid)).findFirst().orElse(null);
            return new ModuleProgress(mid, LearningCurriculum.MODULE_TITLES.get(mid),
                p != null ? p.getStatus().name() : "NOT_STARTED",
                p != null ? p.getScore() : 0,
                p != null ? p.getTotalAttempts() : 0,
                p != null ? p.getCorrectCount() : 0,
                p != null && p.getCompletedAt() != null ? p.getCompletedAt().toString() : null);
        }).toList();
        return new StageProgressResponse(stage, LearningCurriculum.STAGE_TITLES.get(stage), mods);
    }

    @Transactional
    public MissionResultResponse completeMission(String moduleId, MissionCompleteRequest req) {
        Integer stage = LearningCurriculum.MODULE_STAGE.get(moduleId);
        if (stage == null) throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST, "유효하지 않은 모듈입니다.");

        LearningProgress progress = progressRepo.findByWalletAddressAndModule(req.walletAddress(), moduleId)
            .orElseGet(() -> progressRepo.save(LearningProgress.create(req.walletAddress(), stage, moduleId)));

        if (progress.getStatus() == LearningStatus.COMPLETED)
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST, "이미 완료된 모듈입니다.");

        progress.markCompleted(req.totalAttempts(), req.correctCount(), req.wrongCategories(), req.timeSpentMs());
        progressRepo.save(progress);

        int accuracy = req.totalAttempts() > 0 ? (int) ((double) req.correctCount() / req.totalAttempts() * 100) : 0;
        boolean success = accuracy >= 50;

        // 보상 (정답률 비례)
        long baseReward = LearningCurriculum.MODULE_REWARDS.getOrDefault(moduleId, 100_000_000L);
        long reward = (long) (baseReward * accuracy / 100.0);
        if (accuracy == 100) reward += LearningCurriculum.PERFECT_BONUS;
        rewardRepo.save(LearningReward.create(req.walletAddress(), accuracy == 100 ? "QUIZ_PERFECT" : "MISSION_COMPLETE", reward, moduleId));

        // 뱃지
        List<String> newBadges = checkBadges(req.walletAddress(), moduleId, accuracy);

        // 다음 모듈 / 취약 모듈
        int idx = Arrays.asList(MODULE_ORDER).indexOf(moduleId);
        String next = idx < MODULE_ORDER.length - 1 ? MODULE_ORDER[idx + 1] : null;

        return new MissionResultResponse(moduleId, success, accuracy, req.totalAttempts(), req.correctCount(),
            req.wrongCategories(), req.timeSpentMs(), reward, newBadges, next, req.wrongCategories());
    }

    @Transactional
    public LearningReportResponse generateReport(String address) {
        List<LearningProgress> all = progressRepo.findByWalletAddress(address);
        long completed = all.stream().filter(p -> p.getStatus() == LearningStatus.COMPLETED).count();
        if (completed < LearningCurriculum.TOTAL_MODULES)
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST, "모든 모듈을 완료해야 리포트를 생성할 수 있습니다.");

        // 카테고리별 점수 계산
        Map<String, List<Integer>> catScores = new HashMap<>();
        long totalTime = 0;
        for (LearningProgress p : all) {
            if (p.getStatus() != LearningStatus.COMPLETED) continue;
            String cat = LearningCurriculum.MODULE_CATEGORY.get(p.getModule());
            if (cat != null) catScores.computeIfAbsent(cat, k -> new ArrayList<>()).add(p.getScore());
            totalTime += p.getTimeSpentMs();
        }

        int sec = avg(catScores.get("security"));
        int tx = avg(catScores.get("transaction"));
        int net = avg(catScores.get("network"));
        int con = avg(catScores.get("consensus"));
        int tok = avg(catScores.get("tokenEconomy"));
        int fair = avg(catScores.get("fairness"));

        LearningReport report = reportRepo.findByWalletAddress(address)
            .orElseGet(() -> reportRepo.save(LearningReport.create(address)));
        report.updateScores(sec, tx, net, con, tok, fair, totalTime);
        reportRepo.save(report);

        // Welcome JACK 지급
        long welcomeJack = LearningCurriculum.GRADE_REWARDS.getOrDefault(report.getOverallGrade(), 200_000_000L);
        if (!badgeRepo.existsByWalletAddressAndBadgeType(address, "CERTIFICATE_" + report.getOverallGrade())) {
            rewardRepo.save(LearningReward.create(address, "WELCOME_JACK", welcomeJack, null));
            badgeRepo.save(LearningBadge.create(address, "CERTIFICATE_" + report.getOverallGrade()));
        }

        return new LearningReportResponse(sec, tx, net, con, tok, fair,
            report.getOverallGrade(), totalTime, welcomeJack,
            report.getCertificateIssuedAt() != null ? report.getCertificateIssuedAt().toString() : null);
    }

    public LearningReportResponse getReport(String address) {
        LearningReport r = reportRepo.findByWalletAddress(address).orElse(null);
        if (r == null) return null;
        long welcomeJack = LearningCurriculum.GRADE_REWARDS.getOrDefault(r.getOverallGrade(), 200_000_000L);
        return new LearningReportResponse(r.getSecurityScore(), r.getTransactionScore(), r.getNetworkScore(),
            r.getConsensusScore(), r.getTokenEconomyScore(), r.getFairnessScore(),
            r.getOverallGrade(), r.getTotalTimeMs(), welcomeJack,
            r.getCertificateIssuedAt() != null ? r.getCertificateIssuedAt().toString() : null);
    }

    private int avg(List<Integer> scores) {
        if (scores == null || scores.isEmpty()) return 0;
        return (int) scores.stream().mapToInt(Integer::intValue).average().orElse(0);
    }

    private List<String> checkBadges(String addr, String module, int accuracy) {
        List<String> newBadges = new ArrayList<>();
        Integer stage = LearningCurriculum.MODULE_STAGE.get(module);
        if (stage != null) {
            List<String> mods = LearningCurriculum.STAGE_MODULES.get(stage);
            long done = progressRepo.findByWalletAddressAndStage(addr, stage).stream()
                .filter(p -> p.getStatus() == LearningStatus.COMPLETED).count();
            if (done == mods.size()) {
                String b = "STAGE" + stage + "_CLEAR";
                if (!badgeRepo.existsByWalletAddressAndBadgeType(addr, b)) {
                    badgeRepo.save(LearningBadge.create(addr, b));
                    newBadges.add(b);
                }
            }
        }
        long total = progressRepo.findByWalletAddress(addr).stream()
            .filter(p -> p.getStatus() == LearningStatus.COMPLETED).count();
        if (total == LearningCurriculum.TOTAL_MODULES) {
            if (!badgeRepo.existsByWalletAddressAndBadgeType(addr, "ALL_CLEAR")) {
                badgeRepo.save(LearningBadge.create(addr, "ALL_CLEAR"));
                newBadges.add("ALL_CLEAR");
            }
        }
        if (accuracy == 100 && !badgeRepo.existsByWalletAddressAndBadgeType(addr, "QUIZ_PERFECT")) {
            badgeRepo.save(LearningBadge.create(addr, "QUIZ_PERFECT"));
            newBadges.add("QUIZ_PERFECT");
        }
        return newBadges;
    }
}
