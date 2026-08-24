import os, requests, sys, json
from dotenv import load_dotenv
from rapidfuzz import process, fuzz
from datetime import datetime

# Need sys.path.append if running file independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utilities.logging_config import create_log, api_errors

log = create_log("igdb")

load_dotenv()

IGDB_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_URL = "https://api.igdb.com/v4/games"
IGDB_REVIEW_URL = "https://api.igdb.com/v4/reviews"
IGDB_CLIENT_ID = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")

# Grabs all the screenshots from IGDB and change format to steam json
def _grab_screenshots(all_screenshots):
    if not all_screenshots:
        return None

    screenshots = []
    for screenshot in all_screenshots:
        id = screenshot.get("id", None)
        image_id = screenshot.get("image_id", None)

        if id and image_id:
            screenshots.append({
                "id": id,
                "path_thumbnail":  f"https://images.igdb.com/igdb/image/upload/t_screenshot_med/{image_id}.jpg",
                "path_full": f"https://images.igdb.com/igdb/image/upload/t_screenshot_big/{image_id}.jpg"
            })

    return screenshots
    
# Grabs only the trailers from IGDB. IGDB movies are from youtube
def _grab_videos (all_videos):
    if not all_videos:
        return None

    videos = []
    def add_videos(video_type):
        for video in all_videos:
            if video.get("name") == video_type:
                video_id = video.get("video_id")

                if video_id:
                    videos.append({
                        "id":video.get("id"), 
                        "name": video.get("name"),
                        "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg", 
                        "youtube": f"https://www.youtube.com/embed/{video_id}"
                    })

    # If there is no Trailer try to grab a different type of video
    add_videos("Trailer")
    if not videos:
        add_videos("Announcement Trailer")

    return videos

# organize the publisher and developers into two strings
def _grab_publisher_developer(companies):
    if not companies:
        return None, None

    developers = []
    publishers = []

    for company in companies:
        name = company.get("company", {}).get("name", None)
        if not name:
            continue

        if company.get("developer", None):
            developers.append(name)
        if company.get("publisher", None):
            publishers.append(name)

    developers = ", ".join(developers)
    publishers = ", ".join(publishers)

    return developers, publishers

def _grab_genres(genres):
    if not genres:
        return None

    for genre in genres:
        genre_name = genre.pop("name", None)
        genre["description"] = genre_name

    return genres

# Organizes the platforms into a nice string
def _grab_platforms(platforms):
    if not platforms:
        return None

    platform_names = []
    for platform in platforms:
       platform_name = platform.get("name", None)
       if platform_name:
           platform_names.append(platform_name)

    grouped = {}
    for platform_name in platform_names:
        if platform_name.startswith("PlayStation"):
            company = "Playstation"
            version = platform_name.replace("PlayStation ", "")
        elif platform_name.startswith("Xbox"):
            company = "Xbox"
            version = platform_name.replace("Xbox ", "")
        elif platform_name.startswith("Nintendo"):
            company = "Nintendo"
            version = platform_name.replace("Nintendo ", "")
        else:
            if platform_name.startswith("PC"):
                platform_name = "PC"
            grouped[platform_name] = []
            continue

        if company not in grouped:
            grouped[company] = []
        
        grouped[company].append(version)

    res = []
    for company, versions in grouped.items():
        if len(versions) == 0:
            res.append(company)
        elif len(versions) == 1:
            res.append(f"{company} {versions[0]}")
        else:
            versions.sort()
            versions_str = ", ".join(versions)
            res.append(f"{company} ({versions_str})")

    return ", ".join(res)
    
# Logins me into twitch igdb and gives me a temperory token to get data
def _get_oauth_token(game):
    params = {
            "client_id": IGDB_CLIENT_ID,
            "client_secret": IGDB_CLIENT_SECRET,
            "grant_type": "client_credentials"
        }

    try:
        response = requests.post(IGDB_TOKEN_URL, params=params, timeout=5)
        response.raise_for_status()

        data = response.json()

        return data.get("access_token", None)
    except Exception as e:
        api_errors(e, log, "IGDB", game)
    

# API call to get games with the closest title to what the user input in the search bar
def _search_multiple_games(game_title, limit):
    access_token = _get_oauth_token(game_title)
    if not access_token:
        return None

    # Authentication header with my account
    headers = {
        "Client-ID": IGDB_CLIENT_ID,
        "Authorization": f"Bearer {access_token}"
    }

    # Info I want from the search
    # Use limit 25 so i get a good pool of results to compare with process
    query = f'''
        fields
            id,
            name,
            cover.image_id,
            platforms.name,
            artworks.image_id;
        where name ~ *"{game_title}"*;
        limit 25;
    '''

    try:
        response = requests.post(IGDB_URL, headers=headers, data=query, timeout=5)
        response.raise_for_status()

        data = response.json()

        return data
    
    except Exception as e:
        api_errors(e, log, "IGDB", game_title)

    return None

