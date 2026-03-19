package ssatto.BE_ssatto.global.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 공통 페이지네이션 응답 페이로드이다.
 *
 * @param <T> 페이지 콘텐츠 타입
 */
@Getter
public class PageResponse<T> {

    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean hasNext;

    private PageResponse(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
    ) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.hasNext = hasNext;
    }

    /**
     * Spring Data Page 객체를 공통 응답 페이로드로 변환한다.
     *
     * @param page Spring Data Page 객체
     * @return 페이지네이션 응답 페이로드
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
