from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Any

from database.init_db import initialize_database
from api.rawg import rawg_find_similar_titles, rawg_individual_game_info
from api.igdb import igdb_find_similar_titles, igdb_individual_game_info
from api.steam import get_steam_info
from api.hltb import get_hltb_info

import asyncio

"""
Asynccontextmanager: feature that allows lifespan yield two split what
    runs at startup and when the app exits
"""

class LibraryRequest(BaseModel):
    status: str
    game: dict[str, Any]

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
        raise HTTPException(status_code=404, detail= "Games not found from IGDB")

    return games

# Displays the individual game page with all the information from RAWG, Steam, and HLTB
@app.get("/games/{igdb_id}")
async def get_game(igdb_id: int):
    igdb_results = igdb_individual_game_info(igdb_id)

    if igdb_results is None:
        raise HTTPException(status_code=404, detail="Game not found or IGDB unavailable")
        return None

    # Use rawg game name until we can get the steam game name since the steam name is more accurate
    igdb_game_name = igdb_results.get("game_title", None)
    if not igdb_game_name:
        return None

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

@app.post("/library")
async def edit_database(data: LibraryRequest):
    print("This is the data: ", data)
    return {
        "success": True
    }