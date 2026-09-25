import os, sys, asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from urllib.parse import quote
from rapidfuzz import fuzz

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log

log = create_log("playstation")

PLAYSTATION_BASE_URL = "https://store.playstation.com/en-us/search/"

# From price_info this updates final_formatted_price and always_free 
async def _update_final_price(game_location, price_info):
    final_price_locator = game_location.locator(
        '[data-qa="search#productTile0#price#display-price"]'
    )
    if await final_price_locator.count() > 0:
        price = await final_price_locator.inner_text(timeout=5000)
        if price == "Free":
            price_info["always_free"] = True
        else:
            price_info["final_formatted"] = price

    return

# From price_info this updates discount_percent
async def _update_discount_percentage(game_location, price_info):
    discount_percent_locator = game_location.locator(
        '[data-qa="search#productTile0#discount-badge#text"]'
    )
    if await discount_percent_locator.count() > 0:
        discount_percentage = await discount_percent_locator.inner_text(timeout=5000)
        price_info["discount_percent"] = discount_percentage

    return

# From price_info this updates initial_formatted
async def _update_initial_price(game_location, price_info):
    initial_formatted_locator = game_location.locator(
        '[data-qa="search#productTile0#price#price-strikethrough"]'
    )
    if await initial_formatted_locator.count() > 0:
        initial_formatted = await initial_formatted_locator.inner_text(timeout=5000)
        price_info["initial_formatted"] = initial_formatted

    return

# From price_info this updates playstation_essential, playstation_extra, and playstation_premium
async def _update_subscription_info(game_location, price_info):
    playstation_extra_locator = game_location.locator(
        '[data-qa="search#productTile0#service-upsell#descriptorText"]'
    )
    if await playstation_extra_locator.count() > 0:
        subscription_text = await playstation_extra_locator.inner_text(timeout=5000)
        if subscription_text == "Essential":
            price_info["playstation_essential"] = True
        elif subscription_text == "Extra":
            price_info["playstation_extra"] = True
        elif subscription_text == "Premium":
            price_info["playstation_premium"] = True

    return

# Removes page elements I dont need. This helps reduce the load time
async def block_resources(route):
    if route.request.resource_type in {"image", "font", "media", "stylesheet"}:
        await route.abort()
    else:
        await route.continue_()

# Gets the Playstation price and/or subscription for a game 
async def get_playstation_prices(browser, game_title):
    if not game_title:
        return None

    price_info = {
        "always_free": False,
        "currency": "USD",
        "initial_formatted": None,
        "final_formatted": None,
        "discount_percent": None,
        "playstation_essential": False,
        "playstation_extra": False,
        "playstation_premium": False
    }

    # Convert game_title to URL format then add it to Playstation URL
    game_title_as_url= quote(game_title.strip().lower())
    playstation_url = PLAYSTATION_BASE_URL + game_title_as_url

    # Creates a new tab on the browser
    page = await browser.new_page()

    # Block unnecessary info to speed up load time
    await page.route("**/*", block_resources)

    # To safely close the browser with finally
    try:
        # Sends browser to the playstation store with game title as a search option
        await page.goto(
            playstation_url,
            wait_until="domcontentloaded",
            timeout=10000
        )

        # Wait until browser has loaded the first game before extracting data
        game_location = page.locator(
            'div[data-qa="search#productTile0"][data-qa-index="0"]'
        )
        await game_location.wait_for(state="attached", timeout=10000)

        # This checks how close the game the playstation store gave is compared to the game_title from igbd to reduce bad results
        game_title_location = game_location.locator(
            '[data-qa="search#productTile0#product-name"]'
        )
        if await game_title_location.count() > 0:
            playstation_game = await game_title_location.inner_text(timeout=5000)
            score = fuzz.WRatio(game_title.casefold(), playstation_game.casefold())
            if score < 90:
                log.warning(f"get_playstation_prices : The games did not have a good matching score: {score}, game_title: {game_title}, playstation_title: {playstation_game}")
                return None

        # Update price_info with all the info of the first game from the playstation store
        await asyncio.gather(
            _update_final_price(game_location, price_info),
            _update_discount_percentage(game_location, price_info),
            _update_initial_price(game_location, price_info),
            _update_subscription_info(game_location, price_info)
        )

    except PlaywrightTimeoutError as e:
        log.warning(f"get_playstation_prices : Failed to grab playstation price: {game_title}, {e}")
        return None
    except Exception as e:
        log.exception(f"get_playstation_prices: Unexpected error for {game_title}: {e}")
        return None
    finally:
        await page.close()

    log.info(f"get_playstation_price : Successfully grabbed Playstation price for {game_title}")
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

        result = await get_playstation_prices(browser, "Hell Let Loose")

        print(result)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())


