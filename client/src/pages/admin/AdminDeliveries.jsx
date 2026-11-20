import { useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import DeliveryTrack from '../../components/DeliveryTrack.jsx';
import Dialog from '../../components/Dialog.jsx';
import Filters from '../../components/Filters.jsx';
import Field from '../../components/Field.jsx';
import StarInput from '../../components/StarInput.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

const FILTERS = [
  { value: '', label: 'Усі' }, { value: 'створено', label: 'Створено' }, { value: 'зібрано', label: 'Зібрано' },
  { value: 'в дорозі', label: 'В дорозі' }, { value: 'доставлено', label: 'Доставлено' }, { value: 'скасовано', label: 'Скасовано' },
];
const NEXT = { 'створено': ['зібрано', 'Зібрано'], 'зібрано': ['в дорозі', 'Відправити'] };

/** Завершення доставки: одна транзакція (статус, дата, заявка, відгук). */
function CompleteDialog({ d, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const body = rating ? { rating, review_text: text.trim() || null } : {};
    try { await api(`/deliveries/${d.delivery_id}/complete`, { method: 'POST', body }); onDone(); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Dialog title={`Завершити доставку № ${d.delivery_id}`} onClose={onClose}>
      <form className="form" onSubmit={submit} style={{ gap: 16 }}>
        <p>Буде встановлено статус «доставлено» і сьогоднішню дату. Якщо це остання доставка за заявкою, заявка стане «виконана».</p>
        <StarInput legend="Оцінка отримувача (необов’язково)" value={rating} onChange={setRating} />
        {rating > 0 && <Field label="Відгук" optional><textarea className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} /></Field>}
        {err && <div className="alert" role="alert">{err}</div>}
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>Завершити доставку</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Не зараз</button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmCancel({ d, onClose, onDone }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr('');
    try { await api(`/deliveries/${d.delivery_id}/status`, { method: 'PATCH', body: { status_name: 'скасовано' } }); onDone(); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Dialog title={`Скасувати доставку № ${d.delivery_id}?`} onClose={onClose}>
      <p>Товари з набору повернуться на склад «{d.warehouse_name}». Цю дію не можна відмінити.</p>
      {err && <div className="alert" role="alert">{err}</div>}
      <div className="dialog__foot">
        <button className="btn btn--danger" onClick={go} disabled={busy}>Скасувати доставку</button>
        <button className="btn btn--ghost" onClick={onClose}>Залишити</button>
      </div>
    </Dialog>
  );
}

function DetailDialog({ d, onClose }) {
  const { data, error, loading, reload } = useApi(`/deliveries/${d.delivery_id}`);
  return (
    <Dialog title={`Доставка № ${d.delivery_id}`} onClose={onClose}>
      {loading && <Loading lines={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <DeliveryTrack status={data.status_name} />
          <dl className="kv">
            <div><dt>Отримувач</dt><dd>{data.requester_name}</dd></div>
            <div><dt>Волонтер</dt><dd>{data.volunteer_name}, {data.volunteer_phone}</dd></div>
            <div><dt>Маршрут</dt><dd>{data.start_point} → {data.end_point} ({data.distance_km} км)</dd></div>
            <div><dt>План / факт</dt><dd>{formatDateShort(data.planned_date)} / {data.actual_date ? formatDateShort(data.actual_date) : '—'}</dd></div>
          </dl>
          {data.volunteer_note && <p><strong>Примітка:</strong> {data.volunteer_note}</p>}
          <ul className="item-list" aria-label="Вміст набору">
            {data.items.map((i) => <li key={i.item_id}><span>{i.item_name}</span><strong>{formatNumber(i.quantity)} × {i.unit}</strong></li>)}
          </ul>
          {data.feedback && <p><strong>Відгук:</strong> {data.feedback.rating} з 5{data.feedback.review_text ? `. ${data.feedback.review_text}` : ''}</p>}
        </>
      )}
    </Dialog>
  );
}

export default function AdminDeliveries() {
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useApi(`/deliveries${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  const [dialog, setDialog] = useState(null); // { type, d }
  const [rowErr, setRowErr] = useState('');

  async function advance(d, target) {
    setRowErr('');
    try { await api(`/deliveries/${d.delivery_id}/status`, { method: 'PATCH', body: { status_name: target } }); reload(); }
    catch (ex) { setRowErr(ex.message); }
  }
  const close = () => setDialog(null);

  return (
    <>
      <PageHeader title="Доставки">Рух наборів до отримувачів. Завершення доставки виконується однією транзакцією.</PageHeader>
      <Filters label="Фільтр за статусом" value={status} onChange={setStatus} options={FILTERS} />
      {rowErr && <div className="alert" role="alert">{rowErr}</div>}
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>Доставок з таким статусом немає.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>№</th><th>Заявка</th><th>Отримувач</th><th>Волонтер</th><th>Дата</th><th>Статус</th><th><span className="sr-only">Дії</span></th></tr></thead>
              <tbody>
                {data.map((d) => {
                  const next = NEXT[d.status_name];
                  const open = !['доставлено', 'скасовано'].includes(d.status_name);
                  return (
                    <tr key={d.delivery_id}>
                      <td className="nowrap">{d.delivery_id}</td>
                      <td className="nowrap">№ {d.request_id}</td>
                      <td>{d.requester_name}</td>
                      <td className="nowrap">{d.volunteer_name}</td>
                                            <td className="nowrap">{formatDateShort(d.actual_date || d.planned_date)}</td>
                      <td className="nowrap"><StatusBadge value={d.status_name} /></td>
                      <td><div className="row-actions">
                        <button className="btn btn--ghost btn--small" onClick={() => setDialog({ type: 'view', d })}>Деталі</button>
                        {next && <button className="btn btn--primary btn--small" onClick={() => advance(d, next[0])}>{next[1]}</button>}
                        {d.status_name === 'в дорозі' && <button className="btn btn--accent btn--small" onClick={() => setDialog({ type: 'complete', d })}>Завершити</button>}
                        {open && <button className="btn btn--danger btn--small" onClick={() => setDialog({ type: 'cancel', d })}>Скасувати</button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dialog?.type === 'view' && <DetailDialog d={dialog.d} onClose={close} />}
      {dialog?.type === 'complete' && <CompleteDialog d={dialog.d} onClose={close} onDone={reload} />}
      {dialog?.type === 'cancel' && <ConfirmCancel d={dialog.d} onClose={close} onDone={reload} />}
    </>
  );
}
