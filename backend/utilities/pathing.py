import os, sys
from pathlib import Path

# app is at /appdata/local/gamecompass
def _app_path():
    local_app_data = Path(os.environ["LOCALAPPDATA"])
    app_dir = local_app_data / "GameCompass"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir

# DB is at /appdata/local/gamecompass/games.db
def grab_db_path():
    app_dir = _app_path()

    return app_dir / "games.db"

# logs are at /appdata/local/gamecompass/logs
def grab_log_path():
    app_dir = _app_path()

    log_dir = app_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    return log_dir

# Pathing to allow api scripts to get api keys from .env
# This pathing depends on whether python is running in development or exe version
def grab_env_path():
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)

    return Path(__file__).resolve().parent.parent