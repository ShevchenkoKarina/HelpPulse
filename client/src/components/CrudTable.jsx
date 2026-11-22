import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import Dialog from './Dialog.jsx';
import Field from './Field.jsx';
import { Empty, ErrorState, Loading } from './States.jsx';

/**
 * Універсальна таблиця з додаванням, зміною та видаленням записів (CRUD) для простих таблиць БД.
 * columns: [{ key, label, type: 'text'|'number'|'enum'|'ref', required, options, refPath, refValue, refLabel, hint, placeholder, table: false, render }]
 */
function RowForm({ cfg, row, refs, onClose, onSaved }) {
  const editing = !!row;
  const [f, setF] = useState(() => Object.fromEntries(cfg.columns.map((c) => [c.key, row?.[c.key] ?? c.default ?? (c.type === 'enum' ? c.options[0].value : '')])));
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const x = {}; const body = {};
    for (const c of cfg.columns) {
      const v = typeof f[c.key] === 'string' ? f[c.key].trim() : f[c.key];
      if (c.required && (v === '' || v === null)) { x[c.key] = 'Заповніть це поле'; continue; }
      if (c.type === 'number' && v !== '' && !(Number(v) >= 0)) { x[c.key] = 'Введіть число від 0'; continue; }
      if (v === '' && !editing) continue;
      body[c.key] = v === '' ? null : (c.type === 'number' || c.type === 'ref') ? Number(v) : v;
    }
    setErrors(x); setErr('');
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api(editing ? `${cfg.path}/${row[cfg.idKey]}` : cfg.path, { method: editing ? 'PATCH' : 'POST', body });
      onSaved(); onClose();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <Dialog title={editing ? `${cfg.single}: зміна` : `${cfg.single}: додавання`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate style={{ gap: 16 }}>
        {cfg.columns.map((c) => (
          <Field key={c.key} label={c.label} optional={!c.required} error={errors[c.key]} hint={c.hint}>
            {c.type === 'enum' ? (
              <select className="input select" value={f[c.key]} onChange={set(c.key)}>
                {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : c.type === 'ref' ? (
              <select className="input select" value={f[c.key]} onChange={set(c.key)}>
                <option value="">Оберіть…</option>
                {(refs[c.key] || []).map((o) => <option key={o[c.refValue]} value={o[c.refValue]}>{o[c.refLabel]}</option>)}
              </select>
            ) : (
              <input className="input" type={c.type === 'number' ? 'number' : 'text'} step={c.type === 'number' ? '0.1' : undefined} min={c.type === 'number' ? '0' : undefined} placeholder={c.placeholder} value={f[c.key] ?? ''} onChange={set(c.key)} />
            )}
          </Field>
        ))}
        {err && <div className="alert" role="alert">{err}</div>}
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Зберігаємо…' : 'Зберегти'}</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmDelete({ cfg, row, onClose, onDone }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr('');
    try { await api(`${cfg.path}/${row[cfg.idKey]}`, { method: 'DELETE' }); onDone(); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Dialog title="Видалити запис?" onClose={onClose} small>
      <p><strong>{cfg.label(row)}</strong></p>
      <p className="muted">Запис буде видалено з бази назавжди. Якщо на нього посилаються інші дані, база відмовить.</p>
      {err && <div className="alert" role="alert">{err}</div>}
      <div className="dialog__foot">
        <button className="btn btn--danger" onClick={go} disabled={busy}>Видалити</button>
        <button className="btn btn--ghost" onClick={onClose}>Залишити</button>
      </div>
    </Dialog>
  );
}

export default function CrudTable({ cfg }) {
  const { data, error, loading, reload } = useApi(cfg.path);
  // довідники для полів-посилань (наприклад, категорія товару)
  const ref1 = useApi(cfg.columns.find((c) => c.type === 'ref')?.refPath || null);
  const refCol = cfg.columns.find((c) => c.type === 'ref');
  const refs = refCol ? { [refCol.key]: ref1.data } : {};
  const [dlg, setDlg] = useState(null); // { type: 'form'|'delete', row }
  const [q, setQ] = useState('');

  const shown = (data || []).filter((r) => !q || cfg.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q.toLowerCase())) || String(r[cfg.idKey]).includes(q));
  const cols = cfg.columns.filter((c) => c.table !== false);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__search">
          <label className="sr-only" htmlFor={`q-${cfg.path}`}>Пошук</label>
          <input id={`q-${cfg.path}`} className="input" type="search" placeholder="Пошук…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setDlg({ type: 'form', row: null })}>
          <Plus size={18} aria-hidden="true" /> Додати
        </button>
      </div>
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && shown.length === 0 && <Empty>{q ? 'Нічого не знайдено.' : 'Записів ще немає.'}</Empty>}
        {data && shown.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>№</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th><span className="sr-only">Дії</span></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r[cfg.idKey]}>
                    <td className="nowrap">{r[cfg.idKey]}</td>
                    {cols.map((c) => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
                    <td><div className="row-actions">
                      <button className="btn btn--ghost btn--small" onClick={() => setDlg({ type: 'form', row: r })}>Змінити</button>
                      <button className="btn btn--danger btn--small" onClick={() => setDlg({ type: 'delete', row: r })}>Видалити</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dlg?.type === 'form' && <RowForm cfg={cfg} row={dlg.row} refs={refs} onClose={() => setDlg(null)} onSaved={reload} />}
      {dlg?.type === 'delete' && <ConfirmDelete cfg={cfg} row={dlg.row} onClose={() => setDlg(null)} onDone={reload} />}
    </>
  );
}
