import os
from pathlib import Path

def _app_path():
    local_app_data = Path(os.environ["LOCALAPPDATA"])
    app_dir = local_app_data / "GameCompass"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir

def grab_db_path():
    app_dir = _app_path()

    return app_dir / "games.db"

def grab_log_path():
    app_dir = _app_path()

    log_dir = app_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    return log_dir