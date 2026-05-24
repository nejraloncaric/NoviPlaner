import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi } from "../api/endpoints";
import type { Project } from "../types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list({}).then((p) => setProjects(p)).finally(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status === "active");
  const totalTasks = projects.reduce((s, p) => s + p.task_count, 0);
  const completedTasks = projects.reduce((s, p) => s + p.completed_task_count, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>
      <div className="project-grid" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-label">Aktivni projekti</div>
          <div className="stat-value">{active.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Ukupno zadataka</div>
          <div className="stat-value">{totalTasks}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Završeni zadaci</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{completedTasks}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Vaši projekti</h3>
      {loading ? (
        <p>Učitavanje...</p>
      ) : active.length === 0 ? (
        <div className="card">
          <p className="muted">Još nemate aktivnih projekata.</p>
          <Link to="/projects"><button className="primary">Kreiraj projekat</button></Link>
        </div>
      ) : (
        <div className="project-grid">
          {active.slice(0, 6).map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="card project-card" style={{ color: "inherit" }}>
              <h3>{p.name}</h3>
              <div className="desc">{p.description || "—"}</div>
              <div className="row between mt-3">
                <span className="muted">{p.completed_task_count} / {p.task_count} zadataka</span>
                <span className={`badge ${p.status}`}>{p.status}</span>
              </div>
              <div className="progress-bar">
                <div style={{ width: p.task_count ? `${(p.completed_task_count / p.task_count) * 100}%` : "0%" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
