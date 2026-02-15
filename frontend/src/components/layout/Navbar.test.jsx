import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import * as AuthContext from '../../context/AuthContext';

// Mock the useAuth hook
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Helper function to render with router
const renderWithRouter = (component) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('Navbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: jest.fn(),
      });
    });

    test('renders branding', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('Hanuvansh CRM')).toBeInTheDocument();
    });

    test('displays login link when not authenticated', () => {
      renderWithRouter(<Navbar />);
      const loginLink = screen.getByText('Login');
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    test('displays register link when not authenticated', () => {
      renderWithRouter(<Navbar />);
      const registerLink = screen.getByText('Register');
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    test('does not display user info when not authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    test('does not display dashboard link when not authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
    };

    const mockLogout = jest.fn();

    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        logout: mockLogout,
      });
    });

    test('displays user name when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    test('displays user role when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    test('displays dashboard link when authenticated', () => {
      renderWithRouter(<Navbar />);
      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    test('displays logout button when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    test('does not display login/register links when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    test('calls logout function when logout button is clicked', () => {
      renderWithRouter(<Navbar />);
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('displays Sales_Agent role correctly', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { ...mockUser, role: 'Sales_Agent' },
        logout: mockLogout,
      });

      renderWithRouter(<Navbar />);
      expect(screen.getByText('Sales_Agent')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'Sales_Agent',
        },
        logout: jest.fn(),
      });
    });

    test('mobile menu toggle button is present', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      expect(toggleButton).toBeInTheDocument();
    });

    test('mobile menu opens when toggle button is clicked', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-menu');

      expect(menu).not.toHaveClass('open');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');
    });

    test('mobile menu closes when toggle button is clicked again', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      fireEvent.click(toggleButton);
      expect(menu).not.toHaveClass('open');
    });

    test('mobile menu closes when dashboard link is clicked', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);
      expect(menu).not.toHaveClass('open');
    });

    test('mobile menu closes when logout is clicked', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      expect(menu).not.toHaveClass('open');
    });
  });

  describe('Responsive Design', () => {
    test('navbar has correct CSS classes for styling', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: jest.fn(),
      });

      renderWithRouter(<Navbar />);
      const navbar = document.querySelector('.navbar');
      expect(navbar).toBeInTheDocument();
      expect(navbar).toHaveClass('navbar');
    });

    test('hamburger menu has correct structure', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: jest.fn(),
      });

      renderWithRouter(<Navbar />);
      const hamburger = document.querySelector('.hamburger');
      expect(hamburger).toBeInTheDocument();
      expect(hamburger.querySelectorAll('span')).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    test('mobile menu toggle has proper aria attributes', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: jest.fn(),
      });

      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('logout button has proper aria label', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          role: 'Admin',
        },
        logout: jest.fn(),
      });

      renderWithRouter(<Navbar />);
      const logoutButton = screen.getByLabelText('Logout');
      expect(logoutButton).toBeInTheDocument();
    });
  });
});
