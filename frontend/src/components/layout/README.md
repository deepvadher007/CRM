# Layout Components

## PrivateRoute

The `PrivateRoute` component protects routes that require authentication. It checks the authentication state from `AuthContext` and handles the following scenarios:

### Features

1. **Loading State**: Shows a loading spinner while checking authentication status
2. **Authentication Check**: Redirects to `/login` if the user is not authenticated
3. **Role-Based Access**: Optionally checks if the user has the required role(s)
4. **Protected Content**: Renders children components if authenticated (and authorized)

### Usage

#### Basic Usage (Authentication Only)

```jsx
import PrivateRoute from './components/layout/PrivateRoute';
import Dashboard from './components/dashboard/Dashboard';

<Route 
  path="/dashboard" 
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  } 
/>
```

#### Role-Based Access

```jsx
import PrivateRoute from './components/layout/PrivateRoute';
import AdminPanel from './components/admin/AdminPanel';

// Only allow Admin users
<Route 
  path="/admin" 
  element={
    <PrivateRoute allowedRoles={['Admin']}>
      <AdminPanel />
    </PrivateRoute>
  } 
/>
```

#### Multiple Allowed Roles

```jsx
import PrivateRoute from './components/layout/PrivateRoute';
import Reports from './components/reports/Reports';

// Allow both Admin and Sales_Agent users
<Route 
  path="/reports" 
  element={
    <PrivateRoute allowedRoles={['Admin', 'Sales_Agent']}>
      <Reports />
    </PrivateRoute>
  } 
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | The component(s) to render if authenticated |
| `allowedRoles` | `string[]` | No | Array of roles allowed to access this route |

### Behavior

1. **Loading**: While `loading` is `true`, displays a loading spinner
2. **Not Authenticated**: If `isAuthenticated` is `false`, redirects to `/login`
3. **Role Check Failed**: If `allowedRoles` is specified and user doesn't have the required role, displays "Access Denied" message
4. **Success**: If authenticated (and authorized if roles checked), renders the children components

### Example: Complete App.js Integration

```jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import PrivateRoute from './components/layout/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          
          {/* Admin-only route */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoute allowedRoles={['Admin']}>
                <AdminPanel />
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

export default App;
```

### Styling

The component includes CSS for:
- Loading spinner animation
- Access denied message styling
- Responsive design for mobile, tablet, and desktop

The styles are defined in `PrivateRoute.css` and are automatically imported with the component.
