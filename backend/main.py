from fastapi import FastAPI
from contextlib import asynccontextmanager

from database.init_db import initialize_database

"""
Asynccontextmanager: feature that allows lifespan yield two split what
    runs at startup and when the app exits
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database() # creates/checks the database 
    yield

app = FastAPI(lifespan=lifespan)
