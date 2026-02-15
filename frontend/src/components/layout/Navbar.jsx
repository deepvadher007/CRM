import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

/**
 * Navbar component - Application navigation bar
 * Displays branding, navigation links, and user info based on authentication state
 */
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Branding */}
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🏢</span>
          <span className="brand-text">Hanuvansh CRM</span>
        </Link>

        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Navigation Links */}
        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {isAuthenticated ? (
            <>
              {/* Authenticated Navigation */}
              <div className="navbar-links">
                <Link
                  to="/dashboard"
                  className="nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </div>

              {/* User Info and Logout */}
              <div className="navbar-user">
                <div className="user-info">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">{user?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-logout"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Unauthenticated Navigation */}
              <div className="navbar-auth-links">
                <Link
                  to="/login"
                  className="nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-register"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
