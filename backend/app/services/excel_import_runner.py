"""Kreiranje projekata i zadataka iz parsiranog Excela."""

from __future__ import annotations

from app.models.project import ExcelImportResult, ExcelImportSheetResult
from app.api.deps import log_activity


def run_excel_import(
    sb,
    sheets_data: list[dict],
    user: dict,
    extra_members: list[str],
    *,
    source: str = "excel",
    source_url: str | None = None,
) -> ExcelImportResult:
    results: list[ExcelImportSheetResult] = []
    total_tasks = 0

    for sheet in sheets_data:
        proj_res = sb.table("projects").insert({
            "name": sheet["project_name"],
            "owner_id": user["id"],
            "status": "active",
        }).execute()
        if not proj_res.data:
            raise ValueError(f"Projekat nije kreiran: {sheet['project_name']}")
        project = proj_res.data[0]
        project_id = project["id"]

        members_to_add = {user["id"]: "owner"}
        for uid in extra_members:
            if uid != user["id"]:
                members_to_add[uid] = "member"
        sb.table("project_members").upsert([
            {"project_id": project_id, "user_id": uid, "role": role}
            for uid, role in members_to_add.items()
        ]).execute()

        task_rows = []
        for pos, task in enumerate(sheet["tasks"]):
            task_rows.append({
                "project_id": project_id,
                "title": task["title"],
                "notes": task.get("notes"),
                "status": "design",
                "priority": "medium",
                "creator_id": user["id"],
                "position": pos,
            })

        if task_rows:
            sb.table("tasks").insert(task_rows).execute()

        created = len(task_rows)
        total_tasks += created
        payload: dict = {"name": sheet["project_name"], "tasks": created, "source": source}
        if source_url:
            payload["url"] = source_url
        log_activity(
            user["id"], "project.imported_excel",
            project_id=project_id,
            payload=payload,
        )
        results.append(ExcelImportSheetResult(
            sheet_name=sheet["project_name"],
            project_id=project_id,
            project_name=sheet["project_name"],
            tasks_created=created,
            skipped_rows=sheet.get("skipped_rows", 0),
        ))

    return ExcelImportResult(
        sheets=results,
        total_projects=len(results),
        total_tasks=total_tasks,
    )
