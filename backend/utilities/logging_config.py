import os, logging, requests
from logging.handlers import RotatingFileHandler

def create_log(name, level=logging.INFO):
    log = logging.getLogger(name)

    if log.handlers:
        return log
    
    log.setLevel(level)

    base_dir = os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )

    log_dir = os.path.join(base_dir, "logs")

    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, f"{name}.log")
    
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5_000_000,
        backupCount=3
    )

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    file_handler.setFormatter(formatter)

    log.addHandler(file_handler)

    return log

def api_errors(e, log, name, game_name):
    if isinstance(e, requests.exceptions.Timeout):
        log.warning(
            f"{name} API timeout searching for game: {game_name}"
        )

    elif isinstance(e, requests.exceptions.HTTPError):
        status_code = e.response.status_code if e.response else "Unknown"
        log.warning(
            f"{name} API returned HTTP error {status_code} searching for game: {game_name}"
        )

    elif isinstance(e, requests.exceptions.RequestException):
        log.warning(
            f"{name} API request exception searching for game: {game_name}. Exception: {e}"
        )