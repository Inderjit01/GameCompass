import os, sys, asyncio, time
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from rapidfuzz import fuzz

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log

log = create_log("nintendo")

NINTENDO_STARTING_URL = "https://www.nintendo.com/us/search/#q="
NINTENDO_ENDING_URL = "&p=1&cat=shp&sort=df"

# From price_info this updates final_formatted_price and always_free 
async def _update_final_price(game_location, price_info):
    final_price_location = game_location.locator(".o2BsP.SH2al").first

    if await final_price_location.count() > 0:
        final_text = await final_price_location.inner_text(timeout=5000)
        if final_text:
            final_formatted = final_text.replace("Current Price:", "").strip()
            price_info["final_formatted"] = final_formatted
    else:
        regular_label = game_location.get_by_text("Regular Price:", exact=True)
        
        if await regular_label.count() > 0:
            final_price_location = regular_label.locator("..")
            final_text = await final_price_location.inner_text(timeout=5000)
    
            if final_text:
                final_formatted = final_text.replace("Regular Price:", "").strip()
                price_info["final_formatted"] = final_formatted
                if final_formatted == "Free":
                    price_info["always_free"] = True
                else:
                    price_info["final_formatted"] = final_formatted

    return 

# From price_info this updates initial_formatted
async def _update_initial_price(game_location, price_info):
    regular_label = game_location.get_by_text("Regular Price:", exact=True)

    if await regular_label.count() > 0:
        initial_price_location = regular_label.locator("..")
        initial_text = await initial_price_location.inner_text(timeout=5000)

        if initial_text:
            initial_formatted = initial_text.replace("Regular Price:", "").strip()
            price_info["initial_formatted"] = initial_formatted

    return

# From price_info this updates discount_percent
async def _update_discount_percentage(game_location, price_info):
    discount_percent_locator = game_location.locator(".c1Pw7")

    if await discount_percent_locator.count() > 0:
        price_info["discount_percent"] = await discount_percent_locator.inner_text(timeout=5000)

    return

# Removes page elements I dont need. This helps reduce the load time
async def block_resources(route):
    if route.request.resource_type in {"image", "font", "media", "stylesheet"}:
        await route.abort()
    else:
        await route.continue_()

# Gets the Playstation price and/or subscription for a game 
async def get_nintendo_prices(browser, game_title):
    if not game_title:
        return None

    price_info = {
        "always_free": False,
        "currency": "USD",
        "initial_formatted": None,
        "final_formatted": None,
        "discount_percent": None
    }

    # Convert game_title to URL format then add it to Playstation URL
    game_title_as_url = game_title.strip().replace(" ", "+")
    nintendo_full_url = NINTENDO_STARTING_URL + game_title_as_url + NINTENDO_ENDING_URL

    # Creates a new tab on the browser
    page = await browser.new_page()

    # Block unnecessary info to speed up load time
    await page.route("**/*", block_resources)

    try:
        # Sends browser to the playstation store with game title as a search option
        await page.goto(
            nintendo_full_url,
            wait_until="domcontentloaded",
            timeout=10000
        )

        # Wait until browser has loaded the first game before extracting data
        game_location = page.locator(".y83ib.H5L8k").first
        await game_location.wait_for(state="attached", timeout=10000)

        # This checks how close the game the playstation store gave is compared to the game_title from igbd to reduce bad results
        game_title_location = game_location.locator("h3")
        if await game_title_location.count() > 0:
            nintendo_game = await game_title_location.inner_text(timeout=5000)

            score = fuzz.WRatio(game_title.casefold(), nintendo_game.casefold())
            if score < 90:
                log.warning(f"get_nintendo_prices : The games did not have a good matching score: {score}, game_title: {game_title}, playstation_title: {nintendo_game}")
                return None

        # Update price_info with all the info of the first game from the playstation store
        await asyncio.gather(
            _update_final_price(game_location, price_info),
            _update_initial_price(game_location, price_info),
            _update_discount_percentage(game_location, price_info)
        )
    except PlaywrightTimeoutError as e:
        log.warning(f"get_nintendo_prices : Failed to grab nintendo price: {game_title}, {e}")
        return None
    except Exception as e:
        log.exception(f"get_nintendo_prices: Unexpected error for {game_title}: {e}")
        return None
    finally:
        await page.close()

    return price_info

# This is for testing the playstation store script by itself
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
            ]
        )

        results = await get_nintendo_prices(browser, "Mario Kart 8 Deluxe")

        print(results)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
