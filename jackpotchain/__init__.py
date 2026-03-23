"""
로컬 작업 디렉터리에서 `jackpotchain` 패키지명으로 blockchain 소스를 참조하기 위한 별칭 패키지다.
"""

from pathlib import Path

from blockchain import *  # noqa: F401,F403
from blockchain import __all__, __author__, __version__

__path__ = [str(Path(__file__).resolve().parent.parent / "blockchain")]
