import Sidebar from './Sidebar.jsx';

/**
 * Shared AppShell container wrapping Sidebar and main content area for authenticated pages.
 *
 * @param {ReactNode} [sidebar] — custom sidebar override; when omitted the default Sidebar is used.
 */
export default function AppShell({ active, children, dataScreenLabel, sidebar }) {
  return (
    <div className="app-shell" data-screen-label={dataScreenLabel}>
      <div className="botanical-overlay" />
      {sidebar || <Sidebar active={active} />}
      <main className="app-main">
        <div className="app-main__content">
          {children}
        </div>
      </main>
    </div>
  );
}
