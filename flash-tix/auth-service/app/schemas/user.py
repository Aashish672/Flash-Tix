from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_organizer: bool = False

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
