from fastapi import Depends, HTTPException
from app.core.security import get_current_user
from app.core.database import get_supabase


def require_project_member(project_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    proj = sb.table("projects").select("id, owner_id").eq("id", project_id).single().execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.data["owner_id"] == user["id"]:
        return user
    m = sb.table("project_members").select("user_id").eq("project_id", project_id).eq("user_id", user["id"]).execute()
    if not m.data:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return user


def log_activity(actor_id: str, action: str, project_id: str | None = None,
                 task_id: str | None = None, payload: dict | None = None):
    sb = get_supabase()
    sb.table("activities").insert({
        "actor_id": actor_id,
        "action": action,
        "project_id": project_id,
        "task_id": task_id,
        "payload": payload or {},
    }).execute()
