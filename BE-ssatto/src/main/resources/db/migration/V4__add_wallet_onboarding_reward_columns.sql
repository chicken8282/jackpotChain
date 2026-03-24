alter table wallet
    add column onboarding_reward_granted boolean not null default false,
    add column onboarding_reward_tx_id varchar(64),
    add column onboarding_reward_granted_at timestamp;
