package ssatto.BE_ssatto.persistence;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Flyway 마이그레이션 스크립트의 존재와 핵심 정의를 검증한다.
 */
class MigrationScriptTest {

    /**
     * 초기 스키마 마이그레이션이 ERD 기준 핵심 테이블만 포함하는지 확인한다.
     */
    @Test
    @DisplayName("V1 초기 스키마는 ERD 기준 핵심 테이블만 정의한다")
    void initSchemaContainsAllCoreTables() throws Exception {
        Path migration = Path.of("src", "main", "resources", "db", "migration", "V1__init_schema.sql");

        assertThat(Files.exists(migration)).isTrue();

        String sql = Files.readString(migration);
        assertThat(sql).contains("create table wallet");
        assertThat(sql).contains("create table block");
        assertThat(sql).contains("create table \"transaction\"");
        assertThat(sql).contains("create table wallet_activity");
        assertThat(sql).contains("create table lotto_entry");
        assertThat(sql).contains("create table jackpot_pool");
        assertThat(sql).contains("create table lotto_ranking");
        assertThat(sql).doesNotContain("create table outbox_events");
    }

    /**
     * 인덱스 마이그레이션이 요구된 복합 인덱스만 포함하는지 확인한다.
     */
    @Test
    @DisplayName("V2 인덱스 마이그레이션은 ERD 기준 복합 인덱스만 포함한다")
    void addIndexesContainsRequiredIndexes() throws Exception {
        Path migration = Path.of("src", "main", "resources", "db", "migration", "V2__add_indexes.sql");

        assertThat(Files.exists(migration)).isTrue();

        String sql = Files.readString(migration);
        assertThat(sql).contains("wallet_activity (wallet_address, created_at desc)");
        assertThat(sql).contains("lotto_entry (wallet_address, created_at desc)");
        assertThat(sql).contains("lotto_entry (status, claimable_from_height)");
        assertThat(sql).contains("block (miner_address)");
        assertThat(sql).contains("block (mined_at desc)");
        assertThat(sql).doesNotContain("outbox_events (status, created_at)");
        assertThat(sql).doesNotContain("where status = 'PENDING'");
    }
}
