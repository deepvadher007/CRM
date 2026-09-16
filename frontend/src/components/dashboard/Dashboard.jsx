import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { extractErrorMessage } from '../../utils/errorHandler';
import ImportLeadsModal from './ImportLeadsModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Lead form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    number: '',
    leadFrom: '',
    leadSource: 'Own User',
    remark: '',
    status: 'CNR',
    followUpDate: '',
    requirement: '',
    budget: '',
    stage: '',
    lastContacted: '',
    temperature: ''
  });
  
  // UI state
  const [leads, setLeads] = useState([]);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [phoneDropdown, setPhoneDropdown] = useState(null);
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    leadSource: '',
    agent: '',
    search: '',
    stage: '',
    temperature: ''
  });
  
  // Refs for scrolling
  const tableRef = useRef(null);
  const tableScrollRef = useRef(null);   // the actual .table-container (overflow-x: auto)
  const stickyScrollRef = useRef(null);  // the sticky phantom scrollbar track

  // Fetch all leads with filters
  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.leadSource) params.append('leadSource', filters.leadSource);
      if (filters.agent) params.append('agent', filters.agent);
      if (filters.search) params.append('search', filters.search);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.temperature) params.append('temperature', filters.temperature);
      
      const response = await api.get(`/api/leads?${params.toString()}`);
      setLeads(response.data.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  };

  // Fetch pending follow-ups
  const fetchTodayFollowUps = async () => {
    try {
      const response = await api.get('/api/leads/today');
      setTodayFollowUps(response.data.leads || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    }
  };

  // Fetch agents (Admin only). Always sourced live from the API, then
  // de-duplicated by unique _id so a stale/duplicate entry can never render.
  const fetchAgents = async () => {
    if (user?.role === 'Admin') {
      try {
        const response = await api.get('/api/auth/agents');
        const list = response.data.agents || [];
        // De-duplicate by unique database id (identity is _id, not name/email)
        const byId = new Map();
        list.forEach((a) => {
          if (a && a._id && !byId.has(a._id)) {
            byId.set(a._id, a);
          }
        });
        setAgents(Array.from(byId.values()));
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchLeads();
    fetchTodayFollowUps();
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload leads when filters change
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Keep the agent list current after changes made elsewhere (e.g. an agent
  // deleted/created via Manage Agents). Re-fetch when the tab regains focus so
  // no browser restart is needed.
  useEffect(() => {
    const refreshAgentsOnFocus = () => fetchAgents();
    window.addEventListener('focus', refreshAgentsOnFocus);
    return () => window.removeEventListener('focus', refreshAgentsOnFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
    if (success) setSuccess('');
    if (duplicateWarning) setDuplicateWarning('');
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      leadSource: '',
      agent: '',
      search: '',
      stage: '',
      temperature: ''
    });
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning('');

    // Validation
    if (!formData.name.trim() || !formData.number.trim()) {
      setError('Name and Number are required');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing lead
        await api.put(`/api/leads/${editingId}`, formData);
        setSuccess('Lead updated successfully');
        setEditingId(null);
      } else {
        // Create new lead
        const response = await api.post('/api/leads', formData);
        setSuccess('Lead created successfully');
        
        // Check for duplicate warning
        if (response.data.duplicateWarning) {
          setDuplicateWarning(response.data.duplicateWarning);
        }
      }

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: '',
        number: '',
        leadFrom: '',
        leadSource: 'Own User',
        remark: '',
        status: 'CNR',
        followUpDate: '',
        requirement: '',
        budget: '',
        stage: '',
        lastContacted: '',
        temperature: ''
      });

      // Refresh data
      fetchLeads();
      fetchTodayFollowUps();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save lead'));
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (lead) => {
    setEditingId(lead._id);
    setFormData({
      date: lead.date ? new Date(lead.date).toISOString().split('T')[0] : '',
      name: lead.name,
      number: lead.number,
      leadFrom: lead.leadFrom || '',
      leadSource: lead.leadSource || 'Own User',
      remark: lead.remark || '',
      status: lead.status,
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
      requirement: lead.requirement || '',
      budget: lead.budget || '',
      stage: lead.stage || '',
      lastContacted: lead.lastContacted ? new Date(lead.lastContacted).toISOString().split('T')[0] : '',
      temperature: lead.temperature || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      await api.delete(`/api/leads/${id}`);
      setSuccess('Lead deleted successfully');
      fetchLeads();
      fetchTodayFollowUps();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete lead'));
    }
  };

  // Handle lead assignment
  const handleAssignLead = async (leadId, agentId) => {
    try {
      await api.put(`/api/leads/assign/${leadId}`, { agentId });
      await fetchLeads();
      setAssigningLeadId(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to assign lead'));
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      number: '',
      leadFrom: '',
      leadSource: 'Own User',
      remark: '',
      status: 'CNR',
      followUpDate: '',
      requirement: '',
      budget: '',
      stage: '',
      lastContacted: '',
      temperature: ''
    });
    setDuplicateWarning('');
  };

  // Toggle phone dropdown
  const togglePhoneDropdown = (leadId) => {
    setPhoneDropdown(phoneDropdown === leadId ? null : leadId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (phoneDropdown) setPhoneDropdown(null);
      if (assigningLeadId) setAssigningLeadId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [phoneDropdown, assigningLeadId]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Readable "5 Sep 2026" style date (used for Last Contacted)
  const formatReadableDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Temperature display with an icon, reusing existing text styling
  const renderTemperature = (temp) => {
    if (temp === 'Hot') return '🔥 Hot';
    if (temp === 'Warm') return '🟡 Warm';
    if (temp === 'Cold') return '❄️ Cold';
    return '-';
  };

  // Scroll to matching lead and highlight
  const scrollToLead = (leadId) => {
    const row = document.getElementById(`lead-${leadId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('highlight-row');
      setTimeout(() => row.classList.remove('highlight-row'), 2000);
    }
  };

  // Search and scroll to first match
  useEffect(() => {
    if (filters.search && leads.length > 0) {
      scrollToLead(leads[0]._id);
    }
  }, [leads, filters.search]);

  // Keep the sticky scroll track width equal to the table's scrollable width.
  // Runs whenever the leads list changes (rows added/removed = width may change).
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    const stickyEl = stickyScrollRef.current;
    if (!tableEl || !stickyEl) return;

    const thumbEl = stickyEl.firstChild;
    if (thumbEl) {
      thumbEl.style.width = tableEl.scrollWidth + 'px';
    }
  }, [leads]);

  // Bidirectional scroll sync between the sticky scrollbar and the table.
  // A boolean flag prevents the two listeners from triggering each other.
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    const stickyEl = stickyScrollRef.current;
    if (!tableEl || !stickyEl) return;

    let syncing = false;

    const onStickyScroll = () => {
      if (syncing) return;
      syncing = true;
      tableEl.scrollLeft = stickyEl.scrollLeft;
      syncing = false;
    };

    const onTableScroll = () => {
      if (syncing) return;
      syncing = true;
      stickyEl.scrollLeft = tableEl.scrollLeft;
      syncing = false;
    };

    stickyEl.addEventListener('scroll', onStickyScroll);
    tableEl.addEventListener('scroll', onTableScroll);

    // Also sync thumb width on initial mount
    const thumbEl = stickyEl.firstChild;
    if (thumbEl) {
      thumbEl.style.width = tableEl.scrollWidth + 'px';
    }

    return () => {
      stickyEl.removeEventListener('scroll', onStickyScroll);
      tableEl.removeEventListener('scroll', onTableScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Hanuvansh CRM</h1>
        <div className="header-actions">
          <p>Welcome, {user?.name} ({user?.role})</p>
          {user?.role === 'Admin' && (
            <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
              Import Leads
            </button>
          )}
        </div>
      </div>

      {/* Lead Entry Form */}
      <div className="lead-form-section">
        <h2>{editingId ? 'Edit Lead' : 'Add New Lead'}</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {duplicateWarning && (
          <div className={`alert ${duplicateWarning.startsWith('STRONG') ? 'alert-error' : 'alert-warning'}`}>
            ⚠️ {duplicateWarning.replace('STRONG: ', '').replace('WEAK: ', '')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="lead-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="number">Number *</label>
              <input
                type="text"
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                placeholder="Enter phone number"
                disabled={loading}
                required
                className={duplicateWarning ? 'input-error' : ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="leadFrom">Lead From (Optional)</label>
              <input
                type="text"
                id="leadFrom"
                name="leadFrom"
                value={formData.leadFrom}
                onChange={handleChange}
                placeholder="e.g., Facebook, Website, Referral"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="leadSource">Lead Source</label>
              <select
                id="leadSource"
                name="leadSource"
                value={formData.leadSource}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Own User">Own User</option>
                <option value="Investor">Investor</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="CNR">CNR</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="BOOKED">Booked</option>
                <option value="INVALID_NO">Invalid No</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="followUpDate">Follow-up Date</label>
              <input
                type="date"
                id="followUpDate"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="remark">Remark</label>
              <input
                type="text"
                id="remark"
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                placeholder="Enter remark"
                disabled={loading}
              />
            </div>
          </div>

          {/* Real-estate lead fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="requirement">Requirement</label>
              <input
                type="text"
                id="requirement"
                name="requirement"
                value={formData.requirement}
                onChange={handleChange}
                placeholder="e.g., 4 BHK, 2 BHK, Commercial"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="budget">Budget</label>
              <input
                type="text"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g., ₹3Cr, ₹50L"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select stage</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed">Closed</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="lastContacted">Last Contacted</label>
              <input
                type="date"
                id="lastContacted"
                name="lastContacted"
                value={formData.lastContacted}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature">Temperature</label>
              <select
                id="temperature"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select temperature</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Lead' : 'Add Lead'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Pending Follow-ups */}
      {todayFollowUps.length > 0 && (
        <div className="today-followups-section">
          <h2>Pending Follow-ups ({todayFollowUps.length})</h2>
          <div className="followup-cards">
            {todayFollowUps.map((lead) => (
              <div key={lead._id} className="followup-card">
                <div className="followup-info">
                  <h3>{lead.name}</h3>
                  <p>📞 {lead.number}</p>
                  <p className="followup-date">📅 {formatDate(lead.followUpDate)}</p>
                  {lead.remark && <p className="remark">💬 {lead.remark}</p>}
                </div>
                <div className="followup-actions">
                  <button className="btn-icon" onClick={() => handleEdit(lead)} title="Edit">
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <h2>Filters</h2>
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="searchFilter">Search</label>
            <input
              type="text"
              id="searchFilter"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or phone"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="CNR">CNR</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="BOOKED">Booked</option>
              <option value="INVALID_NO">Invalid No</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="leadSourceFilter">Lead Source</label>
            <select
              id="leadSourceFilter"
              name="leadSource"
              value={filters.leadSource}
              onChange={handleFilterChange}
            >
              <option value="">All Sources</option>
              <option value="Own User">Own User</option>
              <option value="Investor">Investor</option>
              <option value="Inquiry">Inquiry</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="stageFilter">Stage</label>
            <select
              id="stageFilter"
              name="stage"
              value={filters.stage}
              onChange={handleFilterChange}
            >
              <option value="">All Stages</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Site Visit">Site Visit</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed">Closed</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="temperatureFilter">Temperature</label>
            <select
              id="temperatureFilter"
              name="temperature"
              value={filters.temperature}
              onChange={handleFilterChange}
            >
              <option value="">All Temperatures</option>
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
            </select>
          </div>

          {user?.role === 'Admin' && (
            <div className="filter-group">
              <label htmlFor="agentFilter">Agent</label>
              <select
                id="agentFilter"
                name="agent"
                value={filters.agent}
                onChange={handleFilterChange}
              >
                <option value="">All Agents</option>
                {agents.map(agent => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* All Leads Table */}
      <div className="leads-table-section" ref={tableRef}>
        <h2>All Leads ({leads.length})</h2>
        {/* Sticky horizontal scrollbar — sits at bottom of visible section.
            Its inner thumb width is kept in sync with the table's scrollWidth
            by the useEffect above. Scrolling either element syncs the other. */}
        <div className="sticky-scroll-track" ref={stickyScrollRef}>
          <div className="sticky-scroll-thumb"></div>
        </div>
        <div className="table-container" ref={tableScrollRef}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Number</th>
                <th>Lead From</th>
                <th>Lead Source</th>
                <th>Status</th>
                <th className="col-requirement">Requirement</th>
                <th className="col-budget">Budget</th>
                <th className="col-stage">Stage</th>
                <th className="col-last-contacted">Last Contacted</th>
                <th className="col-temperature">Temperature</th>
                <th>Follow-up</th>
                <th>Remark</th>
                {user?.role === 'Admin' && <th>Added By</th>}
                {user?.role === 'Admin' && <th>Assigned To</th>}
                {user?.role === 'Admin' && <th>Assigned By</th>}
                {user?.role !== 'Admin' && <th>Assigned By</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'Admin' ? "17" : "15"} className="no-data">
                    No leads found. {filters.search || filters.status || filters.leadSource || filters.agent ? 'Try adjusting your filters.' : 'Add your first lead above!'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id} id={`lead-${lead._id}`}>
                    <td>{formatDate(lead.date)}</td>
                    <td>{lead.name}</td>
                    <td>
                      <div className="phone-cell">
                        <button 
                          className="phone-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhoneDropdown(lead._id);
                          }}
                        >
                          📞 {lead.number}
                        </button>
                        {phoneDropdown === lead._id && (
                          <div className="phone-dropdown" onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${lead.number}`} className="dropdown-item">
                              📞 Call
                            </a>
                            <a 
                              href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dropdown-item"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{lead.leadFrom || '-'}</td>
                    <td>{lead.leadSource || 'Own User'}</td>
                    <td>
                      <span className={`status-badge status-${lead.status.toLowerCase()}`}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="col-requirement">{lead.requirement || '-'}</td>
                    <td className="col-budget">{lead.budget || '-'}</td>
                    <td className="col-stage">
                      {lead.stage ? (
                        <span className={`stage-badge stage-${lead.stage.toLowerCase().replace(/\s+/g, '-')}`}>
                          {lead.stage}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="col-last-contacted">{formatReadableDate(lead.lastContacted)}</td>
                    <td className="col-temperature">{renderTemperature(lead.temperature)}</td>
                    <td>{formatDate(lead.followUpDate)}</td>
                    <td className="remark-cell">{lead.remark || '-'}</td>
                    {user?.role === 'Admin' && (
                      <td>
                        {lead.createdBy ? `${lead.createdBy.name} (${lead.createdBy.role})` : '-'}
                      </td>
                    )}
                    {user?.role === 'Admin' && (
                      <td>{lead.assignedTo?.name || 'Unassigned'}</td>
                    )}
                    {user?.role === 'Admin' && (
                      <td>{lead.assignedBy?.name || '-'}</td>
                    )}
                    {user?.role !== 'Admin' && (
                      <td>{lead.assignedBy?.name || '-'}</td>
                    )}
                    <td className="actions-cell">
                      <button className="btn-icon" onClick={() => handleEdit(lead)} title="Edit">
                        ✏️
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(lead._id)} title="Delete">
                        🗑️
                      </button>
                      {user?.role === 'Admin' && (
                        assigningLeadId === lead._id ? (
                          <select
                            className="assign-select"
                            defaultValue=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleAssignLead(lead._id, val === '' ? null : val);
                            }}
                          >
                            <option value="" disabled>Select agent</option>
                            <option value="">Unassign</option>
                            {agents.map(agent => (
                              <option key={agent._id} value={agent._id}>{agent.name}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            className="btn-icon btn-assign"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Refresh the agent list from the API right before
                              // opening the dropdown so deleted agents never show.
                              fetchAgents();
                              setAssigningLeadId(lead._id);
                            }}
                            title="Assign"
                          >
                            👤
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => fetchLeads()}
      />
    </div>
  );
};

export default Dashboard;
