import { useEffect, useRef, useState } from "react";
import { materialsApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import type { Material } from "../types";

interface Props {
  projectId: string;
  taskId?: string;
  compact?: boolean;
}

export default function MaterialsPanel({ projectId, taskId, compact }: Props) {
  const [items, setItems] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const m = await materialsApi.list(projectId, taskId);
    setItems(m);
  };
  useEffect(() => { load(); }, [projectId, taskId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await materialsApi.upload(projectId, file, taskId);
      await load();
    } catch (err: unknown) {
      alert(apiErrorMessage(err, "Upload nije uspio"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = linkUrl.trim();
    const title = linkTitle.trim();
    if (!url || !title) return;
    setAddingLink(true);
    try {
      await materialsApi.addLink({
        project_id: projectId,
        task_id: taskId,
        title,
        url,
      });
      setLinkUrl("");
      setLinkTitle("");
      await load();
    } catch (err: unknown) {
      alert(apiErrorMessage(err, "Dodavanje linka nije uspjelo"));
    } finally {
      setAddingLink(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Obrisati materijal?")) return;
    await materialsApi.remove(id);
    await load();
  };

  return (
    <div>
      <div className="row between mb-3" style={{ flexWrap: "wrap", gap: 8 }}>
        {!compact && <h3 style={{ margin: 0 }}>Materijali</h3>}
        <input ref={fileRef} type="file" onChange={upload} style={{ display: "none" }} />
        <button className="primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploadujem..." : "+ Upload fajla"}
        </button>
      </div>

      <form className={`material-link-form${compact ? " compact" : ""}`} onSubmit={addLink}>
        <div className="material-link-form-title">Dodaj Teams link</div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor={compact ? "link-url-compact" : "link-url"}>URL linka</label>
          <input
            id={compact ? "link-url-compact" : "link-url"}
            type="url"
            placeholder="https://teams.microsoft.com/..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            required
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor={compact ? "link-title-compact" : "link-title"}>Naziv linka</label>
          <input
            id={compact ? "link-title-compact" : "link-title"}
            type="text"
            placeholder="npr. Specifikacija v1.2"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="primary" disabled={addingLink || !linkUrl.trim() || !linkTitle.trim()}>
          {addingLink ? "Dodajem..." : "+ Dodaj link"}
        </button>
      </form>

      {items.length === 0 ? (
        <div className="muted mt-3">Nema fajlova ni linkova.</div>
      ) : (
        <div className="mt-3">
          {items.map((m) => (
            <div className="material-row" key={m.id}>
              <span style={{ fontSize: 20 }}>{m.is_link ? "🔗" : iconFor(m.mime_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.file_name}
                </div>
                <div className="file-meta">
                  {m.is_link ? (
                    <>
                      Teams / link
                      {m.external_url && (
                        <span className="material-link-preview" title={m.external_url}>
                          {" "}• {truncateUrl(m.external_url)}
                        </span>
                      )}
                    </>
                  ) : (
                    formatSize(m.size_bytes)
                  )}
                  {" • "}{m.uploader_name || "—"}
                  {m.created_at && ` • ${new Date(m.created_at).toLocaleString()}`}
                </div>
              </div>
              {m.is_link && m.external_url ? (
                <a href={m.external_url} target="_blank" rel="noopener noreferrer">
                  <button type="button">Otvori</button>
                </a>
              ) : (
                <a href={materialsApi.downloadUrl(m.id)}
                   onClick={(e) => downloadWithAuth(e, m.id, m.file_name)}>
                  <button type="button">Preuzmi</button>
                </a>
              )}
              <button type="button" className="danger" onClick={() => remove(m.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function truncateUrl(url: string, max = 42) {
  if (url.length <= max) return url;
  return url.slice(0, max - 3) + "...";
}

function iconFor(mime?: string | null) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("zip") || mime.includes("rar")) return "🗜️";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  return "📄";
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

async function downloadWithAuth(e: React.MouseEvent, id: string, name: string) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/materials/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { alert("Download nije uspio"); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
