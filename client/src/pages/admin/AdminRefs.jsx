import { useState } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import Filters from '../../components/Filters.jsx';
import CrudTable from '../../components/CrudTable.jsx';

const req = (extra) => ({ required: true, type: 'text', ...extra });
const SETS = {
  items: {
    tab: 'Товари', path: '/items', idKey: 'item_id', single: 'Товар', label: (r) => r.item_name,
    columns: [
      { key: 'item_name', label: 'Назва', ...req() },
      { key: 'category_id', label: 'Категорія', required: true, type: 'ref', refPath: '/categories', refValue: 'category_id', refLabel: 'category_name', render: (r) => r.category_name },
      { key: 'unit', label: 'Одиниця виміру', required: true, default: 'шт', type: 'text', hint: 'Наприклад: шт, упаковка, кг' },
    ],
  },
  categories: {
    tab: 'Категорії', path: '/categories', idKey: 'category_id', single: 'Категорія', label: (r) => r.category_name,
    columns: [{ key: 'category_name', label: 'Назва категорії', ...req() }],
  },
  requesters: {
    tab: 'Заявники', path: '/requesters', idKey: 'requester_id', single: 'Заявник', label: (r) => r.requester_name,
    columns: [
      { key: 'requester_name', label: 'Назва / ПІБ', ...req() },
      { key: 'requester_type', label: 'Тип', type: 'enum', options: ['людина', 'лікарня', 'організація'].map((v) => ({ value: v, label: v })) },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'address', label: 'Адреса', ...req() },
      { key: 'region', label: 'Область', ...req() },
    ],
  },
  donors: {
    tab: 'Донори', path: '/donors', idKey: 'donor_id', single: 'Донор', label: (r) => r.donor_name,
    columns: [
      { key: 'donor_name', label: 'Назва / ПІБ', ...req() },
      { key: 'donor_type', label: 'Тип', type: 'enum', options: ['особа', 'компанія', 'фонд'].map((v) => ({ value: v, label: v })) },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
    ],
  },
  warehouses: {
    tab: 'Склади', path: '/warehouses', idKey: 'warehouse_id', single: 'Склад', label: (r) => r.warehouse_name,
    columns: [
      { key: 'warehouse_name', label: 'Назва складу', ...req() },
      { key: 'address', label: 'Адреса', ...req() },
      { key: 'phone', label: 'Телефон', type: 'text' },
    ],
  },
  routes: {
    tab: 'Маршрути', path: '/routes', idKey: 'route_id', single: 'Маршрут', label: (r) => `${r.start_point} → ${r.end_point}`,
    columns: [
      { key: 'start_point', label: 'Звідки', ...req() },
      { key: 'end_point', label: 'Куди', ...req() },
      { key: 'distance_km', label: 'Відстань, км', type: 'number' },
    ],
  },
};

export default function AdminRefs() {
  const [tab, setTab] = useState('items');
  return (
    <>
      <PageHeader title="Довідники">Дані, на які посилаються заявки, пожертви й доставки. Запис, що вже використовується, видалити не вдасться.</PageHeader>
      <Filters label="Довідник" value={tab} onChange={setTab} options={Object.entries(SETS).map(([value, s]) => ({ value, label: s.tab }))} />
      <CrudTable key={tab} cfg={SETS[tab]} />
    </>
  );
}
