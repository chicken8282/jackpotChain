package ssatto.jackpotchain.global.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 페이지네이션 응답 래퍼
 *
 * <p>리스트 응답을 페이지 정보와 함께 반환할 때 사용한다.
 * Spring Data의 {@link Page} 객체를 이 클래스로 변환하여 ApiResponse에 담는다.</p>
 *
 * <p>응답 예시:
 * <pre>
 * {
 *   "content": [...],
 *   "page": 0,
 *   "size": 20,
 *   "totalElements": 100,
 *   "totalPages": 5,
 *   "hasNext": true
 * }
 * </pre>
 * </p>
 *
 * @param <T> 페이지 내 항목 타입
 */
@Getter
public class PageResponse<T> {

    /** 현재 페이지의 데이터 목록 */
    private final List<T> content;

    /** 현재 페이지 번호 (0-indexed) */
    private final int page;

    /** 페이지 당 항목 수 */
    private final int size;

    /** 전체 항목 수 */
    private final long totalElements;

    /** 전체 페이지 수 */
    private final int totalPages;

    /** 다음 페이지 존재 여부 */
    private final boolean hasNext;

    private PageResponse(List<T> content, int page, int size, long totalElements, int totalPages, boolean hasNext) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.hasNext = hasNext;
    }

    /**
     * Spring Data Page 객체로부터 PageResponse 생성
     *
     * @param page Spring Data Page 객체
     * @return PageResponse 객체
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.hasNext()
        );
    }
}
