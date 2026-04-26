import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const TOKEN_KEY = 'qr_customer_token';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const fetchMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setCustomer(null); setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/customer/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setCustomer(res.data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setCustomer(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const setAuth = useCallback((newToken, customerData) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCustomer(customerData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await axios.put(`${API}/customer/auth/profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCustomer(res.data);
    return res.data;
  }, [token]);

  return (
    <CustomerAuthContext.Provider value={{ customer, token, loading, setAuth, logout, updateProfile, isAuthenticated: !!customer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
