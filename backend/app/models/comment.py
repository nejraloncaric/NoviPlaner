from datetime import datetime
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    task_id: str
    content: str = Field(min_length=1)
    mentions: list[str] = []


class CommentOut(BaseModel):
    id: str
    task_id: str
    author_id: str
    author_name: str | None = None
    author_avatar: str | None = None
    content: str
    mentions: list[str] = []
    created_at: datetime | None = None
