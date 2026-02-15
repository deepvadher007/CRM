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

        {/* Desktop Navigation */}
        <div className="navbar-desktop">
          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Navigation Links */}
          <div className="navbar-menu">
            {isAuthenticated ? (
              <>
                {/* Authenticated Navigation */}
                <div className="navbar-links">
                  <Link to="/dashboard" className="nav-link">
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
                  <Link to="/login" className="nav-link">
                    Login
                  </Link>
                  <Link to="/register" className="btn-register">
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="navbar-mobile-controls">
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
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {isAuthenticated ? (
          <>
            {/* Authenticated Navigation */}
            <Link
              to="/dashboard"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>

            {/* User Info */}
            <div className="mobile-user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="mobile-btn-logout"
              aria-label="Logout"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {/* Unauthenticated Navigation */}
            <Link
              to="/login"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="mobile-btn-register"
              onClick={() => setMobileMenuOpen(false)}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
