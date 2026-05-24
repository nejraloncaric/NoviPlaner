from datetime import date, datetime
from pydantic import BaseModel, Field


class TaskMaterialItemCreate(BaseModel):
    material_type_id: str
    dimensions_format: str = Field(min_length=1, max_length=500)
    quantity: str = Field(min_length=1, max_length=200)
    visual_content: str = Field(min_length=1, max_length=5000)
    print_shop: str | None = Field(default=None, max_length=300)
    installation_deadline: date | None = None
    other_notes: str | None = Field(default=None, max_length=2000)


class TaskMaterialItemOut(BaseModel):
    id: str
    task_id: str
    material_type_id: str
    material_type_name: str | None = None
    is_print: bool = True
    dimensions_format: str
    quantity: str
    visual_content: str
    print_shop: str | None = None
    installation_deadline: date | None = None
    other_notes: str | None = None
    sort_order: int = 0
    created_at: datetime | None = None
