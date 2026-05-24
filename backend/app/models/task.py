from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field

from app.models.task_material import TaskMaterialItemCreate, TaskMaterialItemOut

TaskStatus = Literal[
    "design",
    "approval",
    "sent_to_print",
    "ready_pickup",
    "placed",
]
TaskPriority = Literal["low", "medium", "high", "urgent"]


class TaskCreate(BaseModel):
    project_id: str
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    notes: str | None = None
    status: TaskStatus = "design"
    priority: TaskPriority = "medium"
    assignee_id: str | None = None
    due_date: date | None = None
    parent_task_id: str | None = None
    material_items: list[TaskMaterialItemCreate] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    notes: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: str | None = None
    due_date: date | None = None
    position: int | None = None


class TaskMove(BaseModel):
    status: TaskStatus
    position: int = 0


class TaskOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None = None
    notes: str | None = None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: str | None = None
    assignee_name: str | None = None
    assignee_avatar: str | None = None
    creator_id: str
    due_date: date | None = None
    position: int = 0
    parent_task_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    subtasks: list["TaskOut"] = []
    comments_count: int = 0
    materials_count: int = 0
    material_items: list[TaskMaterialItemOut] = []


TaskOut.model_rebuild()
