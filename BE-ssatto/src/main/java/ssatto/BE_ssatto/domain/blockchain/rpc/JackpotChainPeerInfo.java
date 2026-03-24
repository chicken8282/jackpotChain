package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain `getpeerinfo` 응답 중 백엔드가 사용하는 핵심 필드만 보관한다.
 *
 * @param address 피어 주소
 * @param version 프로토콜 버전
 * @param subVersion 서브 버전 문자열
 * @param inbound 인바운드 연결 여부
 */
public record JackpotChainPeerInfo(
    String address,
    int version,
    String subVersion,
    boolean inbound
) {
}
