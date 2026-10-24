import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS } from '../config/navigation';
import Logo from './Logo';
import Avatar from './Avatar';

export default function AppLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  const items = NAV_ITEMS.filter((i) => !i.permission || can(i.permission));
  const linkClass = ({ isActive }) => `vb-nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="vb-app">
      <a className="vb-skip" href="#main">Skip to content</a>
      <header className="vb-header">
        <button type="button" className="vb-icon-btn vb-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="vb-sidebar">
          <Menu size={22} aria-hidden="true" />
        </button>
        <Logo />
        <div className="vb-header-user">
          <div className="vb-header-name">
            <strong>{user.firstName} {user.lastName}</strong>
            <span>{user.role}</span>
          </div>
          <Avatar user={user} size={34} />
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleLogout} disabled={signingOut}>
            <LogOut size={15} aria-hidden="true" /> <span className="vb-hide-sm">{signingOut ? 'Signing out…' : 'Log out'}</span>
          </button>
        </div>
      </header>

      <div className="vb-body">
        {open && <div className="vb-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
        <aside id="vb-sidebar" className={`vb-sidebar${open ? ' open' : ''}`}>
          <nav aria-label="Main navigation">
            <ul>
              {items.map(({ to, label, icon: Icon, end, upcoming }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{label}</span>
                    {upcoming && <small className="vb-soon">Soon</small>}
                  </NavLink>
                </li>
              ))}
            </ul>
            {can('users:manage') && (
              <>
                <div className="vb-nav-heading">Administration</div>
                <ul>
                  <li>
                    <NavLink to="/users" className={linkClass} onClick={() => setOpen(false)}>
                      <Users size={17} aria-hidden="true" /><span>Users</span>
                    </NavLink>
                  </li>
                </ul>
              </>
            )}
          </nav>
        </aside>
        <main id="main" className="vb-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
