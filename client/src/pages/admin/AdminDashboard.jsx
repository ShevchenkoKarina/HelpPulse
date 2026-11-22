import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';
import { formatDateShort, formatNumber } from '../../utils/format.js';

function ActiveDeliveries() {
  const { data, error, loading, reload } = useApi('/deliveries?active=true');
  return (
    <section className="panel" aria-labelledby="active-title">
      <div className="panel__head">
        <h2 id="active-title" style={{ fontSize: '1.25rem' }}>Активні доставки</h2>
      </div>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty>Активних доставок немає.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>№</th><th>Отримувач</th><th>Волонтер</th><th>Звідки</th><th>Куди</th><th>Дата</th><th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.delivery_id}>
                  <td className="nowrap">{d.delivery_id}</td>
                  <td>{d.requester_name}</td>
                  <td className="nowrap">{d.volunteer_name}</td>
                  <td className="nowrap">{d.warehouse_name}</td>
                  <td>{d.end_point}</td>
                  <td className="nowrap">{formatDateShort(d.planned_date)}</td>
                  <td className="nowrap"><StatusBadge value={d.status_name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const { data: s, error, loading, reload } = useApi('/reports/summary');

  return (
    <>
      <PageHeader title="Огляд">Поточний стан платформи за даними бази.</PageHeader>

      {loading && <Loading lines={2} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {s && (
        <ul className="stat-grid" aria-label="Ключові показники">
          <StatCard label="Активні заявки" value={formatNumber(s.active_requests)} hint={`з ${formatNumber(s.total_requests)} усього`} />
          <StatCard label="Доставки в дорозі" value={formatNumber(s.in_transit)} hint={`${formatNumber(s.active_deliveries)} активних загалом`} />
          <StatCard label="Доставлено" value={formatNumber(s.delivered)} hint="завершених доставок" />
          <StatCard label="Середня оцінка" value={s.avg_rating ?? '—'} hint={`${formatNumber(s.feedback_count)} відгуків`} />
          <StatCard label="Одиниць на складах" value={formatNumber(s.stock_total)} hint="по всіх складах" />
          <StatCard label="Склади" value={formatNumber(s.warehouses)} hint="у різних містах" />
          <StatCard label="Донори" value={formatNumber(s.donors)} />
          <StatCard label="Волонтери" value={formatNumber(s.volunteers)} />
        </ul>
      )}

      <ActiveDeliveries />
    </>
  );
}
