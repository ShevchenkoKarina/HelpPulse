export default function PageHeader({ title, children, actions }) {
  return (
    <div className="page-head">
      <div className="page-head__row">
        <h1 style={{ fontSize: 'clamp(1.75rem, 1.3rem + 1.4vw, 2.25rem)' }}>{title}</h1>
        {actions}
      </div>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
