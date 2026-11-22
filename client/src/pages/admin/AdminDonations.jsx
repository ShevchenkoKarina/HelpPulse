import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { formatDateShort, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Dialog from '../../components/Dialog.jsx';
import { Empty, ErrorState, Loading } from '../../components/States.jsx';

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
      <PageHeader title="Пожертви">
        Передані донорами товари. Донори передають допомогу через сайт, і кожна пожертва одразу збільшує залишки на складі.
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
      {dlg?.type === 'view' && <Detail id={dlg.id} onClose={() => setDlg(null)} />}
    </>
  );
}
