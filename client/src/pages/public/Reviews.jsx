import { useApi } from '../../hooks/useApi.js';
import { formatDate, plural } from '../../utils/format.js';
import Stars from '../../components/Stars.jsx';
import { Loading, ErrorState, Empty } from '../../components/States.jsx';

export default function Reviews() {
  const list = useApi('/feedback/public');
  const summary = useApi('/feedback/summary');
  const total = Number(summary.data?.count || 0);
  const max = Math.max(1, ...(summary.data?.distribution || []).map((d) => Number(d.count)));

  return (
    <div className="container track-page">
      <div className="form-page__head">
        <h1>Відгуки отримувачів</h1>
        <p className="lead">Що кажуть люди, які отримали допомогу. Імена й адреси ми не показуємо.</p>
      </div>

      {summary.data && total > 0 && (
        <section className="rating-summary" aria-label="Середня оцінка">
          <div className="rating-summary__score">
            <span className="rating-summary__value">{Number(summary.data.average).toLocaleString('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <Stars value={Math.round(summary.data.average)} size={22} />
            <span className="muted">{total} {plural(total, ['відгук', 'відгуки', 'відгуків'])}</span>
          </div>
          <ul className="bars">
            {summary.data.distribution.map((d) => (
              <li key={d.rating}>
                <span>{d.rating} ★</span>
                <span className="bars__track"><span className="bars__fill" style={{ width: `${(Number(d.count) / max) * 100}%` }} /></span>
                <span>{d.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.loading && <Loading lines={4} />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && <Empty>Відгуків поки немає. Вони з’являться, щойно хтось оцінить доставку.</Empty>}
      {list.data && list.data.length > 0 && (
        <ul className="reviews-list">
          {list.data.map((r) => (
            <li key={r.feedback_id} className="review">
              <div className="review__head">
                <Stars value={r.rating} />
                <span>{r.region} область · {formatDate(r.feedback_date)}</span>
              </div>
              {r.review_text && <p className="review__text">{r.review_text}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
