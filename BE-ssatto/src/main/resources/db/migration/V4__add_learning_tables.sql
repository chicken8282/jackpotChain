-- [학습 프론트엔드 v2] 추가: 학습 진행, 뱃지, 보상, 리포트 테이블

-- 학습 진행 상태 테이블 (v2 확장: attempts, correctCount, wrongCategories, timeSpentMs)
CREATE TABLE learning_progress (
    id              BIGSERIAL       PRIMARY KEY,
    wallet_address  VARCHAR(64)     NOT NULL,
    stage           INTEGER         NOT NULL,
    module          VARCHAR(50)     NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'NOT_STARTED',
    total_attempts  INTEGER         NOT NULL DEFAULT 0,
    correct_count   INTEGER         NOT NULL DEFAULT 0,
    wrong_categories TEXT,
    time_spent_ms   BIGINT          NOT NULL DEFAULT 0,
    score           INTEGER         NOT NULL DEFAULT 0,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),

    CONSTRAINT fk_lp_wallet FOREIGN KEY (wallet_address) REFERENCES wallet(address),
    CONSTRAINT uq_lp_module UNIQUE (wallet_address, module)
);

CREATE INDEX idx_lp_wallet ON learning_progress(wallet_address);
CREATE INDEX idx_lp_stage  ON learning_progress(wallet_address, stage);

-- 뱃지 테이블
CREATE TABLE learning_badge (
    id              BIGSERIAL       PRIMARY KEY,
    wallet_address  VARCHAR(64)     NOT NULL,
    badge_type      VARCHAR(50)     NOT NULL,
    earned_at       TIMESTAMP       NOT NULL DEFAULT now(),

    CONSTRAINT fk_lb_wallet FOREIGN KEY (wallet_address) REFERENCES wallet(address),
    CONSTRAINT uq_lb_badge  UNIQUE (wallet_address, badge_type)
);

CREATE INDEX idx_lb_wallet ON learning_badge(wallet_address);

-- 학습 보상 기록 테이블
CREATE TABLE learning_reward (
    id              BIGSERIAL       PRIMARY KEY,
    wallet_address  VARCHAR(64)     NOT NULL,
    reward_type     VARCHAR(30)     NOT NULL,
    jack_amount     BIGINT          NOT NULL,
    module          VARCHAR(50),
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),

    CONSTRAINT fk_lr_wallet FOREIGN KEY (wallet_address) REFERENCES wallet(address)
);

CREATE INDEX idx_lr_wallet ON learning_reward(wallet_address);

-- [v2 신규] 종합 리포트 테이블
CREATE TABLE learning_report (
    id                  BIGSERIAL       PRIMARY KEY,
    wallet_address      VARCHAR(64)     NOT NULL UNIQUE,
    security_score      INTEGER         NOT NULL DEFAULT 0,
    transaction_score   INTEGER         NOT NULL DEFAULT 0,
    network_score       INTEGER         NOT NULL DEFAULT 0,
    consensus_score     INTEGER         NOT NULL DEFAULT 0,
    token_economy_score INTEGER         NOT NULL DEFAULT 0,
    fairness_score      INTEGER         NOT NULL DEFAULT 0,
    overall_grade       VARCHAR(10),
    total_time_ms       BIGINT          NOT NULL DEFAULT 0,
    certificate_issued_at TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT now(),

    CONSTRAINT fk_lrpt_wallet FOREIGN KEY (wallet_address) REFERENCES wallet(address)
);
