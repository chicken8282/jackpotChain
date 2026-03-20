package ssatto.BE_ssatto.domain;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * API와 ERD 기준으로 필요한 도메인 폴더 구조만 존재하는지 검증한다.
 */
class PackageStructureTest {

    /**
     * API 기반 도메인과 ERD 기반 하위 폴더 구조를 확인한다.
     */
    @Test
    void requestedDomainDirectoriesExist() {
        Path domainRoot = Path.of("src", "main", "java", "ssatto", "BE_ssatto", "domain");
        List<String> entityDomains = List.of("blockchain", "wallet", "lotto");
        List<String> apiOnlyDomains = List.of("exchange", "mining");
        List<String> entitySubDirectories = List.of("controller", "service", "repository", "entity", "dto", "exception");
        List<String> apiOnlySubDirectories = List.of("controller", "service", "dto", "exception");
        List<String> authSubDirectories = List.of("controller", "service", "dto", "exception", "repository", "util", "model");

        for (String domain : entityDomains) {
            Path domainPath = domainRoot.resolve(domain);
            assertThat(Files.isDirectory(domainPath)).isTrue();

            for (String subDirectory : entitySubDirectories) {
                assertThat(Files.isDirectory(domainPath.resolve(subDirectory))).isTrue();
            }
        }

        assertThat(Files.isDirectory(domainRoot.resolve("blockchain").resolve("rpc"))).isTrue();

        Path authDomainPath = domainRoot.resolve("auth");
        assertThat(Files.isDirectory(authDomainPath)).isTrue();
        for (String subDirectory : authSubDirectories) {
            assertThat(Files.isDirectory(authDomainPath.resolve(subDirectory))).isTrue();
        }
        assertThat(Files.exists(authDomainPath.resolve("entity"))).isFalse();

        for (String domain : apiOnlyDomains) {
            Path domainPath = domainRoot.resolve(domain);
            assertThat(Files.isDirectory(domainPath)).isTrue();

            for (String subDirectory : apiOnlySubDirectories) {
                assertThat(Files.isDirectory(domainPath.resolve(subDirectory))).isTrue();
            }

            assertThat(Files.exists(domainPath.resolve("entity"))).isFalse();
            assertThat(Files.exists(domainPath.resolve("repository"))).isFalse();
        }

        assertThat(Files.exists(domainRoot.resolve("ops"))).isFalse();
    }
}
