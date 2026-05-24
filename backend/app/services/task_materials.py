"""Pomoćne funkcije za stavke materijala na zadacima."""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException

from app.models.task_material import TaskMaterialItemCreate


def _serialize_date(value: date) -> str:
    return value.isoformat()


def validate_material_items(
    items: list[TaskMaterialItemCreate],
    type_by_id: dict[str, dict],
) -> None:
    if not items:
        raise HTTPException(status_code=400, detail="Odaberite barem jedan materijal")

    seen: set[str] = set()
    for item in items:
        if item.material_type_id in seen:
            raise HTTPException(status_code=400, detail="Isti materijal je odabran više puta")
        seen.add(item.material_type_id)

        mt = type_by_id.get(item.material_type_id)
        if not mt:
            raise HTTPException(status_code=400, detail="Nepoznat tip materijala")
        if not mt.get("is_active", True):
            raise HTTPException(status_code=400, detail=f"Materijal „{mt.get('name')}” nije aktivan")


def insert_task_material_items(
    sb,
    task_id: str,
    items: list[TaskMaterialItemCreate],
) -> None:
    rows = []
    for idx, item in enumerate(items):
        rows.append({
            "task_id": task_id,
            "material_type_id": item.material_type_id,
            "dimensions_format": item.dimensions_format.strip(),
            "quantity": item.quantity.strip(),
            "visual_content": item.visual_content.strip(),
            "print_shop": item.print_shop.strip() if item.print_shop else None,
            "installation_deadline": (
                _serialize_date(item.installation_deadline)
                if item.installation_deadline else None
            ),
            "other_notes": item.other_notes.strip() if item.other_notes else None,
            "sort_order": idx,
        })
    if rows:
        sb.table("task_material_items").insert(rows).execute()


def load_task_material_items(sb, task_id: str) -> list[dict]:
    try:
        res = (
            sb.table("task_material_items")
            .select("*, material_types(name, is_print)")
            .eq("task_id", task_id)
            .order("sort_order")
            .order("created_at")
            .execute()
        )
    except Exception:
        return []
    out: list[dict] = []
    for row in res.data or []:
        mt = row.get("material_types") or {}
        item = {k: v for k, v in row.items() if k != "material_types"}
        item["material_type_name"] = mt.get("name")
        item["is_print"] = mt.get("is_print", True)
        out.append(item)
    return out
