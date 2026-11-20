import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Brand from './Brand.jsx';

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
  useEffect(() => setOpen(false), [pathname]);

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
            <Link to="/admin" className="btn btn--ghost btn--small">Керування</Link>
          </nav>
        </div>
      </header>

      <main id="content"><Outlet /></main>

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
                <li><Link to="/admin">Керування платформою</Link></li>
              </ul>
            </div>
          </div>
          <p className="footer__note">Навчальний проєкт: курсова робота з дисципліни «Організація баз даних».</p>
        </div>
      </footer>
    </div>
  );
}
