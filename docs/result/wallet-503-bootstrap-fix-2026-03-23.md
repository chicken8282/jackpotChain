# 지갑 페이지 오류 수정 결과 (2026-03-23)

## 개요

지갑 페이지에서 발생하던 `POST /api/v1/wallet → 503`, `GET /api/v1/wallet → 404`,
`activities → 500`, `refresh → 401` 오류를 수정했다.

---

# 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `.env.local` | `NODE_BOOTSTRAP_ONBOARDING_REWARD=true` 추가 |
| `blockchain/cli/main.py` | `node` 서브커맨드에 `--bootstrap-onboarding-reward` 인자 추가, `run_node()` 에서 `ensure_local_onboarding_reward_bootstrap()` 호출 |

---

# 상세

## 근본 원인

`entrypoint.sh`는 `NODE_BOOTSTRAP_ONBOARDING_REWARD=true`이면 `--bootstrap-onboarding-reward` 플래그를 CLI에 전달한다.
그런데 `blockchain/cli/main.py`의 `node` 서브커맨드 파서에 이 인자가 등록되어 있지 않아
`unrecognized arguments: --bootstrap-onboarding-reward` 오류로 blockchain 노드 컨테이너가 unhealthy 상태가 됐다.

또한 `.env.local`에 `NODE_BOOTSTRAP_ONBOARDING_REWARD` 항목 자체가 없어서,
`entrypoint.sh`가 기본값 `false`로 처리하여 operator wallet에 JACK이 없었고,
`grantonboardingreward` RPC 호출 시 "Insufficient JACK" 예외 → `BusinessException(BLOCKCHAIN_RPC_FAILED)` → 503 응답.

## 오류 연쇄

```
NODE_BOOTSTRAP_ONBOARDING_REWARD 미설정
  → CLI에 --bootstrap-onboarding-reward 미전달
  → operator wallet JACK 잔액 0
  → POST /api/v1/wallet: grantonboardingreward RPC 실패 → 503
    → @Transactional rollback → wallet DB 미저장
      → GET /api/v1/wallet → WalletNotFoundException → 404
        → auth 흐름 미완료 → refresh session 없음 → 401
  → GET /api/v1/wallet/{address}/activities:
      syncToTip() 내 RPC 다중 타임아웃(~17초) → 500
```

## cli/main.py 수정

```python
# node_parser에 인자 추가 (기존 defaults 보존, store_true → 기본값 False)
node_parser.add_argument(
    '--bootstrap-onboarding-reward',
    action='store_true',
    default=False,
    help='Seed operator wallet with synthetic JACK for onboarding rewards (local dev only)'
)

# run_node() 에서 blockchain, wallet 초기화 직후 호출
if args.bootstrap_onboarding_reward:
    from jackpotchain.bootstrap.local_onboarding_reward import ensure_local_onboarding_reward_bootstrap
    bootstrap_result = ensure_local_onboarding_reward_bootstrap(
        blockchain=blockchain,
        wallet=wallet,
        enabled=True,
    )
    if bootstrap_result:
        print(f"[Bootstrap] Onboarding reward funded: ...")
```

---

# 검증

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up --build -d
# → 전체 컨테이너 healthy

docker logs jc-node-local | grep Bootstrap
# → [Bootstrap] Onboarding reward funded: 1000000000000 JACK at XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82 (created=True)

curl -s -X POST http://localhost:9776/ -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}'
# → {"jsonrpc": "2.0", "id": 1, "result": 2602}
```

---

# 미해결 사항

없음.

---

# 다음 단계

- 지갑 생성 후 `POST /api/v1/wallet` 200 응답 및 `GET /api/v1/wallet` 200 응답 육안 확인
- `GET /api/v1/wallet/{address}/activities` 응답 정상 확인 (bootstrap 적용 후 RPC 연결 안정화)
