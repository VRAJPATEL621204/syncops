import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Token lives in the HttpOnly cookie — never touched by JS.
  // We only keep the user object in state (+ localStorage as a fast-restore cache).
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Always validate with the server — cookie is sent automatically
      try {
        const response = await authAPI.getProfile();
        const freshUser = response.data.data?.user;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // Cookie is missing or expired — clear cached user
          setUser(null);
          localStorage.removeItem('user');
        }
        // Network errors: keep the cached user so the UI doesn't flash to login
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Called after OTP verify / invite accept — backend has already set the cookie
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await authAPI.logout(); // tells backend to clear the HttpOnly cookie
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager';
  const isEmployee = () => user?.role === 'employee';

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isManager,
    isEmployee,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
