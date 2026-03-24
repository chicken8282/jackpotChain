create table auth_refresh_session (
    id bigserial primary key,
    session_handle varchar(80) not null,
    wallet_address varchar(64) not null,
    refresh_token_hash varchar(128) not null,
    expires_at timestamp not null,
    created_at timestamp not null default current_timestamp,
    revoked_at timestamp,
    constraint uk_auth_refresh_session_handle unique (session_handle),
    constraint fk_auth_refresh_session_wallet
        foreign key (wallet_address) references wallet (address)
);

create index idx_auth_refresh_session_wallet_address
    on auth_refresh_session (wallet_address);

create index idx_auth_refresh_session_expires_at
    on auth_refresh_session (expires_at);
