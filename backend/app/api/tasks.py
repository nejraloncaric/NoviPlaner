from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime

from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.task import TaskCreate, TaskUpdate, TaskOut, TaskMove
from app.api.deps import require_project_member, log_activity
from app.services.task_materials import (
    validate_material_items,
    insert_task_material_items,
    load_task_material_items,
)

router = APIRouter()


def _list_board_tasks(sb, project_id: str, status: str) -> list[dict]:
    """Top-level Kanban tasks in one column, ordered."""
    res = (
        sb.table("tasks")
        .select("id, position")
        .eq("project_id", project_id)
        .eq("status", status)
        .is_("parent_task_id", "null")
        .order("position")
        .order("created_at")
        .execute()
    )
    return res.data or []


def _set_board_positions(sb, project_id: str, status: str, ordered_ids: list[str]) -> None:
    now = datetime.utcnow().isoformat()
    for idx, tid in enumerate(ordered_ids):
        sb.table("tasks").update({"position": idx, "updated_at": now}).eq("id", tid).execute()


def _reorder_on_board(sb, project_id: str, task_id: str, from_status: str, to_status: str, to_index: int) -> dict:
    """Premjesti zadatak i normalizuj position u koloni(ama)."""
    target = _list_board_tasks(sb, project_id, to_status)
    target_ids = [t["id"] for t in target if t["id"] != task_id]
    to_index = max(0, min(to_index, len(target_ids)))
    target_ids.insert(to_index, task_id)

    now = datetime.utcnow().isoformat()
    sb.table("tasks").update({
        "status": to_status,
        "position": to_index,
        "updated_at": now,
    }).eq("id", task_id).execute()
    _set_board_positions(sb, project_id, to_status, target_ids)

    if from_status != to_status:
        source = _list_board_tasks(sb, project_id, from_status)
        source_ids = [t["id"] for t in source if t["id"] != task_id]
        _set_board_positions(sb, project_id, from_status, source_ids)

    res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return res.data


def _hydrate_task(task: dict, with_subtasks: bool = True) -> dict:
    sb = get_supabase()
    if task.get("assignee_id"):
        u = sb.table("users").select("full_name, avatar_url").eq("id", task["assignee_id"]).execute()
        if u.data:
            task["assignee_name"] = u.data[0].get("full_name")
            task["assignee_avatar"] = u.data[0].get("avatar_url")
    c = sb.table("comments").select("id", count="exact").eq("task_id", task["id"]).execute()
    task["comments_count"] = c.count or 0
    m = sb.table("materials").select("id", count="exact").eq("task_id", task["id"]).execute()
    task["materials_count"] = m.count or 0
    if with_subtasks:
        subs = (
            sb.table("tasks")
            .select("*")
            .eq("parent_task_id", task["id"])
            .order("position")
            .order("created_at")
            .execute()
        )
        task["subtasks"] = [_hydrate_task(s, with_subtasks=False) for s in (subs.data or [])]
    else:
        task["subtasks"] = []
    if not task.get("parent_task_id"):
        task["material_items"] = load_task_material_items(sb, task["id"])
    else:
        task["material_items"] = []
    return task


@router.get("/", response_model=list[TaskOut])
def list_tasks(
    project_id: str = Query(...),
    status: str | None = None,
    assignee_id: str | None = None,
    priority: str | None = None,
    q: str | None = None,
    user=Depends(get_current_user),
):
    # member check
    require_project_member(project_id=project_id, user=user)
    sb = get_supabase()
    query = sb.table("tasks").select("*").eq("project_id", project_id).is_("parent_task_id", "null")
    if status:
        query = query.eq("status", status)
    if assignee_id:
        query = query.eq("assignee_id", assignee_id)
    if priority:
        query = query.eq("priority", priority)
    if q:
        query = query.ilike("title", f"%{q}%")
    res = query.order("position").order("created_at").execute()
    return [_hydrate_task(t) for t in (res.data or [])]


