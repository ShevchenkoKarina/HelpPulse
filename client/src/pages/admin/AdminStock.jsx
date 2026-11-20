import { useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Filters from '../../components/Filters.jsx';
import Dialog from '../../components/Dialog.jsx';
import Field from '../../components/Field.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

const LOW = 50; // нижче цього залишку рядок підсвічується

function EditDialog({ row, onClose, onSaved }) {
  const [qty, setQty] = useState(String(row.quantity));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (qty === '' || !Number.isInteger(Number(qty)) || Number(qty) < 0) { setErr('Введіть ціле число від 0'); return; }
    setBusy(true); setErr('');
    try { await api('/stock', { method: 'PUT', body: { warehouse_id: row.warehouse_id, item_id: row.item_id, quantity: Number(qty) } }); onSaved(); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Dialog title="Виправити залишок" onClose={onClose} small>
      <form className="form" onSubmit={submit} noValidate style={{ gap: 16 }}>
        <p><strong>{row.item_name}</strong><br /><span className="muted">{row.warehouse_name}, зараз {formatNumber(row.quantity)} {row.unit}</span></p>
        <Field label="Фактична кількість (інвентаризація)" error={err}>
          <input className="input" type="number" min="0" step="1" value={qty} onChange={(e) => { setQty(e.target.value); setErr(''); }} />
        </Field>
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>Зберегти</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminStock() {
  const [mode, setMode] = useState('wh');
  const [wh, setWh] = useState('');
  const [min, setMin] = useState('0');
  const warehouses = useApi('/warehouses');
  const stock = useApi(mode === 'wh' ? `/stock${wh ? `?warehouse_id=${wh}` : ''}` : `/stock/totals?min=${Number(min) >= 0 ? Number(min) : 0}`);
  const [edit, setEdit] = useState(null);
  const { data, error, loading, reload } = stock;

  return (
    <>
      <PageHeader title="Склад і залишки">Скільки чого лежить на складах. Залишки змінюються автоматично: пожертви додають, набори списують.</PageHeader>
      <div className="toolbar">
        <Filters label="Вигляд" value={mode} onChange={setMode} options={[{ value: 'wh', label: 'По складах' }, { value: 'total', label: 'Разом по товарах' }]} />
        {mode === 'wh' ? (
          <div className="toolbar__search">
            <label className="sr-only" htmlFor="wh">Склад</label>
            <select id="wh" className="input select" value={wh} onChange={(e) => setWh(e.target.value)}>
              <option value="">Усі склади</option>
              {(warehouses.data || []).map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
            </select>
          </div>
        ) : (
          <div className="toolbar__search">
            <label className="sr-only" htmlFor="min">Показувати товари, яких разом більше ніж</label>
            <input id="min" className="input" type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Більше ніж… (наприклад, 100)" />
          </div>
        )}
      </div>
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>За цим фільтром нічого немає.</Empty>}
        {data && data.length > 0 && mode === 'wh' && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Склад</th><th>Категорія</th><th>Товар</th><th className="num">Залишок</th><th><span className="sr-only">Дії</span></th></tr></thead>
            <tbody>{data.map((r) => (
              <tr key={`${r.warehouse_id}-${r.item_id}`}>
                <td className="nowrap">{r.warehouse_name}</td><td>{r.category_name}</td><td>{r.item_name}</td>
                <td className={`num${r.quantity < LOW ? ' low' : ''}`}>{formatNumber(r.quantity)} {r.unit}</td>
                <td><div className="row-actions"><button className="btn btn--ghost btn--small" onClick={() => setEdit(r)}>Виправити</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
        {data && data.length > 0 && mode === 'total' && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Товар</th><th>Категорія</th><th className="num">Разом на всіх складах</th></tr></thead>
            <tbody>{data.map((r) => (
              <tr key={r.item_id}><td>{r.item_name}</td><td>{r.category_name}</td><td className="num">{formatNumber(r.total_quantity)} {r.unit}</td></tr>))}</tbody>
          </table></div>
        )}
      </section>
      {mode === 'wh' && <p className="muted">Червоним позначено залишок менше {LOW}.</p>}
      {mode === 'total' && <p className="muted">Це запит із групуванням: GROUP BY + HAVING SUM(quantity) &gt; {Number(min) || 0}.</p>}
      {edit && <EditDialog row={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
