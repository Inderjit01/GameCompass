import requests, os, sys
from dotenv import load_dotenv
from rapidfuzz import process, fuzz

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log, api_errors

log = create_log("rawg")

load_dotenv()

RAWG_KEY = os.getenv("RAWG_API_KEY")
RAWG_URL = "https://api.rawg.io/api/games"

# organizes the platforms the games is available on into a nice string
def _grab_platforms(platforms):
    if not platforms:
        return None
    
    platform_names = []

    # Get all the platform names from api results
    for item in platforms:
        platform = item["platform"].get("name", "")
        if platform:
            platform_names.append(platform)

    # Organize all the plaforms based on company
    grouped = {}
    for platform in platform_names:
        if "Playstation" in platform:
            company = "Playstation"
            version = platform.replace("Playstation ", "")
        elif "Xbox" in platform:
            company = "Xbox"
            version = platform.replace("Xbox ", "")
        elif "Nintendo" in platform:
            company = "Nintendo"
            version = platform.replace("Nintendo ", "")
        else:
            grouped[platform] = []
            continue

        if company not in grouped:
            grouped[company] = []

        grouped[company].append(version)

    result = []
    for company, versions in grouped.items():
        if not versions:
            result.append(company) 
        elif len(versions) == 1:
            result.append(f"{company} {versions[0]}")
        else:
            versions.sort()
            combined_versions = ",".join(versions)
            result.append(f"{company} ({combined_versions})")
    return ", ".join(result)

# API call to get a single game's information
def _search_one_game(rawg_id):
    params = {
            "key": RAWG_KEY,
    }

    response = requests.get(RAWG_URL + f"/{rawg_id}", params, timeout=5)
    response.raise_for_status()

    return response.json()

# API call to get games with the closest title to what the user input in the search bar
def _search_multiple_games(game_title, limit):
    params = {
        "key": RAWG_KEY,
        "search": game_title,
        "page_size": limit 
    }
    try:
        response = requests.get(RAWG_URL, params=params, timeout=5)
        response.raise_for_status()
        return response.json()["results"]
    except Exception as e:
        api_errors(e, log, "RAWG", game_title)
        return None

# Orders the most similar games titles and returns json format back to frontend
def rawg_find_similar_titles(game_title, limit):
    games = _search_multiple_games(game_title, limit)

    if not games:
        return None

    titles = []
    for game in games:
        titles.append(game['name'])

    matches = process.extract(
        game_title,
        titles,
        scorer = fuzz.WRatio,
        limit = limit
    )

    res = []
    for match_title, score, index in matches:
        game = games[index]

        rawg_id = game.get("id", None)

        game_name = game.get("name", None)

        platforms = _grab_platforms(game.get("platforms", None))

        background_image = game.get("background_image", None)

        res.append({
            "api_id": rawg_id,
            "game_name": game_name,
            "background_image": background_image,
            "platforms": platforms
        })
    return res

# Get all the JSON data to the frontend for displaying individual game pages
def rawg_individual_game_info(rawg_id):
    game = _search_one_game(rawg_id)

    if not game:
        return None

    game_name = game.get("name", None)

    platforms = _grab_platforms(game.get("platforms", None))

    cover_image = game.get("background_image", None)

    description = game.get("description", None)

    released = game.get("released", None)

    # makes the developer lists into a single string with just the company names
    developers_info = game.get("developers", None)
    developers_list = []
    for developer in developers_info:
        name = developer.get("name", None)
        if name:
            developers_list.append(name)
    developers = ", ".join(developers_list) if developers_list else None

    # makes the publisher lists into a single string with just the company names
    publishers_info = game.get("publishers", None)
    publishers_list = []
    for publisher in publishers_info:
        name = publisher.get("name", None)
        if name:
            publishers_list.append(name)
    publishers = ", ".join(publishers_list) if publishers_list else None
    
    try:
        rating = round(float(game["rating"]) * 20)
    except (KeyError, TypeError, ValueError):
        rating = None

    steam_id = None
    
    return {
        "rawg_id": rawg_id,
        "game_title": game_name,
        "cover_image": cover_image,
        "platforms": platforms,
        "short_description": description,
        "released": released,
        "developers": developers,
        "publishers": publishers,
        "rating": rating
    }