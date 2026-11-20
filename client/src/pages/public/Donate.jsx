import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import Field from '../../components/Field.jsx';
import RadioCards from '../../components/RadioCards.jsx';
import ItemsPicker, { newRow, readRows } from '../../components/ItemsPicker.jsx';
import { Loading, ErrorState } from '../../components/States.jsx';

const TYPES = [
  { value: 'особа', title: 'Особа', desc: 'Приватна пожертва' },
  { value: 'компанія', title: 'Компанія', desc: 'Бізнес або підприємство' },
  { value: 'фонд', title: 'Фонд', desc: 'Благодійна організація' },
];

export default function Donate() {
  const catalog = useApi('/items');
  const warehouses = useApi('/warehouses');
  const [form, setForm] = useState({ donor_type: 'особа', donor_name: '', email: '', phone: '', warehouse_id: '' });
  const [rows, setRows] = useState([newRow()]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };
  const changeRows = (r) => { setRows(r); setErrors((x) => ({ ...x, items: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!form.donor_name.trim()) err.donor_name = 'Вкажіть ім’я або назву';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) err.email = 'Вкажіть електронну пошту, наприклад name@example.com';
    if (!form.warehouse_id) err.warehouse_id = 'Оберіть склад, куди ви передасте товар';
    const { items, error: itemsError } = readRows(rows);
    if (itemsError) err.items = itemsError;
    setErrors(err);
    setSubmitError('');
    if (Object.keys(err).length) return;

    setSending(true);
    try {
      const donor = { donor_type: form.donor_type, donor_name: form.donor_name.trim(), email: form.email.trim() };
      if (form.phone.trim()) donor.phone = form.phone.trim();
      const res = await api('/donations', { method: 'POST', body: { donor, warehouse_id: Number(form.warehouse_id), items } });
      setDone(res);
    } catch (ex) {
      setSubmitError(ex.message);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="container form-page">
        <div className="success" role="status">
          <CheckCircle2 size={40} color="var(--green)" aria-hidden="true" />
          <h2>Дякуємо за допомогу!</h2>
          <div className="success__box">
            <span className="muted">Номер пожертви</span>
            <span className="success__number">{done.donation_id}</span>
          </div>
          <p>Пожертву записано, товари вже враховано на складі. Незабаром вони потраплять у набори для тих, хто чекає.</p>
          <div className="form-actions">
            <Link to="/" className="btn btn--primary">На головну</Link>
            <button type="button" className="btn btn--ghost" onClick={() => { setDone(null); setRows([newRow()]); }}>Зробити ще одну пожертву</button>
          </div>
        </div>
      </div>
    );
  }

  const loadingAny = catalog.loading || warehouses.loading;
  const errAny = catalog.error || warehouses.error;

  return (
    <div className="container form-page">
      <div className="form-page__head">
        <h1>Допомогти як донор</h1>
        <p className="lead">Вкажіть, що ви передаєте і на який склад. Залишки одразу збільшаться, а товар піде в набори для людей.</p>
      </div>

      <form className="form" onSubmit={submit} noValidate>
        <section className="form-card">
          <h2>Про вас</h2>
          <RadioCards legend="Хто ви" name="donor" value={form.donor_type} options={TYPES}
            onChange={(v) => setForm({ ...form, donor_type: v })} />
          <Field label={form.donor_type === 'особа' ? 'Ім’я та прізвище' : 'Назва'} error={errors.donor_name}>
            <input className="input" value={form.donor_name} onChange={set('donor_name')} maxLength={100} />
          </Field>
          <div className="grid-2">
            <Field label="Електронна пошта" error={errors.email}>
              <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Телефон" optional>
              <input className="input" type="tel" autoComplete="tel" placeholder="+380…" value={form.phone} onChange={set('phone')} />
            </Field>
          </div>
        </section>

        <section className="form-card">
          <h2>Що ви передаєте</h2>
          {loadingAny && <Loading lines={2} />}
          {errAny && <ErrorState error={errAny} onRetry={() => { catalog.reload(); warehouses.reload(); }} />}
          {catalog.data && warehouses.data && (
            <>
              <Field label="Склад" error={errors.warehouse_id}>
                <select className="input select" value={form.warehouse_id} onChange={set('warehouse_id')}>
                  <option value="">Оберіть склад…</option>
                  {warehouses.data.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}, {w.address}</option>)}
                </select>
              </Field>
              <ItemsPicker catalog={catalog.data} rows={rows} onChange={changeRows} error={errors.items} showRowErrors={!!errors.items} />
            </>
          )}
        </section>

        {submitError && <div className="alert" role="alert">{submitError}</div>}
        <div className="form-actions">
          <button className="btn btn--primary" type="submit" disabled={sending}>{sending ? 'Надсилаємо…' : 'Передати пожертву'}</button>
        </div>
      </form>
    </div>
  );
}
