import sys, os, asyncio, time
from playwright.async_api import async_playwright
import threading

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log

from database.database_controller import get_games_from_location

from api.steam import get_steam_price
from api.epic import get_epic_prices
from api.xbox import get_xbox_prices

from scrapers.playstation import get_playstation_prices
from scrapers.nintendo import get_nintendo_prices

# Limit how many games can load at a time because Playstation and Nintendo will IP ban with to many requests
MAX_CONCURRENT_GAMES = 5
semaphore = asyncio.Semaphore(MAX_CONCURRENT_GAMES)

log = create_log("caching")

# uses concurrency to grab each games info
async def _create_game_cache(browser, location):
    if location not in ("backlog", "wishlist", "completed"):
        log.warning(f"create_game_cache : location is invaild : {location}")
        return None

    # Grabs all the games saved to a location in DB
    try:
        games = get_games_from_location(location)
        if not games:
            log.warning("create_game_cache : status_code: 404, Failed to grab games that are in the wishlist")

        log.info(f"create_game_cache: Successfully grabbed games stored in {location}")
    except Exception:
        log.warning(f"create_game_cache : Failed to grab games that are in {location}")
        return None

    # concurrency to grab the price of the game from each store simultaneously
    async def _get_prices(browser, game):
        # semaphore is the limit for concurrency
        async with semaphore:
            if not game:
                return None

            igdb_id = game.get("igdb_id", None)
            game_title = game.get("game_title", None)
            platforms = game.get("platforms", None)

            if platforms == "":
                return None

            # default values
            game_prices = {
                "steam": None,
                "epic": None,
                "playstation": None,
                "xbox": None,
                "nintendo": None
            }

            store_tasks = []
            # Check the platforms the game is available on to save time
            if "PC" in platforms:
                store_tasks.append((
                    "steam",
                    get_steam_price(game_title)
                ))

                store_tasks.append((
                    "epic",
                    get_epic_prices(game_title)
                ))
            
            if "Playstation" in platforms:
                store_tasks.append((
                    "playstation",
                    get_playstation_prices(browser, game_title)
                ))
            
            if "Xbox" in platforms:
                store_tasks.append((
                    "xbox",
                    get_xbox_prices(game_title)
                ))
            
            if "Nintendo" in platforms:
                store_tasks.append((
                    "nintendo",
                    get_nintendo_prices(browser, game_title)
                ))

            # Starts the concurrency for each store
            if store_tasks:
                tasks = []

                for store, task in store_tasks:
                    tasks.append(task)

                results = await asyncio.gather(*tasks)

                # update game_prices with the current prices
                for index in range(len(store_tasks)):
                    store = store_tasks[index][0]
                    price = results[index]

                    game_prices[store] = price

            # Combine all info for the game
            return {
                igdb_id : {
                    **game,
                    "prices": game_prices
                }
            }

    # Uses concurrency for each game to grab the price from all stores. Then combines those prices with the games results
    try:
        tasks = []

        for game in games:
            task = asyncio.create_task(_get_prices(browser, game))
            tasks.append(task)

        store_results = await asyncio.gather(*tasks)

        results = {}
        for store_result in store_results:
            for igdb_id, game_info in store_result.items():
                results[igdb_id] = game_info

        log.info(f"create_game_cache : Successfully grabed {location} games and prices")

    except Exception as e:
        log.exception(f"create_game_cache : Failed to grab prices of games : {e}")
        return None

    log.info(f"create_game_cache : Successfully grabbed {location} games and prices")
    return results

# Addes the new game to the cache for faster loading
def add_to_game_cache(cache, game_info, game_prices):
    if cache is None:
        log.warning("add_to_game_cache : cache is None")
        return None
    if game_info is None:
        log.warning("add_to_game_cache : game_info is None")
        return cache
    if game_prices is None:
        log.warning("add_to_game_cache : game_prices is None")
        return cache

    igdb_id = game_info.get("igdb_id", None)
    if not igdb_id:
        log.warning("add_to_game_cache : igdb_id is None")
        return cache

    try:
        cache[igdb_id] = {
            **game_info, 
            "prices": game_prices
        }
    except Exception:
        log.exception("add_to_game_cache : Failed to add to cache")
        raise

    return cache

# Removes game from cache when it is removed from DB
def remove_from_game_cache(cache, igdb_id):
    if cache is None:
        log.warning("remove_from_game_cache : cache is None")
        return None
    if not igdb_id:
        log.warning("remove_from_game_cache : igdb_id is None")
        return cache

    try:
        igdb_id = int(igdb_id)

        cache.pop(igdb_id, None)
    except (ValueError, TypeError):
        log.exception(f"remove_from_game_cache : Invalid igdb_id: {igdb_id}")
        return cache
    except Exception:
        log.exception(f"remove_from_game_cache : Failed to remove game {igdb_id} from cache")
        return cache

    log.info(f"remove_from_game_cache : Successfully removed {igdb_id} from cache")
    return cache

# Starts the caching process for wishlist and backlog
async def build_caches(app):
    try:
        # This status flag tells the wishlist page to keep requesting until the cache is done when the user is on the wishlist page
        app.state.wishlist_cache_done = False

        # Loads wishlist cache first
        print("Starting wishlist cache...")
        app.state.wishlist_cache = await _create_game_cache(
            app.state.browser,
            "wishlist"
        )

        # Let wishlist page know that cache is done
        app.state.wishlist_cache_done = True
        print("Wishlist cache finished!")

        # Start backlog cache
        print("Starting backlog cache...")
        app.state.backlog_cache = await _create_game_cache(
            app.state.browser,
            "backlog"
        )

        print("Backlog cache finished!")
        print("Background cache complete!")

    except asyncio.CancelledError:
        print("Background cache cancelled")
        raise

    except Exception:
        log.exception("Background cache building failed")

# This is for testing the caching script by itself
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
            ]
        )

        results = await _create_game_cache(browser, "wishlist")

        print(results)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())