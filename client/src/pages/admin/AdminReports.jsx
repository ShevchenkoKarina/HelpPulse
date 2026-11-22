import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

/** Панель звіту: заголовок, вміст або стан завантаження. */
function Report({ title, path, children, wide }) {
  const { data, error, loading, reload } = useApi(path);
  return (
    <section className="panel" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <div className="panel__head">
        <h2 style={{ fontSize: '1.125rem' }}>{title}</h2>
      </div>
      {loading && <Loading lines={2} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty>Даних поки немає.</Empty>}
      {data && data.length > 0 && children(data)}
    </section>
  );
}

function Bars({ rows, label, value, yellow }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[value])));
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={label(r)}>
          <span>{label(r)}</span>
          <span className="bar-list__track"><span className={`bar-list__fill${yellow ? ' bar-list__fill--yellow' : ''}`} style={{ width: `${(Number(r[value]) / max) * 100}%` }} /></span>
          <strong>{r[value]}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function AdminReports() {
  return (
    <>
      <PageHeader title="Звіти">Підсумки за даними платформи: заявки, доставки, області, донори та волонтери.</PageHeader>
      <div className="report-grid">
        <Report title="Заявки за статусами" path="/reports/requests-by-state">
          {(rows) => <Bars rows={rows} label={(r) => r.request_state} value="count" />}
        </Report>
        <Report title="Доставки за статусами" path="/reports/deliveries-by-status">
          {(rows) => <Bars rows={rows} label={(r) => r.status_name} value="count" yellow />}
        </Report>

        <Report title="Виконані доставки за областями" path="/reports/regions">
          {(rows) => (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Область</th><th className="num">Доставок</th><th>Примітка</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.region}><td>{r.region}</td><td className="num">{r.delivered_count}</td><td>{r.is_leader && <span className="leader">лідер</span>}</td></tr>))}</tbody>
            </table></div>
          )}
        </Report>
        <Report title="Внесок донорів" path="/reports/donations-by-donor">
          {(rows) => (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Донор</th><th>Тип</th><th className="num">Пожертв</th><th className="num">Одиниць</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.donor_id}><td>{r.donor_name}</td><td>{r.donor_type}</td><td className="num">{r.donations_count}</td><td className="num">{formatNumber(r.total_quantity)}</td></tr>))}</tbody>
            </table></div>
          )}
        </Report>

        <Report wide title="Волонтери: доставки та оцінка" path="/reports/volunteers">
          {(rows) => (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Волонтер</th><th>Область</th><th className="num">Усього</th><th className="num">Доставлено</th><th className="num">Активних</th><th className="num">Середня оцінка</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.volunteer_id}><td>{r.volunteer_name}</td><td>{r.region || '—'}</td><td className="num">{r.deliveries_total}</td><td className="num">{r.delivered}</td><td className="num">{r.active}</td><td className="num">{r.avg_rating ?? '—'}</td></tr>))}</tbody>
            </table></div>
          )}
        </Report>

        <Report wide title="Доставки без відгуку" path="/reports/deliveries-without-feedback">
          {(rows) => (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Доставка</th><th>Статус</th><th>Планова дата</th><th>Фактична дата</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.delivery_id}><td>№ {r.delivery_id}</td><td><StatusBadge value={r.status_name} /></td><td>{formatDateShort(r.planned_date)}</td><td>{r.actual_date ? formatDateShort(r.actual_date) : '—'}</td></tr>))}</tbody>
            </table></div>
          )}
        </Report>
      </div>
    </>
  );
}
