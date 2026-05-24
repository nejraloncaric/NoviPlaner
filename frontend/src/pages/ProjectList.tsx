import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi, usersApi } from "../api/endpoints";
import type { Project, User } from "../types";
import Modal from "../components/Modal";
import Avatar from "../components/Avatar";
import ImportExcelModal from "../components/ImportExcelModal";

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    const p = await projectsApi.list({ include_archived: showArchived });
    setProjects(p);
  };

  useEffect(() => { load(); }, [showArchived]);

  return (
    <div>
      <div className="page-header">
        <h2>Projekti</h2>
        <div className="row">
          <label className="row" style={{ marginBottom: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }}
              checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Prikaži arhivirane
          </label>
          <button type="button" onClick={() => setImporting(true)}>Uvoz iz Excela</button>
          <button className="primary" onClick={() => setCreating(true)}>+ Novi projekat</button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card"><p className="muted">Nema projekata.</p></div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="card project-card" style={{ color: "inherit" }}>
              <div className="row between mb-2">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <span className={`badge ${p.status}`}>{p.status}</span>
              </div>
              <div className="desc">{p.description || "—"}</div>
              <div className="row" style={{ marginTop: 10, gap: 4 }}>
                {p.members.slice(0, 5).map((m) => (
                  <Avatar key={m.user_id} name={m.full_name || "?"} size="sm" />
                ))}
                {p.members.length > 5 && <span className="muted">+{p.members.length - 5}</span>}
              </div>
              <div className="row between mt-3">
                <span className="muted">
                  {p.completed_task_count} / {p.task_count} zadataka
                </span>
                {p.end_date && <span className="muted">Rok: {p.end_date}</span>}
              </div>
              <div className="progress-bar">
                <div style={{ width: p.task_count ? `${(p.completed_task_count / p.task_count) * 100}%` : "0%" }} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <ImportExcelModal open={importing} onClose={() => setImporting(false)} onImported={load} />
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      usersApi.list().then(setUsers);
      setName(""); setDescription(""); setStartDate(""); setEndDate(""); setMemberIds([]); setError("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      await projectsApi.create({
        name, description: description || null,
        start_date: startDate || null,
        end_date: endDate || null,
        member_ids: memberIds,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Greška");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novi projekat">
      <form onSubmit={submit}>
        <div className="field">
          <label>Naziv</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Opis</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Datum početka</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Datum završetka</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Članovi</label>
          <select multiple value={memberIds} size={Math.min(6, Math.max(3, users.length))}
                  onChange={(e) =>
                    setMemberIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                  }>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
            ))}
          </select>
          <small className="muted">Ctrl/Cmd + klik za odabir više članova</small>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Odustani</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Snimam..." : "Kreiraj"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
