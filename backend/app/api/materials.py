import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
import io

from app.core.security import get_current_user
from app.core.database import get_supabase
from app.core.config import settings
from app.models.material import MaterialOut, MaterialLinkCreate
from app.api.deps import require_project_member, log_activity

router = APIRouter()


def _require_task_in_project(sb, task_id: str, project_id: str) -> None:
    res = sb.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not res.data or res.data["project_id"] != project_id:
        raise HTTPException(status_code=400, detail="Zadatak ne pripada ovom projektu")


def _get_signed_url(storage_path: str) -> str | None:
    """Vrati signed URL kompatibilan sa supabase-py >= 2.11."""
    try:
        sb = get_supabase()
        result = sb.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(storage_path, 3600)
        # storage3 2.x vraća TypedDict: {"signedUrl": "...", "signedURL": "..."}
        if isinstance(result, dict):
            return result.get("signedUrl") or result.get("signedURL") or result.get("signed_url")
        # Ako je objekat (starija verzija)
        return getattr(result, "signed_url", None) or getattr(result, "signedUrl", None)
    except Exception:
        return None


def _hydrate_material(m: dict) -> dict:
    sb = get_supabase()
    u = sb.table("users").select("full_name").eq("id", m["uploader_id"]).execute()
    if u.data:
        m["uploader_name"] = u.data[0].get("full_name")
    external = m.get("external_url")
    if external:
        m["is_link"] = True
        m["download_url"] = external
    else:
        m["is_link"] = False
        path = m.get("storage_path")
        m["download_url"] = _get_signed_url(path) if path else None
    return m


@router.get("/", response_model=list[MaterialOut])
def list_materials(
    project_id: str = Query(...),
    task_id: str | None = None,
    user=Depends(get_current_user),
):
    require_project_member(project_id=project_id, user=user)
    sb = get_supabase()
    q = sb.table("materials").select("*").eq("project_id", project_id)
    if task_id:
        q = q.eq("task_id", task_id)
    res = q.order("created_at", desc=True).execute()
    return [_hydrate_material(m) for m in (res.data or [])]


@router.post("/upload", response_model=MaterialOut, status_code=201)
async def upload_material(
    project_id: str = Form(...),
    task_id: str | None = Form(None),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    require_project_member(project_id=project_id, user=user)
    sb = get_supabase()
    if task_id:
        _require_task_in_project(sb, task_id, project_id)
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Fajl je prazan")

    # Sigurno ime fajla
    safe_name = (file.filename or "file").replace("/", "_").replace("\\", "_")
    storage_path = f"{project_id}/{uuid.uuid4()}_{safe_name}"
    content_type = file.content_type or "application/octet-stream"

    try:
        sb.storage.from_(settings.SUPABASE_BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": content_type},
        )
    except Exception as e:
        err_str = str(e)
        # Ako bucket nije pronađen - jasna poruka
        if "Bucket not found" in err_str or "404" in err_str:
            raise HTTPException(
                status_code=500,
                detail=f"Storage bucket '{settings.SUPABASE_BUCKET}' ne postoji. "
                       "Kreiraj ga u Supabase Studio → Storage."
            )
        raise HTTPException(status_code=500, detail=f"Upload nije uspio: {err_str}")

    insert = sb.table("materials").insert({
        "project_id": project_id,
        "task_id": task_id if task_id else None,
        "uploader_id": user["id"],
        "file_name": file.filename or safe_name,
        "storage_path": storage_path,
        "mime_type": content_type,
        "size_bytes": len(content),
    }).execute()

    if not insert.data:
        # Pokušaj obrisati već uploadovani fajl ako insert nije uspio
        try:
            sb.storage.from_(settings.SUPABASE_BUCKET).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Nije moguće sačuvati zapis o fajlu")

    log_activity(user["id"], "material.uploaded", project_id=project_id, task_id=task_id,
                 payload={"file_name": file.filename})
    return _hydrate_material(insert.data[0])


@router.post("/link", response_model=MaterialOut, status_code=201)
def create_material_link(payload: MaterialLinkCreate, user=Depends(get_current_user)):
    """Spremi eksterni link (npr. Teams / SharePoint) uz prikazno ime."""
    require_project_member(project_id=payload.project_id, user=user)
    sb = get_supabase()
    if payload.task_id:
        _require_task_in_project(sb, payload.task_id, payload.project_id)
    url = str(payload.url)
    insert = sb.table("materials").insert({
        "project_id": payload.project_id,
        "task_id": payload.task_id if payload.task_id else None,
        "uploader_id": user["id"],
        "file_name": payload.title.strip(),
        "storage_path": None,
        "external_url": url,
        "mime_type": "application/link",
        "size_bytes": None,
    }).execute()
    if not insert.data:
        raise HTTPException(status_code=500, detail="Nije moguće sačuvati link")
    log_activity(
        user["id"], "material.link_added",
        project_id=payload.project_id, task_id=payload.task_id,
        payload={"title": payload.title, "url": url},
    )
    return _hydrate_material(insert.data[0])


@router.get("/{material_id}/download")
def download_material(material_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("materials").select("*").eq("id", material_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")
    require_project_member(project_id=res.data["project_id"], user=user)
    if res.data.get("external_url"):
        raise HTTPException(status_code=400, detail="Eksterni link se otvara u pregledniku, ne preuzima")
    if not res.data.get("storage_path"):
        raise HTTPException(status_code=404, detail="Fajl nije dostupan")
    try:
        data = sb.storage.from_(settings.SUPABASE_BUCKET).download(res.data["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download nije uspio: {e}")
    return StreamingResponse(
        io.BytesIO(data),
        media_type=res.data.get("mime_type") or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{res.data["file_name"]}"'},
    )


@router.delete("/{material_id}", status_code=204)
def delete_material(material_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("materials").select("*").eq("id", material_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")
    require_project_member(project_id=res.data["project_id"], user=user)
    if res.data.get("storage_path"):
        try:
            sb.storage.from_(settings.SUPABASE_BUCKET).remove([res.data["storage_path"]])
        except Exception:
            pass
    sb.table("materials").delete().eq("id", material_id).execute()
    log_activity(user["id"], "material.deleted", project_id=res.data["project_id"],
                 payload={"file_name": res.data["file_name"]})
    return None
