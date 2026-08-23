import sqlite3
from pathlib import Path
import json
from fastapi import HTTPException

from utilities.pathing import grab_db_path
from utilities.logging_config import create_log

DB_FILE = grab_db_path()

ALLOWED_TABLES = {"games", "user_games"}

# All cloumns except for keys since those cannot be changed
GAMES_COLUMNS = [
    "game_title",
    "description",
    "developers",
    "publishers",
    "release_date",
    "genres",
    "platforms",
    "image_url",
    "review_score",
    "main_story",
    "main_extra",
    "completionist",
    "all_styles",
]
USER_GAMES_COLUMNS = [
    "library_status",
    "favorite",
    "user_score",
    "hours_played",
    "added_date",
    "completed_date",
    "notes"
]

log = create_log("db_controller")

def _create_connection():
    conn = sqlite3.connect(DB_FILE)
    # Need to turn on foreign key feature
    conn.execute("PRAGMA foreign_keys = ON")
    # makes fetch return the column names
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    return conn, cur

# Lets me know if the game is already in the database
def _check_game_exists(cur, igdb_id):
    if not igdb_id:
        return False

    cur.execute('''
        SELECT igdb_id FROM games WHERE igdb_id = ? LIMIT 1
    ''', (igdb_id,))

    result = cur.fetchone()

    return True if result else False

# Grabs all database info for a game
def _grab_row_from_db(cur, table, igdb_id):
    if not igdb_id:
        return None

    if table not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table: {table}")

    cur.execute(f'''
        SELECT * FROM {table} WHERE igdb_id = ? LIMIT 1
    ''', (igdb_id,))

    row = cur.fetchone()

    return row
    
