package ssatto.BE_ssatto.global.response;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 공통 API 응답 래퍼의 계약을 검증한다.
 */
class ApiResponseTest {

    /**
     * 데이터가 있을 때 기대한 성공 응답을 반환하는지 확인한다.
     */
    @Test
    void successResponseContainsSuccessCodeMessageAndData() {
        ApiResponse<String> response = ApiResponse.success(200, "대시보드 조회가 완료되었습니다.", "payload");

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getMessage()).isEqualTo("대시보드 조회가 완료되었습니다.");
        assertThat(response.getData()).isEqualTo("payload");
    }

    /**
     * 데이터가 없을 때 null 데이터를 유지한 성공 응답을 반환하는지 확인한다.
     */
    @Test
    void successResponseWithoutDataKeepsNullData() {
        ApiResponse<Void> response = ApiResponse.success(200, "로또 참여가 완료되었습니다.");

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getMessage()).isEqualTo("로또 참여가 완료되었습니다.");
        assertThat(response.getData()).isNull();
    }

    /**
     * 에러 응답이 null 데이터를 포함하는지 확인한다.
     */
    @Test
    void errorResponseContainsErrorCodeAndMessage() {
        ApiResponse<Void> response = ApiResponse.error(400, "잘못된 요청입니다.");

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("잘못된 요청입니다.");
        assertThat(response.getData()).isNull();
    }
}
