import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../../context/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper function to render Login with required providers
const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders login form correctly', () => {
    renderLogin();

    // There are two elements with "Login" text (heading + button), use getAllByText
    expect(screen.getAllByText('Login').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Welcome back! Please login to your account.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email or Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText('Register here')).toBeInTheDocument();
  });

  test('displays validation error for empty identifier', async () => {
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email or phone is required')).toBeInTheDocument();
    });
  });

  test('displays validation error for empty password', async () => {
    renderLogin();

    const identifierInput = screen.getByLabelText('Email or Phone');
    fireEvent.change(identifierInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('clears field error when user starts typing', async () => {
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email or phone is required')).toBeInTheDocument();
    });

    const identifierInput = screen.getByLabelText('Email or Phone');
    fireEvent.change(identifierInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText('Email or phone is required')).not.toBeInTheDocument();
    });
  });

  test('shows loading state during form submission', async () => {
    renderLogin();

    const identifierInput = screen.getByLabelText('Email or Phone');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(identifierInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    // Button should show loading text
    expect(screen.getByText('Logging in...')).toBeInTheDocument();
  });

  test('link to register page is present', () => {
    renderLogin();

    const registerLink = screen.getByText('Register here');
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
