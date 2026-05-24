from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.activity import ActivityOut
from app.api.deps import require_project_member

router = APIRouter()


@router.get("/", response_model=list[ActivityOut])
def list_activities(
    project_id: str | None = Query(None),
    task_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    user=Depends(get_current_user),
):
    sb = get_supabase()
    if not project_id and not task_id:
        raise HTTPException(status_code=400, detail="project_id or task_id required")
    if task_id and not project_id:
        t = sb.table("tasks").select("project_id").eq("id", task_id).single().execute()
        if not t.data:
            raise HTTPException(status_code=404, detail="Task not found")
        project_id = t.data["project_id"]
    if project_id:
        require_project_member(project_id=project_id, user=user)
    q = sb.table("activities").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    if task_id:
        q = q.eq("task_id", task_id)
    res = q.order("created_at", desc=True).limit(limit).execute()
    activities = res.data or []
    # hydrate actor names
    actor_ids = list({a["actor_id"] for a in activities})
    names = {}
    if actor_ids:
        u = sb.table("users").select("id, full_name").in_("id", actor_ids).execute()
        names = {row["id"]: row["full_name"] for row in (u.data or [])}
    for a in activities:
        a["actor_name"] = names.get(a["actor_id"])
    return activities
