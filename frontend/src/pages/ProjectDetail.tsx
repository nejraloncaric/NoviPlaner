import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsApi, tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import type { Project, Task } from "../types";
import KanbanBoard from "../components/KanbanBoard";
import ActivityFeed from "../components/ActivityFeed";
import MembersPanel from "../components/MembersPanel";
import EditProjectModal from "../components/EditProjectModal";
import TaskDetailModal from "../components/TaskDetailModal";
import CreateTaskModal from "../components/CreateTaskModal";
import Avatar from "../components/Avatar";

type Tab = "kanban" | "members" | "activity";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("kanban");
  const [editing, setEditing] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tasksError, setTasksError] = useState("");

  // filters
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterQ, setFilterQ] = useState<string>("");

  const loadProject = async () => {
    if (!id) return;
    try {
      const p = await projectsApi.get(id);
      setProject(p);
      setLoadError("");
    } catch {
      setLoadError("Projekat nije pronađen ili nemate pristup.");
      setProject(null);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    try {
      const t = await tasksApi.list({
        project_id: id,
        assignee_id: filterAssignee || undefined,
        priority: (filterPriority as any) || undefined,
        q: filterQ || undefined,
      });
      setTasks(t);
      setTasksError("");
    } catch (err) {
      setTasks([]);
      setTasksError(apiErrorMessage(err, "Zadaci nisu učitani"));
    }
  };

  useEffect(() => { loadProject(); }, [id]);
  useEffect(() => { loadTasks(); }, [id, filterAssignee, filterPriority, filterQ]);

  const archive = async () => {
    if (!project) return;
    if (!confirm(`Arhivirati projekat "${project.name}"?`)) return;
    try {
      await projectsApi.archive(project.id);
      loadProject();
    } catch (err) {
      alert(apiErrorMessage(err, "Arhiviranje nije uspjelo"));
    }
  };
  const unarchive = async () => {
    if (!project) return;
    try {
      await projectsApi.unarchive(project.id);
      loadProject();
    } catch (err) {
      alert(apiErrorMessage(err, "Vraćanje iz arhive nije uspjelo"));
    }
  };
  const remove = async () => {
    if (!project) return;
    if (!confirm(`Trajno obrisati projekat "${project.name}"? Ovo je nepovratno.`)) return;
    try {
      await projectsApi.remove(project.id);
      navigate("/projects");
    } catch (err) {
      alert(apiErrorMessage(err, "Brisanje nije uspjelo"));
    }
  };

  if (loadError) return <div className="card"><p className="error">{loadError}</p></div>;
  if (!project) return <p>Učitavanje...</p>;

  return (
    <div>
      <div className="project-hero">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ gap: 10 }}>
              <h2 style={{ margin: 0 }}>{project.name}</h2>
              <span className={`badge ${project.status}`}>{project.status}</span>
            </div>
            {project.description && <div className="muted mt-2">{project.description}</div>}
            <div className="row muted mt-2" style={{ gap: 16, fontSize: 13 }}>
              {project.start_date && <span>Početak: {project.start_date}</span>}
              {project.end_date && <span>Rok: {project.end_date}</span>}
              <span>{project.completed_task_count} / {project.task_count} završeno</span>
            </div>
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button type="button" onClick={() => setEditing(true)}>Uredi</button>
            {project.status === "active" ? (
              <button type="button" onClick={archive}>Arhiviraj</button>
            ) : (
              <button type="button" onClick={unarchive}>Vrati iz arhive</button>
            )}
            <button type="button" className="danger" onClick={remove}>Obriši</button>
            <button type="button" className="primary" onClick={() => setCreatingTask(true)}>+ Novi zadatak</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className={tab === "kanban" ? "active" : ""} onClick={() => setTab("kanban")}>Kanban</button>
        <button type="button" className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Članovi</button>
        <button type="button" className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>Aktivnost</button>
      </div>

      {tab === "kanban" && (
        <>
          {tasksError && <div className="error mb-3">{tasksError}</div>}
          <div className="toolbar">
            <input placeholder="Pretraži zadatke..." value={filterQ}
                   onChange={(e) => setFilterQ(e.target.value)} style={{ maxWidth: 220 }} />
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
              <option value="">Svi izvršioci</option>
              {project.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">Svi prioriteti</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <span className="toolbar-meta">{tasks.length} zadataka</span>
            <div className="row" style={{ gap: 4 }}>
              {project.members.slice(0, 8).map((m) => (
                <Avatar key={m.user_id} name={m.full_name || "?"} size="sm" />
              ))}
            </div>
          </div>
          <KanbanBoard tasks={tasks} onChange={() => { loadTasks(); loadProject(); }}
                       onOpenTask={(t) => setSelectedTaskId(t.id)} />
        </>
      )}

      {tab === "members" && (
        <MembersPanel project={project} onChange={loadProject} />
      )}
      {tab === "activity" && <ActivityFeed projectId={project.id} />}

      <EditProjectModal open={editing} project={project}
                        onClose={() => setEditing(false)}
                        onSaved={() => { setEditing(false); loadProject(); }} />
      <CreateTaskModal open={creatingTask} project={project}
                       onClose={() => setCreatingTask(false)}
                       onCreated={() => { setCreatingTask(false); loadTasks(); loadProject(); }} />
      <TaskDetailModal taskId={selectedTaskId} project={project}
                       onClose={() => setSelectedTaskId(null)}
                       onChange={() => { loadTasks(); loadProject(); }} />
    </div>
  );
}
