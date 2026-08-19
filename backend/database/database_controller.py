import sqlite3
from pathlib import Path
from utilities.pathing import grab_db_path

DB_FILE = grab_db_path()

def _create_connection():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    return conn, cur

def update_db(data):
    pass

def add_to_db(data):
    conn, cur = _create_connection()

    cur.execute('''
        INSERT INTO games (igdb_id, name) VALUES (?, ?)
    ''', (243534, "test game"))

    conn.commit()
    cur.close()
