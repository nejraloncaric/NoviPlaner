from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, HttpUrl

ProjectStatus = Literal["active", "archived", "completed"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    member_ids: list[str] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: ProjectStatus | None = None


class ProjectMemberAdd(BaseModel):
    user_id: str
    role: Literal["owner", "manager", "member"] = "member"


class ProjectMemberOut(BaseModel):
    user_id: str
    role: str
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: ProjectStatus
    owner_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    members: list[ProjectMemberOut] = []
    task_count: int = 0
    completed_task_count: int = 0


class ExcelImportSheetResult(BaseModel):
    sheet_name: str
    project_id: str
    project_name: str
    tasks_created: int
    skipped_rows: int = 0


class ExcelImportResult(BaseModel):
    sheets: list[ExcelImportSheetResult] = []
    total_projects: int = 0
    total_tasks: int = 0


class ExcelImportFromUrl(BaseModel):
    url: HttpUrl
    member_ids: list[str] = []
