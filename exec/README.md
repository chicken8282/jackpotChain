# exec - 포팅 매뉴얼

> **14기 특화PJT - JackpotChain (팀코드: S14P21E202)**
>
> 이 폴더는 프로젝트 산출물 중 **'5. 포팅 매뉴얼'**에 해당하는 문서들을 포함합니다.

---

## 문서 목록

| 번호 | 파일명 | 내용 요약 |
|------|--------|-----------|
| 1 | [1_빌드_및_배포.md](1_빌드_및_배포.md) | 기술 스택 버전, 환경 변수, 빌드 절차, 배포 구조, 포트 구성, CI/CD 파이프라인, 장애 대응 |
| 2 | [2_외부_서비스_정보.md](2_외부_서비스_정보.md) | SSAFY GMS API, DockerHub, AWS EC2, Jenkins 등 외부 서비스 가입/설정 정보 |
| 3 | [3_DB_덤프_및_ERD.md](3_DB_덤프_및_ERD.md) | PostgreSQL 접속 정보, Flyway 마이그레이션, ERD 다이어그램, 테이블 설명 |
| 4 | [4_시연_시나리오.md](4_시연_시나리오.md) | 시연 순서별 화면 설명 (학습 → 채굴 → 지갑 → 로또 → 대시보드) |

---

## 각 문서 상세 설명

### 1. 빌드 및 배포 (`1_빌드_및_배포.md`)

GitLab에서 소스를 클론한 이후 **빌드부터 배포까지 전 과정**을 다룹니다.

- **기술 스택**: Backend(Java 21, Spring Boot 3.5.11), Frontend(React 19, Vite 6), Blockchain(Python 3.11), 인프라(PostgreSQL 16, Redis 7, RabbitMQ 3, Nginx 1.24)
- **환경 변수**: DB 접속, JWT 시크릿, RPC URL, API 키 등 모든 환경 변수 정리
- **빌드 방법**: 로컬 Docker Compose 원커맨드 실행, 개별 모듈 빌드, Docker 이미지 빌드
- **배포 구조**: Dev(단순 재기동) / Prod(Blue/Green 무중단 배포) 환경 분리
- **CI/CD**: Jenkins → Docker Build & Push → EC2 SSH 배포 자동화
- **장애 대응**: 즉시 롤백, Health Check 실패 시 대응, 로그 확인 방법

### 2. 외부 서비스 정보 (`2_외부_서비스_정보.md`)

프로젝트에서 활용하는 **외부 서비스의 가입 및 설정 방법**을 정리합니다.

- **SSAFY GMS API**: 프론트엔드 지도 서비스, API 키 발급 및 적용 방법
- **DockerHub**: CI/CD에서 사용하는 이미지 저장소, 리포지토리 정보
- **AWS EC2**: 서버 주소, SSH 접속, 디렉토리 구조
- **Jenkins**: CI/CD 파이프라인에 필요한 Credential 목록 (DockerHub, GMS, SSH)
- **로컬 실행**: 외부 서비스 없이 Docker Compose만으로 전체 스택 실행 가능

### 3. DB 덤프 및 ERD (`3_DB_덤프_및_ERD.md`)

데이터베이스 스키마와 **핵심 테이블 구조**를 문서화합니다.

- **접속 정보**: PostgreSQL 16, `jackpotchain` 데이터베이스
- **마이그레이션**: Flyway 기반 V1~V6 마이그레이션 파일 (Spring Boot 기동 시 자동 실행)
- **ERD**: wallet, block, transaction, wallet_activity, lotto_entry, lotto_ranking, jackpot_pool 테이블 간 관계도
- **설계 원칙**: 지갑 잔액은 DB에 저장하지 않음 (블록체인 노드 RPC로 실시간 조회), 개인키/원시 토큰 서버 미저장
- **트랜잭션 버전**: v1(일반 송금), v2(JACK→POT 교환), v3(로또 커밋), v5(로또 클레임)

### 4. 시연 시나리오 (`4_시연_시나리오.md`)

시연 순서에 따른 **화면별 클릭 위치와 동작**을 상세 설명합니다.

- **학습 페이지**: 로드맵 → 개념학습(카드 3개 클릭) → 챗봇 → 체험하기 → 검증 미션 → 리포트
- **채굴 페이지**: TUI 다운로드 안내 → TUI 실행(지갑 생성, 노드 참여, 채굴, 로또)
- **지갑 페이지**: 지갑 등록(개인키 입력 → 암호화 저장 → 챌린지 인증) → 잔액/활동 확인
- **로또 페이지**: 번호 선택(16진수 6개) → 참여 → 결과/당첨 확인
- **대시보드**: 블록체인 시각화, 잭팟 풀, 블록 상세, 노드 네트워크

---

## 프로젝트 아키텍처 요약

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   Backend    │────▶│ Blockchain Node │
│  (React 19) │     │ (Spring Boot)│     │   (Python 3.11) │
│  Vite + TS  │     │  Java 21     │     │  P2P + RPC      │
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                      │
                    ┌──────┴───────┐        ┌─────┴─────┐
                    │  PostgreSQL  │        │  TUI Node │
                    │  Redis       │        │ (사용자PC) │
                    │  RabbitMQ    │        └───────────┘
                    └──────────────┘
```

---

## 빠른 시작 (로컬)

```bash
git clone https://lab.ssafy.com/s14-blochain-sub1/S14P21E202.git
cd S14P21E202
cp .env.example .env.local
# .env.local 편집 후
docker compose -f docker-compose.local.yml --env-file .env.local up -d

# 접속: http://localhost:13000
```
