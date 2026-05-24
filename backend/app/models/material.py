from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class MaterialLinkCreate(BaseModel):
    project_id: str
    task_id: str | None = None
    title: str = Field(min_length=1, max_length=300)
    url: HttpUrl


class MaterialOut(BaseModel):
    id: str
    project_id: str
    task_id: str | None = None
    uploader_id: str
    uploader_name: str | None = None
    file_name: str
    storage_path: str | None = None
    external_url: str | None = None
    is_link: bool = False
    mime_type: str | None = None
    size_bytes: int | None = None
    download_url: str | None = None
    created_at: datetime | None = None
