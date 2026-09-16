import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { extractErrorMessage } from '../../utils/errorHandler';
import './ManageAgents.css';

/**
 * ManageAgents modal - Admin-only Agent management.
 *
 * Allows an Admin to:
 *  - View the list of Agent accounts
 *  - Create a new Agent (role is always 'Agent', enforced by the backend)
 *  - Delete an Agent (backend preserves that agent's leads)
 *
 * Rendered only for Admins (the Navbar guards this) and every action is also
 * enforced on the backend by JWT auth + Admin role middleware.
 */
const emptyForm = {
  name: '',
  countryCode: '+91',
  number: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const ManageAgents = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [agents, setAgents] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState([]);
  const [formSuccess, setFormSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAgents = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const response = await api.get('/api/auth/manage/agents');
      setAgents(response.data.agents || []);
    } catch (err) {
      setListError(extractErrorMessage(err, 'Failed to load agents'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      setForm(emptyForm);
      setFormErrors([]);
      setFormSuccess('');
    }
  }, [isOpen, fetchAgents]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors.length) setFormErrors([]);
    if (formSuccess) setFormSuccess('');
  };

  const validateClient = () => {
    const errors = [];
    if (!form.name.trim()) errors.push('Name is required');
    if (!form.email.trim()) errors.push('Email is required');
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.push('Please provide a valid email address');
    if (!form.countryCode.trim()) errors.push('Country code is required');
    if (!form.number.trim()) errors.push('Phone number is required');
    else if (!/^\d{10,15}$/.test(form.number.trim())) errors.push('Phone number must be 10-15 digits');
    if (!form.password) errors.push('Password is required');
    else if (form.password.length < 8) errors.push('Password must be at least 8 characters long');
    if (form.password !== form.confirmPassword) errors.push('Passwords do not match');
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSuccess('');

    const clientErrors = validateClient();
    if (clientErrors.length) {
      setFormErrors(clientErrors);
      return;
    }

    setCreating(true);
    try {
      await api.post('/api/auth/manage/agents', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: {
          countryCode: form.countryCode.trim(),
          number: form.number.trim()
        },
        password: form.password,
        confirmPassword: form.confirmPassword
      });

      setFormSuccess('Agent created successfully');
      setForm(emptyForm);
      fetchAgents();
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length) {
        setFormErrors(backendErrors);
      } else {
        setFormErrors([extractErrorMessage(err, 'Failed to create agent')]);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agent) => {
    if (!window.confirm(`Delete agent "${agent.name}"? Their leads will be kept.`)) {
      return;
    }
    setDeletingId(agent._id);
    setListError('');
    try {
      await api.delete(`/api/auth/manage/agents/${agent._id}`);
      setAgents((prev) => prev.filter((a) => a._id !== agent._id));
    } catch (err) {
      setListError(extractErrorMessage(err, 'Failed to delete agent'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    if (typeof phone === 'string') return phone;
    return `${phone.countryCode || ''} ${phone.number || ''}`.trim() || '-';
  };

  // Only Admins can use this feature (backend also enforces this)
  if (!isOpen || user?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content manage-agents-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage Agents"
      >
        <h3>Manage Agents</h3>

        {/* Create Agent Form */}
        <form onSubmit={handleCreate} className="manage-agents-form">
          <h4>Add New Agent</h4>

          {formErrors.length > 0 && (
            <div className="error-message">
              {formErrors.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          )}
          {formSuccess && <div className="success-message">{formSuccess}</div>}

          <div className="form-group">
            <label htmlFor="agent-name">Full Name</label>
            <input
              type="text"
              id="agent-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              disabled={creating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="agent-email">Email</label>
            <input
              type="email"
              id="agent-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              disabled={creating}
            />
          </div>

          <div className="form-row-inline">
            <div className="form-group country-code-group">
              <label htmlFor="agent-country-code">Country Code</label>
              <input
                type="text"
                id="agent-country-code"
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
                placeholder="+91"
                disabled={creating}
              />
            </div>
            <div className="form-group phone-number-group">
              <label htmlFor="agent-number">Phone Number</label>
              <input
                type="text"
                id="agent-number"
                name="number"
                value={form.number}
                onChange={handleChange}
                placeholder="10-15 digits"
                disabled={creating}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agent-password">Password</label>
            <input
              type="password"
              id="agent-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min 8 characters"
              disabled={creating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="agent-confirm-password">Confirm Password</label>
            <input
              type="password"
              id="agent-confirm-password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              disabled={creating}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>

        {/* Agent List */}
        <div className="manage-agents-list">
          <h4>Existing Agents ({agents.length})</h4>

          {listError && <div className="error-message">{listError}</div>}

          {loadingList ? (
            <p className="agents-loading">Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="agents-empty">No agents yet. Create one above.</p>
          ) : (
            <div className="agents-table-wrapper">
              <table className="agents-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent._id}>
                      <td>{agent.name}</td>
                      <td>{agent.email || '-'}</td>
                      <td>{formatPhone(agent.phone)}</td>
                      <td>{agent.role}</td>
                      <td>{formatDate(agent.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete-agent"
                          onClick={() => handleDelete(agent)}
                          disabled={deletingId === agent._id}
                          aria-label={`Delete ${agent.name}`}
                        >
                          {deletingId === agent._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageAgents;
