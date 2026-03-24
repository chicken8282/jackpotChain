# Blockchain Node — blockchain/ (Python)

Inherits all rules from root CLAUDE.md. These rules are blockchain-specific additions.

## CRITICAL: Do Not Break Existing Behavior

**Before making any change to this codebase, you must assess its impact on the live blockchain network and existing node behavior.**

Any modification to the following areas is considered HIGH RISK and requires:

1. Explicit risk assessment documented in the plan
2. Network regression tests (not just Docker smoke tests)
3. Multi-node manual verification before marking complete

HIGH RISK areas:

- `consensus/` — chain selection, difficulty adjustment, miner logic
- `network/node.py`, `network/peer.py` — P2P message handling, peer discovery, sync
- `validation/` — block and transaction validation rules
- `script/` — script interpreter and opcodes
- `gacha/` — commit-reveal randomness and lotto game logic
- Tokenomics constants (`constants.py`) — block reward, fee ratios

LOW RISK changes (Docker/infra only — do not touch consensus or network logic):

- `cli/main.py`: CLI argument additions (e.g., `--rpc-host`) — preserve all defaults
- `Dockerfile`, `entrypoint.sh`, `.dockerignore`: build/run artifacts only
- `rpc/server.py`: adding new read-only RPC methods

**When adding CLI arguments, ALWAYS preserve existing defaults** so that local CLI users are not broken. Docker-specific values are overrides only.

## Reference Reviews

Before working on the following areas, read the corresponding review docs first:

| Area                                                   | Review Document               |
| ------------------------------------------------------ | ----------------------------- |
| Node architecture, TX versions, commit-reveal, webhook | `docs/reviews/blockchain.md`  |
| Docker/container setup and known blockers              | `docs/reviews/docker-plan.md` |
| Change risk classification and test requirements       | `docs/reviews/modify.md`      |

## Stack

- Python 3.12+
- asyncio (async I/O for network and RPC)
- Custom P2P networking (`network/`)
- JSON-RPC server (`rpc/`)
- UTXO-based transaction model

## Module Responsibilities

```
core/         Block, Transaction, UTXO data structures — pure logic, no I/O
consensus/    Chain selection, difficulty adjustment, miner
crypto/       Hashing, signing, address derivation, Merkle tree
mempool/      Pending transaction pool
network/      P2P node, peer discovery, NAT traversal, hole punching
rpc/          JSON-RPC server (external API surface)
script/       Script interpreter and opcodes
validation/   Block and transaction validation rules
wallet/       Key management, signing
gacha/        Commit-reveal randomness and game logic
cli/          CLI entry points
```

## System Architecture Context

The Server Node deployed on EC2 is an **Observer only** — it does NOT mine:

- Receives blocks/TX from P2P network
- Provides RPC on port 8332
- Listens for P2P on port 8333
- Notifies Backend via Webhook when a new block arrives

Mining is done by TUI nodes on local user machines.

**Webhook pattern** (already implemented via `_on_block` callback):

```python
node.set_block_callback(notify_backend)
# → HTTP POST to backend /internal/new-block on each received block
```

## Transaction Version Reference

| Version | Type                                                         |
| ------- | ------------------------------------------------------------ |
| 1       | Standard transfer                                            |
| 2       | JACK → POT exchange (one-way only; reverse is not supported) |
| 3       | Lotto commit                                                 |
| 5       | Lotto claim                                                  |

## Lotto Commit-Reveal Mechanics

- Commit in block N → result determined by block hashes at N+3, N+6, N+9, N+12, N+15, N+18
- Claim window: N+18 to N+68
- Block hash last hex digit mod 16 = result digit (0–15)
- Never modify the commit-reveal logic without a full regression test of `tests/test_e2e_lotto.py`

## Known Risks to Track

From `docs/reviews/modify.md`:

- `sync/manager.py` `on_headers_received()` has an unresolved TODO for header validation/storage
- `tests/test_reorg.py` has a comment indicating UTXO expectations may fail on current implementation
- Multi-node long-duration sync and reorg stability have not been fully confirmed

Do not mark any sync/reorg-related change complete without multi-node verification.

## Implementation Rules

**Correctness over cleverness:**

- Consensus rules are invariants — never relax them for convenience
- Cryptographic operations must use established libraries (no custom crypto primitives)
- Validation logic must be deterministic and side-effect-free

**UTXO model:**

- Never double-spend: check UTXO set before accepting a transaction
- Transaction IDs must be content-addressed (hash of serialized content)
- Coinbase transactions follow separate validation path

**Mempool:**

- Bounded size — evict by fee rate when full
- Reject invalid or duplicate transactions at entry
- Thread-safe / asyncio-safe operations

**Network:**

- All peer messages must be validated before processing
- Malformed/malicious peer input must never crash the node
- Disconnect and ban peers that send invalid data repeatedly
- Node startup recovery: handle incomplete state gracefully

**RPC:**

- Validate all RPC inputs before processing
- RPC errors must use standard JSON-RPC error codes
- Never expose internal node state in error messages
- Rate-limit RPC endpoints where abuse is possible
- RPC default bind host is `127.0.0.1` — Docker uses `0.0.0.0` as an override only

## Failure Modes to Handle Explicitly

- Startup with incomplete/corrupted chain state
- Peer disconnection mid-sync
- Fork resolution (longest valid chain wins)
- Invalid block received from peer
- Mempool full under load
- RPC request with malformed parameters

## Testing

**Required before any network/consensus/lotto change:**

```bash
# Network and peer discovery
pytest blockchain/tests/test_network.py blockchain/tests/test_peer_discovery.py

# End-to-end lotto
pytest blockchain/tests/test_e2e_lotto.py

# Reorg (check for known failures before and after your change)
pytest blockchain/tests/test_reorg.py -v -s

# Multi-node (if available)
python -m blockchain.scripts.test_multinode all
```

For Docker/CLI-only changes, RPC smoke test is sufficient:

```bash
curl -X POST http://127.0.0.1:8332/ -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}'
```

## Performance

- Block validation must complete within a bounded time (no unbounded loops on external data)
- UTXO lookups should use indexed structures — no linear scans over chain history
- Mempool queries should not block network I/O

## Observability

- Structured logging with `logging` module
- Log level: DEBUG for internal state, INFO for block/TX events, WARNING for peer issues, ERROR for node failures
- Include block height, tx hash, peer address in relevant log lines
- Startup sequence must log each recovery step clearly, including actual bind host/port/wallet path

## Security

- Reject blocks with timestamps too far in the future (clock skew tolerance)
- Validate script execution with resource limits (prevent script DoS)
- Do not trust peer-provided chain metadata without validation
- Private keys never logged, never included in RPC responses
