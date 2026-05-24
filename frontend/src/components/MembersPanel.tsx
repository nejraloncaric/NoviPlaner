import { useEffect, useState } from "react";
import { projectsApi, usersApi } from "../api/endpoints";
import type { Project, User } from "../types";
import Avatar from "./Avatar";

interface Props {
  project: Project;
  onChange: () => void;
}

export default function MembersPanel({ project, onChange }: Props) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    usersApi.list(search || undefined).then(setAllUsers);
  }, [search]);

  const memberIds = new Set(project.members.map((m) => m.user_id));
  const candidates = allUsers.filter((u) => !memberIds.has(u.id));

  const add = async (u: User) => {
    await projectsApi.addMember(project.id, u.id, "member");
    onChange();
  };
  const remove = async (uid: string) => {
    if (uid === project.owner_id) { alert("Vlasnik se ne može ukloniti."); return; }
    if (!confirm("Ukloniti člana?")) return;
    await projectsApi.removeMember(project.id, uid);
    onChange();
  };

  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Članovi projekta</h3>
        {project.members.map((m) => (
          <div key={m.user_id} className="row mt-2" style={{ gap: 10 }}>
            <Avatar name={m.full_name || "?"} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{m.full_name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{m.email}</div>
            </div>
            <span className="badge active">{m.role}</span>
            {m.user_id !== project.owner_id &&
              <button className="danger" onClick={() => remove(m.user_id)}>Ukloni</button>}
          </div>
        ))}
      </div>
      <div className="card" style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Dodaj člana</h3>
        <input placeholder="Pretraga po imenu ili emailu..."
               value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-3">
          {candidates.length === 0 ? (
            <div className="muted">Nema dostupnih korisnika.</div>
          ) : (
            candidates.map((u) => (
              <div key={u.id} className="row mt-2" style={{ gap: 10 }}>
                <Avatar name={u.full_name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                </div>
                <button className="primary" onClick={() => add(u)}>+ Dodaj</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
