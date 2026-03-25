"""
Status Widget - 통합 현황 화면

블록체인 / 네트워크 / 채굴 통계 + ASCII 바 그래프 + 최근 블록 + 피어 목록
"""

from rich.text import Text

from textual import work
from textual.app import ComposeResult
from textual.widgets import Static, Label, DataTable
from textual.containers import ScrollableContainer, Horizontal, Vertical

from ..client import RPCClient


def _make_bar(value: float, max_val: float, width: int = 20, color: str = "#00d4ff") -> Text:
    """ASCII 진행 바를 Rich Text로 생성."""
    t = Text()
    if max_val <= 0:
        filled = 0
    else:
        filled = int(width * min(value, max_val) / max_val)
    t.append("[", style="#333333")
    t.append("=" * filled, style=color)
    t.append("-" * (width - filled), style="#222222")
    t.append("]", style="#333333")
    return t


class StatusWidget(ScrollableContainer):
    """통합 현황 위젯"""

    def __init__(self, rpc: RPCClient, **kwargs):
        super().__init__(**kwargs)
        self.rpc = rpc

    def compose(self) -> ComposeResult:
        # ── 상단 3열 통계 ─────────────────────────────────────────────────────
        yield Horizontal(
            # 블록체인
            Vertical(
                Label("BLOCKCHAIN", classes="box-title"),
                Horizontal(
                    Label("Height", classes="stat-label"),
                    Label("--", id="st-height", classes="stat-value cyan"),
                ),
                Horizontal(
                    Label("Difficulty", classes="stat-label"),
                    Label("--", id="st-difficulty", classes="stat-value"),
                ),
                Horizontal(
                    Label("Mempool", classes="stat-label"),
                    Label("--", id="st-mempool", classes="stat-value"),
                ),
                Horizontal(
                    Label("Sync", classes="stat-label"),
                    Label("CONNECTING", id="st-sync", classes="stat-value yellow"),
                ),
                classes="stat-box status-col",
            ),
            # 네트워크
            Vertical(
                Label("NETWORK", classes="box-title"),
                Horizontal(
                    Label("Peers", classes="stat-label"),
                    Label("--", id="st-peers", classes="stat-value cyan"),
                ),
                Horizontal(
                    Label("Inbound", classes="stat-label"),
                    Label("--", id="st-inbound", classes="stat-value"),
                ),
                Horizontal(
                    Label("Outbound", classes="stat-label"),
                    Label("--", id="st-outbound", classes="stat-value"),
                ),
                Horizontal(
                    Label("Version", classes="stat-label"),
                    Label("--", id="st-version", classes="stat-value"),
                ),
                classes="stat-box status-col",
            ),
            # 채굴 + 잭팟
            Vertical(
                Label("MINING", classes="box-title"),
                Horizontal(
                    Label("Status", classes="stat-label"),
                    Label("STOPPED", id="st-mining-status", classes="stat-value red"),
                ),
                Horizontal(
                    Label("Hash Rate", classes="stat-label"),
                    Label("--", id="st-hashrate", classes="stat-value"),
                ),
                Horizontal(
                    Label("Blocks", classes="stat-label"),
                    Label("--", id="st-blocks-mined", classes="stat-value"),
                ),
                Horizontal(
                    Label("Jackpot", classes="stat-label"),
                    Label("--", id="st-jackpot", classes="stat-value yellow"),
                ),
                classes="stat-box status-col",
            ),
            id="status-grid",
        )

        # ── ASCII 바 그래프 ───────────────────────────────────────────────────
        yield Vertical(
            Label("LOAD METERS", classes="box-title"),
            Static("", id="st-bar-graphs"),
            classes="stat-box",
        )

        # ── 최근 블록 ─────────────────────────────────────────────────────────
        yield Vertical(
            Label("RECENT BLOCKS  (last nibble = lotto digit)", classes="box-title"),
            Static("", id="st-blocks-display"),
            Label(
                "<- OLDER                                                  NEWER ->",
                id="st-blocks-dir",
                classes="info-text",
            ),
            classes="stat-box",
            id="st-blocks-section",
        )

        # ── 피어 목록 ─────────────────────────────────────────────────────────
        yield Vertical(
            Label("CONNECTED PEERS", classes="box-title"),
            DataTable(id="st-peers-table"),
            classes="stat-box",
        )

    def on_mount(self) -> None:
        table = self.query_one("#st-peers-table", DataTable)
        table.add_columns("Address", "Height", "Dir", "Ping")
        self.refresh_data()
        self.set_interval(5, self.refresh_data)

    def refresh_data(self) -> None:
        self._load_data()

    @work(exclusive=True)
    async def _load_data(self) -> None:
        mempool_count = 0
        peer_count = 0
        hashrate = 0

        # 블록체인 정보
        resp = await self.rpc.get_blockchain_info()
        sync_lbl = self.query_one("#st-sync", Label)
        if resp.success:
            height = resp.result.get("blocks", 0)
            self.query_one("#st-height", Label).update(f"#{height:,}")
            sync_lbl.update("SYNCED")
            sync_lbl.remove_class("yellow", "red")
            sync_lbl.add_class("green")
        else:
            sync_lbl.update("OFFLINE")
            sync_lbl.remove_class("yellow", "green")
            sync_lbl.add_class("red")

        # 채굴 정보
        resp = await self.rpc.get_mining_info()
        if resp.success:
            data = resp.result
            diff = data.get("difficulty", 0)
            if isinstance(diff, int):
                self.query_one("#st-difficulty", Label).update(f"0x{diff:08x}")
            else:
                self.query_one("#st-difficulty", Label).update(str(diff))
            mempool_count = data.get("pooledtx", 0)
            self.query_one("#st-mempool", Label).update(str(mempool_count))

            is_mining = data.get("mining", False)
            mining_lbl = self.query_one("#st-mining-status", Label)
            if is_mining:
                mining_lbl.update("MINING [*]")
                mining_lbl.remove_class("red")
                mining_lbl.add_class("green")
                hashrate = data.get("hashrate", 0)
                if hashrate > 1_000_000:
                    hr_str = f"{hashrate/1_000_000:.2f} MH/s"
                elif hashrate > 1_000:
                    hr_str = f"{hashrate/1_000:.2f} KH/s"
                else:
                    hr_str = f"{hashrate:.0f} H/s"
                self.query_one("#st-hashrate", Label).update(hr_str)
                self.query_one("#st-blocks-mined", Label).update(
                    str(data.get("blocks_mined", 0))
                )
            else:
                mining_lbl.update("STOPPED")
                mining_lbl.remove_class("green")
                mining_lbl.add_class("red")

        # 잭팟 풀
        resp = await self.rpc.get_jackpot_pool()
        if resp.success:
            pool = resp.result.get("balance", 0)
            self.query_one("#st-jackpot", Label).update(f"{pool:,.0f} JACK")

        # 네트워크 정보
        resp = await self.rpc.get_network_info()
        if resp.success:
            data = resp.result
            peer_count = data.get("connections", 0)
            self.query_one("#st-peers", Label).update(str(peer_count))
            self.query_one("#st-inbound", Label).update(str(data.get("connections_in", 0)))
            self.query_one("#st-outbound", Label).update(str(data.get("connections_out", 0)))
            ver = data.get("subversion", "/JackpotChain/")
            self.query_one("#st-version", Label).update(ver[:24])

        # 바 그래프 업데이트
        self._update_bar_graphs(mempool_count, peer_count, hashrate)

        # 피어 목록
        resp = await self.rpc.get_peer_info()
        if resp.success:
            peers = resp.result or []
            table = self.query_one("#st-peers-table", DataTable)
            table.clear()
            for p in peers:
                addr = p.get("addr", "?")[:22]
                height = p.get("best_height", p.get("startingheight", 0))
                direction = "IN" if p.get("inbound") else "OUT"
                ping = p.get("pingtime", p.get("ping", None))
                ping_str = f"{ping*1000:.0f}ms" if isinstance(ping, float) else "--"
                table.add_row(addr, f"#{height}", direction, ping_str)

        # 최근 블록
        resp = await self.rpc.get_recent_blocks(10)
        if resp.success:
            self._update_blocks_display(resp.result or [])

    def _update_bar_graphs(self, mempool: int, peers: int, hashrate: float) -> None:
        t = Text()

        # Mempool (최대 100 TX 기준)
        t.append("  Mempool  ", style="#777777")
        t.append_text(_make_bar(mempool, 100, 24, "#00d4ff"))
        t.append(f"  {mempool} TX\n", style="#00d4ff")

        # Peers (최대 20 기준)
        t.append("  Peers    ", style="#777777")
        t.append_text(_make_bar(peers, 20, 24, "#00d4ff"))
        t.append(f"  {peers}\n", style="#00d4ff")

        # Hash Rate (최대 1 MH/s 기준)
        hr_max = 1_000_000
        if hashrate > 1_000_000:
            hr_str = f"{hashrate/1_000_000:.1f} MH/s"
        elif hashrate > 1_000:
            hr_str = f"{hashrate/1_000:.1f} KH/s"
        else:
            hr_str = f"{hashrate:.0f} H/s"
        t.append("  HashRate  ", style="#777777")
        t.append_text(_make_bar(hashrate, hr_max, 24, "#ffbd2e"))
        t.append(f"  {hr_str}\n", style="#ffbd2e")

        self.query_one("#st-bar-graphs", Static).update(t)

    def _update_blocks_display(self, blocks: list) -> None:
        if not blocks:
            self.query_one("#st-blocks-display", Static).update("(no blocks yet)")
            return
        lines: list = [[], [], [], [], [], []]
        for b in blocks:
            h = b.get("height", 0)
            diff = b.get("difficulty", "0x0")
            n_tx = b.get("nTx", 0)
            digit = b.get("lotto_digit", "?")
            diff_short = diff[2:6] if len(diff) > 5 else diff
            w = 14
            lines[0].append("+" + "-" * (w - 2) + "+")
            lines[1].append("|" + f" #{h}".ljust(w - 2) + "|")
            lines[2].append("|" + f" D:{diff_short}".ljust(w - 2) + "|")
            lines[3].append("|" + f" TX:{n_tx}".ljust(w - 2) + "|")
            lines[4].append("|" + f" [{digit}]".ljust(w - 2) + "|")
            lines[5].append("+" + "-" * (w - 2) + "+")
        text = "\n".join("  ".join(row) for row in lines)
        self.query_one("#st-blocks-display", Static).update(text)