# Adding a new game to the database
def _insert_db(cur, formatted_data):    
    cur.execute('''
        INSERT INTO games (
            igdb_id, 
            game_title,
            description,
            developers,
            publishers,
            release_date,
            genres,
            platforms,
            image_url,
            review_score,
            main_story,
            main_extra,
            completionist,
            all_styles
            )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
            formatted_data["igdb_id"],
            formatted_data["game_title"],
            formatted_data["description"],
            formatted_data["developers"],
            formatted_data["publishers"],
            formatted_data["release_date"],
            formatted_data["genres"],
            formatted_data["platforms"],
            formatted_data["image_url"],
            formatted_data["review_score"],
            formatted_data["main_story"],
            formatted_data["main_extra"],
            formatted_data["completionist"],
            formatted_data["all_styles"],
        )
    )

    cur.execute('''
        INSERT INTO user_games (
            igdb_id, library_status
        ) 
        VALUES (?, ?)
    ''', (
            formatted_data["igdb_id"], 
            formatted_data["library_status"]
        )
    )

# Remove a game from games table
def _delete_games(cur, igdb_id):
    cur.execute('''
        DELETE FROM games WHERE igdb_id = ?
    ''', (igdb_id,))

# Removes user data of a game from user_games table
def _delete_user_games(cur, igdb_id):
    cur.execute('''
        DELETE FROM user_games WHERE igdb_id = ?
    ''', (igdb_id,))

# updates db if any information has changed
def _update_db(cur, table, columns, formatted_data):
    if not table or not columns or not formatted_data:
        return None

    if table not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table: {table}")

    old_data = _grab_row_from_db(cur, table=table, igdb_id=formatted_data["igdb_id"])
    if not old_data:
        return
    
    change_columns = []
    change_values = []

    for column in columns:
        if column in formatted_data and old_data[column] != formatted_data[column]:
            change_columns.append(column)
            change_values.append(formatted_data[column])

    if not change_columns:
        return

    set_parts = []

    for column in change_columns:
        set_parts.append(f"{column} = ?")

    set_clause = ", ".join(set_parts)

    change_values.append(formatted_data["igdb_id"])

    query = f'''
        UPDATE {table} 
        SET {set_clause}
        WHERE igdb_id = ?
    '''

    cur.execute(query, change_values)

# Deletes the game from games and user_games tables
def remove_from_library(igdb_id):
    if not igdb_id:
        return 

    conn, cur = _create_connection()

    try:
        # make sure the game exists before trying to delete
        if not _check_game_exists(cur, igdb_id):
            return

        _delete_user_games(cur, igdb_id)
        _delete_games(cur, igdb_id)

        log.info(f"remove_from_library : Successfully removed {igdb_id} from library")
        conn.commit()
    except Exception:
        log.exception(f"remove_from_library : status_code: 404, Failed to remove {igdb_id} from library")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

# Determines how to add the data that was sent when user pressed backlog, wishlist, or completed button
def add_to_library(formatted_data): 
    if not formatted_data or not formatted_data.get("igdb_id"):
        return 

    conn, cur = _create_connection()

    # If the game does not exists add a new entry
    try:
        igdb_id = formatted_data["igdb_id"]

        if _check_game_exists(cur, igdb_id):
            _update_db(cur, "games", GAMES_COLUMNS, formatted_data)
            _update_db(cur, "user_games", USER_GAMES_COLUMNS, formatted_data)
        else:
            _insert_db(cur, formatted_data)

        log.info(f"add_to_library : Successfully added {igdb_id} to library")
        conn.commit()
    except Exception:
        log.exception(f"add_to_library : status_code: 404, Failled to add {igdb_id} to library")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

# grabs where the game is stored (backlog, wishlist, completed)
def get_library_location(igdb_id):
    if not igdb_id:
        return

    conn, cur = _create_connection()

    try:
        cur.execute('''
            SELECT library_status FROM user_games WHERE igdb_id = ?
        ''', (igdb_id,))

        result = cur.fetchone()

        log.info(f"get_library_location : Successfully got library location for {igdb_id}")
        return result[0] if result else None
    except Exception:
        log.exception("get_library_location : status_code: 404, Failed to grab library location in database controller")
        raise HTTPException(
            status_code=404,
            details="Failed to grab library location in database controller"
        )
    finally:
        cur.close()
        conn.close()

# Extracting and formatting the data that will be stored in the database
def format_data(status, game_data):
    if not game_data:
        return None

    formatted_data = {}

    # Shortcuts
    igdb = game_data.get("igdb") or {}
    steam = (game_data.get("steam") or {}).get("basic_info") or {}
    hltb = game_data.get("hltb") or {}

    # Values to store in DB
    formatted_data["igdb_id"] = igdb.get("igdb_id")

    formatted_data["game_title"] = igdb.get("game_title")

    formatted_data["description"] = steam.get("short_description") or igdb.get("short_description")

    # if developers is from steam it will be a list so change it to a string. IGDB has correct format
    developers = steam.get("developers") or igdb.get("developers")
    if developers and isinstance(developers, list):
        developers = ", ".join(developers)
    formatted_data["developers"] = developers

    publishers = steam.get("publishers") or igdb.get("publishers")
    if publishers and isinstance(publishers, list):
        publishers = ", ".join(publishers)
    formatted_data["publishers"] = publishers

    formatted_data["release_date"] = steam.get("release_date", {}).get("date") or igdb.get("released") or "Coming Soon"

    genres = None
    genres_list = []
    genre_data = steam.get("genres") or igdb.get("genres")
    if genre_data:
        for genre in genre_data:
            genres_list.append(genre["description"])
        genres = ", ".join(genres_list)
    formatted_data["genres"] = genres

    formatted_data["platforms"] = igdb.get("platforms")

    formatted_data["image_url"] = steam.get("header_image") or igdb.get("artwork")

    review_data = ((game_data.get("steam") or {}).get("reviews") or {}).get("query_summary") or {}
    total_positive = review_data.get("total_positive")
    total_reviews = review_data.get("total_reviews")
    if total_positive and total_reviews:
        review_score = round((total_positive / total_reviews) * 100)
    else:
        review_score = igdb.get("rating")
    formatted_data["review_score"] = review_score

    formatted_data["main_story"] = hltb.get("main_story")
    formatted_data["main_extra"] = hltb.get("main_extra")
    formatted_data["completionist"] = hltb.get("completionist")
    formatted_data["all_styles"] = hltb.get("all_styles")

    formatted_data["library_status"] = status

    return formatted_data
        