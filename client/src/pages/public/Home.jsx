import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import DeliveryTrack from '../../components/DeliveryTrack.jsx';
import Stars from '../../components/Stars.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';
import { formatDate, formatNumber, plural } from '../../utils/format.js';

/** Табло живих доставок. Лише склад і область: без імен та адрес отримувачів. */
function LiveBoard() {
  const { data, error, loading, reload } = useApi('/track/board');

  return (
    <section className="board" aria-labelledby="board-title">
      <div className="board__head">
        <h2 className="board__title" id="board-title">Зараз у русі</h2>
        <span className="board__live">актуально зараз</span>
      </div>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <p className="board__empty">Активних доставок зараз немає.</p>}
      {data && data.length > 0 && (
        <ul className="board__list">
          {data.slice(0, 3).map((d, i) => (
            <li key={i} className="delivery-card">
              <div className="delivery-card__top">
                <span className="delivery-card__route">{d.warehouse_name} → {d.region} область</span>
                <span className="delivery-card__meta">очікується {formatDate(d.planned_date)}</span>
              </div>
              <DeliveryTrack status={d.status_name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrackForm() {
  const [id, setId] = useState('');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const n = id.trim().replace(/^№/, '');
    navigate(n ? `/track/${encodeURIComponent(n)}` : '/track');
  };
  return (
    <form className="trackform" onSubmit={submit}>
      <label className="trackform__label" htmlFor="track-id">Вже подали заявку? Введіть її номер</label>
      <div className="trackform__row">
        <input
          id="track-id" className="input" inputMode="numeric" placeholder="Наприклад, 7"
          value={id} onChange={(e) => setId(e.target.value)}
        />
        <button className="btn btn--primary" type="submit"><Search size={18} aria-hidden="true" /> Знайти</button>
      </div>
    </form>
  );
}

function Stats() {
  const { data } = useApi('/reports/summary');
  const items = data && [
    { value: formatNumber(data.active_requests), label: plural(data.active_requests, ['активна заявка', 'активні заявки', 'активних заявок']) },
    { value: formatNumber(data.delivered), label: plural(data.delivered, ['доставка виконана', 'доставки виконано', 'доставок виконано']) },
    { value: formatNumber(data.volunteers), label: plural(data.volunteers, ['волонтер', 'волонтери', 'волонтерів']) },
    { value: formatNumber(data.stock_total), label: 'одиниць допомоги на складах' },
  ];
  return (
    <div className="stats">
      <div className="container">
        <ul className="stats__grid" aria-label="Платформа у цифрах">
          {(items || [0, 1, 2, 3].map(() => ({ value: '·', label: ' ' }))).map((s, i) => (
            <li key={i} className="stats__item">
              <span className="stats__value">{s.value}</span>
              <span className="stats__label">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Reviews() {
  const { data, error, loading, reload } = useApi('/feedback/public');
  const best = data && [...data].filter((f) => f.review_text).sort((a, b) => b.rating - a.rating || (a.feedback_date < b.feedback_date ? 1 : -1)).slice(0, 3);

  return (
    <section className="section" aria-labelledby="reviews-title">
      <div className="container">
        <div className="section__head">
          <h2 id="reviews-title">Що кажуть ті, хто отримав допомогу</h2>
        </div>
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {best && best.length === 0 && <Empty>Відгуків поки немає. Вони з’являться після перших доставок.</Empty>}
        {best && best.length > 0 && (
          <ul className="quotes">
            {best.map((f) => (
              <li key={f.feedback_id} className="quote">
                <blockquote style={{ margin: 0 }}>
                  <p className="quote__text">«{f.review_text}»</p>
                </blockquote>
                <div>
                  <Stars value={f.rating} />
                  <p className="quote__who">Отримувач допомоги, {f.region} область</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: 32 }}>
          <Link to="/reviews" className="btn btn--ghost">Усі відгуки <ArrowRight size={18} aria-hidden="true" /></Link>
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__text">
            <h1>Допомога, яка доходить до адресата</h1>
            <p className="lead">
              Подайте заявку на їжу, ліки чи одяг, передайте допомогу як донор
              і стежте, як набір їде від складу до людей.
            </p>
            <div className="hero__actions">
              <Link to="/request" className="btn btn--primary">Подати заявку</Link>
              <Link to="/donate" className="btn btn--accent">Допомогти</Link>
            </div>
            <TrackForm />
          </div>
          <LiveBoard />
        </div>
      </section>

      <Stats />

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className="section__head">
            <h2 id="how-title">Як це працює</h2>
            <p className="lead">Кожна заявка проходить чотири кроки, і на кожному видно, де зараз допомога.</p>
          </div>
          <ol className="flow">
            <li className="flow__step"><h3>Заявка</h3><p>Ви описуєте, що потрібно і скільки, а ми реєструємо потребу.</p></li>
            <li className="flow__step"><h3>Набір</h3><p>Склад збирає набір із наявних запасів, залишки оновлюються автоматично.</p></li>
            <li className="flow__step"><h3>Доставка</h3><p>Волонтер везе набір за маршрутом, статус змінюється на кожному етапі.</p></li>
            <li className="flow__step"><h3>Відгук</h3><p>Після отримання ви оцінюєте доставку, і це допомагає робити її кращою.</p></li>
          </ol>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }} aria-label="З чого почати">
        <div className="container paths">
          <div className="path path--need">
            <h2>Потрібна допомога</h2>
            <p>Опишіть, що саме потрібно вам, вашій родині чи закладу. Заявка займає кілька хвилин.</p>
            <Link to="/request" className="btn btn--accent">Подати заявку</Link>
          </div>
          <div className="path path--give">
            <h2>Хочете допомогти</h2>
            <p>Передайте їжу, ліки, одяг чи спорядження на склад найближчого міста. Ми покажемо, куди вони поїдуть.</p>
            <Link to="/donate" className="btn btn--primary">Передати допомогу</Link>
          </div>
        </div>
      </section>

      <Reviews />
    </>
  );
}
