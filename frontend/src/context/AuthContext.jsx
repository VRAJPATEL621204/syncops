import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log('[AuthContext] Init started:', { hasToken: !!storedToken, hasUser: !!storedUser });
      
      if (storedToken && storedUser) {
        // Immediately restore auth state from localStorage
        // This prevents redirect to login during refresh
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext] Restored user from localStorage:', { 
          role: parsedUser?.role, 
          name: parsedUser?.fullName,
          orgId: parsedUser?.organizationId 
        });
        setUser(parsedUser);
        
        // Validate token by fetching profile in background
        try {
          console.log('[AuthContext] Validating token with getProfile...');
          const response = await authAPI.getProfile();
          const freshUser = response.data.data?.user; // Backend returns { data: { user: {...} } }
          console.log('[AuthContext] Token valid, got fresh user:', { 
            role: freshUser?.role, 
            name: freshUser?.fullName 
          });
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        } catch (error) {
          console.log('[AuthContext] Profile fetch error:', error.response?.status, error.message);
          // Only logout on 401 auth errors
          if (error.response?.status === 401) {
            console.log('[Auth] Token expired (401), logging out');
            // Clear everything on auth failure
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          } else {
            // Network/server errors: keep cached user, stay logged in
            console.log('[Auth] Profile fetch failed (network error), keeping cached user');
            // User and token already set from localStorage above
          }
        }
      } else {
        console.log('[AuthContext] No stored auth found');
      }
      setLoading(false);
      console.log('[AuthContext] Init complete, loading=false');
    };

    initAuth();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    token,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isManager,
    isEmployee,
    isAuthenticated: !!token,
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
