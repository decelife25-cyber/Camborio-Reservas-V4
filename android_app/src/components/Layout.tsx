import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Settings, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { to: '/reservas', icon: '📝', label: 'HACER RESERVA' },
  { to: '/calendario', icon: '📅', label: 'CALENDARIO' },
  { to: '/reservas', icon: '🔎', label: 'BUSCAR RESERVA' },
  { to: '/', icon: '📖', label: 'RESERVAS HOY' },
  { to: '/reservas', icon: '✅', label: 'CONFIRMAR' },
  { to: '/mesas', icon: '🗺️', label: 'PLANOS DE MESAS' },
];

export default function Layout() {
  const [darkMode, setDarkMode] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
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
      </header>

      <nav className="private-menu" aria-label="Menú privado">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.to}
            className={({ isActive }) => 'menu-card ' + (isActive && item.label === 'RESERVAS HOY' ? 'active' : '')}
          >
            <span className="menu-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="private-content">
        <Outlet />
      </main>
    </div>
  );
}
