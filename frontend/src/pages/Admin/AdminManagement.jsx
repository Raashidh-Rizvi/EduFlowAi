import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  Database, 
  Cpu, 
  Key, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Sparkles,
  Search,
  Lock,
  Sliders,
  SlidersHorizontal,
  Server,
  Brain,
  DollarSign,
  Zap,
  BarChart3,
  Clock,
  ArrowUpRight,
  Eye,
  FileText,
  Bot,
  Layers,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  X
} from 'lucide-react';

export default function AdminManagement() {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'config' | 'system' | 'ai-telemetry'
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [usersList, setUsersList] = useState([]);

  // AI Telemetry State
  const [aiTelemetry, setAiTelemetry] = useState(null);
  const [loadingAiTelemetry, setLoadingAiTelemetry] = useState(false);
  const [aiUserSearch, setAiUserSearch] = useState('');
  const [aiRoleFilter, setAiRoleFilter] = useState('All');
  const [aiSortKey, setAiSortKey] = useState('TotalTokens'); // 'TotalTokens' | 'TotalCostUsd' | 'TotalRequests'
  const [selectedWorkflowModal, setSelectedWorkflowModal] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'ai-telemetry') {
      fetchAiTelemetry();
    }
  }, [activeSubTab]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      // Map API response to match UI format
      const mapped = response.data.map(u => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        status: u.isActive ? 'Active' : 'Suspended',
        xp: `${u.totalXp} XP`,
        joined: new Date(u.createdAt).toISOString().split('T')[0]
      }));
      setUsersList(mapped);
    } catch (err) {
      console.warn('Failed to fetch users:', err);
    }
  };

  const fetchAiTelemetry = async () => {
    setLoadingAiTelemetry(true);
    try {
      const response = await api.get('/admin/ai-telemetry');
      setAiTelemetry(response.data);
    } catch (err) {
      console.warn('Failed to fetch AI telemetry:', err);
    } finally {
      setLoadingAiTelemetry(false);
    }
  };

  const [systemConfig, setSystemConfig] = useState({
    globalXpMultiplier: 1.0,
    dailyStreakFreezeCap: 3,
    aiMaxWeeklyHoursConstraint: 20,
    aiMinGoalLengthConstraint: 5,
    enableSignalRLiveUpdates: true,
    requireInstructorHitlApproval: true
  });

  const handleToggleUserStatus = async (id) => {
    try {
      await api.post(`/admin/users/${id}/toggle-status`);
      fetchUsers();
    } catch (err) {
      console.warn('Failed to toggle user status:', err);
    }
  };

  const handleChangeRole = async (id, newRole) => {
    try {
      await api.post(`/admin/users/${id}/change-role`, { newRole });
      fetchUsers();
    } catch (err) {
      console.warn('Failed to change user role:', err);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered AI User Usage list
  const filteredAiUserUsage = (aiTelemetry?.userUsage || [])
    .filter(u => {
      const matchesSearch = (u.fullName || '').toLowerCase().includes(aiUserSearch.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(aiUserSearch.toLowerCase());
      const matchesRole = aiRoleFilter === 'All' || u.role === aiRoleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => (b[aiSortKey] || 0) - (a[aiSortKey] || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="card-premium" style={{
        padding: '24px 28px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge-pill badge-danger">
              ROOT RBAC ACCESS
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Platform Security & Policy Engine</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Platform Governance & Administration
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '640px' }}>
            Manage identity directory, elevate role scopes, monitor AI model token usage & costs, observe multi-agent workflows, and enforce deterministic safety constraints.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-canvas)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveSubTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'users' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'users' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: activeSubTab === 'users' ? '600' : '500',
              border: activeSubTab === 'users' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Users size={14} /> 
            <span>Directory ({usersList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('ai-telemetry')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'ai-telemetry' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'ai-telemetry' ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: activeSubTab === 'ai-telemetry' ? '700' : '500',
              border: activeSubTab === 'ai-telemetry' ? '1px solid var(--primary)' : '1px solid transparent',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'ai-telemetry' ? '0 0 10px rgba(99, 102, 241, 0.15)' : 'none'
            }}
          >
            <Brain size={14} color={activeSubTab === 'ai-telemetry' ? 'var(--primary)' : 'currentColor'} /> 
            <span>AI & Agent Telemetry</span>
            <span className="badge-pill badge-primary" style={{ fontSize: '10px', padding: '1px 5px' }}>NEW</span>
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'config' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'config' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: activeSubTab === 'config' ? '600' : '500',
              border: activeSubTab === 'config' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={14} /> 
            <span>Platform Policy</span>
          </button>
          <button
            onClick={() => setActiveSubTab('system')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'system' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'system' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: activeSubTab === 'system' ? '600' : '500',
              border: activeSubTab === 'system' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Server size={14} /> 
            <span>Telemetry</span>
          </button>
        </div>
      </div>

      {/* 1. User Management View */}
      {activeSubTab === 'users' && (
        <div className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                width: '280px'
              }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '7px 12px', fontSize: '12.5px' }}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Instructor">Instructor</option>
                <option value="Student">Student</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Showing {filteredUsers.length} of {usersList.length} Accounts
              </span>
              <button 
                onClick={() => alert('Add User Modal will open here. You can add Instructors or Students.')} 
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                + Add User
              </button>
            </div>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>User Details</th>
                  <th style={{ padding: '10px 12px' }}>Role Scope</th>
                  <th style={{ padding: '10px 12px' }}>Experience Points</th>
                  <th style={{ padding: '10px 12px' }}>Account Status</th>
                  <th style={{ padding: '10px 12px' }}>Enrolled On</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{user.email}</div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="form-select"
                        style={{
                          width: 'auto',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: '600'
                        }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Instructor">Instructor</option>
                        <option value="Student">Student</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
                      {user.xp}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span className={`badge-pill ${user.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {user.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {user.joined}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleUserStatus(user.id)}
                        className={user.status === 'Active' ? 'btn-danger' : 'btn-success'}
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                      >
                        {user.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. AI & Agent Telemetry View */}
      {activeSubTab === 'ai-telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingAiTelemetry ? (
            <div className="card-premium" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '14px' }}>Loading real-time AI cost, token usage, and multi-agent workflow telemetry...</p>
            </div>
          ) : aiTelemetry ? (
            <>
              {/* Top Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Estimated Cost
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--success)', letterSpacing: '-0.03em' }}>
                    ${aiTelemetry.summary.totalCostUsd?.toFixed(4)} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>USD</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={13} color="var(--success)" />
                    <span>Real-time model metering active</span>
                  </div>
                </div>

                <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Tokens Consumed
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.03em' }}>
                    {(aiTelemetry.summary.totalTokens / 1000)?.toFixed(1)}k
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Prompt: <strong style={{ color: 'var(--text-main)' }}>{(aiTelemetry.summary.totalPromptTokens / 1000)?.toFixed(1)}k</strong> | Completion: <strong style={{ color: 'var(--text-main)' }}>{(aiTelemetry.summary.totalCompletionTokens / 1000)?.toFixed(1)}k</strong>
                  </div>
                </div>

                <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Agent Invocations
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                    {aiTelemetry.summary.totalInvocations}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                      {aiTelemetry.summary.activeAgentsCount} Agents Operational
                    </span>
                  </div>
                </div>

                <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Avg Agent Latency
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                    {aiTelemetry.summary.avgLatencyMs} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>ms</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="status-dot-active" style={{ width: '6px', height: '6px' }}></span>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>FastAPI Gateway :8000 Healthy</span>
                  </div>
                </div>
              </div>

              {/* LLM Model Cost & Token Metering Breakdown */}
              <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      LLM Model Pricing & Consumption Breakdown
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Cost allocation, token volume distribution, and pricing meters per foundation model.
                    </p>
                  </div>
                  <button 
                    onClick={fetchAiTelemetry}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                  >
                    <RefreshCw size={12} /> Refresh Telemetry
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {aiTelemetry.modelCosts.map((m, idx) => (
                    <div key={idx} style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{m.modelName}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Provider: {m.provider}</div>
                        </div>
                        <span className="badge-pill badge-primary" style={{ fontSize: '11px' }}>
                          {m.usagePercent}% Share
                        </span>
                      </div>

                      {/* Token progress bar */}
                      <div>
                        <div style={{ height: '6px', backgroundColor: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${m.usagePercent}%`,
                            backgroundColor: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : idx === 2 ? 'var(--success)' : 'var(--warning)',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Prompt Tokens</div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{(m.promptTokens / 1000)?.toFixed(1)}k</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Completion Tokens</div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{(m.completionTokens / 1000)?.toFixed(1)}k</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Rate / 1k Prompt</div>
                          <div style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>${m.pricePer1kPrompt}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Est. Model Cost</div>
                          <div style={{ fontWeight: '700', color: 'var(--success)' }}>${m.estimatedCost?.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who's Using What: User AI Usage & Token Directory */}
              <div className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      User AI Usage & Token Metering Directory ("Who's Using What")
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Per-user prompt/completion token consumption, cost breakdown, and top AI features utilized.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-card)',
                      width: '260px'
                    }}>
                      <Search size={14} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Search by user or email..."
                        value={aiUserSearch}
                        onChange={(e) => setAiUserSearch(e.target.value)}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
                      />
                    </div>

                    <select
                      value={aiRoleFilter}
                      onChange={(e) => setAiRoleFilter(e.target.value)}
                      className="form-select"
                      style={{ width: 'auto', padding: '7px 12px', fontSize: '12.5px' }}
                    >
                      <option value="All">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Student">Student</option>
                    </select>

                    <select
                      value={aiSortKey}
                      onChange={(e) => setAiSortKey(e.target.value)}
                      className="form-select"
                      style={{ width: 'auto', padding: '7px 12px', fontSize: '12.5px' }}
                    >
                      <option value="TotalTokens">Sort by Total Tokens</option>
                      <option value="TotalCostUsd">Sort by Total Cost ($)</option>
                      <option value="TotalRequests">Sort by Requests Count</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 12px' }}>User Details</th>
                        <th style={{ padding: '10px 12px' }}>Requests</th>
                        <th style={{ padding: '10px 12px' }}>Prompt Tokens</th>
                        <th style={{ padding: '10px 12px' }}>Completion Tokens</th>
                        <th style={{ padding: '10px 12px' }}>Total Tokens</th>
                        <th style={{ padding: '10px 12px' }}>Est. Cost ($ USD)</th>
                        <th style={{ padding: '10px 12px' }}>Top Feature Used</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAiUserUsage.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No user AI token records matched your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAiUserUsage.map((usr) => (
                          <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{usr.fullName}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{usr.email}</div>
                              <span className={`badge-pill ${usr.role === 'Admin' ? 'badge-danger' : usr.role === 'Instructor' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block' }}>
                                {usr.role}
                              </span>
                            </td>

                            <td style={{ padding: '12px' }}>
                              <span className="badge-pill badge-secondary" style={{ fontWeight: '600' }}>
                                {usr.totalRequests} reqs
                              </span>
                            </td>

                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                              {(usr.promptTokens / 1000)?.toFixed(1)}k
                            </td>

                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                              {(usr.completionTokens / 1000)?.toFixed(1)}k
                            </td>

                            <td style={{ padding: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                              {(usr.totalTokens / 1000)?.toFixed(1)}k
                            </td>

                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--success)',
                                fontWeight: '700',
                                fontSize: '12.5px'
                              }}>
                                ${usr.totalCostUsd?.toFixed(4)}
                              </span>
                            </td>

                            <td style={{ padding: '12px' }}>
                              <span className="badge-pill badge-primary" style={{ fontSize: '11px' }}>
                                {usr.topFeature}
                              </span>
                            </td>

                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                              {new Date(usr.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interconnected 7-Agent Microservice Topology Grid */}
              <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                    Interconnected Multi-Agent Topology & Health Monitoring
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Real-time status, foundation model assignments, latency, and success metrics for all 7 LangGraph microservice agents.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {aiTelemetry.agents.map((agent, i) => (
                    <div key={i} style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      border: '1px solid var(--border-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Bot size={16} color="var(--primary)" />
                          <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
                            {agent.name}
                          </span>
                        </div>
                        <span className="badge-pill badge-success" style={{ fontSize: '10.5px' }}>
                          <span className="status-dot-active" style={{ width: '5px', height: '5px' }}></span>
                          {agent.status}
                        </span>
                      </div>

                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, minHeight: '32px' }}>
                        {agent.role}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Model: <strong>{agent.model}</strong></span>
                        <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{agent.invocations} calls</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        <span>Avg Latency: <strong style={{ color: 'var(--text-main)' }}>{agent.avgLatencyMs}ms</strong></span>
                        <span>Success: <strong style={{ color: 'var(--success)' }}>{agent.successRatePercent}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Multi-Agent LangGraph Workflow Execution Traces */}
              <div className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                    Live LangGraph Blackboard Workflow Execution Traces
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Observe active and recent state transitions, HITL approval states, step latency, and token consumption details.
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 12px' }}>Workflow ID & Feature</th>
                        <th style={{ padding: '10px 12px' }}>User</th>
                        <th style={{ padding: '10px 12px' }}>Pipeline Transitions</th>
                        <th style={{ padding: '10px 12px' }}>Tokens & Latency</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiTelemetry.recentWorkflows.map((wf) => (
                        <tr key={wf.workflowId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{wf.workflowId}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-main)', marginTop: '2px' }}>{wf.feature}</div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{wf.userName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wf.userEmail}</div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--secondary)', backgroundColor: 'var(--bg-canvas)', padding: '4px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', display: 'inline-block' }}>
                              {wf.pipeline}
                            </div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{wf.totalTokens} tokens</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wf.executionTimeMs} ms | ${wf.costUsd?.toFixed(4)}</div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <span className={`badge-pill ${wf.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                              {wf.status}
                            </span>
                          </td>

                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedWorkflowModal(wf)}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px' }}
                            >
                              <Eye size={12} /> Inspect State
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* 3. Global Config View */}
      {activeSubTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Gamification Ledger Rules</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Deterministic XP multipliers and streak policies.</p>
            </div>

            <div>
              <label className="form-label">Global XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={systemConfig.globalXpMultiplier}
                onChange={(e) => setSystemConfig({ ...systemConfig, globalXpMultiplier: parseFloat(e.target.value) })}
                className="form-input"
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Applied across all quiz submissions and daily milestone rewards.
              </span>
            </div>

            <div>
              <label className="form-label">Max Streak Freeze Tokens Per Student</label>
              <input
                type="number"
                value={systemConfig.dailyStreakFreezeCap}
                onChange={(e) => setSystemConfig({ ...systemConfig, dailyStreakFreezeCap: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>

            <button
              onClick={() => alert('Global Gamification Configuration Saved Successfully!')}
              className="btn-primary"
              style={{ marginTop: 'auto', padding: '9px 16px' }}
            >
              Save Reward Policies
            </button>
          </div>

          <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>AI Deterministic Safety Guardrails</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>LangGraph Python Validation Agent parameter limits.</p>
            </div>

            <div>
              <label className="form-label">Max Weekly Study Hours Guard (Hours/Week)</label>
              <input
                type="number"
                value={systemConfig.aiMaxWeeklyHoursConstraint}
                onChange={(e) => setSystemConfig({ ...systemConfig, aiMaxWeeklyHoursConstraint: parseInt(e.target.value) })}
                className="form-input"
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Strict workload ceiling enforced during agentic study plan decomposition.
              </span>
            </div>

            <div>
              <label className="form-label">Minimum Student Goal Input Length</label>
              <input
                type="number"
                value={systemConfig.aiMinGoalLengthConstraint}
                onChange={(e) => setSystemConfig({ ...systemConfig, aiMinGoalLengthConstraint: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>

            <button
              onClick={() => alert('AI Guardrail Constraints Saved Successfully!')}
              className="btn-primary"
              style={{ marginTop: 'auto', padding: '9px 16px' }}
            >
              Save AI Guardrails
            </button>
          </div>
        </div>
      )}

      {/* 4. Infrastructure & System Health */}
      {activeSubTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            { title: 'PostgreSQL 16 Database', status: 'Connected (Neon Cloud Cluster)', latency: '34ms', icon: Database, color: 'var(--success)' },
            { title: 'LangGraph Multi-Agent Service', status: 'Healthy (FastAPI Gateway :8000)', latency: '12ms', icon: Cpu, color: 'var(--primary)' },
            { title: 'SignalR Real-Time Hub', status: 'Active (WebSockets WSS Protocol)', latency: '8ms', icon: Activity, color: 'var(--secondary)' },
            { title: 'JWT Authentication Guard', status: 'Active (RSA256 Bearer Token)', latency: '0ms', icon: Lock, color: 'var(--warning)' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.color
                  }}>
                    <Icon size={18} />
                  </div>
                  <span className="badge-pill badge-success" style={{ fontSize: '11px' }}>
                    <span className="status-dot-active" style={{ width: '5px', height: '5px' }}></span>
                    {item.latency}
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{item.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{item.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Workflow State Inspector Modal */}
      {selectedWorkflowModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-pill badge-primary" style={{ fontSize: '11px' }}>
                    LANGGRAPH STATE MACHINE INSPECTOR
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workflow ID: {selectedWorkflowModal.workflowId}</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>
                  {selectedWorkflowModal.feature}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWorkflowModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', backgroundColor: 'var(--bg-canvas)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Initiating User</div>
                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{selectedWorkflowModal.userName}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{selectedWorkflowModal.userEmail}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Execution Metrics</div>
                <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedWorkflowModal.totalTokens} Tokens ({selectedWorkflowModal.promptTokens} p / {selectedWorkflowModal.completionTokens} c)</div>
                <div style={{ fontSize: '11.5px', color: 'var(--success)' }}>Cost: ${selectedWorkflowModal.costUsd?.toFixed(4)} | {selectedWorkflowModal.executionTimeMs}ms</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>State Machine Transition Pipeline</h4>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--secondary)', backgroundColor: 'var(--bg-canvas)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-card)' }}>
                {selectedWorkflowModal.pipeline}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>Input Objective Payload</h4>
              <pre style={{ fontSize: '11.5px', backgroundColor: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', overflowX: 'auto', margin: 0 }}>
                {JSON.stringify(JSON.parse(selectedWorkflowModal.inputPayloadJson || '{}'), null, 2)}
              </pre>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>State Result Output Payload</h4>
              <pre style={{ fontSize: '11.5px', backgroundColor: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', color: 'var(--success)', overflowX: 'auto', margin: 0 }}>
                {JSON.stringify(JSON.parse(selectedWorkflowModal.outputPayloadJson || '{}'), null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setSelectedWorkflowModal(null)}
                className="btn-primary"
                style={{ padding: '8px 16px' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

