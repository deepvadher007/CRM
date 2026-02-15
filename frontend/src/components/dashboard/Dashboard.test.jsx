import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthProvider } from '../../context/AuthContext';

// Mock AuthContext with test user data
const mockLogout = jest.fn();
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
};

jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Helper function to render Dashboard with required providers
const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  test('renders dashboard correctly', () => {
    renderDashboard();
    
    expect(screen.getByText(/Welcome back, John Doe!/i)).toBeInTheDocument();
    expect(screen.getByText(/Here's what's happening with your CRM today/i)).toBeInTheDocument();
  });

  test('displays user profile information', () => {
    renderDashboard();
    
    // Check for profile section
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
    
    // Check for user name
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    // Check for user email
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    
    // Check for user role
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('displays logout button', () => {
    renderDashboard();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  test('calls logout function when logout button is clicked', () => {
    renderDashboard();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('displays CRM feature placeholders', () => {
    renderDashboard();
    
    // Check for all feature cards
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  test('displays "Coming Soon" badges on feature cards', () => {
    renderDashboard();
    
    const comingSoonBadges = screen.getAllByText('Coming Soon');
    expect(comingSoonBadges).toHaveLength(6);
  });

  test('displays feature descriptions', () => {
    renderDashboard();
    
    expect(screen.getByText(/View your sales performance and key metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your customer relationships and contacts/i)).toBeInTheDocument();
    expect(screen.getByText(/Track your sales pipeline and close deals faster/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule meetings and manage your appointments/i)).toBeInTheDocument();
    expect(screen.getByText(/Send and track email campaigns to your contacts/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate detailed reports and insights/i)).toBeInTheDocument();
  });
});
