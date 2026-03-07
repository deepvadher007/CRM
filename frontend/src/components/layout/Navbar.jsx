import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import './Navbar.css';

/**
 * Navbar component - Application navigation bar
 * Displays branding, navigation links, and user info based on authentication state
 */
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const response = await api.put('/api/auth/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        setPasswordSuccess('Password changed successfully');
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
          setPasswordSuccess('');
        }, 2000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
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
                    onClick={() => setShowChangePassword(true)}
                    className="btn-change-password"
                    aria-label="Change Password"
                  >
                    🔒 Change Password
                  </button>
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

            {/* Change Password Button */}
            <button
              onClick={() => {
                setShowChangePassword(true);
                setMobileMenuOpen(false);
              }}
              className="mobile-btn-change-password"
              aria-label="Change Password"
            >
              🔒 Change Password
            </button>

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

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            
            {passwordError && (
              <div className="error-message">{passwordError}</div>
            )}
            
            {passwordSuccess && (
              <div className="success-message">{passwordSuccess}</div>
            )}
            
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="oldPassword">Old Password</label>
                <input
                  type="password"
                  id="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                  placeholder="Enter old password"
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }} 
                  className="btn-secondary"
                  disabled={changingPassword}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
