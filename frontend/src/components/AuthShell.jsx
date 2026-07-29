/**
 * Shared AuthShell layout container wrapping public auth screens (Login & Register).
 */
export default function AuthShell({ children }) {
  return (
    <div className="app-shell--auth">
      <div className="botanical-overlay" />
      <div className="mesh-overlay" />
      <div className="card card--auth">
        {children}
      </div>
    </div>
  );
}
