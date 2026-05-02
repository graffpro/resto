import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Auto-logout on 401 from backend (stale token, deactivated account, etc.)
  // The interceptor must NOT trigger on the login endpoint itself.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        if ((status === 401 || status === 403) && !url.includes('/auth/login')) {
          // Stale or invalid token → clear and let routing naturally fall back to landing/login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true, user, token };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Direct auth set (for registration flow)
  const setAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};