@router.post("/", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, user=Depends(get_current_user)):
    require_project_member(project_id=payload.project_id, user=user)
    sb = get_supabase()
    material_items = payload.material_items or []
    data = payload.model_dump(exclude={"material_items"})
    if data.get("due_date"):
        data["due_date"] = data["due_date"].isoformat()
    data["creator_id"] = user["id"]

    if not data.get("parent_task_id"):
        types_res = (
            sb.table("material_types")
            .select("id, name, is_active, is_print")
            .eq("is_active", True)
            .execute()
        )
        type_by_id = {t["id"]: t for t in (types_res.data or [])}
        validate_material_items(material_items, type_by_id)
        if not payload.due_date:
            raise HTTPException(
                status_code=400,
                detail="Unesite rok dostave (datum zadatka)",
            )
    elif material_items:
        raise HTTPException(status_code=400, detail="Podzadaci ne podržavaju stavke materijala")

    if data.get("parent_task_id"):
        parent = (
            sb.table("tasks")
            .select("project_id")
            .eq("id", data["parent_task_id"])
            .single()
            .execute()
        )
        if not parent.data or parent.data["project_id"] != payload.project_id:
            raise HTTPException(status_code=400, detail="Nevažeći podzadatak za ovaj projekat")

    # Podzadaci = checklista (bez Kanban statusa u UI)
    if data.get("parent_task_id"):
        data["status"] = "design"
        data["priority"] = "medium"
    # determine position (last in column or among subtasks)
    if data.get("parent_task_id"):
        existing = (
            sb.table("tasks")
            .select("position")
            .eq("project_id", payload.project_id)
            .eq("parent_task_id", data["parent_task_id"])
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
    else:
        existing = (
            sb.table("tasks")
            .select("position")
            .eq("project_id", payload.project_id)
            .eq("status", payload.status)
            .is_("parent_task_id", "null")
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
    pos = 0
    if existing.data:
        pos = (existing.data[0]["position"] or 0) + 1
    data["position"] = pos
    res = sb.table("tasks").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create task")
    task = res.data[0]

    if material_items and not task.get("parent_task_id"):
        try:
            insert_task_material_items(sb, task["id"], material_items)
        except Exception:
            sb.table("tasks").delete().eq("id", task["id"]).execute()
            raise HTTPException(
                status_code=400,
                detail="Stavke materijala nisu sačuvane. Provjerite SQL migraciju u Supabase.",
            )

    action = "task.subtask_created" if task.get("parent_task_id") else "task.created"
    log_activity(
        user["id"], action,
        project_id=payload.project_id,
        task_id=task["parent_task_id"] if task.get("parent_task_id") else task["id"],
        payload={"title": task["title"], "subtask_id": task["id"]} if task.get("parent_task_id") else {"title": task["title"]},
    )
    return _hydrate_task(task, with_subtasks=not bool(task.get("parent_task_id")))


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=res.data["project_id"], user=user)
    return _hydrate_task(res.data)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    sb = get_supabase()
    existing = sb.table("tasks").select("*").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=existing.data["project_id"], user=user)
    # exclude_unset=True: šalje samo polja koja su explicitno poslana u requestu
    # (uključuje i null — npr. assignee_id=null znači "ukloni izvršioca")
    data = payload.model_dump(exclude_unset=True)
    if "due_date" in data and data["due_date"] is not None and hasattr(data["due_date"], "isoformat"):
        data["due_date"] = data["due_date"].isoformat()
    data["updated_at"] = datetime.utcnow().isoformat()
    res = sb.table("tasks").update(data).eq("id", task_id).execute()
    row = res.data[0] if res.data else None
    if not row:
        refetch = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not refetch.data:
            raise HTTPException(status_code=404, detail="Task not found")
        row = refetch.data
    action = "task.updated"
    if "status" in data and data["status"] != existing.data["status"]:
        action = "task.status_changed"
    log_activity(user["id"], action, project_id=existing.data["project_id"],
                 task_id=task_id, payload={k: str(v) for k, v in data.items() if k != "updated_at"})
    return _hydrate_task(row)


@router.post("/{task_id}/move", response_model=TaskOut)
def move_task(task_id: str, payload: TaskMove, user=Depends(get_current_user)):
    """Drag-and-drop move: promijeni status (kolonu) i poziciju."""
    sb = get_supabase()
    existing = sb.table("tasks").select("*").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=existing.data["project_id"], user=user)
    if existing.data.get("parent_task_id"):
        raise HTTPException(status_code=400, detail="Podzadaci se ne mogu premještati na Kanbanu")
    from_status = existing.data["status"]
    task = _reorder_on_board(
        sb, existing.data["project_id"], task_id, from_status, payload.status, payload.position
    )
    log_activity(user["id"], "task.moved", project_id=existing.data["project_id"],
                 task_id=task_id, payload={"from": from_status, "to": payload.status})
    return _hydrate_task(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    existing = sb.table("tasks").select("project_id, title").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=existing.data["project_id"], user=user)
    # VAŽNO: log_activity PRIJE delete — FK constraint zabranjuje referencu na obrisani task
    log_activity(user["id"], "task.deleted", project_id=existing.data["project_id"],
                 task_id=task_id, payload={"title": existing.data.get("title", "")})
    sb.table("tasks").delete().eq("id", task_id).execute()
    return None
