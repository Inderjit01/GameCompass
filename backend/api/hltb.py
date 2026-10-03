import sys, os
from howlongtobeatpy import HowLongToBeat
import asyncio

# Need sys.path.append if running file independently
# This is to allow the script to use utilities
if not getattr(sys, 'frozen', False):
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utilities.logging_config import create_log, api_errors

log = create_log("hltb")

# hltb library scraps the offical website for how long a game is
def get_hltb_info(game_name):
    try:
        results = HowLongToBeat().search(game_name)

        if not results or len(results) == 0:
            log.warning(f"get_hltb_info : Returned None for HLTB. HLTB package most likely needs to be updated. : {game_name}")
            return None

        main_story = getattr(results[0], "main_story", None)
        if main_story:
            main_story = round(main_story)

        main_extra = getattr(results[0], "main_extra", None)
        if main_extra:
            main_extra = round(main_extra)

        completionist = getattr(results[0], "completionist", None)
        all_styles = getattr(results[0], "all_styles", None)

        results =  {
            "main_story": main_story,
            "main_extra": main_extra,
            "completionist": completionist,
            "all_styles": all_styles
        }

        log.info(f"get_hltb_info: Successfully grabbed hltb for {game_name}: {results}")

        return results
    except Exception as e:
        api_errors(e, log, "HLTB", game_name)
        return None

# For testing
def main():
    print((get_hltb_info("Stellar Blade")))

if __name__ == "__main__":
    main()