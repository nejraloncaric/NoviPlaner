import { useEffect, useState } from "react";
import Modal from "./Modal";
import { projectsApi } from "../api/endpoints";
import type { Project, ProjectStatus } from "../types";

interface Props {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditProjectModal({ open, project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [endDate, setEndDate] = useState(project.end_date || "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description || "");
      setStartDate(project.start_date || "");
      setEndDate(project.end_date || "");
      setStatus(project.status);
      setError("");
    }
  }, [open, project]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await projectsApi.update(project.id, {
        name, description: description || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Greška");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Uredi projekat">
      <form onSubmit={submit}>
        <div className="field">
          <label>Naziv</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Opis</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Početak</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Rok</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Odustani</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Snimam..." : "Snimi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
