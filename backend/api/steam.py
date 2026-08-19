import os, requests, json, sys, asyncio
from dotenv import load_dotenv
from rapidfuzz import process, fuzz

from utilities.logging_config import create_log, api_errors

log = create_log("steam")

STEAM_KEY = os.getenv("STEAM_API_KEY")
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
    
    matches = process.extract(
        game_title,
        titles_to_id_map.keys(),
        scorer = fuzz.WRatio,
        limit = 1
    )

    game_name = matches[0][0] if matches else None
    steam_id = titles_to_id_map.get(game_name, None) if game_name else None

    return steam_id

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

        game_data = data.get(str(steam_id), {}).get("data", None)
        if not game_data:
            return None

        game_price = game_data.get("price_overview", None)

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
            "genres",
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

async def get_steam_info(game_title):
    steam_id = _find_steam_id(game_title)
    if not steam_id:
        return None

    price = None
    steam_data, best_reviews, recent_reviews = await asyncio.gather(
        asyncio.to_thread(_get_steam_basic_info, steam_id),
        asyncio.to_thread(_get_steam_reviews, steam_id, review_category="all"),
        asyncio.to_thread(_get_steam_reviews, steam_id, review_category="recent")
    )

    if steam_data is None:
        return None

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

    return game_info, game_price

# data = asyncio.run(get_steam_info("stellar blade"))

#with open("C:/Users/inder/Documents/Python Projects/GameCompassProject/GameCompass/backend/api/HellLetLoose.txt", "w") as f:
#    json.dump(data, f, indent=4)