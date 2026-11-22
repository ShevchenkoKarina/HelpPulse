import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
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
        <p><strong>{row.item_name}</strong><br /><span className="muted">{row.warehouse_name}, зараз {formatNumber(row.quantity)} × {row.unit}</span></p>
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

/** Повертає значення із затримкою: пошук іде, коли людина зробила паузу в наборі, а не після кожної літери. */
function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function AdminStock() {
  const [wh, setWh] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const warehouses = useApi('/warehouses');

  // Усі три умови діють разом (склад І категорія І назва)
  const dCategory = useDebounced(category).trim();
  const dName = useDebounced(name).trim();
  const qs = new URLSearchParams();
  if (wh) qs.set('warehouse_id', wh);
  if (dCategory) qs.set('category', dCategory);
  if (dName) qs.set('q', dName);
  const { data, error, loading, reload } = useApi(`/stock${qs.toString() ? `?${qs}` : ''}`);
  const [edit, setEdit] = useState(null);
  const filtered = !!(wh || category.trim() || name.trim());
  const reset = () => { setWh(''); setCategory(''); setName(''); };

  return (
    <>
      <PageHeader title="Склад і залишки">Скільки чого лежить на складах: від більшого залишку до меншого. Залишки змінюються автоматично: пожертви додають, набори списують.</PageHeader>
      <div className="stock-filters">
        <div>
          <label className="sr-only" htmlFor="wh">Склад</label>
          <select id="wh" className="input select" value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Усі склади</option>
            {(warehouses.data || []).map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="cat">Пошук за категорією</label>
          <input id="cat" className="input" type="search" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Категорія, наприклад: Їжа" autoComplete="off" />
        </div>
        <div>
          <label className="sr-only" htmlFor="nm">Пошук за назвою товару</label>
          <input id="nm" className="input" type="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва товару, наприклад: вода" autoComplete="off" />
        </div>
        {filtered && <button type="button" className="btn btn--ghost" onClick={reset}>Скинути</button>}
      </div>
      <section className="panel">
        {loading && !data && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>За цими умовами нічого не знайдено. Спробуйте змінити або скинути пошук.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Склад</th><th>Категорія</th><th>Товар</th><th className="num">Залишок</th><th><span className="sr-only">Дії</span></th></tr></thead>
            <tbody>{data.map((r) => (
              <tr key={`${r.warehouse_id}-${r.item_id}`}>
                <td className="nowrap">{r.warehouse_name}</td><td>{r.category_name}</td><td>{r.item_name}</td>
                <td className={`num${r.quantity < LOW ? ' low' : ''}`}>{formatNumber(r.quantity)} × {r.unit}</td>
                <td><div className="row-actions"><button className="btn btn--ghost btn--small" onClick={() => setEdit(r)}>Виправити</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
      {data && data.length > 0 && <p className="muted">Знайдено позицій: {data.length}. Червоним позначено залишок менше {LOW}.</p>}
      {edit && <EditDialog row={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
