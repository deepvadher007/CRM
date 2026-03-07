import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState(null);

  const { identifier, password } = formData;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    // Don't clear API error immediately - let it stay for 4 seconds
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    // Identifier validation (email or phone)
    if (!identifier.trim()) {
      newErrors.identifier = 'Email or phone is required';
    } else if (identifier.includes('@')) {
      // Validate as email
      if (!/^\S+@\S+\.\S+$/.test(identifier)) {
        newErrors.identifier = 'Please provide a valid email address';
      }
    } else {
      // Validate as phone
      if (!/^\d{10,15}$/.test(identifier)) {
        newErrors.identifier = 'Phone must be 10-15 digits';
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors and timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }
    setApiError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(identifier, password);

      if (result.success) {
        // Redirect to dashboard on successful login
        navigate('/dashboard');
      } else {
        // Display API error message and keep it for 4 seconds
        const errorMsg = result.error || 'Login failed. Please try again.';
        setApiError(errorMsg);
        
        // Auto-clear error after 4 seconds
        const timeout = setTimeout(() => {
          setApiError('');
          setErrorTimeout(null);
        }, 4000);
        
        setErrorTimeout(timeout);
      }
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setApiError(errorMsg);
      
      // Auto-clear error after 4 seconds
      const timeout = setTimeout(() => {
        setApiError('');
        setErrorTimeout(null);
      }, 4000);
      
      setErrorTimeout(timeout);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <p className="login-subtitle">Welcome back! Please login to your account.</p>

        {apiError && (
          <div className="error-message api-error" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="identifier">Email or Phone</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={identifier}
              onChange={handleChange}
              className={errors.identifier ? 'input-error' : ''}
              placeholder="Enter email or phone number"
              disabled={loading}
              autoComplete="username"
            />
            {errors.identifier && (
              <span className="error-message field-error">{errors.identifier}</span>
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
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="error-message field-error">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="link">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
