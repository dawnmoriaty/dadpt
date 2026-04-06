import asyncio
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('d:/feature/dadpt/aiservice')
from src.platform.tool_factory import ToolFactory

async def test():
    f = ToolFactory('http://localhost:8080')
    res = await f._search_trips_http(origin='ninh bình', destination='bến xe mỹ đình', date='2026-04-09')
    print("RES:", res)

asyncio.run(test())
