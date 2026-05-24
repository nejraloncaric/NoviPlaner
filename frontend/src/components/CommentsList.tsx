import { useEffect, useState } from "react";
import { commentsApi } from "../api/endpoints";
import type { Comment, Project } from "../types";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

interface Props {
  taskId: string;
  project: Project;
  onChange?: () => void;
}

export default function CommentsList({ taskId, project, onChange }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => setComments(await commentsApi.list(taskId));
  useEffect(() => { load(); }, [taskId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      // detect @mentions (@FullName) -> resolve to member id
      const mentions: string[] = [];
      const re = /@([A-Za-zŠĐČĆŽšđčćžÀ-ſ][\wŠĐČĆŽšđčćžÀ-ſ]*(?:\s+[A-Za-zŠĐČĆŽšđčćžÀ-ſ][\wŠĐČĆŽšđčćžÀ-ſ]*)?)/g;
      const matches = text.matchAll(re);
      for (const m of matches) {
        const name = m[1].trim().toLowerCase();
        const member = project.members.find(
          (mem) => (mem.full_name || "").toLowerCase().startsWith(name)
        );
        if (member && !mentions.includes(member.user_id)) mentions.push(member.user_id);
      }
      await commentsApi.create(taskId, text, mentions);
      setText("");
      await load();
      onChange?.();
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Obrisati komentar?")) return;
    await commentsApi.remove(id);
    await load();
  };

  return (
    <div>
      <div>
        {comments.length === 0 && <div className="muted">Nema komentara.</div>}
        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <Avatar name={c.author_name || "?"} />
            <div className="content">
              <div className="header">
                <span className="author">{c.author_name}</span>
                <span className="time">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
                {c.author_id === user?.id && (
                  <button onClick={() => remove(c.id)}
                          style={{ marginLeft: "auto", padding: "0 4px", fontSize: 11, border: "none" }}>×</button>
                )}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}
                   dangerouslySetInnerHTML={{ __html: renderMentions(c.content) }} />
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3">
        <textarea rows={2} placeholder="Napiši komentar... (koristi @ za označavanje)"
                  value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row between mt-2">
          <small className="muted">Tip: @Ime Prezime za mention</small>
          <button type="submit" className="primary" disabled={sending || !text.trim()}>
            {sending ? "Šaljem..." : "Pošalji"}
          </button>
        </div>
      </form>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMentions(s: string) {
  return escapeHtml(s).replace(/@([\wŠĐČĆŽšđčćžÀ-ſ]+(?:\s+[\wŠĐČĆŽšđčćžÀ-ſ]+)?)/g,
    '<span class="mention">@$1</span>');
}
