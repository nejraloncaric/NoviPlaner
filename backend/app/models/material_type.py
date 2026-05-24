from datetime import datetime
from pydantic import BaseModel, Field


class MaterialTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    is_print: bool = True


class MaterialTypeUpdate(BaseModel):
    name: str | None = None
    is_print: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class MaterialTypeOut(BaseModel):
    id: str
    name: str
    is_print: bool
    sort_order: int
    is_active: bool
    created_at: datetime | None = None
