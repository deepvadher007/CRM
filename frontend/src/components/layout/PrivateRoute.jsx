import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PrivateRoute.css';

/**
 * PrivateRoute component - Protects routes that require authentication
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to render if authenticated
 * @param {string[]} props.allowedRoles - Optional array of roles allowed to access this route
 * @returns {React.ReactElement} Protected route component
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="private-route-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return (
        <div className="private-route-forbidden">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>Required role: {allowedRoles.join(' or ')}</p>
        </div>
      );
    }
  }

  // Render children if authenticated (and authorized if roles checked)
  return <>{children}</>;
};

export default PrivateRoute;
