import os, sys, requests, asyncio
from dotenv import load_dotenv

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log, api_errors

log = create_log("xbox")

load_dotenv() 

ISTHEREANYDEAL_KEY = os.getenv("ISTHEREANYDEAL_API_KEY")
BASE_URL = "https://api.isthereanydeal.com/lookup/id/title/v1"
PRICE_URL = f"https://api.isthereanydeal.com/games/prices/v3?key={ISTHEREANYDEAL_KEY}"
SUBSCRIPTION_URL = f"https://api.isthereanydeal.com/games/subs/v1?key={ISTHEREANYDEAL_KEY}"

# Gets the games price if it is on game pass for XBOX store
async def get_xbox_prices(game_title, country="US"):
    if not game_title:
        return None

    price_info = {
        "always_free": False,
        "currency": None,
        "initial_formatted": "",
        "final_formatted": "",
        "discount_percent": 0,
        "game_pass": False
    }

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
        api_errors(e, log, "Xbox, Failed to get ID for game title:", game_title)
        return None
    
    lookup_data = request_data.json()
    game_id = lookup_data.get(game_title)
    if not game_id:
        log.warning(f"get_xbox_prices : game_id empty from ISTHEREANYDEAL : {game_title}")
        return None

    try:
        # Gets the price data with the key from the previous request
        prices_task = asyncio.to_thread(
            requests.post,
            PRICE_URL + f"&country={country}",
            json=[game_id],
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        # Gets the subscription info
        subs_task = asyncio.to_thread(
            requests.post,
            SUBSCRIPTION_URL,
            json=[game_id],
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        # runs both API requests at the same time
        prices_request, subs_request = await asyncio.gather(prices_task, subs_task)

        subs_request.raise_for_status()
        prices_request.raise_for_status()

    except requests.RequestException as e:
        api_errors(e, log, "Xbox, Failed to get prices/subscriptions for game title:", game_title)
        return None

    # Checks the price of the game
    prices_data = prices_request.json()
    if not prices_data or not isinstance(prices_data, list):
        return None
    
    game_prices = prices_data[0].get("deals", [])

    # Filter for XBOX game store (shop ID 48)
    ms_deals = [d for d in game_prices if d.get("shop", {}).get("id") == 48]  # Microsoft Store
    if ms_deals:
        deal = ms_deals[0]
        regular = deal.get("regular", {})
        price = deal.get("price", {})
        cut = deal.get("cut", 0)
        
        regular_amount = regular.get("amount", 0.0)
        price_amount = price.get("amount", 0.0)

        # This means the game is always free
        if regular_amount == 0:
            price_info["always_free"] = True

        price_info["currency"] = price.get("currency") or regular.get("currency", "USD")
        price_info["initial_formatted"] = "$" + str(regular_amount)
        price_info["final_formatted"] =  "$" + str(price_amount)
        price_info["discount_percent"] = cut
    else:
        return None
    
    # Checks if the game is on game pass
    subs_data = subs_request.json()
    game_pass = None
    if subs_data and isinstance(subs_data, list) and "subs" in subs_data[0]:
        subs = subs_data[0]["subs"]
        game_pass = [s for s in subs if "Game Pass" in s.get("name", "")]
        if game_pass:
            price_info["game_pass"] = True

    log.info(f"/get_xbox_prices : Successfully grabbed Xbox prices for {game_title}")
    return price_info

#print(asyncio.run(get_xbox_prices("Hell Let Loose")))