import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import FormularioInscripcionPage from './pages/public/FormularioInscripcionPage';
import VerFichaPublicaPage from './pages/public/VerFichaPublicaPage';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ImprimirFichasPage from './pages/admin/ImprimirFichasPage';
import { BASE_PATH } from './config';

function ProtectedRoute({ children }) {
  const { user, token } = useAuth();
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Solo el rol admin (Backups e impresión masiva)
function AdminRoute({ children }) {
  const { user, token } = useAuth();
  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.rol !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={BASE_PATH}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/inscripcion" element={<FormularioInscripcionPage />} />
          <Route path="/ficha/:token" element={<VerFichaPublicaPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/imprimir"
            element={
              <AdminRoute>
                <ImprimirFichasPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
