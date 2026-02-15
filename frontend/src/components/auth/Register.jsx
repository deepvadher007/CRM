import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
    email: '',
    password: '',
    role: 'Agent',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { name, countryCode, phone, email, password, role } = formData;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Country code validation
    if (!countryCode) {
      newErrors.countryCode = 'Country code is required';
    }

    // Phone validation
    if (!phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10,15}$/.test(phone)) {
      newErrors.phone = 'Phone must be 10-15 digits';
    }

    // Email validation (optional)
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Role validation
    if (!role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setApiError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await register({ 
        name, 
        phone: { countryCode, number: phone },
        email: email || undefined,
        password, 
        role 
      });

      if (result.success) {
        // Redirect to login on successful registration
        navigate('/login', { 
          state: { message: 'Registration successful! Please login.' } 
        });
      } else {
        // Display API error message
        setApiError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Register</h2>
        <p className="register-subtitle">Create your account to get started.</p>

        {apiError && (
          <div className="error-message api-error" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              className={errors.name ? 'input-error' : ''}
              placeholder="Enter your full name"
              disabled={loading}
              autoComplete="name"
            />
            {errors.name && (
              <span className="error-message field-error">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="countryCode">Country Code</label>
            <select
              id="countryCode"
              name="countryCode"
              value={countryCode}
              onChange={handleChange}
              className={errors.countryCode ? 'input-error' : ''}
              disabled={loading}
            >
              <option value="+91">+91 (India)</option>
              <option value="+1">+1 (USA/Canada)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+61">+61 (Australia)</option>
              <option value="+971">+971 (UAE)</option>
            </select>
            {errors.countryCode && (
              <span className="error-message field-error">{errors.countryCode}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={handleChange}
              className={errors.phone ? 'input-error' : ''}
              placeholder="Enter phone number (10-15 digits)"
              disabled={loading}
              autoComplete="tel"
            />
            {errors.phone && (
              <span className="error-message field-error">{errors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (Optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              className={errors.email ? 'input-error' : ''}
              placeholder="Enter your email (optional)"
              disabled={loading}
              autoComplete="email"
            />
            {errors.email && (
              <span className="error-message field-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
              placeholder="Enter your password (min 8 characters)"
              disabled={loading}
              autoComplete="new-password"
            />
            {errors.password && (
              <span className="error-message field-error">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={handleChange}
              className={errors.role ? 'input-error' : ''}
              disabled={loading}
            >
              <option value="Agent">Agent</option>
              <option value="Admin">Admin</option>
            </select>
            {errors.role && (
              <span className="error-message field-error">{errors.role}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
