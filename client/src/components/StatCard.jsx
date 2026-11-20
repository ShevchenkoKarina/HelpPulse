export default function StatCard({ label, value, hint, alert }) {
  return (
    <li className={`stat-card${alert ? ' stat-card--alert' : ''}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </li>
  );
}
