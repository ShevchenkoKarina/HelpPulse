import { useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Dialog from '../../components/Dialog.jsx';
import Field from '../../components/Field.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

const today = () => new Date().toISOString().slice(0, 10);

function DeliveryForm({ kit, onClose, onSaved }) {
  const volunteers = useApi('/volunteers');
  const routes = useApi('/routes');
  const [f, setF] = useState({ volunteer_id: '', route_id: '', start_point: '', end_point: '', distance_km: '', planned_date: today(), volunteer_note: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };
  const isNew = f.route_id === 'new';

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!f.volunteer_id) x.volunteer_id = 'Оберіть волонтера';
    if (!f.route_id) x.route_id = 'Оберіть маршрут';
    if (isNew) {
      if (!f.start_point.trim()) x.start_point = 'Вкажіть початок маршруту';
      if (!f.end_point.trim()) x.end_point = 'Вкажіть кінець маршруту';
      if (!(Number(f.distance_km) > 0)) x.distance_km = 'Вкажіть відстань у км';
    }
    if (!f.planned_date) x.planned_date = 'Вкажіть дату';
    setErrors(x); setErr('');
    if (Object.keys(x).length) return;
    const body = { kit_id: kit.kit_id, volunteer_id: Number(f.volunteer_id), planned_date: f.planned_date };
    if (f.volunteer_note.trim()) body.volunteer_note = f.volunteer_note.trim();
    if (isNew) body.route = { start_point: f.start_point.trim(), end_point: f.end_point.trim(), distance_km: Number(f.distance_km) };
    else body.route_id = Number(f.route_id);
    setBusy(true);
    try { await api('/deliveries', { method: 'POST', body }); onSaved(); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <Dialog title={`Доставка для набору № ${kit.kit_id}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate style={{ gap: 16 }}>
        <p className="muted">{kit.requester_name}, {kit.region} область. Склад: {kit.warehouse_name}.</p>
        <Field label="Волонтер" error={errors.volunteer_id}>
          <select className="input select" value={f.volunteer_id} onChange={set('volunteer_id')}>
            <option value="">Оберіть волонтера…</option>
            {(volunteers.data || []).map((v) => <option key={v.volunteer_id} value={v.volunteer_id}>{v.volunteer_name}{v.has_vehicle === 'Y' ? ' (є авто)' : ''}</option>)}
          </select>
        </Field>
        <Field label="Маршрут" error={errors.route_id}>
          <select className="input select" value={f.route_id} onChange={set('route_id')}>
            <option value="">Оберіть маршрут…</option>
            {(routes.data || []).map((r) => <option key={r.route_id} value={r.route_id}>{r.start_point} → {r.end_point} ({r.distance_km} км)</option>)}
            <option value="new">Новий маршрут…</option>
          </select>
        </Field>
        {isNew && (
          <>
            <div className="grid-2">
              <Field label="Звідки" error={errors.start_point}><input className="input" value={f.start_point} onChange={set('start_point')} /></Field>
              <Field label="Куди" error={errors.end_point}><input className="input" value={f.end_point} onChange={set('end_point')} /></Field>
            </div>
            <Field label="Відстань, км" error={errors.distance_km}><input className="input" type="number" min="0" step="0.1" value={f.distance_km} onChange={set('distance_km')} /></Field>
          </>
        )}
        <Field label="Планова дата" error={errors.planned_date}><input className="input" type="date" value={f.planned_date} onChange={set('planned_date')} /></Field>
        <Field label="Примітка для волонтера" optional><textarea className="input" maxLength={500} value={f.volunteer_note} onChange={set('volunteer_note')} /></Field>
        {err && <div className="alert" role="alert">{err}</div>}
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>Призначити доставку</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Dialog>
  );
}

function KitDialog({ kit, onClose, onAssign }) {
  const { data, error, loading, reload } = useApi(`/kits/${kit.kit_id}`);
  return (
    <Dialog title={`Набір № ${kit.kit_id}`} onClose={onClose}>
      {loading && <Loading lines={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <dl className="kv">
            <div><dt>Заявка</dt><dd>№ {data.request_id}, {data.requester_name}</dd></div>
            <div><dt>Склад</dt><dd>{data.warehouse_name}</dd></div>
            <div><dt>Створено</dt><dd>{formatDateShort(data.created_at)}</dd></div>
          </dl>
          <ul className="item-list" aria-label="Вміст набору">
            {data.items.map((i) => <li key={i.item_id}><span>{i.item_name}</span><strong>{formatNumber(i.quantity)} × {i.unit}</strong></li>)}
          </ul>
          {!data.delivery_id && <div className="dialog__foot"><button className="btn btn--primary" onClick={onAssign}>Призначити доставку</button></div>}
        </>
      )}
    </Dialog>
  );
}

export default function AdminKits() {
  const { data, error, loading, reload } = useApi('/kits');
  const [view, setView] = useState(null);
  const [assign, setAssign] = useState(null);
  return (
    <>
      <PageHeader title="Набори допомоги">Набори зібрані зі складів під заявки. Для набору без доставки призначте волонтера й маршрут.</PageHeader>
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>Наборів ще немає. Сформуйте набір у розділі «Заявки».</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>№</th><th>Дата</th><th>Заявка</th><th>Отримувач</th><th>Склад</th><th className="num">Одиниць</th><th>Доставка</th><th><span className="sr-only">Дії</span></th></tr></thead>
              <tbody>
                {data.map((k) => (
                  <tr key={k.kit_id}>
                    <td className="nowrap">{k.kit_id}</td>
                    <td className="nowrap">{formatDateShort(k.created_at)}</td>
                    <td className="nowrap">№ {k.request_id}</td>
                    <td>{k.requester_name}</td>
                    <td className="nowrap">{k.warehouse_name}</td>
                    <td className="num">{formatNumber(k.total_quantity)}</td>
                    <td className="nowrap">{k.delivery_id ? `№ ${k.delivery_id}` : <StatusBadge value="створено" />}</td>
                    <td><div className="row-actions">
                      <button className="btn btn--ghost btn--small" onClick={() => setView(k)}>Вміст</button>
                      {!k.delivery_id && <button className="btn btn--primary btn--small" onClick={() => setAssign(k)}>Призначити</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {view && <KitDialog kit={view} onClose={() => setView(null)} onAssign={() => { setAssign(view); setView(null); }} />}
      {assign && <DeliveryForm kit={assign} onClose={() => setAssign(null)} onSaved={reload} />}
    </>
  );
}
