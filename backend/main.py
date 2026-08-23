from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database.init_db import initialize_database
from database.database_controller import format_data, add_to_library, remove_from_library, get_library_location
from api.rawg import rawg_find_similar_titles, rawg_individual_game_info
from api.igdb import igdb_find_similar_titles, igdb_individual_game_info
from api.steam import get_steam_info
from api.hltb import get_hltb_info
from models.library import LibraryRequestAdd, LibraryRequestRemove
from utilities.logging_config import create_log

import asyncio

log = create_log("FastAPI")

"""
Asynccontextmanager: feature that allows lifespan yield two split what
    runs at startup and when the app exits
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database() # creates/checks the database 
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Will get the most similar games. Then user can add to backlog or wishlist
@app.get("/search")
def search_game(game_title: str, limit: int):
    games = igdb_find_similar_titles(game_title, limit)

    if games is None:
        log.warning(f"/search : status_code: 404, Could not find any games with similar title to {game_title}")
        raise HTTPException(
            status_code=404, 
            detail= "Could not find any games with similar title to {game_title}")

    log.info(f"/search : Found similar_titles for {game_title}")
    return games

# Displays the individual game page with all the information from RAWG, Steam, and HLTB
@app.get("/games/{igdb_id}")
async def get_game(igdb_id: int):
    igdb_results = igdb_individual_game_info(igdb_id)

    if igdb_results is None:
        log.warning(f"/games/{igdb_id} : status_code: 404, Game not found or IGDB unavailable")
        raise HTTPException(
            status_code=404, 
            detail="Game not found or IGDB unavailable"
        )

    # Use igdb game name until we can get the steam game name since the steam name is more accurate
    igdb_game_name = igdb_results.get("game_title", None)
    if not igdb_game_name:
        log.warning(f"/games/{igdb_id} : status_code: 404, Game title not found from IGDB results")
        raise HTTPException(
            status_code=404,
            detail="Game title not found from IGDB results"
        )

    steam_results = None
    epic_results = None
    xbox_results = None
    nintendo_results = None

    igdb_platforms = igdb_results.get("platforms", None)

    steam_results, steam_price = None, None
    if "PC" in igdb_platforms:
        steam_results, steam_price = await get_steam_info(igdb_results["game_title"])
        # place epic api here later
        
    if "Playstation" in igdb_platforms:
        #Placeholder for playstation
        pass

    if "Xbox" in igdb_platforms:
        #placeholder for Xbox
        pass

    if "nintendo" in igdb_platforms:
        #placeholder for Nintendo"
        pass

    #steam_game_name = (steam_results or {}).get("basic_info", {}).get("name", None)
    ## Use steam game name if available, otherwise use igdb game name for HLTB search
    #hltb_game_name = steam_game_name or igdb_game_name

    hltb_results = await get_hltb_info(igdb_game_name)

    log.info(f"/games/{igdb_id} : Found the individual game page with all the information from RAWG, Steam, and HLTB")
    return {
        "igdb": igdb_results,
        "steam": steam_results,
        "hltb": hltb_results,
        "prices": {
            "steam": steam_price,
            "epic": None,
            "playstation": None,
            "xbox": None,
            "nintendo": None
        }
    }

    #"prices": {
    #    "steam": steam_price,
    #    "epic": {"final_formatted": "$59.99"},
    #    "playstation": {"final_formatted": "$59.99"},
    #    "xbox": {"final_formatted": "$59.99"},
    #    "nintendo": {"final_formatted": "$59.99"}

@app.post("/library/add/{igdb_id}")
async def add_to_db(data: LibraryRequestAdd, igdb_id):
    if not data.status or not data.game_data:
        log.warning(f"/library/add/{igdb_id} : status_code: 400, Missing library status or game data")
        raise HTTPException(
            status_code=400,
            detail="Missing library status or game data"
        )
    
    formatted_data = format_data(data.status, data.game_data)
    if not formatted_data:
        log.warning(f"/library/add/{igdb_id} : status_code: 400, Unable to format game data")
        raise HTTPException (
            status_code=400,
            detail="Unable to format game data"
        )

    try:
        add_to_library(formatted_data)
    except Exception:
        log.warning(f"/library/add/{igdb_id} : status_code: 500, Failed to add game to library")
        raise HTTPException(
            status_code=500,
            detail="Failed to add game to library"
        )

    log.info("/library/add/{igdb_id} : Successfully added/updated game info into database")
    return {
        "success": True
    }

@app.post("/library/remove/{igdb_id}")
async def remove_from_db(data: LibraryRequestRemove, igdb_id):
    if not data.status or not igdb_id:
        log.warning(f"/library/remove/{igdb_id} : status_code: 400, Missing library status or igdb_id")
        raise HTTPException(
            status_code=400,
            detail="Missing library status or igdb_id"
        )

    # Verify the front end matches the backend end for where the game is located
    library_location = get_library_location(igdb_id)
    if not library_location:
        log.warning(f"/library/remove/{igdb_id} : status_code: 404, Game is not in database")
        raise HTTPException(
            status_code=404,
            detail="Game is not in database"
        )
    if library_location != data.status:
        log.warning(f"/library/remove/{igdb_id} : status_code: 400, The game's library location from database does not match status")
        raise HTTPException(
            status_code=400,
            detail="The game's library location from database does not match status"
        )

    try:
        remove_from_library(igdb_id)
    except Exception:
        log.warning(f"/library/remove/{igdb_id} : status_code: 500, Failed to remove game from database")
        raise HTTPException(
            status_code=500,
            detail="Failed to remove game from database"
        )

    log.info(f"/library/remove/{igdb_id} : Successfully removed game from database")
    return {
        "success": True
    }

@app.get("/library/location/{igdb_id}")
async def grab_game_location(igdb_id):
    if not igdb_id:
        log.warning(f"Missing igdb_id /library/location/{igdb_id}")
        raise HTTPException(
            status_code=400,
            detail="Missing igdb_id"
        )

    library_location = get_library_location(igdb_id)

    log.info(f"/library/location/{igdb_id} : Successfully grabbed game library location : {library_location}")
    return library_location
