import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorHandler';

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user profile using stored token on mount
  const loadUser = async () => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/profile');
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (identifier, password) => {
    try {
      const response = await api.post('/api/auth/login', { identifier, password });
      
      const { token: newToken, user: userData } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Login failed');
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Registration failed');
      const errors = error.response?.data?.errors || [];
      return { success: false, error: errorMessage, errors };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear state
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Redirect to login
    window.location.href = '/login';
  };

  // Load user on component mount
  useEffect(() => {
    loadUser();
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
