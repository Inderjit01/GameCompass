import requests, sys, os
from howlongtobeatpy import HowLongToBeat
import asyncio

from utilities.logging_config import create_log, api_errors

log = create_log("hltb")

# hltb library scraps the offical website for how long a game is
async def get_hltb_info(game_name):
    try:
        results = await HowLongToBeat().async_search(game_name)

        if not results or len(results) == 0:
            return None

        main_story = getattr(results[0], "main_story", None)
        if main_story:
            main_story = round(main_story)

        main_extra = getattr(results[0], "main_extra", None)
        if main_extra:
            main_extra = round(main_extra)

        completionist = getattr(results[0], "completionist", None)
        all_styles = getattr(results[0], "all_styles", None)

        return {
            "main_story": main_story,
            "main_extra": main_extra,
            "completionist": completionist,
            "all_styles": all_styles
        }
    except Exception as e:
        api_errors(e, log, "HLTB", game_name)
        return None