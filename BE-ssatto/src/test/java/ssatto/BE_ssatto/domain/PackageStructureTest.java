package ssatto.BE_ssatto.domain;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 요청한 모듈러 모놀리식 패키지 골격이 존재하는지 검증한다.
 */
class PackageStructureTest {

    /**
     * 각 도메인이 요청된 패키지 디렉터리 구조를 포함하는지 확인한다.
     */
    @Test
    void requestedDomainDirectoriesExist() {
        Path domainRoot = Path.of("src", "main", "java", "ssatto", "BE_ssatto", "domain");
        List<String> domains = List.of("auth", "blockchain", "wallet", "exchange", "lotto", "mining", "ops");
        List<String> subDirectories = List.of("controller", "service", "repository", "entity", "dto", "exception");

        for (String domain : domains) {
            Path domainPath = domainRoot.resolve(domain);
            assertThat(Files.isDirectory(domainPath))
                .as("도메인 디렉터리가 존재해야 한다: %s", domainPath)
                .isTrue();

            for (String subDirectory : subDirectories) {
                Path subDirectoryPath = domainPath.resolve(subDirectory);
                assertThat(Files.isDirectory(subDirectoryPath))
                    .as("하위 디렉터리가 존재해야 한다: %s", subDirectoryPath)
                    .isTrue();
            }
        }
    }
}
