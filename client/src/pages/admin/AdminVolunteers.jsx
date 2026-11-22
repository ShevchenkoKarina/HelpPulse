import PageHeader from '../../components/PageHeader.jsx';
import CrudTable from '../../components/CrudTable.jsx';

const CFG = {
  path: '/volunteers', idKey: 'volunteer_id', single: 'Волонтер', label: (r) => r.volunteer_name,
  columns: [
    { key: 'volunteer_name', label: 'ПІБ', required: true, type: 'text' },
    { key: 'phone', label: 'Телефон', required: true, type: 'text', placeholder: '+380XXXXXXXXX' },
    { key: 'region', label: 'Область', type: 'text' },
  ],
};

export default function AdminVolunteers() {
  return (
    <>
      <PageHeader title="Волонтери">Люди, які розвозять набори. Статистику доставок і оцінок дивіться у розділі «Звіти».</PageHeader>
      <CrudTable cfg={CFG} />
    </>
  );
}
