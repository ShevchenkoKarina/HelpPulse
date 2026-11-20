import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Dialog from '../../components/Dialog.jsx';
import Field from '../../components/Field.jsx';
import ItemsPicker, { newRow, readRows } from '../../components/ItemsPicker.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

const today = () => new Date().toISOString().slice(0, 10);

function NewDonation({ onClose, onSaved }) {
  const donors = useApi('/donors');
  const warehouses = useApi('/warehouses');
  const items = useApi('/items');
  const [f, setF] = useState({ donor_id: '', warehouse_id: '', donation_date: today() });
  const [rows, setRows] = useState([newRow()]);
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!f.donor_id) x.donor_id = 'Оберіть донора';
    if (!f.warehouse_id) x.warehouse_id = 'Оберіть склад';
    if (!f.donation_date) x.donation_date = 'Вкажіть дату';
    const { items: list, error: ie } = readRows(rows);
    if (ie) x.items = ie;
    setErrors(x); setErr('');
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api('/donations', { method: 'POST', body: { donor_id: Number(f.donor_id), warehouse_id: Number(f.warehouse_id), donation_date: f.donation_date, items: list } });
      onSaved(); onClose();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Dialog title="Нова пожертва" onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate style={{ gap: 16 }}>
        <Field label="Донор" error={errors.donor_id} hint="Нового донора додайте у «Довідники → Донори»">
          <select className="input select" value={f.donor_id} onChange={set('donor_id')}>
            <option value="">Оберіть донора…</option>
            {(donors.data || []).map((d) => <option key={d.donor_id} value={d.donor_id}>{d.donor_name}</option>)}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Склад" error={errors.warehouse_id}>
            <select className="input select" value={f.warehouse_id} onChange={set('warehouse_id')}>
              <option value="">Оберіть склад…</option>
              {(warehouses.data || []).map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
            </select>
          </Field>
          <Field label="Дата" error={errors.donation_date}><input className="input" type="date" value={f.donation_date} onChange={set('donation_date')} /></Field>
        </div>
        {items.data && <ItemsPicker catalog={items.data} rows={rows} onChange={(r) => { setRows(r); setErrors((x) => ({ ...x, items: undefined })); }} error={errors.items} showRowErrors={!!errors.items} />}
        {err && <div className="alert" role="alert">{err}</div>}
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>Записати пожертву</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Dialog>
  );
}

function Detail({ id, onClose }) {
  const { data, error, loading, reload } = useApi(`/donations/${id}`);
  return (
    <Dialog title={`Пожертва № ${id}`} onClose={onClose}>
      {loading && <Loading lines={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (<>
        <dl className="kv">
          <div><dt>Донор</dt><dd>{data.donor_name} ({data.donor_type})</dd></div>
          <div><dt>Склад</dt><dd>{data.warehouse_name}</dd></div>
          <div><dt>Дата</dt><dd>{formatDateShort(data.donation_date)}</dd></div>
        </dl>
        <ul className="item-list">{data.items.map((i) => <li key={i.item_id}><span>{i.item_name}</span><strong>{formatNumber(i.quantity)} × {i.unit}</strong></li>)}</ul>
      </>)}
    </Dialog>
  );
}

export default function AdminDonations() {
  const { data, error, loading, reload } = useApi('/donations');
  const [dlg, setDlg] = useState(null);
  return (
    <>
      <PageHeader title="Пожертви" actions={<button className="btn btn--primary" onClick={() => setDlg({ type: 'new' })}><Plus size={18} aria-hidden="true" /> Нова пожертва</button>}>
        Передані донорами товари. Кожна нова пожертва одразу збільшує залишки на складі.
      </PageHeader>
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>Пожертв ще немає.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>№</th><th>Дата</th><th>Донор</th><th>Склад</th><th className="num">Позицій</th><th className="num">Одиниць</th><th><span className="sr-only">Дії</span></th></tr></thead>
            <tbody>{data.map((d) => (
              <tr key={d.donation_id}>
                <td className="nowrap">{d.donation_id}</td><td className="nowrap">{formatDateShort(d.donation_date)}</td>
                <td>{d.donor_name}</td><td className="nowrap">{d.warehouse_name}</td>
                <td className="num">{d.items_count}</td><td className="num">{formatNumber(d.total_quantity)}</td>
                <td><div className="row-actions"><button className="btn btn--ghost btn--small" onClick={() => setDlg({ type: 'view', id: d.donation_id })}>Склад</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
      {dlg?.type === 'new' && <NewDonation onClose={() => setDlg(null)} onSaved={reload} />}
      {dlg?.type === 'view' && <Detail id={dlg.id} onClose={() => setDlg(null)} />}
    </>
  );
}
