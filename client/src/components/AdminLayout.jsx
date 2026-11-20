import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, LogOut, ClipboardList, Globe, HeartHandshake, LayoutDashboard,
  Menu, MessageSquare, Package, Truck, Users, Warehouse, X,
} from 'lucide-react';
import Brand from './Brand.jsx';
import { clearToken } from '../api/auth.js';

const LINKS = [
  { to: '/admin', label: 'Огляд', icon: LayoutDashboard, end: true },
  { to: '/admin/requests', label: 'Заявки', icon: ClipboardList },
  { to: '/admin/kits', label: 'Набори', icon: Package },
  { to: '/admin/deliveries', label: 'Доставки', icon: Truck },
  { to: '/admin/stock', label: 'Склад', icon: Warehouse },
  { to: '/admin/donations', label: 'Пожертви', icon: HeartHandshake },
  { to: '/admin/volunteers', label: 'Волонтери', icon: Users },
  { to: '/admin/refs', label: 'Довідники', icon: BookOpen },
  { to: '/admin/feedback', label: 'Відгуки', icon: MessageSquare },
  { to: '/admin/reports', label: 'Звіти', icon: BarChart3 },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout = () => { clearToken(); navigate('/'); };
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="admin">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar__brand">
          <div>
            <Brand to="/admin" />
            <span className="sidebar__role">Керування платформою</span>
          </div>
          <button
            className="nav__toggle" type="button" aria-expanded={open}
            aria-label={open ? 'Закрити меню' : 'Відкрити меню'} onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav className="sidebar__nav" aria-label="Розділи керування">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="sidebar__link">
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <NavLink to="/" className="sidebar__link">
            <Globe size={20} aria-hidden="true" />
            Публічний сайт
          </NavLink>
          <button type="button" className="sidebar__link sidebar__btn" onClick={logout}>
            <LogOut size={20} aria-hidden="true" />
            Вийти
          </button>
        </div>
      </aside>
      <div className="admin__main">
        <main className="admin__content"><Outlet /></main>
      </div>
    </div>
  );
}
