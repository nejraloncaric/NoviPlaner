import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggleButton } from "../components/ThemeToggle";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Prijava nije uspjela");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-theme-fab">
        <ThemeToggleButton />
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h1>Planner</h1>
        <p className="muted mb-3">Prijavite se na svoj račun</p>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Lozinka</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error mb-2">{error}</div>}
        <button className="primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Prijavljivanje..." : "Prijavi se"}
        </button>
        <p className="mt-3 muted" style={{ textAlign: "center" }}>
          Nemate račun? <Link to="/register">Registrujte se</Link>
        </p>
      </form>
    </div>
  );
}
