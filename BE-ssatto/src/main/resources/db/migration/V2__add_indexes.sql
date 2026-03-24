create index idx_wallet_activity_wallet_created_at
    on wallet_activity (wallet_address, created_at desc);

create index idx_wallet_activity_tx_id
    on wallet_activity (tx_id);

create index idx_lotto_entry_wallet_created_at
    on lotto_entry (wallet_address, created_at desc);

create index idx_lotto_entry_status_claimable_from_height
    on lotto_entry (status, claimable_from_height);

create index idx_lotto_entry_commit_block_height
    on lotto_entry (commit_block_height);

create index idx_lotto_entry_claim_tx_id
    on lotto_entry (claim_tx_id);

create index idx_blocks_miner_address
    on block (miner_address);

create index idx_blocks_mined_at_desc
    on block (mined_at desc);

create index idx_transactions_block_id
    on "transaction" (block_id);

create index idx_transactions_from_address
    on "transaction" (from_address);

create index idx_transactions_to_address
    on "transaction" (to_address);

create index idx_lotto_ranking_reward_jack_desc
    on lotto_ranking (reward_jack desc);
