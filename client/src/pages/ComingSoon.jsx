import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

// Тимчасова сторінка для розділів, які з’являться на наступних кроках.
export default function ComingSoon({ title, admin = false, notFound = false }) {
  const body = (
    <>
      <PageHeader title={title} />
      <p className="lead">
        {notFound
          ? 'Такої адреси немає. Перейдіть на головну сторінку й скористайтеся меню.'
          : 'Цей розділ ще в розробці й з’явиться на одному з наступних кроків.'}
      </p>
      <Link to={admin ? '/admin' : '/'} className="btn btn--primary">
        {admin ? 'До огляду' : 'На головну'}
      </Link>
    </>
  );
  return admin ? <div className="soon" style={{ padding: 0 }}>{body}</div> : <div className="container soon">{body}</div>;
}
