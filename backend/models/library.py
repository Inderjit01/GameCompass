from typing import Any
from pydantic import BaseModel

class LibraryRequestAdd(BaseModel):
    status: str
    game_data: dict[str, Any]

class LibraryRequestRemove(BaseModel):
    status: str