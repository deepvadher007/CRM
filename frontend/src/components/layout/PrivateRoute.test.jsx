import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import * as AuthContext from '../../context/AuthContext';

// Mock the useAuth hook
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('PrivateRoute Component', () => {
  const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading spinner while checking authentication', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <PrivateRoute>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('redirects to /login if not authenticated', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <PrivateRoute>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    // When not authenticated, Navigate component redirects, so protected content should not render
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('renders children if authenticated', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { _id: '123', name: 'Test User', email: 'test@example.com', role: 'Admin' },
    });

    render(
      <MemoryRouter>
        <PrivateRoute>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('renders children if authenticated and user has allowed role', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { _id: '123', name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
    });

    render(
      <MemoryRouter>
        <PrivateRoute allowedRoles={['Admin']}>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('shows access denied if authenticated but user lacks required role', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { _id: '123', name: 'Sales User', email: 'sales@example.com', role: 'Sales_Agent' },
    });

    render(
      <MemoryRouter>
        <PrivateRoute allowedRoles={['Admin']}>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission/)).toBeInTheDocument();
    expect(screen.getByText(/Required role: Admin/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('allows access if user has one of multiple allowed roles', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { _id: '123', name: 'Sales User', email: 'sales@example.com', role: 'Sales_Agent' },
    });

    render(
      <MemoryRouter>
        <PrivateRoute allowedRoles={['Admin', 'Sales_Agent']}>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('shows access denied if user is null but authenticated (edge case)', () => {
    AuthContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <PrivateRoute allowedRoles={['Admin']}>
          <TestChild />
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
