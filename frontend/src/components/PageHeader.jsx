/**
 * Shared PageHeader component used at the top of authenticated content views.
 */
export default function PageHeader({ title, subtitle, actions, className = 'topbar' }) {
  return (
    <header className={className}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="sub-heading">{subtitle}</p>}
      </div>
      {actions && <div className="topbar__actions">{actions}</div>}
    </header>
  );
}
