from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.comment import CommentCreate, CommentOut
from app.api.deps import require_project_member, log_activity

router = APIRouter()


def _hydrate_comment(c: dict) -> dict:
    sb = get_supabase()
    u = sb.table("users").select("full_name, avatar_url").eq("id", c["author_id"]).execute()
    if u.data:
        c["author_name"] = u.data[0].get("full_name")
        c["author_avatar"] = u.data[0].get("avatar_url")
    return c


@router.get("/", response_model=list[CommentOut])
def list_comments(task_id: str = Query(...), user=Depends(get_current_user)):
    sb = get_supabase()
    t = sb.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not t.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=t.data["project_id"], user=user)
    res = sb.table("comments").select("*").eq("task_id", task_id).order("created_at").execute()
    return [_hydrate_comment(c) for c in (res.data or [])]


@router.post("/", response_model=CommentOut, status_code=201)
def create_comment(payload: CommentCreate, user=Depends(get_current_user)):
    sb = get_supabase()
    t = sb.table("tasks").select("project_id").eq("id", payload.task_id).single().execute()
    if not t.data:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(project_id=t.data["project_id"], user=user)
    res = sb.table("comments").insert({
        "task_id": payload.task_id,
        "author_id": user["id"],
        "content": payload.content,
        "mentions": payload.mentions or [],
    }).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create comment")
    comment = res.data[0]
    log_activity(user["id"], "comment.created",
                 project_id=t.data["project_id"], task_id=payload.task_id,
                 payload={"mentions": payload.mentions})
    return _hydrate_comment(comment)


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    existing = sb.table("comments").select("author_id, task_id").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Comment not found")
    if existing.data["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only author can delete")
    sb.table("comments").delete().eq("id", comment_id).execute()
    return None
