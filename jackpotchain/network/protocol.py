class MessageType(Enum):
    """메시지 타입"""
    # 핸드셰이크
    VERSION = b'version\x00\x00\x00\x00\x00'
    VERACK = b'verack\x00\x00\x00\x00\x00\x00'

    # 인벤토리
    INV = b'inv\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    GETDATA = b'getdata\x00\x00\x00\x00\x00'
    NOTFOUND = b'notfound\x00\x00\x00\x00'

    # 블록
    BLOCK = b'block\x00\x00\x00\x00\x00\x00\x00'
    GETBLOCKS = b'getblocks\x00\x00\x00'
    GETHEADERS = b'getheaders\x00\x00'
    HEADERS = b'headers\x00\x00\x00\x00\x00'

    # 트랜잭션
    TX = b'tx\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    MEMPOOL = b'mempool\x00\x00\x00\x00\x00'

    # 피어
    ADDR = b'addr\x00\x00\x00\x00\x00\x00\x00\x00'
    GETADDR = b'getaddr\x00\x00\x00\x00\x00'

    # 핑퐁
    PING = b'ping\x00\x00\x00\x00\x00\x00\x00\x00'
    PONG = b'pong\x00\x00\x00\x00\x00\x00\x00\x00'

    # 거부
    REJECT = b'reject\x00\x00\x00\x00\x00\x00'


class InvType(Enum):
    """인벤토리 타입"""
    ERROR = 0
    TX = 1
    BLOCK = 2
    FILTERED_BLOCK = 3
    COMPACT_BLOCK = 4