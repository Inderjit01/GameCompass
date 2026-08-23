import sqlite3
from pathlib import Path
from utilities.pathing import grab_db_path

DB_FILE = grab_db_path()

def initialize_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            igdb_id INTEGER UNIQUE NOT NULL,
            game_title TEXT NOT NULL,
            description TEXT,
            developers TEXT,
            publishers TEXT,
            release_date TEXT,
            genres TEXT,
            platforms TEXT,
            image_url TEXT,
            review_score REAL,
            main_story REAL,
            main_extra REAL,
            completionist REAL,
            all_styles REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_games (
            user_game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            igdb_id INTEGER UNIQUE NOT NULL,
            library_status TEXT NOT NULL,
            favorite INTEGER DEFAULT 0,
            user_score TEXT,
            hours_played REAL,
            added_date TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_date TEXT,
            notes TEXT,

            FOREIGN KEY (igdb_id) REFERENCES games(igdb_id)
        )
    """)

    conn.commit()
    conn.close()