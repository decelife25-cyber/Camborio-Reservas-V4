import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Settings, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { to: '/reservas', icon: '📝', label: 'HACER RESERVA' },
  { to: '/calendario', icon: '📅', label: 'CALENDARIO' },
  { to: '/buscar', icon: '🔎', label: 'BUSCAR RESERVA' },
  { to: '/', icon: '📖', label: 'RESERVAS HOY' },
  { to: '/confirmar', icon: '✅', label: 'CONFIRMAR' },
  { to: '/mesas', icon: '🗺️', label: 'PLANOS DE MESAS' },
];

export default function Layout() {
  const [darkMode, setDarkMode] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  useEffect(() => {
    async function fetchPendingCount() {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
      const { count, error } = await supabase
        .from('Reservas')
        .select('ReservaID', { count: 'exact', head: true })
        .eq('Estado', 'PENDIENTE')
        .gte('FechaReserva', today);
      if (!error) setPendingCount(count || 0);
    }

    if (user) fetchPendingCount();
  }, [user]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return <Outlet />;

  return (
    <div className="private-app">
      <header className="private-header">
        <div className="brand-lockup" aria-label="Taberna Camborio, Cervecería Tapería">
          <img
            className="brand-emblem"
            src="https://www.decelife.com/reservas-camborio/logocamborio_trans.png"
            alt=""
          />
          <div className="brand-copy">
            <div className="brand-name">TABERNA CAMBORIO</div>
            <div className="brand-line"><span /> CERVECERÍA · TAPERÍA <span /></div>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-icon theme-button" onClick={toggleDarkMode} aria-label="Cambiar modo día/noche" title="Modo día/noche">
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button className="header-icon" onClick={() => navigate('/configuracion')} aria-label="Configuración" title="Configuración">
            <Settings size={22} />
          </button>
          <button className="logout-button" onClick={handleLogout}>CERRAR SESIÓN</button>
        </div>
        <div className="app-version" aria-label="Versión de la aplicación">V1.0.020</div>
      </header>

      <nav className="private-menu" aria-label="Menú privado">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.to}
            className={({ isActive }) => {
              const active = item.label === 'RESERVAS HOY'
                ? isActive && window.location.pathname === '/'
                : item.label === 'CONFIRMAR'
                  ? isActive && window.location.pathname === '/confirmar'
                  : item.label === 'CALENDARIO'
                    ? isActive && window.location.pathname === '/calendario'
                    : false;
              return 'menu-card ' + (active ? 'active' : '');
            }}
          >
            <span className="menu-icon" aria-hidden="true">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
            {item.label === 'CONFIRMAR' && pendingCount > 0 && (
              <span className="pending-badge" aria-label={pendingCount + ' reservas por confirmar'}>{pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="private-content">
        <Outlet />
      </main>
    </div>
  );
}
