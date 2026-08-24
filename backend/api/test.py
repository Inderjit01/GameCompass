import asyncio
from howlongtobeatpy import HowLongToBeat

async def main():
    try:
        results = await HowLongToBeat().async_search("Portal 2")

        print("TYPE:", type(results))
        print("RESULT:", results)

    except Exception as e:
        print("ERROR:", repr(e))
        raise

asyncio.run(main())