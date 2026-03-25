"""
JackpotChain TUI Main Application

3-Tab 구조:  [F1] SETUP  ·  [F2] LOTTO  ·  [F3] STATUS
"""

import os
import sys
from pathlib import Path

from rich.text import Text

from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.widgets import Footer, ContentSwitcher, Static
from textual.containers import Horizontal

from .widgets.setup import SetupWidget
from .widgets.lotto import LottoWidget
from .widgets.status import StatusWidget
from .client import RPCClient
from ..wallet.wallet import Wallet


class JackpotChainApp(App):
    """JackpotChain TUI 메인 앱 (3-Tab)"""

    CSS_PATH = Path(__file__).parent / "styles.tcss"
    TITLE = "JackpotChain"
    SUB_TITLE = "UTXO Blockchain + On-chain Lottery"

    BINDINGS = [
        Binding("1", "show_tab('setup')", "Setup", show=True, priority=True),
        Binding("2", "show_tab('lotto')", "Lotto", show=True, priority=True),
        Binding("3", "show_tab('status')", "Status", show=True, priority=True),
        Binding("ctrl+r", "refresh", "Refresh", show=True, priority=True),
        Binding("ctrl+q", "quit", "Quit", show=True, priority=True),
    ]

    def __init__(self, host: str = "127.0.0.1", port: int = 9776, wallet_dir: str = None):
        super().__init__()
        self.rpc = RPCClient(host, port)
        self._current_tab = "setup"

        # 지갑 디렉토리 — %APPDATA%\JackpotChain\wallets
        if wallet_dir is None:
            appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
            wallet_dir = os.path.join(appdata, "JackpotChain", "wallets")
        self.wallet_dir = Path(wallet_dir)
        self.wallet_dir.mkdir(parents=True, exist_ok=True)

        self.current_wallet: Wallet | None = None
        self.current_wallet_file: Path | None = None
        self.selected_address: str | None = None
        self.mining_address: str | None = None

        self._load_default_wallet()

    def _load_default_wallet(self) -> None:
        default_path = self.wallet_dir / "default.json"
        if default_path.exists():
            self.load_wallet(default_path)

    def load_wallet(self, wallet_path: Path) -> bool:
        try:
            self.current_wallet = Wallet(str(wallet_path))
            self.current_wallet_file = wallet_path
            addresses = self.current_wallet.get_addresses()
            if addresses:
                self.selected_address = addresses[0]
            return True
        except Exception:
            return False

    def create_wallet(self, wallet_name: str) -> bool:
        wallet_path = self.wallet_dir / f"{wallet_name}.json"
        if wallet_path.exists():
            return False
        try:
            self.current_wallet = Wallet(str(wallet_path))
            self.current_wallet_file = wallet_path
            self.selected_address = self.current_wallet.generate_address(label="기본")
            return True
        except Exception:
            return False

    def get_wallet_files(self) -> list[Path]:
        return list(self.wallet_dir.glob("*.json"))

    def compose(self) -> ComposeResult:
        # 커스텀 헤더 (앱 제목 + 라이브 스탯)
        yield Horizontal(
            Static("", id="hdr-left"),
            Static("", id="hdr-right"),
            id="app-header",
        )

        # 탭 메뉴 바
        yield Horizontal(
            Static("[1] SETUP", id="menu-setup", classes="menu-item active"),
            Static("[2] LOTTO", id="menu-lotto", classes="menu-item"),
            Static("[3] STATUS", id="menu-status", classes="menu-item"),
            id="menu-bar",
        )

        yield ContentSwitcher(
            SetupWidget(self.rpc, id="setup"),
            LottoWidget(self.rpc, id="lotto"),
            StatusWidget(self.rpc, id="status"),
            initial="setup",
            id="content",
        )

        yield Footer()

    def on_mount(self) -> None:
        self._update_header()
        self._update_menu()
        self._refresh_header_stats()
        self.set_interval(5, self._refresh_header_stats)

    async def on_unmount(self) -> None:
        await self.rpc.close()

    def action_show_tab(self, tab_name: str) -> None:
        self._current_tab = tab_name
        self.query_one("#content", ContentSwitcher).current = tab_name
        self._update_header()
        self._update_menu()
        self.action_refresh()

    def _update_header(self) -> None:
        tab_names = {"setup": "SETUP", "lotto": "LOTTO", "status": "STATUS"}
        left = Text()
        left.append("◆ JackpotChain", style="bold #00d4ff")
        left.append(f"  [{tab_names.get(self._current_tab, '')}]", style="#444444")
        try:
            self.query_one("#hdr-left", Static).update(left)
        except Exception:
            pass

    @work(exclusive=True)
    async def _refresh_header_stats(self) -> None:
        height_str = "--"
        peers_str = "--"
        mining_str = "OFFLINE"
        mining_style = "#555555"

        try:
            resp = await self.rpc.get_blockchain_info()
            if resp.success:
                height_str = f"#{resp.result.get('blocks', 0):,}"
        except Exception:
            pass

        try:
            resp = await self.rpc.get_network_info()
            if resp.success:
                peers_str = str(resp.result.get("connections", 0))
        except Exception:
            pass

        try:
            resp = await self.rpc.get_mining_info()
            if resp.success:
                is_mining = resp.result.get("mining", False)
                if is_mining:
                    mining_str = "MINING"
                    mining_style = "#00d4ff"
                else:
                    mining_str = "STOPPED"
                    mining_style = "#555555"
        except Exception:
            pass

        right = Text(justify="right")
        right.append("Height ", style="#555555")
        right.append(height_str, style="#00d4ff")
        right.append("  Peers ", style="#555555")
        right.append(peers_str, style="#cccccc")
        right.append("  Mining ", style="#555555")
        right.append(mining_str, style=mining_style)

        try:
            self.query_one("#hdr-right", Static).update(right)
        except Exception:
            pass

    def _update_menu(self) -> None:
        for tab in ["setup", "lotto", "status"]:
            item = self.query_one(f"#menu-{tab}", Static)
            if tab == self._current_tab:
                item.add_class("active")
            else:
                item.remove_class("active")

    def on_click(self, event) -> None:
        widget_id = getattr(event.widget, "id", None)
        if widget_id and widget_id.startswith("menu-"):
            self.action_show_tab(widget_id.replace("menu-", ""))

    def action_refresh(self) -> None:
        try:
            current = self.query_one(f"#{self._current_tab}")
            if hasattr(current, "refresh_data"):
                current.refresh_data()
        except Exception:
            pass


def run_tui(host: str = "127.0.0.1", port: int = 9776):
    """TUI 실행"""
    app = JackpotChainApp(host, port)
    app.run()


if __name__ == "__main__":
    run_tui()
