/**
 * Example usage of PrivateRoute component
 * 
 * This file demonstrates how to integrate PrivateRoute into your App.js
 * DO NOT import this file - it's for reference only
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PrivateRoute from './components/layout/PrivateRoute';

// Example protected component
const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is a protected route - only authenticated users can see this.</p>
    </div>
  );
};

// Example admin-only component
const AdminPanel = () => {
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>This is an admin-only route - only users with Admin role can see this.</p>
    </div>
  );
};

// Example App component with PrivateRoute integration
function AppExample() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected route - requires authentication only */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          
          {/* Protected route with role check - requires Admin role */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoute allowedRoles={['Admin']}>
                <AdminPanel />
              </PrivateRoute>
            } 
          />
          
          {/* Protected route with multiple allowed roles */}
          <Route 
            path="/reports" 
            element={
              <PrivateRoute allowedRoles={['Admin', 'Sales_Agent']}>
                <div>Reports Page</div>
              </PrivateRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default AppExample;
