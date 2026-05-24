import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { ThemeToggleButton, ThemePreferenceSelect } from "./ThemeToggle";

function navClass({ isActive }: { isActive: boolean }) {
  return "nav-link" + (isActive ? " active" : "");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden />
          <span className="sidebar-title">Planner</span>
        </div>
        <div className="sidebar-theme">
          <ThemeToggleButton />
          <ThemePreferenceSelect />
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={navClass}>
            <span className="nav-icon" aria-hidden>◫</span>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            <span className="nav-icon" aria-hidden>▦</span>
            Projekti
          </NavLink>
          <NavLink to="/settings/materials" className={navClass}>
            <span className="nav-icon" aria-hidden>◇</span>
            Materijali
          </NavLink>
        </nav>
        <div className="user-box">
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={user?.full_name || "?"} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{user?.full_name}</div>
              <div className="email">{user?.email}</div>
            </div>
          </div>
          <button type="button" className="btn-ghost logout-btn" onClick={logout}>
            Odjava
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
