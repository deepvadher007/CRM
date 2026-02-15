/**
 * Example usage of the Navbar component
 * 
 * This file demonstrates how to use the Navbar component in your application.
 * The Navbar automatically adapts based on authentication state from AuthContext.
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Navbar from './Navbar';

// Example 1: Basic usage with AuthProvider
export const BasicNavbarExample = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <div style={{ padding: '20px' }}>
          <h1>Your App Content</h1>
          <p>The Navbar will automatically show appropriate links based on auth state.</p>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Example 2: Navbar in a complete app layout
export const AppLayoutExample = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            {/* Your routes and content go here */}
            <h1>Dashboard</h1>
            <p>Main application content</p>
          </main>
          <footer className="app-footer">
            <p>&copy; 2024 Hanuvansh CRM. All rights reserved.</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Example 3: Testing different authentication states (for development)
export const NavbarStatesExample = () => {
  return (
    <div>
      <h2>Navbar Component States</h2>
      
      <h3>Unauthenticated State</h3>
      <p>Shows Login and Register links</p>
      
      <h3>Authenticated State</h3>
      <p>Shows Dashboard link, user name, role, and Logout button</p>
      
      <h3>Mobile View</h3>
      <p>Resize browser to &lt;768px to see hamburger menu</p>
    </div>
  );
};

export default BasicNavbarExample;
