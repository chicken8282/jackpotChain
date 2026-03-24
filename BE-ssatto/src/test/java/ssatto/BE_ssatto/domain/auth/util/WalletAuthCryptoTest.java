package ssatto.BE_ssatto.domain.auth.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Python blockchain 구현과의 주소/서명 정합성을 검증한다.
 */
class WalletAuthCryptoTest {

    private final WalletAuthCrypto walletAuthCrypto = new WalletAuthCrypto();

    @Test
    @DisplayName("압축 공개키로부터 blockchain과 동일한 주소를 재유도한다")
    void deriveAddressMatchesBlockchainVector() {
        WalletFixture fixture = readFixture().getFirst();
        String address = walletAuthCrypto.deriveAddress(
            fixture.publicKeyHex()
        );

        assertThat(address).isEqualTo(fixture.address());
    }

    @Test
    @DisplayName("고정 벡터 서명 검증이 성공한다")
    void verifySignatureMatchesBlockchainVector() {
        WalletFixture fixture = readFixture().getFirst();
        boolean result = walletAuthCrypto.verifySignature(
            fixture.loginMessage(),
            fixture.signatureHex(),
            fixture.publicKeyHex()
        );

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Base58Check 주소 형식을 검증한다")
    void isValidAddressChecksBase58Check() {
        assertThat(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).isTrue();
        assertThat(walletAuthCrypto.isValidAddress("0x1234")).isFalse();
    }

    private List<WalletFixture> readFixture() {
        try {
            return new ObjectMapper().readValue(
                Path.of("..", "docs", "fixtures", "wallet_vectors.json").toFile(),
                new TypeReference<>() {
                }
            );
        } catch (IOException exception) {
            throw new IllegalStateException("fixture 파일을 읽지 못했습니다.", exception);
        }
    }

    /**
     * FE/BE/blockchain 공용 fixture 구조다.
     */
    private record WalletFixture(
        String privateKeyHex,
        String publicKeyHex,
        String address,
        String loginMessage,
        String signatureHex
    ) {
    }
}
