from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from playwright.async_api import async_playwright
from copy import deepcopy
import asyncio

from database.init_db import initialize_database
from database.database_controller import format_data, add_to_library, remove_from_library, get_library_location, get_games_from_location, update_favorite_status, get_one_game

from caching import build_caches, add_to_game_cache, remove_from_game_cache

from api.igdb import igdb_find_similar_titles, igdb_individual_game_info
from api.steam import get_steam_info, get_steam_price
from api.hltb import get_hltb_info

from api.epic import get_epic_prices
from api.xbox import get_xbox_prices

from scrapers.playstation import get_playstation_prices
from scrapers.nintendo import get_nintendo_prices

from models.library import LibraryRequestAdd, LibraryRequestRemove, LibraryRequestUpdateFavorite

from utilities.logging_config import create_log

log = create_log("FastAPI")

"""
Asynccontextmanager: feature that allows lifespan yield two split what
    runs at startup and when the app exits
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the browser page for scrapping playstation and nintendo
    playwright = await async_playwright().start()

    browser = await playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
            ]
        )

    app.state.playwright = playwright
    app.state.browser = browser

    initialize_database() # creates/checks the database 

    app.state.wishlist_cache = {}
    app.state.backlog_cache = {}

    app.state.cache_task = asyncio.create_task(
        build_caches(app)
    )

    #app.state.wishlist_cache = await create_game_cache(app.state.browser, "wishlist")
    #app.state.backlog_cache = await create_game_cache(app.state.browser, "backlog")

    yield

    await browser.close()
    await playwright.stop()

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

@app.get("/health")
async def health():
    return {"status": "ready"}

# Will get the most similar games. Then user can add to backlog, wishlist, or completed
@app.get("/search")
def search_game(game_title: str, limit: int):
    games = igdb_find_similar_titles(game_title, limit)

    if games is None:
        log.warning(f"/search : status_code: 404, Could not find any games with similar title to {game_title}")
        raise HTTPException(
            status_code=404, 
            detail= f"Could not find any games with similar title to {game_title}")

    log.info(f"/search : Found similar_titles for {game_title}")
    return games

# Displays the individual game page with all the information from RAWG, Steam, and HLTB
@app.get("/games/{igdb_id}")
async def get_game(igdb_id: int):
    ''' --------------------------------------
        1. Get the igdb info about the game
    ------------------------------------------ ''' 
    igdb_results = igdb_individual_game_info(igdb_id)

    if igdb_results is None:
        log.warning(f"/games/{igdb_id} : status_code: 404, Game not found or IGDB unavailable")
        raise HTTPException(
            status_code=404, 
            detail="Game not found or IGDB unavailable"
        )

    # Use igdb game name until we can get the steam game name since the steam name is more accurate
    igdb_game_title = igdb_results.get("game_title", None)
    if not igdb_game_title:
        log.warning(f"/games/{igdb_id} : status_code: 404, Game title not found from IGDB results")
        raise HTTPException(
            status_code=404,
            detail="Game title not found from IGDB results"
        )

    ''' ---------------------------------------------------------------------------------
        2. use igdb_platform to know from which stores to get more info about the game.
            Run those stores at the same time to reduce wait time
    ------------------------------------------------------------------------------------- '''
    # This section is for steam results, hltb, and all stores price
    steam_results, steam_price = None, None
    epic_price = None
    playstation_price = None
    xbox_price = None
    nintendo_price = None

    hltb_results = None

    try:
        if (app.state.backlog_cache is not None and igdb_id in app.state.backlog_cache) or (app.state.wishlist_cache is not None and igdb_id in app.state.wishlist_cache):
            if igdb_id in app.state.backlog_cache:
                game_cache = app.state.backlog_cache[igdb_id]
            else:
                game_cache = app.state.wishlist_cache[igdb_id]

            prices = game_cache.get("prices", {})

            steam_price = prices.get("steam")
            epic_price = prices.get("epic")
            playstation_price = prices.get("playstation")
            xbox_price = prices.get("xbox")
            nintendo_price = prices.get("nintendo")

            steam_results, _ = await get_steam_info(igdb_game_title)
            hltb_results = await get_hltb_info(igdb_game_title)

        else:
            igdb_platforms = igdb_results.get("platforms", None)

            # Start all requests at the same time
            tasks = {}

            if igdb_platforms is not None:            
                # test time is IGBD API with just the individual below API.
                if "PC" in igdb_platforms:
                    # Steam API took 3 seconds
                    tasks["steam"] = get_steam_info(igdb_game_title)
                    # Epic API took 3 seconds
                    tasks["epic"] = get_epic_prices(igdb_game_title)
                
                # Playstation scraping took 5 seconds
                if "Playstation" in igdb_platforms:
                    browser = app.state.browser
                    tasks["playstation"] = get_playstation_prices(browser, igdb_game_title)
                
                # Xbox API took 3 seconds
                if "Xbox" in igdb_platforms:
                    tasks["xbox"] = get_xbox_prices(igdb_game_title)
                
                # Nintendo Scraping took 5 seconds
                if "Nintendo" in igdb_platforms:
                    browser = app.state.browser
                    tasks["nintendo"] = get_nintendo_prices(browser, igdb_game_title)      
            # HLTB API took 2 seconds
            tasks["hltb"] = get_hltb_info(igdb_game_title)
            
            # store all tasks results in here with task type as key and values as results
            results = {}

            # Start the tasks and then create a dictionary for mapping for results
            task_names = list(tasks.keys())

            task_results = await asyncio.gather(
                *tasks.values(),
                return_exceptions=True
            )

            results = dict(zip(task_names, task_results))

            ''' --------------------------------------------------------------
                3. Map the function to the results and look for any failures
            ------------------------------------------------------------------ '''
            # grab the results from tasks. If any failed it will be logged without stopping the rest of the functions
            if "steam" in results:
                if not isinstance(results["steam"], Exception):
                    steam_results, steam_price = results["steam"]
                else:
                    log.error(f'/games/{igdb_id} : Steam request failed: {results["steam"]}')

            if "epic" in results:
                if not isinstance(results["epic"], Exception):
                    epic_price = results["epic"]
                else:
                    log.error(f'/games/{igdb_id} : Epic request failed: {results["epic"]}')

            if "playstation" in results:
                if not isinstance(results["playstation"], Exception):
                    playstation_price = results["playstation"]
                else:
                    log.error(f'/games/{igdb_id} : Playstation request failed: {results["playstation"]}')

            if "xbox" in results:
                if not isinstance(results["xbox"], Exception):
                    xbox_price = results["xbox"]
                else:
                    log.error(f'/games/{igdb_id} : Xbox request failed: {results["xbox"]}')

            if "nintendo" in results:
                if not isinstance(results["nintendo"], Exception):
                    nintendo_price = results["nintendo"]
                else:
                    log.error(f'/games/{igdb_id} : Nintendo request failed: {results["nintendo"]}')

            if not isinstance(results.get("hltb"), Exception):
                hltb_results = results.get("hltb")
            else:
                log.error(f'/games/{igdb_id} : HLTB request failed: {results["hltb"]}')
    except Exception:
        log.exception(f'/games/{igdb_id} : Failed to get store information other than IGDB')
        raise HTTPException (
            status_code=404,
            detail=f'/games/{igdb_id} : Failed to get store information other than IGDB'
        )
    ''' ----------------------------------------------------
        4. Put all the results together for the front end
    -------------------------------------------------------- '''
    log.info(f"/games/{igdb_id} : Found the individual game page with all the information from RAWG, Steam, Playstation, Xbox, Nintendo, and HLTB")
    return {
        "igdb": igdb_results,
        "steam": steam_results,
        "hltb": hltb_results,
        "prices": {
            "steam": steam_price,
            "epic": epic_price,
            "playstation": playstation_price,
            "xbox": xbox_price,
            "nintendo": nintendo_price
        }
    }

# Adds the game to the DB
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

    # Adds the game to the DB
    try:
        add_to_library(formatted_data)
    except Exception:
        log.warning(f"/library/add/{igdb_id} : status_code: 500, Failed to add game to library")
        raise HTTPException(
            status_code=500,
            detail="Failed to add game to library"
        )

    # Updates the local cache to add the new game
    try:
        db_game_info = get_one_game(igdb_id)
        if not db_game_info:
            log.warning(f"/library/add/{igdb_id} : Failed to get DB info for game {igdb_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Failed to get DB info for game {igdb_id}"
            )
        game_prices = data.game_data.get("prices", None)

        if data.status == "wishlist":
            app.state.wishlist_cache = add_to_game_cache(app.state.wishlist_cache, db_game_info, game_prices)
    except Exception:
        log.exception(f"/library/add/{igdb_id} : status_code: 404, Failed to add game to cache")
        raise HTTPException(
            status_code=500,
            detail="Failed to add game to cache"
        )

    log.info(f"/library/add/{igdb_id} : Successfully added/updated game info into database")
    return {
        "success": True
    }

# Removes the game from the DB
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

    # Removes the game from the DB
    try:
        remove_from_library(igdb_id)
    except Exception:
        log.warning(f"/library/remove/{igdb_id} : status_code: 404, Failed to remove game from database")
        raise HTTPException(
            status_code=500,
            detail="Failed to remove game from database"
        )

    # Remove game from the cache
    try:
        if library_location == "wishlist":
            app.state.wishlist_cache = remove_from_game_cache(app.state.wishlist_cache, igdb_id)
    except Exception:
        log.warning(f"/library/remove/{igdb_id} : status_code: 404, Failed to remove game from cache")
        raise HTTPException(
            status_code=500,
            detail="Failed to remove game from cache"
        )

    log.info(f"/library/remove/{igdb_id} : Successfully removed game from database and cache")
    return {
        "success": True
    }

# Updates favorite status for a game
@app.post("/library/update_favorite/{igdb_id}")
async def update_favorite(igdb_id, favorite_data: LibraryRequestUpdateFavorite):
    if not igdb_id or favorite_data is None:
        log.warning(f"/library/update_favorite : status_code: 400, Missing igdb_id or favorite status")
        raise HTTPException(
            status_code=400,
            detail="Missing igdb_id or favorite status"
        )

    try:
        update_favorite_status(igdb_id, favorite_data.favorite)
    except Exception:
        log.warning(f"/library/update_favorite : status_code: 500, Failed to update favorite status in database")
        raise HTTPException(
            status_code=500,
            detail="Failed to update favorite status in database"
        )

    return {
        "success": True
    }

# Checks if the game is already in the DB. If so return the location (backlog, wishlist, or completed)
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

# Grabs all the games that are in the user's backlog
@app.get("/backlog")
async def grab_backlog():
    games = get_games_from_location("backlog")
    if not games:
        log.warning("/backlog : status_code: 404, Failed to grab games that are in the backlog")

    log.info("/backlog: Successfully grabbed games stored to backlog")
    return games

# Grabs all the games that are in the user's wishlist and the prices for those games
@app.get("/wishlist")
async def grab_wishlist():
    games = []

    # Creat a deepcopy so the original cache will not be modifed when edited to wishlist format
    cached_games = deepcopy(app.state.wishlist_cache)

    # If the cache has not finished returned the False status for cache_done to let requester know to try again in a few seconds
    if not cached_games:
        return {
            "games": [],
            "cache_done": app.state.wishlist_cache_done
        }

    # Formatting for wishlist data
    for igdb_id, values in cached_games.items():
        # price variables
        store = None
        always_free = False
        currency = "USD"
        initial_formatted = None
        final_formatted = None
        discount_percent = None

        # subscription variables
        game_pass = False
        playstation_essential = False
        playstation_extra = False
        playstation_premium = False

        # We want to keep prices for only the cheapest store
        prices = values.pop("prices", {}) or {}

        cheapest_price = float("infinity")
        for store, price in prices.items():
            if price is None:
                continue

            # This section checks if the game is part of any subscription
            if store == "playstation":
                playstation_essential = price.get("playstation_essential")
                playstation_extra = price.get("playstation_extra")
                playstation_premium = price.get("playstation_premium")

            elif store == "xbox":
                game_pass = price.get("game_pass")

            # This section does the price comparison and only keeps the cheapest
            formatted_price = price.get("final_formatted")
            if not formatted_price:
                continue

            try:
                current_price = float(formatted_price.replace("$", "").replace("Free", "0"))

                if current_price < cheapest_price:
                    cheapest_price = current_price
                    cheapest_store = store 
                    always_free = price.get("always_free") or price.get("is_free")
                    currency = price.get("currency")
                    initial_formatted = price.get("initial_formatted")
                    final_formatted = price.get("final_formatted")
                    discount_percent = price.get("discount_percent")
            except (ValueError, TypeError) as e:
                log.warning(f"/wishlist : status_code: 404, Failed to convert formatted_price to float: store:{store}, Price:{price} {e}")

        results = values

        # Best Price
        results["cheapest_store"] = cheapest_store
        results["always_free"] = always_free
        results["currency"] = currency
        results["initial_formatted"] = initial_formatted
        results["final_formatted"] = final_formatted
        results["discount_percent"] = discount_percent

        # Game is part of any subscription type
        results["playstation_essential"] = playstation_essential
        results["playstation_extra"] = playstation_extra
        results["playstation_premium"] = playstation_premium
        results["game_pass"] = game_pass

        games.append(values)
    
    return {
        "games": games,
        "cache_done": app.state.wishlist_cache_done
    }
