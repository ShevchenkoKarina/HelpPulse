import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Brand from './Brand.jsx';
import AdminLogin from './AdminLogin.jsx';
import { api } from '../api/client.js';
import { getToken } from '../api/auth.js';

const LINKS = [
  { to: '/', label: 'Головна', end: true },
  { to: '/request', label: 'Подати заявку' },
  { to: '/track', label: 'Відстежити' },
  { to: '/donate', label: 'Допомогти' },
  { to: '/reviews', label: 'Відгуки' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [login, setLogin] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Якщо вхід уже виконано, кнопка веде одразу в адмінку; інакше показує вікно з паролем
  async function openAdmin() {
    setOpen(false);
    if (getToken()) {
      try { await api('/auth/check'); navigate('/admin'); return; } catch { /* токен недійсний */ }
    }
    setLogin(true);
  }

  return (
    <div className="app">
      <a className="skip-link" href="#content">До основного вмісту</a>
      <header className="nav">
        <div className="container nav__inner">
          <Brand />
          <button
            className="nav__toggle" type="button" aria-expanded={open} aria-controls="main-menu"
            aria-label={open ? 'Закрити меню' : 'Відкрити меню'} onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav id="main-menu" className={`nav__menu${open ? ' open' : ''}`} aria-label="Основне меню">
            <ul className="nav__links">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} className="nav__link">{l.label}</NavLink>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--ghost btn--small" onClick={openAdmin}>Керування</button>
          </nav>
        </div>
      </header>

      <main id="content"><Outlet /></main>
      {login && <AdminLogin onClose={() => setLogin(false)} onSuccess={() => { setLogin(false); navigate('/admin'); }} />}

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div>
              <Brand />
              <p style={{ marginTop: 16, maxWidth: '38ch' }}>
                Платформа, яка пов’язує тих, хто потребує допомоги, з тими, хто може її надати,
                і показує шлях кожного набору від складу до адресата.
              </p>
            </div>
            <div>
              <h3>Для отримувачів</h3>
              <ul>
                <li><Link to="/request">Подати заявку</Link></li>
                <li><Link to="/track">Відстежити заявку</Link></li>
                <li><Link to="/reviews">Відгуки</Link></li>
              </ul>
            </div>
            <div>
              <h3>Для донорів і команди</h3>
              <ul>
                <li><Link to="/donate">Передати допомогу</Link></li>
                <li><button type="button" className="footer__link" onClick={openAdmin}>Керування платформою</button></li>
              </ul>
            </div>
          </div>
          <p className="footer__note">Навчальний проєкт: курсова робота з дисципліни «Організація баз даних».</p>
        </div>
      </footer>
    </div>
  );
}
