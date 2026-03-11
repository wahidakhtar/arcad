from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    username: str
    password: str
