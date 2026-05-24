import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from datetime import datetime

from app.core.security import get_current_user
from app.core.database import get_supabase
from app.models.project import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    ProjectMemberAdd, ProjectMemberOut,
    ExcelImportResult, ExcelImportFromUrl,
)
from app.api.deps import require_project_member, log_activity
from app.services.excel_import import parse_workbook
from app.services.excel_import_runner import run_excel_import
from app.services.sharepoint_fetch import SharePointFetchError, fetch_excel_from_url

router = APIRouter()


def _hydrate_project(project: dict) -> dict:
    sb = get_supabase()
    members_res = sb.table("project_members").select(
        "user_id, role, users(full_name, email, avatar_url)"
    ).eq("project_id", project["id"]).execute()
    members = []
    for m in members_res.data or []:
        u = m.get("users") or {}
        members.append({
            "user_id": m["user_id"],
            "role": m["role"],
            "full_name": u.get("full_name"),
            "email": u.get("email"),
            "avatar_url": u.get("avatar_url"),
        })
    member_ids = {m["user_id"] for m in members}
    if project["owner_id"] not in member_ids:
        owner = sb.table("users").select("full_name, email, avatar_url").eq("id", project["owner_id"]).execute()
        if owner.data:
            u = owner.data[0]
            members.insert(0, {
                "user_id": project["owner_id"],
                "role": "owner",
                "full_name": u.get("full_name"),
                "email": u.get("email"),
                "avatar_url": u.get("avatar_url"),
            })
    tasks_res = (
        sb.table("tasks")
        .select("id, status")
        .eq("project_id", project["id"])
        .is_("parent_task_id", "null")
        .execute()
    )
    tasks = tasks_res.data or []
    project["members"] = members
    project["task_count"] = len(tasks)
    project["completed_task_count"] = sum(1 for t in tasks if t["status"] == "placed")
    return project


@router.get("/", response_model=list[ProjectOut])
def list_projects(
    status: str | None = Query(None),
    include_archived: bool = Query(False),
    user=Depends(get_current_user),
):
    sb = get_supabase()
    member_rows = sb.table("project_members").select("project_id").eq("user_id", user["id"]).execute()
    member_ids = [r["project_id"] for r in (member_rows.data or [])]
    owned = sb.table("projects").select("*").eq("owner_id", user["id"]).execute()
    owned_ids = {p["id"] for p in (owned.data or [])}
    all_ids = list(set(member_ids) | owned_ids)
    if not all_ids:
        return []
    q = sb.table("projects").select("*").in_("id", all_ids)
    if status:
        q = q.eq("status", status)
    elif not include_archived:
        q = q.neq("status", "archived")
    res = q.order("created_at", desc=True).execute()
    return [_hydrate_project(p) for p in (res.data or [])]


@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, user=Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude={"member_ids"})
    if data.get("start_date"):
        data["start_date"] = data["start_date"].isoformat()
    if data.get("end_date"):
        data["end_date"] = data["end_date"].isoformat()
    data["owner_id"] = user["id"]
    res = sb.table("projects").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create project")
    project = res.data[0]
    # always add owner as member
    members_to_add = {user["id"]: "owner"}
    for uid in payload.member_ids or []:
        if uid != user["id"]:
            members_to_add[uid] = "member"
    if members_to_add:
        sb.table("project_members").upsert([
            {"project_id": project["id"], "user_id": uid, "role": role}
            for uid, role in members_to_add.items()
        ]).execute()
    log_activity(user["id"], "project.created", project_id=project["id"], payload={"name": project["name"]})
    return _hydrate_project(project)


def _parse_member_ids(member_ids: str | None) -> list[str]:
    if not member_ids:
        return []
    try:
        parsed = json.loads(member_ids)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="member_ids mora biti JSON niz")
    return []


