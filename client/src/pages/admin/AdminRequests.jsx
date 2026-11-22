import { useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Dialog from '../../components/Dialog.jsx';
import Filters from '../../components/Filters.jsx';
import Field from '../../components/Field.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

const FILTERS = [
  { value: '', label: 'Усі' }, { value: 'нова', label: 'Нові' }, { value: 'в обробці', label: 'В обробці' },
  { value: 'виконана', label: 'Виконані' }, { value: 'скасована', label: 'Скасовані' },
];

function RequestDialog({ id, onClose, onChanged }) {
  const { data: r, error, loading, reload } = useApi(`/requests/${id}`);
  const warehouses = useApi('/warehouses');
  const [wh, setWh] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  async function run(fn, okText) {
    setBusy(true); setMsg({ type: '', text: '' });
    try { await fn(); setMsg({ type: 'ok', text: okText }); reload(); onChanged(); }
    catch (ex) { setMsg({ type: 'err', text: ex.message }); }
    finally { setBusy(false); }
  }
  const makeKit = () => {
    if (!wh) { setMsg({ type: 'err', text: 'Оберіть склад, з якого збирати набір' }); return; }
    run(() => api('/kits', { method: 'POST', body: { request_id: id, warehouse_id: Number(wh) } }), '');
  };
  const cancel = () => run(() => api(`/requests/${id}`, { method: 'PATCH', body: { request_state: 'скасована' } }), 'Заявку скасовано');
  const canAct = r && (r.request_state === 'нова' || r.request_state === 'в обробці');

  return (
    <Dialog title={`Заявка № ${id}`} onClose={onClose}>
      {loading && <Loading lines={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {r && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><StatusBadge value={r.request_state} /><StatusBadge value={r.priority} /></div>
          <dl className="kv">
            <div><dt>Заявник</dt><dd>{r.requester_name} ({r.requester_type})</dd></div>
            <div><dt>Телефон</dt><dd>{r.phone || '—'}</dd></div>
            <div><dt>Область</dt><dd>{r.region}</dd></div>
            <div><dt>Створено</dt><dd>{formatDateShort(r.created_at)}</dd></div>
          </dl>
          <dl className="kv"><div><dt>Адреса</dt><dd>{r.address}</dd></div></dl>
          <ul className="item-list" aria-label="Потрібні товари">
            {r.items.map((i) => <li key={i.item_id}><span>{i.item_name}</span><strong>{formatNumber(i.quantity_needed)} × {i.unit}</strong></li>)}
          </ul>
          {canAct && !r.kit && (
            <Field label="Склад для комплектації" hint="Товари буде списано з обраного складу. Якщо їх не вистачає, набір не створиться.">
              <select className="input select" value={wh} onChange={(e) => setWh(e.target.value)}>
                <option value="">Оберіть склад…</option>
                {(warehouses.data || []).map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </Field>
          )}
          {r.kit && (
            <div className="notice" role="status">
              Набір № {r.kit.kit_id} сформовано на складі «{r.kit.warehouse_name}», товари списано.
              {canAct && (r.kit.delivery_id
                ? ` Доставку призначено (№ ${r.kit.delivery_id}).`
                : ' Далі призначте доставку у розділі «Сформовані набори».')}
            </div>
          )}
          {canAct && (
            <div className="dialog__foot">
              {!r.kit && <button type="button" className="btn btn--primary" onClick={makeKit} disabled={busy}>Сформувати набір</button>}
              <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>Скасувати заявку</button>
            </div>
          )}
          {msg.type === 'ok' && msg.text && <div className="notice" role="status">{msg.text}</div>}
          {msg.type === 'err' && <div className="alert" role="alert">{msg.text}</div>}
        </>
      )}
    </Dialog>
  );
}

export default function AdminRequests() {
  const [state, setState] = useState('');
  const { data, error, loading, reload } = useApi(`/requests${state ? `?state=${encodeURIComponent(state)}` : ''}`);
  const [open, setOpen] = useState(null);
  return (
    <>
      <PageHeader title="Заявки">Заявки отримувачів допомоги. Відкрийте заявку, щоб сформувати набір зі складу.</PageHeader>
      <Filters label="Фільтр за статусом" value={state} onChange={setState} options={FILTERS} />
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>Заявок з таким статусом немає.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>№</th><th>Дата</th><th>Заявник</th><th>Область</th><th className="num">Позицій</th><th className="num">Одиниць</th><th>Терміновість</th><th>Статус</th><th><span className="sr-only">Дії</span></th></tr></thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.request_id}>
                    <td className="nowrap">{r.request_id}</td>
                    <td className="nowrap">{formatDateShort(r.created_at)}</td>
                    <td>{r.requester_name}</td>
                    <td className="nowrap">{r.region}</td>
                    <td className="num">{r.items_count}</td>
                    <td className="num">{formatNumber(r.total_needed)}</td>
                    <td className="nowrap"><StatusBadge value={r.priority} /></td>
                    <td className="nowrap"><StatusBadge value={r.request_state} /></td>
                    <td><div className="row-actions"><button type="button" className="btn btn--ghost btn--small" onClick={() => setOpen(r.request_id)}>Відкрити</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && <RequestDialog id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
