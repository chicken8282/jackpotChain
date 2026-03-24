package ssatto.BE_ssatto.domain.learning.service;

// [학습 프론트엔드 v2] 추가: 커리큘럼 + 카테고리 매핑

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class LearningCurriculum {

    private LearningCurriculum() {}

    public static final Map<Integer, String> STAGE_TITLES = Map.of(
        1, "신뢰의 근원", 2, "디지털 소유권", 3, "가치 흐름의 이해",
        4, "생태계의 유지", 5, "최종 실행"
    );

    public static final Map<String, String> MODULE_TITLES = new LinkedHashMap<>();
    public static final Map<Integer, List<String>> STAGE_MODULES = new LinkedHashMap<>();
    public static final Map<String, Integer> MODULE_STAGE = new LinkedHashMap<>();
    public static final Map<String, Long> MODULE_REWARDS = new LinkedHashMap<>();

    /** [v2] 모듈 → 리포트 카테고리 매핑 */
    public static final Map<String, String> MODULE_CATEGORY = new LinkedHashMap<>();

    public static final int TOTAL_MODULES = 12;
    public static final long PERFECT_BONUS = 50_000_000L;

    /** [v2] Welcome JACK 등급별 지급 */
    public static final Map<String, Long> GRADE_REWARDS = Map.of(
        "GOLD", 1_000_000_000L,   // 10 JACK
        "SILVER", 500_000_000L,   // 5 JACK
        "BRONZE", 200_000_000L    // 2 JACK
    );

    static {
        STAGE_MODULES.put(1, List.of("1.1", "1.2", "1.3"));
        STAGE_MODULES.put(2, List.of("2.1", "2.2"));
        STAGE_MODULES.put(3, List.of("3.1", "3.2", "3.3"));
        STAGE_MODULES.put(4, List.of("4.1", "4.2"));
        STAGE_MODULES.put(5, List.of("5.1", "5.2"));

        MODULE_TITLES.put("1.1", "투명한 유리 금고");
        MODULE_TITLES.put("1.2", "디지털 봉인 (해시)");
        MODULE_TITLES.put("1.3", "합의의 힘");
        MODULE_TITLES.put("2.1", "나만의 열쇠 만들기");
        MODULE_TITLES.put("2.2", "디지털 서명 체험");
        MODULE_TITLES.put("3.1", "디지털 지폐의 여행 (UTXO)");
        MODULE_TITLES.put("3.2", "트랜잭션 만들어보기");
        MODULE_TITLES.put("3.3", "블록 확정까지의 여정");
        MODULE_TITLES.put("4.1", "행운의 숫자 찾기 (채굴)");
        MODULE_TITLES.put("4.2", "JACK & POT 토큰 이코노미");
        MODULE_TITLES.put("5.1", "로또 참여 시뮬레이션");
        MODULE_TITLES.put("5.2", "공정성 증명");

        STAGE_MODULES.forEach((stage, modules) ->
            modules.forEach(m -> MODULE_STAGE.put(m, stage)));

        MODULE_REWARDS.put("1.1", 100_000_000L);
        MODULE_REWARDS.put("1.2", 100_000_000L);
        MODULE_REWARDS.put("1.3", 100_000_000L);
        MODULE_REWARDS.put("2.1", 200_000_000L);
        MODULE_REWARDS.put("2.2", 200_000_000L);
        MODULE_REWARDS.put("3.1", 300_000_000L);
        MODULE_REWARDS.put("3.2", 300_000_000L);
        MODULE_REWARDS.put("3.3", 300_000_000L);
        MODULE_REWARDS.put("4.1", 400_000_000L);
        MODULE_REWARDS.put("4.2", 400_000_000L);
        MODULE_REWARDS.put("5.1", 500_000_000L);
        MODULE_REWARDS.put("5.2", 500_000_000L);

        // [v2] 모듈 → 리포트 카테고리
        MODULE_CATEGORY.put("1.1", "network");
        MODULE_CATEGORY.put("1.2", "security");
        MODULE_CATEGORY.put("1.3", "consensus");
        MODULE_CATEGORY.put("2.1", "security");
        MODULE_CATEGORY.put("2.2", "security");
        MODULE_CATEGORY.put("3.1", "transaction");
        MODULE_CATEGORY.put("3.2", "transaction");
        MODULE_CATEGORY.put("3.3", "transaction");
        MODULE_CATEGORY.put("4.1", "consensus");
        MODULE_CATEGORY.put("4.2", "tokenEconomy");
        MODULE_CATEGORY.put("5.1", "fairness");
        MODULE_CATEGORY.put("5.2", "fairness");
    }
}