def _import_parsed_sheets(
    sheets_data: list[dict],
    user: dict,
    extra_members: list[str],
    *,
    source: str = "excel",
    source_url: str | None = None,
) -> ExcelImportResult:
    if not sheets_data:
        raise HTTPException(
            status_code=400,
            detail="Nema podataka za uvoz. Svaki sheet treba imati zaglavlje u prvom redu i zadatke ispod.",
        )
    sb = get_supabase()
    try:
        return run_excel_import(
            sb, sheets_data, user, extra_members,
            source=source, source_url=source_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/import-excel", response_model=ExcelImportResult)
async def import_excel(
    file: UploadFile = File(...),
    member_ids: str | None = Form(None),
    user=Depends(get_current_user),
):
    """Svaki sheet = projekat; prva kolona = naziv zadatka; ostale kolone = opis."""
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Podržani formati: .xlsx, .xlsm i .xls",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Datoteka je prazna")
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datoteka je prevelika (maks. 10 MB)")

    try:
        sheets_data = parse_workbook(raw, filename=file.filename)
    except Exception:
        raise HTTPException(status_code=400, detail="Excel datoteka nije valjana ili je oštećena")

    extra_members = _parse_member_ids(member_ids)
    return _import_parsed_sheets(sheets_data, user, extra_members)


@router.post("/import-excel-url", response_model=ExcelImportResult)
async def import_excel_url(payload: ExcelImportFromUrl, user=Depends(get_current_user)):
    """Uvoz iz Excel tabele na Teams / SharePoint (javni link za pregled)."""
    url = str(payload.url)
    try:
        raw, filename = fetch_excel_from_url(url)
    except SharePointFetchError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        sheets_data = parse_workbook(raw, filename=filename)
    except Exception:
        raise HTTPException(status_code=400, detail="Excel datoteka nije valjana ili je oštećena")

    return _import_parsed_sheets(
        sheets_data, user, payload.member_ids,
        source="sharepoint", source_url=url,
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, user=Depends(require_project_member)):
    sb = get_supabase()
    res = sb.table("projects").select("*").eq("id", project_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return _hydrate_project(res.data)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, user=Depends(require_project_member)):
    sb = get_supabase()
    data = payload.model_dump(exclude_unset=True)
    for k in ("start_date", "end_date"):
        if k in data and data[k] is not None and hasattr(data[k], "isoformat"):
            data[k] = data[k].isoformat()
    data["updated_at"] = datetime.utcnow().isoformat()
    res = sb.table("projects").update(data).eq("id", project_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    log_activity(user["id"], "project.updated", project_id=project_id, payload=data)
    return _hydrate_project(res.data[0])


@router.post("/{project_id}/archive", response_model=ProjectOut)
def archive_project(project_id: str, user=Depends(require_project_member)):
    sb = get_supabase()
    res = sb.table("projects").update({"status": "archived"}).eq("id", project_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    log_activity(user["id"], "project.archived", project_id=project_id)
    return _hydrate_project(res.data[0])


@router.post("/{project_id}/unarchive", response_model=ProjectOut)
def unarchive_project(project_id: str, user=Depends(require_project_member)):
    sb = get_supabase()
    res = sb.table("projects").update({"status": "active"}).eq("id", project_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    log_activity(user["id"], "project.unarchived", project_id=project_id)
    return _hydrate_project(res.data[0])


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    proj = sb.table("projects").select("owner_id").eq("id", project_id).single().execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.data["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    sb.table("projects").delete().eq("id", project_id).execute()
    return None


# ---- Members ----

@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def list_members(project_id: str, user=Depends(require_project_member)):
    sb = get_supabase()
    res = sb.table("project_members").select(
        "user_id, role, users(full_name, email, avatar_url)"
    ).eq("project_id", project_id).execute()
    out = []
    for m in res.data or []:
        u = m.get("users") or {}
        out.append({
            "user_id": m["user_id"], "role": m["role"],
            "full_name": u.get("full_name"), "email": u.get("email"),
            "avatar_url": u.get("avatar_url"),
        })
    return out


@router.post("/{project_id}/members", response_model=ProjectMemberOut, status_code=201)
def add_member(project_id: str, payload: ProjectMemberAdd, user=Depends(require_project_member)):
    sb = get_supabase()
    sb.table("project_members").upsert({
        "project_id": project_id, "user_id": payload.user_id, "role": payload.role,
    }).execute()
    u = sb.table("users").select("full_name, email, avatar_url").eq("id", payload.user_id).single().execute()
    log_activity(user["id"], "project.member_added", project_id=project_id,
                 payload={"user_id": payload.user_id, "role": payload.role})
    ud = u.data or {}
    return {"user_id": payload.user_id, "role": payload.role, **ud}


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(project_id: str, user_id: str, user=Depends(require_project_member)):
    sb = get_supabase()
    sb.table("project_members").delete().eq("project_id", project_id).eq("user_id", user_id).execute()
    log_activity(user["id"], "project.member_removed", project_id=project_id, payload={"user_id": user_id})
    return None
