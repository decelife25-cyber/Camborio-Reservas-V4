import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Inicio from "./pages/Inicio";
import Reservas from "./pages/Reservas";
import Calendario from "./pages/Calendario";
import Mesas from "./pages/Mesas";
import Clientes from "./pages/Clientes";
import Historial from "./pages/Historial";
import Configuracion from "./pages/Configuracion";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Inicio />} />
            <Route path="reservas" element={<Reservas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="mesas" element={<Mesas />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="historial" element={<Historial />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
