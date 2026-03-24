# Plan: jc-node-local 기동 실패 — `--address required when --mine is enabled`

> 작성일: 2026-03-24

---

## 원인

### 직접 원인

`entrypoint.sh`의 mining address 해석 로직:

```sh
if [ -n "${NODE_MINING_ADDRESS_VALUE}" ]; then
  set -- "$@" --address "${NODE_MINING_ADDRESS_VALUE}"
elif [ -f "${WALLET_FILE}" ]; then
  WALLET_ADDR=$(python -c "import json; ...")
  set -- "$@" --address "${WALLET_ADDR}"
fi
# ← else 없음 — 두 조건 모두 실패하면 --address 미전달
```

`.env.local`에서:
- `NODE_MINE=true` — 채굴 활성화
- `NODE_MINING_ADDRESS=` — 빈 값

볼륨 삭제 전: `/wallets/default.json` 존재 → 지갑에서 주소 추출 → 정상 동작
볼륨 삭제 후: `/wallets/default.json` 미존재 → 두 조건 모두 실패 → `--mine` + `--address` 없음 → `cli/main.py:99` exit(1)

### 근본 원인

`entrypoint.sh`가 채굴 주소를 결정하는 세 번째 경로(신규 지갑 자동 생성)가 없다.
볼륨이 삭제된 clean 상태에서는 지갑 파일이 없으므로 항상 실패한다.

---

## 영향 레이어

| 레이어 | 파일 | 변경 종류 |
|--------|------|---------|
| Infra | `blockchain/entrypoint.sh` | `else` 분기 추가 — 지갑 자동 생성 |

blockchain/CLAUDE.md 기준 LOW RISK 변경: `entrypoint.sh`는 build/run 아티팩트에 해당.
consensus / network / validation 코드 미접촉.

---

## 가정 / 모호한 점

- `python -m jackpotchain.cli.main wallet create --wallet-file FILE` 실행 시:
  - `Wallet(FILE)` 객체 생성 → 파일 없으면 신규 생성
  - `wallet.generate_address()` 호출 → 주소 생성 후 파일에 저장
  - `print(f"New address: {address}")` 출력
  - 실행 후 파일 포맷: `{"addresses": [{"address": "...", ...}]}`
  - 기존 `entrypoint.sh`의 JSON 파싱 코드 (`w['addresses'][0]['address']`)로 재사용 가능
- `WALLET_FILE`의 디렉토리(`/wallets/`)는 `entrypoint.sh` 상단에서 `mkdir -p`로 보장됨

---

## 변경 범위

### `blockchain/entrypoint.sh`

`if [ "${NODE_MINE_VALUE}" = "true" ]` 블록의 `elif` 뒤에 `else` 분기 추가:

```sh
else
  # 볼륨 삭제 후 재기동 등으로 지갑 파일 없는 경우 — 새 지갑 자동 생성
  python -m jackpotchain.cli.main wallet create --wallet-file "${WALLET_FILE}"
  WALLET_ADDR=$(python -c "import json; w=json.load(open('${WALLET_FILE}')); print(w['addresses'][0]['address'])")
  set -- "$@" --address "${WALLET_ADDR}"
fi
```

---

## 실패 가능 지점

| 지점 | 원인 | 대응 |
|------|------|------|
| `wallet create` 실패 | Python 패키지 미설치 등 | pip 설치 문제면 Docker 빌드 단계에서 이미 실패했을 것 |
| JSON 파싱 실패 | 지갑 파일 구조 변경 | `w['addresses'][0]['address']` — 기존 entrypoint에서 이미 사용 중인 동일 표현식이므로 안전 |
| `/wallets/` 권한 문제 | jackpot 사용자 권한 | Dockerfile에서 이미 `chown -R jackpot:jackpot /wallets` 설정됨 |
