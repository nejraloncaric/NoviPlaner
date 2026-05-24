from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.material_type import MaterialTypeCreate, MaterialTypeUpdate, MaterialTypeOut

router = APIRouter()


@router.get("/", response_model=list[MaterialTypeOut])
def list_material_types(
    active_only: bool = Query(True),
    user=Depends(get_current_user),
):
    sb = get_supabase()
    q = sb.table("material_types").select("*")
    if active_only:
        q = q.eq("is_active", True)
    res = q.order("sort_order").order("name").execute()
    return res.data or []


@router.post("/", response_model=MaterialTypeOut, status_code=201)
def create_material_type(payload: MaterialTypeCreate, user=Depends(get_current_user)):
    sb = get_supabase()
    name = payload.name.strip()
    existing = (
        sb.table("material_types")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Materijal s tim nazivom već postoji")

    max_sort = sb.table("material_types").select("sort_order").order("sort_order", desc=True).limit(1).execute()
    sort_order = (max_sort.data[0]["sort_order"] + 10) if max_sort.data else 10

    res = sb.table("material_types").insert({
        "name": name,
        "is_print": payload.is_print,
        "sort_order": sort_order,
        "is_active": True,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Materijal nije kreiran")
    return res.data[0]


@router.patch("/{type_id}", response_model=MaterialTypeOut)
def update_material_type(
    type_id: str,
    payload: MaterialTypeUpdate,
    user=Depends(get_current_user),
):
    sb = get_supabase()
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    res = sb.table("material_types").update(data).eq("id", type_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Materijal nije pronađen")
    return res.data[0]


@router.delete("/{type_id}", status_code=204)
def deactivate_material_type(type_id: str, user=Depends(get_current_user)):
    """Soft delete — skriva iz izbora pri kreiranju zadatka."""
    sb = get_supabase()
    res = sb.table("material_types").update({"is_active": False}).eq("id", type_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Materijal nije pronađen")
    return None
