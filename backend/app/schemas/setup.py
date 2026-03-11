from pydantic import BaseModel

class CreateCEORequest(BaseModel):
    name: str
    username: str
    password: str