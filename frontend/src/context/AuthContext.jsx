import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('tf_token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * login — returns the full API response data so callers can detect needsVerification.
   */
  const login = useCallback(async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    localStorage.setItem('tf_token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    // Return merged user object with top-level needsVerification flag
    return { ...data.user, needsVerification: data.needsVerification ?? false };
  }, []);

  /**
   * register — returns { needsVerification: true, email } so caller can redirect
   */
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data.token) {
      localStorage.setItem('tf_token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      if (data.user) setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tf_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  /**
   * updateUser — merge top-level user fields instantly (avatar, name, etc.)
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * setRestaurant — attach a newly created restaurant to the user context.
   * Called after successful restaurant creation so the UI updates instantly.
   */
  const setRestaurant = useCallback((restaurant) => {
    setUser((prev) => prev ? { ...prev, restaurant } : prev);
  }, []);

  /**
   * updateRestaurantData — merge restaurant fields instantly (logo, name, etc.)
   * Works whether user.restaurant is a populated object or just an ID string.
   * Safe when restaurant is null (deleted) — silently no-ops.
   */
  const updateRestaurantData = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      // If restaurant is null/undefined (deleted), don't reconstruct it
      if (!prev.restaurant) return prev;
      const existingRestaurant = typeof prev.restaurant === 'object'
        ? prev.restaurant
        : { _id: prev.restaurant };
      return {
        ...prev,
        restaurant: { ...existingRestaurant, ...updates },
      };
    });
  }, []);

  /**
   * refreshSubscription — re-fetch /auth/me and sync user state.
   * Call after redeeming a code or upgrading.
   */
  const refreshSubscription = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (_) {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      setRestaurant,
      updateRestaurantData,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};