# API call to get a single game's information
def _search_one_game(igdb_id):
    access_token = _get_oauth_token(igdb_id)
    if not access_token:
        return None

    # Authentication header with my account
    headers = {
        "Client-ID": IGDB_CLIENT_ID,
        "Authorization": f"Bearer {access_token}"
    }
    query=f'''
        fields
            name,
            summary,
            first_release_date,
            cover.image_id,
            platforms.name,
            genres.name,
            involved_companies.company.name,
            involved_companies.developer,
            involved_companies.publisher,
            rating,
            videos.video_id,
            videos.name,
            screenshots.image_id,
            artworks.image_id;
        where id = {igdb_id};
        limit 1;
    '''

    try:
        response = requests.post(IGDB_URL, headers=headers, data=query, timeout=5)
        response.raise_for_status()

        data = response.json()
        return data
    
    except Exception as e:
        api_errors(e, log, "IGDB", igdb_id)

    return None

# Orders the most similar games titles and returns json format back to frontend
def igdb_find_similar_titles(game_title, limit):
    games = _search_multiple_games(game_title, limit)
    if not games:
        return None

    titles = []
    for game in games:
        title = game.get("name", None)
        if title:
            titles.append(title)

    matches = process.extract(
        game_title,
        titles,
        scorer = fuzz.WRatio,
        limit = limit
        )

    res = []
    for match_title, score, index in matches:
        game = games[index]

        id = game.get("id", None)

        api_game_title = game.get("name", None)

        platforms = _grab_platforms(game.get("platforms", None))

        image_id = game.get("cover", {}).get("image_id", None)
        cover_image = None
        if image_id:
            cover_image = f"https://images.igdb.com/igdb/image/upload/t_1080p/{image_id}.jpg"

        artworks = game.get("artworks", None)
        artwork = None
        if artworks:
            image_id = artworks[0].get("image_id", None)
            if image_id:
                artwork = f"https://images.igdb.com/igdb/image/upload/t_1080p/{image_id}.jpg"

        res.append({
            "igdb_id": id,
            "game_title": api_game_title,
            "cover_image": cover_image,
            "platforms": platforms,
            "artwork": artwork
        })

    return res

# Get all the JSON data to the frontend for displaying individual game pages
def igdb_individual_game_info(igdb_id):
    game = _search_one_game(igdb_id)
    if not game:
        return None

    game = game[0]

    game_title = game.get("name", None)

    image_id = game.get("cover", {}).get("image_id", None)
    cover_image = None
    if image_id:
        cover_image = f"https://images.igdb.com/igdb/image/upload/t_1080p/{image_id}.jpg"

    platforms = _grab_platforms(game.get("platforms", None))

    genres = _grab_genres(game.get("genres"))

    short_description = game.get("summary", None)

    timestamp = game.get("first_release_date", None)
    released = None
    if timestamp:
        date = datetime.fromtimestamp(timestamp)
        released = date.strftime("%b %d, %Y").replace(" 0", " ")

    developers, publisher = _grab_publisher_developer(game.get("involved_companies", None))

    rating = game.get("rating", None)
    if rating:
        rating = int(rating)

    all_videos = game.get("videos", None)
    movies = _grab_videos(all_videos)

    screenshots = _grab_screenshots(game.get("screenshots", None))

    artworks = game.get("artworks", None)
    artwork = None
    if artworks:
        image_id = artworks[0].get("image_id", None)
        if image_id:
            artwork = f"https://images.igdb.com/igdb/image/upload/t_1080p/{image_id}.jpg"

    return {
        "igdb_id": igdb_id,
        "game_title": game_title,
        "cover_image": cover_image,
        "platforms": platforms,
        "genres": genres,
        "short_description": short_description,
        "released": released,
        "developers": developers,
        "publishers": publisher,
        "rating": rating,
        "movies": movies,
        "screenshots": screenshots,
        "artwork": artwork
    }

#data = igdb_individual_game_info(68353)
#with open("C:/Users/inder/Documents/Python Projects/GameCompassProject/GameCompass/backend/api/igdb_unicorn_overlord.txt", "w") as f:
#    json.dump(data, f, indent=4)
#data = igdb_individual_game_info(117170)
#with open ("C:/Users/inder/Documents/Python Projects/GameCompassProject/GameCompass/backend/api/igdb_stellar_blade.txt", "w") as f:
#    json.dump(data, f, indent=4)

#data = igdb_individual_game_info(331212)
#with open ("C:/Users/inder/Documents/Python Projects/GameCompassProject/GameCompass/backend/api/igdb_tides_of_annihilation.txt", "w") as f:
#    json.dump(data, f, indent=4)