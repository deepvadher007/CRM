import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
import { AuthProvider } from '../../context/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper function to render Register with required providers
const renderRegister = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders register form correctly', () => {
    renderRegister();

    // There are two elements with "Register" text (heading + button)
    expect(screen.getAllByText('Register').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Create your account to get started.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByText('Login here')).toBeInTheDocument();
  });

  test('displays validation error for empty name', async () => {
    renderRegister();

    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  test('displays validation error for empty password', async () => {
    renderRegister();

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('displays validation error for password shorter than 8 characters', async () => {
    renderRegister();

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  test('clears field error when user starts typing', async () => {
    renderRegister();

    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  test('shows loading state during form submission', async () => {
    renderRegister();

    const nameInput = screen.getByLabelText('Name');
    const phoneInput = screen.getByLabelText('Phone Number');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    // Button should show loading text
    expect(screen.getByText('Registering...')).toBeInTheDocument();
  });

  test('role dropdown has correct default value', () => {
    renderRegister();

    const roleSelect = screen.getByLabelText('Role');
    expect(roleSelect.value).toBe('Agent');
  });

  test('role dropdown has both options', () => {
    renderRegister();

    const roleSelect = screen.getByLabelText('Role');
    const options = Array.from(roleSelect.options).map(option => option.value);

    expect(options).toContain('Agent');
    expect(options).toContain('Admin');
  });

  test('link to login page is present', () => {
    renderRegister();

    const loginLink = screen.getByText('Login here');
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
