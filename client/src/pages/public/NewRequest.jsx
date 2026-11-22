import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { REGIONS } from '../../utils/regions.js';
import Field from '../../components/Field.jsx';
import RadioCards from '../../components/RadioCards.jsx';
import ItemsPicker, { newRow, readRows } from '../../components/ItemsPicker.jsx';
import { Loading, ErrorState } from '../../components/States.jsx';

const TYPES = [
  { value: 'людина', title: 'Людина', desc: 'Прошу допомогу для себе чи родини' },
  { value: 'лікарня', title: 'Лікарня', desc: 'Медичний заклад' },
  { value: 'організація', title: 'Організація', desc: 'Притулок, школа, громада' },
];
const PRIORITIES = [
  { value: 'середній', title: 'Звичайна', desc: 'Допомога потрібна найближчим часом' },
  { value: 'високий', title: 'Термінова', desc: 'Потрібна швидше' },
  { value: 'критичний', title: 'Критична', desc: 'Загроза життю чи здоров’ю', danger: true },
];

export default function NewRequest() {
  const catalog = useApi('/items');
  const [form, setForm] = useState({ requester_type: 'людина', requester_name: '', phone: '', address: '', region: '', priority: 'середній' });
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
    if (!form.requester_name.trim()) err.requester_name = 'Вкажіть, як до вас звертатися';
    if (!/^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim())) err.phone = 'Вкажіть номер телефону, наприклад +380991112233';
    if (!form.address.trim()) err.address = 'Вкажіть адресу, куди привезти допомогу';
    if (!form.region) err.region = 'Оберіть область';
    const { items, error: itemsError } = readRows(rows);
    if (itemsError) err.items = itemsError;
    setErrors(err);
    setSubmitError('');
    if (Object.keys(err).length) return;

    setSending(true);
    try {
      const { requester_type, requester_name, phone, address, region, priority } = form;
      const res = await api('/requests', {
        method: 'POST',
        body: { requester: { requester_type, requester_name: requester_name.trim(), phone: phone.trim(), address: address.trim(), region }, priority, items },
      });
      setDone(res);
    } catch (ex) {
      setSubmitError(ex.message);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    const id = done.request_id;
    return (
      <div className="container form-page">
        <div className="success" role="status">
          <CheckCircle2 size={40} color="var(--green)" aria-hidden="true" />
          <h2>Заявку прийнято</h2>
          <div className="success__box">
            <span className="muted">Номер вашої заявки</span>
            <span className="success__number">{id}</span>
          </div>
          <p>Запишіть цей номер: за ним ви побачите, на якому етапі допомога. Координатор зв’яжеться з вами за телефоном.</p>
          <div className="form-actions">
            <Link to={`/track/${id}`} className="btn btn--primary">Відстежити заявку</Link>
            <Link to="/" className="btn btn--ghost">На головну</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container form-page">
      <div className="form-page__head">
        <h1>Подати заявку на допомогу</h1>
        <p className="lead">Розкажіть, хто ви і що потрібно. Ми зберемо набір і привеземо його волонтером.</p>
      </div>

      <form className="form" onSubmit={submit} noValidate>
        <section className="form-card">
          <h2>Про вас</h2>
          <RadioCards legend="Хто звертається" name="type" value={form.requester_type} options={TYPES}
            onChange={(v) => setForm({ ...form, requester_type: v })} />
          <Field label={form.requester_type === 'людина' ? 'Ім’я та прізвище' : 'Назва'} error={errors.requester_name}>
            <input className="input" autoComplete="name" value={form.requester_name} onChange={set('requester_name')} maxLength={100} />
          </Field>
          <div className="grid-2">
            <Field label="Телефон" error={errors.phone} hint="Для зв’язку координатора і волонтера">
              <input className="input" type="tel" autoComplete="tel" placeholder="+380…" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Область" error={errors.region}>
              <select className="input select" value={form.region} onChange={set('region')}>
                <option value="">Оберіть область…</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Адреса доставки" error={errors.address} hint="Місто, вулиця, будинок. Її бачать координатор, волонтер і всі, хто знає номер заявки.">
            <input className="input" autoComplete="street-address" value={form.address} onChange={set('address')} maxLength={200} />
          </Field>
        </section>

        <section className="form-card">
          <h2>Що потрібно</h2>
          {catalog.loading && <Loading lines={2} />}
          {catalog.error && <ErrorState error={catalog.error} onRetry={catalog.reload} />}
          {catalog.data && (
            <ItemsPicker catalog={catalog.data} rows={rows} onChange={changeRows} error={errors.items} showRowErrors={!!errors.items} />
          )}
          <RadioCards legend="Наскільки це терміново" name="priority" value={form.priority} options={PRIORITIES}
            onChange={(v) => setForm({ ...form, priority: v })} />
        </section>

        {submitError && <div className="alert" role="alert">{submitError}</div>}
        <div className="form-actions">
          <button className="btn btn--primary" type="submit" disabled={sending}>{sending ? 'Надсилаємо…' : 'Надіслати заявку'}</button>
        </div>
      </form>
    </div>
  );
}
