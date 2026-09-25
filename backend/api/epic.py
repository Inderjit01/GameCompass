import requests, os, sys, asyncio
from dotenv import load_dotenv

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log, api_errors

log = create_log("epic")

load_dotenv()

ISTHEREANYDEAL_KEY = os.getenv("ISTHEREANYDEAL_API_KEY")
BASE_URL = "https://api.isthereanydeal.com/lookup/id/title/v1"
PRICE_URL = f"https://api.isthereanydeal.com/games/prices/v3?key={ISTHEREANYDEAL_KEY}"

# Returns the current epic store price if it exists
async def get_epic_prices(game_title, country='US'):

    # The first step for this API is to get the games ID from ISTHEREANYDEAL so we can then later grab the price of that game
    try:
        request_data = await asyncio.to_thread(
            requests.post,
            BASE_URL,
            json=[game_title],
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        request_data.raise_for_status()
    except requests.RequestException as e:
        api_errors(e, log, "Epic, no results found with game_title", game_title)
        return

    lookup_data = request_data.json()

    game_id = lookup_data.get(game_title)
    if not game_id:
        log.warning("epic_prices: status_code: 404, game_id is empty")
        return

    # Gets the price data with the key from the previous request
    try:
        prices_request = await asyncio.to_thread(
            requests.post,
            PRICE_URL + f"&country={country}",
            json=[game_id],
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        prices_request.raise_for_status()
    except requests.RequestException as e:
        api_errors(e, log, "Epic, no prices found with game_id", game_title)
        return
    
    prices_data = prices_request.json()

    if not prices_data or not isinstance(prices_data, list):
        log.warning("epic_prices: status_code: 404, prices_data is empty")
        return
    
    game_prices = prices_data[0].get("deals", [])
    
    # Filter for Epic Games Store (shop ID 16)
    epic_deals = [d for d in game_prices if d.get("shop", {}).get("id") == 16]
    if not epic_deals:
        log.warning("epic_prices: Game does not exist on Epic or could not find game on Epic")
        return
    
    deal = epic_deals[0]
    regular = deal.get("regular", {})
    price = deal.get("price", {})
    cut = deal.get("cut", 0)
    
    regular_amount = regular.get("amount", 0.0)
    price_amount = price.get("amount", 0.0)

    log.info(f"/get_epic_prices : Successfully grabbed Epic prices for {game_title}")

    # This means the game is always free
    if regular_amount == 0:
        return {
            "always_free": True
        }
    
    return {
        "always_free": False,
        "currency": price.get("currency") or regular.get("currency", "USD"),
        "initial_formatted": "$" + str(regular_amount),
        "final_formatted": "$" + str(price_amount),
        "discount_percent": cut
    }

#print(asyncio.run(get_epic_prices("Hell Let Loose")))