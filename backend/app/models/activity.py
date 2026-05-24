from datetime import datetime
from typing import Any
from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: str
    project_id: str | None = None
    task_id: str | None = None
    actor_id: str
    actor_name: str | None = None
    action: str
    payload: dict[str, Any] = {}
    created_at: datetime | None = None
