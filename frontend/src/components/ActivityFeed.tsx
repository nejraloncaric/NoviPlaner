import { useEffect, useState } from "react";
import { activitiesApi } from "../api/endpoints";
import type { Activity } from "../types";

interface Props { projectId: string; }

const ACTION_LABELS: Record<string, string> = {
  "project.created": "kreirao projekat",
  "project.updated": "ažurirao projekat",
  "project.archived": "arhivirao projekat",
  "project.unarchived": "vratio projekat iz arhive",
  "project.member_added": "dodao člana",
  "project.member_removed": "uklonio člana",
  "task.created": "kreirao zadatak",
  "task.subtask_created": "dodao stavku na checklistu",
  "task.updated": "ažurirao zadatak",
  "task.status_changed": "promijenio status zadatka",
  "task.moved": "premjestio zadatak",
  "task.deleted": "obrisao zadatak",
  "comment.created": "dodao komentar",
  "material.uploaded": "uploadovao fajl",
  "material.link_added": "dodao link",
  "material.deleted": "obrisao fajl",
};

export default function ActivityFeed({ projectId }: Props) {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    activitiesApi.list({ project_id: projectId, limit: 100 }).then(setItems);
  }, [projectId]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Istorija aktivnosti</h3>
      {items.length === 0 ? (
        <div className="muted">Nema aktivnosti.</div>
      ) : (
        items.map((a) => {
          const detail =
            a.action === "task.moved" && a.payload?.from && a.payload?.to
              ? ` (${a.payload.from} → ${a.payload.to})` :
            (a.action === "task.created" || a.action === "task.subtask_created") && a.payload?.title
              ? `: "${a.payload.title}"` :
            a.action === "material.uploaded" && a.payload?.file_name
              ? `: ${a.payload.file_name}` :
            (a.action === "material.link_added" || a.action === "material.uploaded") && a.payload?.title
              ? `: ${a.payload.title}` :
            "";
          return (
            <div key={a.id} className="activity-item">
              <span className="actor">{a.actor_name || "Korisnik"}</span>{" "}
              {ACTION_LABELS[a.action] || a.action}{detail}
              <div className="time">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
