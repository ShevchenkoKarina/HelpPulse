import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, plural } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import DeliveryTrack from '../../components/DeliveryTrack.jsx';
import StarInput from '../../components/StarInput.jsx';
import Field from '../../components/Field.jsx';
import { Loading, ErrorState } from '../../components/States.jsx';

function SearchForm({ initial = '' }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    const n = Number(value.trim());
    if (!Number.isInteger(n) || n < 1) { setError('Введіть номер заявки: ціле число, наприклад 7'); return; }
    setError('');
    navigate(`/track/${n}`);
  }
  return (
    <form className="form-card" onSubmit={submit} noValidate style={{ maxWidth: 560 }}>
      <Field label="Номер заявки" error={error} hint="Його показано після надсилання заявки">
        <input className="input" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button className="btn btn--primary" type="submit"><Search size={18} aria-hidden="true" /> Показати стан</button>
      </div>
    </form>
  );
}

/** Форма відгуку після доставки: оцінка і короткий текст. */
function ReviewForm({ deliveryId, onSaved }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!rating) { setRatingError('Поставте оцінку від 1 до 5'); return; }
    setRatingError('');
    setSending(true); setError('');
    try {
      await api('/feedback', { method: 'POST', body: { delivery_id: deliveryId, rating, review_text: text.trim() || null } });
      onSaved();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setSending(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="form" style={{ gap: 16 }}>
      <h4 style={{ fontSize: '1.0625rem' }}>Як усе минуло?</h4>
      <StarInput legend="Ваша оцінка" value={rating} onChange={(v) => { setRating(v); setRatingError(''); }} error={ratingError} />
      <Field label="Відгук" optional hint="Пишіть без телефону й адреси: відгук бачать усі відвідувачі сайту">
        <textarea className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="form-actions">
        <button className="btn btn--accent" type="submit" disabled={sending}>{sending ? 'Надсилаємо…' : 'Залишити відгук'}</button>
      </div>
    </form>
  );
}

function Delivery({ d, index, total, reload }) {
  const delivered = d.status_name === 'доставлено';
  return (
    <section className="delivery-big">
      <div className="delivery-big__head">
        <h3>{total > 1 ? `Доставка ${index + 1} із ${total}` : 'Доставка'}</h3>
        <StatusBadge value={d.status_name} />
      </div>
      <div className="track-big"><DeliveryTrack status={d.status_name} /></div>
      <dl className="kv">
        <div><dt>Звідки їде</dt><dd>{d.start_point}</dd></div>
        <div><dt>Волонтер</dt><dd>{d.volunteer_first_name}</dd></div>
        <div><dt>{delivered ? 'Доставлено' : 'Планова дата'}</dt><dd>{formatDate(delivered ? d.actual_date : d.planned_date)}</dd></div>
      </dl>
      {delivered && (d.has_feedback
        ? <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={18} color="var(--green)" aria-hidden="true" /> Дякуємо, відгук уже залишено.</p>
        : <ReviewForm deliveryId={d.delivery_id} onSaved={reload} />)}
    </section>
  );
}

export default function Track() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(id ? `/track/${id}` : null);

  if (!id) {
    return (
      <div className="container track-page">
        <div className="form-page__head">
          <h1>Відстежити заявку</h1>
          <p className="lead">Введіть номер заявки, і ви побачите, де зараз ваша допомога.</p>
        </div>
        <SearchForm />
      </div>
    );
  }

  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <div className="container track-page">
      {loading && <Loading lines={4} />}
      {notFound && (
        <>
          <div className="form-page__head">
            <h1>Заявку не знайдено</h1>
            <p className="lead">Заявки з номером {id} немає. Перевірте номер і спробуйте ще раз.</p>
          </div>
          <SearchForm initial={id} />
        </>
      )}
      {error && !notFound && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <section className="track-summary">
            <div className="track-summary__top">
              <h2>Заявка № {data.request_id}</h2>
              <StatusBadge value={data.request_state} />
            </div>
            <dl className="kv">
              <div><dt>Створено</dt><dd>{formatDate(data.created_at)}</dd></div>
              <div><dt>Область</dt><dd>{data.region}</dd></div>
              <div><dt>Терміновість</dt><dd>{data.priority}</dd></div>
            </dl>
            <ul className="item-list" aria-label="Що замовлено">
              {data.items.map((i) => (
                <li key={i.item_name}><span>{i.item_name}</span><strong>{i.quantity_needed} {i.unit}</strong></li>
              ))}
            </ul>
          </section>

          {data.deliveries.length === 0 ? (
            <div className="state">
              {data.request_state === 'скасована'
                ? 'Заявку скасовано.'
                : 'Заявку прийнято. Координатор збирає набір і незабаром призначить волонтера. Загляньте сюди пізніше.'}
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.375rem' }}>
                {data.deliveries.length} {plural(data.deliveries.length, ['доставка', 'доставки', 'доставок'])}
              </h2>
              {data.deliveries.map((d, i) => (
                <Delivery key={d.delivery_id} d={d} index={i} total={data.deliveries.length} reload={reload} />
              ))}
            </>
          )}
          <p><Link to="/track">Шукати іншу заявку</Link></p>
        </>
      )}
    </div>
  );
}
