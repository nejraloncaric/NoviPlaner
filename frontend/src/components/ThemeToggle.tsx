import { useTheme, type ThemePreference } from "../context/ThemeContext";

export function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "Svijetla tema" : "Tamna tema"}
      aria-label={isDark ? "Uključi svijetlu temu" : "Uključi tamnu temu"}
    >
      <span className="theme-toggle-icon" aria-hidden>{isDark ? "☀" : "☾"}</span>
      <span className="theme-toggle-label">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function ThemePreferenceSelect() {
  const { preference, setPreference } = useTheme();
  return (
    <select
      className="theme-select"
      value={preference}
      onChange={(e) => setPreference(e.target.value as ThemePreference)}
      aria-label="Tema aplikacije"
    >
      <option value="system">Sistem</option>
      <option value="light">Svijetla</option>
      <option value="dark">Tamna</option>
    </select>
  );
}
