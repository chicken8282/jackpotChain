create table wallet (
    id bigserial primary key,
    address varchar(64) not null,
    nickname varchar(50),
    wallet_color varchar(20) not null default 'DEFAULT',
    created_at timestamp not null default current_timestamp,
    constraint uk_wallet_address unique (address)
);

create table block (
    id bigserial primary key,
    height bigint not null,
    hash varchar(64) not null,
    prev_hash varchar(64) not null,
    version varchar(16) not null,
    mined_at timestamp not null,
    mining_elapsed integer,
    difficulty varchar(20) not null,
    nonce bigint not null,
    miner_address varchar(64),
    reward_jack bigint not null default 10000000000,
    fee_reward_jack bigint not null default 0,
    tx_count integer not null default 0,
    is_main_chain boolean not null default true,
    constraint uk_block_height unique (height),
    constraint uk_block_hash unique (hash)
);

create table "transaction" (
    id bigserial primary key,
    tx_id varchar(64) not null,
    block_id bigint not null,
    tx_version integer not null default 1,
    from_address varchar(64),
    to_address varchar(64),
    jack_amount bigint not null default 0,
    pot_amount bigint not null default 0,
    created_at timestamp not null,
    constraint uk_transaction_tx_id unique (tx_id),
    constraint fk_transaction_block
        foreign key (block_id) references block (id) on delete cascade
);

create table wallet_activity (
    id bigserial primary key,
    wallet_address varchar(64) not null,
    type varchar(20) not null,
    description varchar(200) not null,
    jack_amount bigint,
    pot_amount bigint,
    tx_id varchar(64),
    created_at timestamp not null default current_timestamp,
    constraint fk_wallet_activity_wallet
        foreign key (wallet_address) references wallet (address),
    constraint fk_wallet_activity_transaction
        foreign key (tx_id) references "transaction" (tx_id)
);

create table lotto_entry (
    id bigserial primary key,
    commit_hash varchar(64) not null,
    wallet_address varchar(64) not null,
    chosen_numbers varchar(50) not null,
    jackpot_snapshot bigint not null,
    commit_block_height bigint not null,
    result_numbers varchar(50),
    match_count integer,
    status varchar(10) not null default 'DRAWING',
    reward_jack bigint,
    claim_tx_id varchar(64),
    claimable_from_height bigint not null,
    claimable_until_height bigint not null,
    created_at timestamp not null default current_timestamp,
    claimed_at timestamp,
    constraint uk_lotto_entry_commit_hash unique (commit_hash),
    constraint fk_lotto_entry_commit_hash
        foreign key (commit_hash) references "transaction" (tx_id),
    constraint fk_lotto_entry_wallet
        foreign key (wallet_address) references wallet (address),
    constraint fk_lotto_entry_claim_tx
        foreign key (claim_tx_id) references "transaction" (tx_id)
);

create table jackpot_pool (
    id bigint primary key,
    balance_jack bigint not null default 0,
    total_entries bigint not null default 0,
    total_winners bigint not null default 0,
    last_synced_height bigint not null default 0,
    updated_at timestamp not null default current_timestamp,
    constraint ck_jackpot_pool_singleton check (id = 1)
);

create table lotto_ranking (
    id bigserial primary key,
    rank integer not null,
    wallet_address varchar(64) not null,
    commit_hash varchar(64) not null,
    match_count integer not null,
    reward_jack bigint not null,
    claimed_at timestamp not null,
    updated_at timestamp not null default current_timestamp,
    constraint uk_lotto_ranking_rank unique (rank),
    constraint uk_lotto_ranking_commit_hash unique (commit_hash),
    constraint fk_lotto_ranking_wallet
        foreign key (wallet_address) references wallet (address),
    constraint fk_lotto_ranking_commit_hash
        foreign key (commit_hash) references lotto_entry (commit_hash)
);
