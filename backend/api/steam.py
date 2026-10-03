import os, requests, json, sys, asyncio
from dotenv import load_dotenv
from rapidfuzz import process, fuzz
from pathlib import Path

# Need sys.path.append if running file independently
# This is to allow the script to use utilities
if not getattr(sys, 'frozen', False):
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log, api_errors

log = create_log("steam")

STEAM_ID_URL = "https://store.steampowered.com/api/storesearch/"
STEAM_GAME_INFO_URL = "https://store.steampowered.com/api/appdetails/"
STEAM_GAME_REVIEWS_URL = "https://store.steampowered.com/appreviews/"

# Find similar steam titles to the game title provided
def _steam_id_database(game_title):
    params = {
        "term": game_title,
        "l": "english",
        "cc": "us"
    }

    try:
        response = requests.get(STEAM_ID_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        return data
    
    except Exception as e:
        api_errors(e, log, "Steam id database", game_title)

    return None

# Find the steam id of the game title provided using the steam api's data
def _find_steam_id(game_title):
    titles_to_id_map = {}

    data = _steam_id_database(game_title)

    for game in data.get("items", []):
        title = game.get("name", None)
        if title:
            titles_to_id_map[title] = game["id"]

    if not titles_to_id_map:
        log.warning(f"_find_steam_id : No id's were found for {game_title}")
        return

    # match formatting for better comparison of titles
    normalized_titles_to_id_map = {}
    for title, id in titles_to_id_map.items():
        formatted_title = title.lower().replace(":", "").replace("™", "")

        normalized_titles_to_id_map[formatted_title] = id

    # Get the game with the best match
    matches = process.extract(
        game_title.lower().replace(":", "").replace("™", ""),
        normalized_titles_to_id_map.keys(),
        scorer = fuzz.WRatio,
        limit = 1
    )

    # If the title has less than 90% similarity return None. Probably the wrong game
    if matches and matches[0][1] >= 90:
        game_name = matches[0][0] 
    else: 
        log.warning(f"_find_steam_id : {game_title} failed similarity test")
        return None

    steam_id = normalized_titles_to_id_map.get(game_name, None)

    return steam_id

# Gets the general information of the game
def _get_steam_basic_info(steam_id):
    params = {
        "appids": steam_id,
        "cc": "us",
        "l": "english"
    }

    try:
        response = requests.get(STEAM_GAME_INFO_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        app_data = next(iter(data.values()), {})
        if not app_data.get("success"):
            log.warning(f"_get_steam_basic_info : No game info for {steam_id}")
            return None

        game_data = app_data.get("data")
        if not game_data:
            log.warning(f"_get_steam_basic_info : No game data for {steam_id}")
            return None
        
        # Split the prices so I can group prices with other stores
        game_price = game_data.get("price_overview", None)

        # Remove info I don't need from API response
        remove_list = (
            "background",
            "background_raw",
            "required_age",
            "controller_support",
            "supported_languages",
            "website",
            "pc_requirements",
            "mac_requirements",
            "linux_requirements",
            "legal_notice",
            "drm_notice",
            "demos",
            "packages",
            "package_groups",
            "platforms",
            "categories",
            "recommendations",
            "achievements",
            "support_info",
            "content_descriptors",
            "ratings",
            "price_overview"
        )
        for key in remove_list:
            if key in game_data:
                game_data.pop(key)
    
        return {
            "basic_info": game_data, 
            "steam_price": game_price
        }
    except Exception as e:
        api_errors(e, log, "Steam basic_info", steam_id)

    return None

# Get the Steam reviews for a game if it exists
def _get_steam_reviews(steam_id, review_category):
    params = {
        "json": 1,
        "language": "english",
        "purchase_type": "all",
        "num_per_page": 10,
        "filter": review_category
    }

    try:
        response = requests.get(f"{STEAM_GAME_REVIEWS_URL}/{steam_id}", params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        return data if data else None
    except Exception as e:
        api_errors(e, log, "Steam reviews", steam_id)

    return None

# Gets the basic info about a game, the best reviews for a game, and the most recent reviews for a game. Then combine all of them
async def get_steam_info(game_title):
    steam_id = await asyncio.to_thread(_find_steam_id, game_title)
    if not steam_id:
        log.warning(f"get_steam_info : steam_id is None for {game_title}. Most likely game does not exists on Steam")
        return None, None

    price = None
    steam_data, best_reviews, recent_reviews = await asyncio.gather(
        asyncio.to_thread(_get_steam_basic_info, steam_id),
        asyncio.to_thread(_get_steam_reviews, steam_id, review_category="all"),
        asyncio.to_thread(_get_steam_reviews, steam_id, review_category="recent")
    )

    if steam_data is None:
        log.warning(f"get_steam_info : steam_data is None for {game_title}. Most likely Steam found the wrong game and I filtered it out with comparison.")
        return None, None

    game_info = {
        "basic_info": steam_data["basic_info"],
        "reviews": best_reviews,
        "recent_reviews": recent_reviews
    }
    game_price = steam_data["steam_price"]
    if game_info.get("basic_info", {}).get("is_free", False):
        game_price = {
            "is_free": True
        }

    log.info(f"get_steam_info : Successfully grabbed Steam basic info, reviews, and recent reviews for {game_title}")

    return game_info, game_price

# Only get the Steam price
async def get_steam_price(game_title):
    steam_id = await asyncio.to_thread(_find_steam_id, game_title)
    if not steam_id:
        log.warning(f"get_steam_price : steam_id is None for {game_title}. Most likely game does not exists on Steam")
        return None

    steam_data = await asyncio.to_thread(_get_steam_basic_info, steam_id)
    if steam_data is None:
        log.warning(f"get_steam_price : steam_data is None for {game_title}. Most likely Steam found the wrong game and I filtered it out with comparison.")
        return None

    game_price = steam_data["steam_price"]
    if steam_data.get("basic_info", {}).get("is_free", False):
        game_price = {
            "is_free": True
        }

    log.info(f"get_steam_price : Successfully grabbed Steam prices for {game_title}")

    return game_price

# This is for testing the script independently
async def main():
    data = await get_steam_info("Horizon Zero Dawn™ Remastered")
    print(data)
    
    #data = await get_steam_price("DEATH STRANDING DIRECTOR'S CUT")
    #print(data)

    #with open("C:/Users/inder/Documents/Python Projects/GameCompassProject/GameCompass/backend/api/TidesOfAnnihilation.txt", "w") as f:
    #    json.dump(data, f, indent=4)

if __name__ == "__main__":
    asyncio.run(main())