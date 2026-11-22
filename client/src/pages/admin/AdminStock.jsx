import { useState } from 'react';
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

export default function AdminStock() {
  const [wh, setWh] = useState('');
  const [cat, setCat] = useState('');
  const [item, setItem] = useState('');
  const warehouses = useApi('/warehouses');
  const categories = useApi('/categories');
  const items = useApi('/items');

  // Список товарів звужується до обраної категорії
  const itemOptions = (items.data || [])
    .filter((i) => !cat || String(i.category_id) === cat)
    .sort((x, y) => x.item_name.localeCompare(y.item_name, 'uk'));
  const catName = (categories.data || []).find((c) => String(c.category_id) === cat)?.category_name;

  // Усі три умови діють разом (склад І категорія І товар), але кожну можна обрати окремо
  const qs = new URLSearchParams();
  if (wh) qs.set('warehouse_id', wh);
  if (catName) qs.set('category', catName);
  if (item) qs.set('item_id', item);
  const { data, error, loading, reload } = useApi(`/stock${qs.toString() ? `?${qs}` : ''}`);
  const [edit, setEdit] = useState(null);
  const filtered = !!(wh || cat || item);
  const reset = () => { setWh(''); setCat(''); setItem(''); };
  const changeCat = (v) => {
    setCat(v);
    const cur = (items.data || []).find((i) => String(i.item_id) === item);
    if (v && cur && String(cur.category_id) !== v) setItem('');
  };

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
          <label className="sr-only" htmlFor="cat">Категорія</label>
          <select id="cat" className="input select" value={cat} onChange={(e) => changeCat(e.target.value)}>
            <option value="">Усі категорії</option>
            {(categories.data || []).map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="nm">Товар</label>
          <select id="nm" className="input select" value={item} onChange={(e) => setItem(e.target.value)}>
            <option value="">Усі товари</option>
            {itemOptions.map((i) => <option key={i.item_id} value={i.item_id}>{i.item_name}</option>)}
          </select>
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
