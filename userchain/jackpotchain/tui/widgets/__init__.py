"""TUI Widgets"""

from .setup import SetupWidget
from .lotto import LottoWidget
from .status import StatusWidget

# 하위 호환 (기존 위젯 유지)
from .dashboard import DashboardWidget
from .wallet import WalletWidget
from .mining import MiningWidget
from .history import HistoryWidget
from .network import NetworkWidget

__all__ = [
    'SetupWidget',
    'LottoWidget',
    'StatusWidget',
    'DashboardWidget',
    'WalletWidget',
    'MiningWidget',
    'HistoryWidget',
    'NetworkWidget',
]
