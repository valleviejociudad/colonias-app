import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const res = await fetch('/api/auth/login', {
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

  const loginWithGoogle = async ({ email, nombre, googleId, avatar }) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, googleId, avatar })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error con Google Auth');
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    return fetch(url, { cache: 'no-store', ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithGoogle, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
