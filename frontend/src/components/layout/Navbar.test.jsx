import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import * as AuthContext from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock the useAuth hook
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Helper function to render with router and theme
const renderWithRouter = (component) => {
  return render(<ThemeProvider><MemoryRouter>{component}</MemoryRouter></ThemeProvider>);
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
      const loginLinks = screen.getAllByText('Login');
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);
      expect(loginLinks[0]).toHaveAttribute('href', '/login');
    });

    test('displays register link when not authenticated', () => {
      renderWithRouter(<Navbar />);
      const registerLinks = screen.getAllByText('Register');
      expect(registerLinks.length).toBeGreaterThanOrEqual(1);
      expect(registerLinks[0]).toHaveAttribute('href', '/register');
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
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });

    test('displays user role when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    });

    test('displays dashboard link when authenticated', () => {
      renderWithRouter(<Navbar />);
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
      expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');
    });

    test('displays logout button when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getAllByText('Logout').length).toBeGreaterThanOrEqual(1);
    });

    test('does not display login/register links when authenticated', () => {
      renderWithRouter(<Navbar />);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    test('calls logout function when logout button is clicked', () => {
      renderWithRouter(<Navbar />);
      const logoutButtons = screen.getAllByText('Logout');
      fireEvent.click(logoutButtons[0]);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('displays Sales_Agent role correctly', () => {
      AuthContext.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { ...mockUser, role: 'Sales_Agent' },
        logout: mockLogout,
      });

      renderWithRouter(<Navbar />);
      expect(screen.getAllByText('Sales_Agent').length).toBeGreaterThanOrEqual(1);
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
      const menu = document.querySelector('.navbar-mobile-menu');

      expect(menu).not.toHaveClass('open');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');
    });

    test('mobile menu closes when toggle button is clicked again', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-mobile-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      fireEvent.click(toggleButton);
      expect(menu).not.toHaveClass('open');
    });

    test('mobile menu closes when dashboard link is clicked', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-mobile-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      // Click the mobile nav link (it has the onClick handler to close the menu)
      const mobileDashboardLink = document.querySelector('.mobile-nav-link');
      fireEvent.click(mobileDashboardLink);
      expect(menu).not.toHaveClass('open');
    });

    test('mobile menu closes when logout is clicked', () => {
      renderWithRouter(<Navbar />);
      const toggleButton = screen.getByLabelText('Toggle navigation menu');
      const menu = document.querySelector('.navbar-mobile-menu');

      fireEvent.click(toggleButton);
      expect(menu).toHaveClass('open');

      // Click the mobile logout button
      const mobileLogoutButton = document.querySelector('.mobile-btn-logout');
      fireEvent.click(mobileLogoutButton);
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
      const logoutButtons = screen.getAllByLabelText('Logout');
      expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
