package ssatto.BE_ssatto.domain.auth.util;

import org.bouncycastle.asn1.ASN1InputStream;
import org.bouncycastle.asn1.ASN1Integer;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.sec.SECNamedCurves;
import org.bouncycastle.crypto.digests.RIPEMD160Digest;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.signers.ECDSASigner;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;

/**
 * blockchain 규칙과 동일한 주소/서명 검증 유틸리티다.
 */
@Component
public class WalletAuthCrypto {

    private static final int VERSION_PUBKEY = 0x4A;
    private static final int VERSION_SCRIPT = 0x4B;
    private static final String BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    private static final ECDomainParameters DOMAIN_PARAMETERS = new ECDomainParameters(
        SECNamedCurves.getByName("secp256k1").getCurve(),
        SECNamedCurves.getByName("secp256k1").getG(),
        SECNamedCurves.getByName("secp256k1").getN(),
        SECNamedCurves.getByName("secp256k1").getH()
    );

    /**
     * JackpotChain 주소 형식을 검증한다.
     *
     * @param address 지갑 주소
     * @return 유효 여부
     */
    public boolean isValidAddress(String address) {
        if (address == null || address.isBlank()) {
            return false;
        }

        try {
            byte[] decoded = base58Decode(address);
            if (decoded.length < 5) {
                return false;
            }

            int version = Byte.toUnsignedInt(decoded[0]);
            if (version != VERSION_PUBKEY && version != VERSION_SCRIPT) {
                return false;
            }

            byte[] payload = Arrays.copyOfRange(decoded, 1, decoded.length - 4);
            byte[] checksum = Arrays.copyOfRange(decoded, decoded.length - 4, decoded.length);
            byte[] expectedChecksum = Arrays.copyOf(doubleSha256(Arrays.copyOf(decoded, decoded.length - 4)), 4);
            return payload.length == 20 && Arrays.equals(checksum, expectedChecksum);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    /**
     * 압축 공개키 hex에서 JackpotChain 주소를 재유도한다.
     *
     * @param publicKeyHex 압축 공개키 hex
     * @return 재유도된 주소
     */
    public String deriveAddress(String publicKeyHex) {
        byte[] publicKey = parseHex(publicKeyHex);
        byte[] pubkeyHash = hash160(publicKey);
        byte[] versioned = new byte[1 + pubkeyHash.length];
        versioned[0] = (byte) VERSION_PUBKEY;
        System.arraycopy(pubkeyHash, 0, versioned, 1, pubkeyHash.length);

        byte[] checksum = Arrays.copyOf(doubleSha256(versioned), 4);
        byte[] addressBytes = new byte[versioned.length + checksum.length];
        System.arraycopy(versioned, 0, addressBytes, 0, versioned.length);
        System.arraycopy(checksum, 0, addressBytes, versioned.length, checksum.length);
        return base58Encode(addressBytes);
    }

    /**
     * canonical 로그인 메시지와 공개키/서명 조합을 검증한다.
     *
     * @param message canonical 메시지
     * @param signatureHex DER 서명 hex
     * @param publicKeyHex 압축 공개키 hex
     * @return 유효 여부
     */
    public boolean verifySignature(String message, String signatureHex, String publicKeyHex) {
        try {
            byte[] messageHash = sha256(message.getBytes(StandardCharsets.UTF_8));
            byte[] signature = parseHex(signatureHex);
            byte[] publicKey = parseHex(publicKeyHex);
            BigInteger[] signatureComponents = decodeDerSignature(signature);

            ECDSASigner verifier = new ECDSASigner();
            verifier.init(
                false,
                new ECPublicKeyParameters(
                    SECNamedCurves.getByName("secp256k1").getCurve().decodePoint(publicKey),
                    DOMAIN_PARAMETERS
                )
            );
            return verifier.verifySignature(messageHash, signatureComponents[0], signatureComponents[1]);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private byte[] parseHex(String value) {
        return HexFormat.of().parseHex(value);
    }

    private byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 해시 계산에 실패했습니다.", exception);
        }
    }

    private byte[] doubleSha256(byte[] value) {
        return sha256(sha256(value));
    }

    private byte[] hash160(byte[] value) {
        byte[] sha = sha256(value);
        RIPEMD160Digest digest = new RIPEMD160Digest();
        digest.update(sha, 0, sha.length);
        byte[] output = new byte[digest.getDigestSize()];
        digest.doFinal(output, 0);
        return output;
    }

    private String base58Encode(byte[] data) {
        int leadingZeros = 0;
        while (leadingZeros < data.length && data[leadingZeros] == 0) {
            leadingZeros++;
        }

        BigInteger number = new BigInteger(1, data);
        StringBuilder encoded = new StringBuilder();
        while (number.compareTo(BigInteger.ZERO) > 0) {
            BigInteger[] division = number.divideAndRemainder(BigInteger.valueOf(58));
            encoded.insert(0, BASE58_ALPHABET.charAt(division[1].intValue()));
            number = division[0];
        }

        return "1".repeat(leadingZeros) + encoded;
    }

    private byte[] base58Decode(String value) {
        int leadingOnes = 0;
        while (leadingOnes < value.length() && value.charAt(leadingOnes) == '1') {
            leadingOnes++;
        }

        BigInteger number = BigInteger.ZERO;
        for (int index = 0; index < value.length(); index++) {
            int alphabetIndex = BASE58_ALPHABET.indexOf(value.charAt(index));
            if (alphabetIndex < 0) {
                throw new IllegalArgumentException("Base58 문자가 아닙니다.");
            }
            number = number.multiply(BigInteger.valueOf(58)).add(BigInteger.valueOf(alphabetIndex));
        }

        byte[] decoded = number.equals(BigInteger.ZERO) ? new byte[0] : number.toByteArray();
        if (decoded.length > 0 && decoded[0] == 0) {
            decoded = Arrays.copyOfRange(decoded, 1, decoded.length);
        }

        byte[] result = new byte[leadingOnes + decoded.length];
        System.arraycopy(decoded, 0, result, leadingOnes, decoded.length);
        return result;
    }

    private BigInteger[] decodeDerSignature(byte[] signature) {
        try (ASN1InputStream inputStream = new ASN1InputStream(signature)) {
            ASN1Sequence sequence = ASN1Sequence.getInstance(inputStream.readObject());
            ASN1Integer r = ASN1Integer.getInstance(sequence.getObjectAt(0));
            ASN1Integer s = ASN1Integer.getInstance(sequence.getObjectAt(1));
            return new BigInteger[]{r.getValue(), s.getValue()};
        } catch (IOException exception) {
            throw new IllegalArgumentException("DER 서명 파싱에 실패했습니다.", exception);
        }
    }
}
