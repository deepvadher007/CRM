import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

/**
 * Dashboard component - Main dashboard view for authenticated users
 * Displays user information and placeholder sections for future CRM features
 */
const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome back, {user?.name}! 👋</h1>
          <p className="welcome-subtitle">Here's what's happening with your CRM today</p>
        </div>

        {/* User Info Card */}
        <div className="user-info-card">
          <h2 className="card-title">Your Profile</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{user?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role</span>
              <span className="info-value role-badge">{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="btn-logout-dashboard">
            Logout
          </button>
        </div>

        {/* CRM Feature Placeholders */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Analytics</h3>
            <p className="feature-description">
              View your sales performance and key metrics
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3 className="feature-title">Contacts</h3>
            <p className="feature-description">
              Manage your customer relationships and contacts
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💼</div>
            <h3 className="feature-title">Deals</h3>
            <p className="feature-description">
              Track your sales pipeline and close deals faster
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3 className="feature-title">Calendar</h3>
            <p className="feature-description">
              Schedule meetings and manage your appointments
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3 className="feature-title">Email</h3>
            <p className="feature-description">
              Send and track email campaigns to your contacts
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3 className="feature-title">Reports</h3>
            <p className="feature-description">
              Generate detailed reports and insights
            </p>
            <span className="coming-soon">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
