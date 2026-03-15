import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

// Mock the api module
jest.mock('../../services/api');

// Mock AuthContext with test user data
const mockLogout = jest.fn();
const mockAdminUser = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
  _id: 'admin123',
};

const mockAgentUser = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'Agent',
  _id: 'agent123',
};

jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));

const { useAuth } = require('../../context/AuthContext');

// Helper function to render Dashboard with required providers
const renderDashboard = (user = mockAdminUser) => {
  useAuth.mockReturnValue({ user, logout: mockLogout });
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
    // Default mock for api calls
    api.get.mockResolvedValue({ data: { leads: [], agents: [] } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard header with user info', () => {
    renderDashboard();
    expect(screen.getByText('Hanuvansh CRM')).toBeInTheDocument();
    expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  test('renders lead form', () => {
    renderDashboard();
    expect(screen.getByText('Add New Lead')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Number *')).toBeInTheDocument();
  });

  test('Admin sees "Assigned To" table header', () => {
    renderDashboard(mockAdminUser);
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
  });

  test('Agent does not see "Assigned To" table header', () => {
    renderDashboard(mockAgentUser);
    expect(screen.queryByText('Assigned To')).not.toBeInTheDocument();
  });

  test('Admin sees "Assign" button when leads are present', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/leads')) {
        return Promise.resolve({
          data: {
            leads: [
              {
                _id: 'lead1',
                name: 'Test Lead',
                number: '1234567890',
                status: 'CNR',
                leadSource: 'Own User',
                date: new Date().toISOString(),
                createdBy: { name: 'Admin', role: 'Admin' },
                assignedTo: null,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { agents: [], leads: [] } });
    });

    renderDashboard(mockAdminUser);

    await waitFor(() => {
      expect(screen.getAllByText('Test Lead').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByTitle('Assign')).toBeInTheDocument();
  });

  test('Agent does not see "Assign" button', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/leads')) {
        return Promise.resolve({
          data: {
            leads: [
              {
                _id: 'lead1',
                name: 'Test Lead',
                number: '1234567890',
                status: 'CNR',
                leadSource: 'Own User',
                date: new Date().toISOString(),
                createdBy: { name: 'Agent', role: 'Agent' },
                assignedTo: null,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { agents: [], leads: [] } });
    });

    renderDashboard(mockAgentUser);

    await waitFor(() => {
      expect(screen.getAllByText('Test Lead').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByTitle('Assign')).not.toBeInTheDocument();
  });

  test('unassigned lead shows "Unassigned" in Assigned To column', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/leads')) {
        return Promise.resolve({
          data: {
            leads: [
              {
                _id: 'lead1',
                name: 'Test Lead',
                number: '1234567890',
                status: 'CNR',
                leadSource: 'Own User',
                date: new Date().toISOString(),
                createdBy: { name: 'Admin', role: 'Admin' },
                assignedTo: null,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { agents: [], leads: [] } });
    });

    renderDashboard(mockAdminUser);

    await waitFor(() => {
      expect(screen.getAllByText('Test Lead').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  test('assigned lead shows agent name in Assigned To column', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/leads')) {
        return Promise.resolve({
          data: {
            leads: [
              {
                _id: 'lead1',
                name: 'Test Lead',
                number: '1234567890',
                status: 'CNR',
                leadSource: 'Own User',
                date: new Date().toISOString(),
                createdBy: { name: 'Admin', role: 'Admin' },
                assignedTo: { name: 'Jane Smith' },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { agents: [], leads: [] } });
    });

    renderDashboard(mockAdminUser);

    await waitFor(() => {
      expect(screen.getAllByText('Test Lead').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('clicking Assign button shows agent dropdown', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/auth/agents')) {
        return Promise.resolve({
          data: { agents: [{ _id: 'agent1', name: 'Agent One' }] },
        });
      }
      if (url.includes('/api/leads')) {
        return Promise.resolve({
          data: {
            leads: [
              {
                _id: 'lead1',
                name: 'Test Lead',
                number: '1234567890',
                status: 'CNR',
                leadSource: 'Own User',
                date: new Date().toISOString(),
                createdBy: { name: 'Admin', role: 'Admin' },
                assignedTo: null,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { leads: [] } });
    });

    renderDashboard(mockAdminUser);

    await waitFor(() => {
      expect(screen.getAllByText('Test Lead').length).toBeGreaterThanOrEqual(1);
    });

    const assignButton = screen.getByTitle('Assign');
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(screen.getAllByText('Agent One').length).toBeGreaterThanOrEqual(1);
    });
  });
});
