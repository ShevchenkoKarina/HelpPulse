import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { getToken } from '../api/auth.js';
import AdminLogin from './AdminLogin.jsx';
import Brand from './Brand.jsx';

/**
 * Пускає в адмінку лише з дійсним токеном. Без нього показує вікно входу.
 * Токен щоразу перевіряється на сервері, тож підроблений запис у sessionStorage не допоможе.
 */
export default function RequireAdmin({ children }) {
  const [state, setState] = useState(getToken() ? 'checking' : 'login'); // checking | ok | login | cancelled

  useEffect(() => {
    if (state !== 'checking') return undefined;
    let alive = true;
    api('/auth/check').then(() => alive && setState('ok')).catch(() => alive && setState('login'));
    return () => { alive = false; };
  }, [state]);

  // Якщо під час роботи токен спливе, повертаємо на вхід
  useEffect(() => {
    const out = () => setState('login');
    window.addEventListener('helppulse:logout', out);
    return () => window.removeEventListener('helppulse:logout', out);
  }, []);

  if (state === 'ok') return children;
  if (state === 'cancelled') return <Navigate to="/" replace />;
  return (
    <div className="gate">
      <Brand />
      {state === 'login' && <AdminLogin onClose={() => setState('cancelled')} onSuccess={() => setState('ok')} />}
    </div>
  );
}
