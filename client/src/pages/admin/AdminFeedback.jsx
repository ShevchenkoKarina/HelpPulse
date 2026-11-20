import { useState } from 'react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, plural } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Stars from '../../components/Stars.jsx';
import Dialog from '../../components/Dialog.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

function ConfirmDelete({ row, onClose, onDone }) {
  const [err, setErr] = useState('');
  async function go() {
    setErr('');
    try { await api(`/feedback/${row.feedback_id}`, { method: 'DELETE' }); onDone(); onClose(); } catch (ex) { setErr(ex.message); }
  }
  return (
    <Dialog title="Видалити відгук?" onClose={onClose} small>
      <p className="muted">Відгук до доставки № {row.delivery_id} зникне з сайту. Після цього доставку можна буде оцінити знову.</p>
      {err && <div className="alert" role="alert">{err}</div>}
      <div className="dialog__foot">
        <button className="btn btn--danger" onClick={go}>Видалити</button>
        <button className="btn btn--ghost" onClick={onClose}>Залишити</button>
      </div>
    </Dialog>
  );
}

export default function AdminFeedback() {
  const { data, error, loading, reload } = useApi('/feedback');
  const [del, setDel] = useState(null);
  return (
    <>
      <PageHeader title="Відгуки">
        {data ? `${data.length} ${plural(data.length, ['відгук', 'відгуки', 'відгуків'])}. ` : ''}Модерація: некоректний відгук можна видалити.
      </PageHeader>
      <section className="panel">
        {loading && <Loading />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty>Відгуків ще немає.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Дата</th><th>Доставка</th><th>Отримувач</th><th>Волонтер</th><th>Оцінка</th><th>Відгук</th><th><span className="sr-only">Дії</span></th></tr></thead>
            <tbody>{data.map((f) => (
              <tr key={f.feedback_id}>
                <td className="nowrap">{formatDateShort(f.feedback_date)}</td><td className="nowrap">№ {f.delivery_id}</td>
                <td>{f.requester_name}</td><td className="nowrap">{f.volunteer_name}</td>
                <td className="nowrap"><Stars value={f.rating} size={16} /></td><td>{f.review_text || '—'}</td>
                <td><div className="row-actions"><button className="btn btn--danger btn--small" onClick={() => setDel(f)}>Видалити</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
      {del && <ConfirmDelete row={del} onClose={() => setDel(null)} onDone={reload} />}
    </>
  );
}
