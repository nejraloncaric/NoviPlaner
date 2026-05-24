from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.user import UserOut, UserUpdate

router = APIRouter()


def _safe_search_term(q: str) -> str:
    """Izbjegni lomljenje PostgREST .or_ filtera."""
    return q.replace(",", " ").replace("%", "").strip()[:80]


@router.get("/", response_model=list[UserOut])
def list_users(q: str | None = None, user=Depends(get_current_user)):
    sb = get_supabase()
    query = sb.table("users").select("id, email, full_name, avatar_url, created_at")
    if q:
        term = _safe_search_term(q)
        if term:
            query = query.or_(f"email.ilike.%{term}%,full_name.ilike.%{term}%")
    res = query.order("full_name").limit(50).execute()
    return res.data or []


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("users").select("id, email, full_name, avatar_url, created_at").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user=Depends(get_current_user)):
    sb = get_supabase()
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return user
    res = sb.table("users").update(data).eq("id", user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Update failed")
    row = res.data[0]
    return {k: row.get(k) for k in ("id", "email", "full_name", "avatar_url", "created_at")}
