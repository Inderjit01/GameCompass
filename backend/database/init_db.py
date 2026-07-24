import sqlite3
from pathlib import Path

DB_FILE = Path("games.db")

def initialize_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            developer TEXT,
            publisher TEXT,
            release_date TEXT,
            genre TEXT,
            platform TEXT,
            image_url TEXT,
            main_hours REAL DEFAULT 0,
            main_extra_hours REAL DEFAULT 0,
            completionist_hours REAL DEFAULT 0,
            average_hours REAL DEFAULT 0,
            review_score REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_games (
            game_id INTEGER PRIMARY KEY,
            library_status TEXT NOT NULL,
            favorite INTEGER DEFAULT 0,
            enjoyed TEXT DEFAULT "NO",
            personal_rating REAL,
            hours_played REAL,
            added_date TEXT CURRENT_TIMESTAMP,
            completed_date TEXT,
            notes TEXT,

            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)

    conn.commit()
    conn.close()