import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vv_colonias_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vv_colonias_token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('vv_colonias_token', token);
    } else {
      localStorage.removeItem('vv_colonias_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('vv_colonias_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vv_colonias_user');
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const authFetch = useCallback(async (url, options = {}) => {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(url, { cache: 'no-store', ...options, headers });
    if (res.status === 401) {
      // Token expirado o inválido: limpiar sesión y lanzar error especial
      setToken(null);
      setUser(null);
      const err = new Error('Sesión expirada. Por favor, iniciá sesión nuevamente.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    return res;
  }, [token]);

  // Validar token y traer los permisos actualizados al arrancar y al volver a la pestaña
  // (si un admin cambió los permisos de este usuario, se aplican sin cerrar sesión)
  useEffect(() => {
    if (!token) return undefined;
    const refrescar = () => {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
        .then(async (r) => {
          if (r.status === 401) {
            setToken(null);
            setUser(null);
            return;
          }
          if (r.ok) {
            const data = await r.json();
            if (data?.user) setUser(data.user);
          }
        })
        .catch(() => { /* red caída: no cerrar sesión */ });
    };
    refrescar();
    const alVolver = () => document.visibilityState === 'visible' && refrescar();
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
