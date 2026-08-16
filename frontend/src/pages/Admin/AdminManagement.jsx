import React, { useState } from 'react';
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
  Server
} from 'lucide-react';

export default function AdminManagement() {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'config' | 'system'
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [usersList, setUsersList] = useState([
    { id: '11111111-1111-1111-1111-111111111111', name: 'System Administrator', email: 'admin@eduflow.ai', role: 'Admin', status: 'Active', xp: 'N/A', joined: '2026-08-01' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Dr. Sarah Jenkins', email: 'instructor@eduflow.ai', role: 'Instructor', status: 'Active', xp: 'N/A', joined: '2026-08-05' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Alex Rivera', email: 'student@eduflow.ai', role: 'Student', status: 'Active', xp: '0 XP', joined: '2026-08-10' }
  ]);

  const [systemConfig, setSystemConfig] = useState({
    globalXpMultiplier: 1.0,
    dailyStreakFreezeCap: 3,
    aiMaxWeeklyHoursConstraint: 20,
    aiMinGoalLengthConstraint: 5,
    enableSignalRLiveUpdates: true,
    requireInstructorHitlApproval: true
  });

  const handleToggleUserStatus = (id) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        return { ...u, status: newStatus };
      }
      return u;
    }));
  };

  const handleChangeRole = (id, newRole) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
            Manage identity directory, elevate role scopes, enforce deterministic safety constraints, and observe microservice health telemetry.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-canvas)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
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

            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Showing {filteredUsers.length} of {usersList.length} Accounts
            </span>
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

      {/* 2. Global Config View */}
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

      {/* 3. Infrastructure & System Health */}
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
    </div>
  );
}
