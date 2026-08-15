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
  Lock
} from 'lucide-react';

export default function AdminManagement() {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'config' | 'system'
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [usersList, setUsersList] = useState([
    { id: '11111111-1111-1111-1111-111111111111', name: 'System Administrator', email: 'admin@eduflow.ai', role: 'Admin', status: 'Active', xp: 'N/A', joined: '2026-08-01' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Dr. Sarah Jenkins', email: 'instructor@eduflow.ai', role: 'Instructor', status: 'Active', xp: 'N/A', joined: '2026-08-05' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Alex Rivera', email: 'student@eduflow.ai', role: 'Student', status: 'Active', xp: '1,250 XP', joined: '2026-08-10' },
    { id: '33333333-3333-3333-3333-333333333334', name: 'Maya Patel', email: 'maya@eduflow.ai', role: 'Student', status: 'Active', xp: '8,420 XP', joined: '2026-08-08' },
    { id: '33333333-3333-3333-3333-333333333335', name: 'Chen Wei', email: 'chen@eduflow.ai', role: 'Student', status: 'Active', xp: '4,650 XP', joined: '2026-08-12' },
    { id: '33333333-3333-3333-3333-333333333336', name: 'Elena Rostova', email: 'elena@eduflow.ai', role: 'Student', status: 'Active', xp: '2,940 XP', joined: '2026-08-14' }
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
      <div className="glass-panel" style={{
        padding: '24px 28px',
        border: '1px solid rgba(244, 63, 94, 0.4)',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(17, 24, 39, 0.9))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(244, 63, 94, 0.25)',
              color: 'var(--accent)',
              fontWeight: '800',
              letterSpacing: '0.05em'
            }}>
              ADMIN PRIVILEGES ACTIVE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Root Role-Based Access Control</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF' }}>
            System Administration & Platform Governance 🛡️
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage user accounts, RBAC role elevations, global gamification configurations, and AI microservice safety bounds.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveSubTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeSubTab === 'users' ? 'var(--accent)' : 'transparent',
              color: activeSubTab === 'users' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Users size={15} /> User Management ({usersList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeSubTab === 'config' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'config' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Settings size={15} /> Global Config
          </button>
          <button
            onClick={() => setActiveSubTab('system')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeSubTab === 'system' ? 'var(--secondary)' : 'transparent',
              color: activeSubTab === 'system' ? '#0F172A' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Activity size={15} /> Infrastructure Health
          </button>
        </div>
      </div>

      {/* 1. User Management View */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                width: '260px'
              }}>
                <Search size={15} color="var(--text-subtle)" />
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12px', width: '100%' }}
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Instructor">Instructor</option>
                <option value="Student">Student</option>
              </select>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredUsers.length} of {usersList.length} Accounts
            </span>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 10px' }}>User Details</th>
                  <th style={{ padding: '12px 10px' }}>Role</th>
                  <th style={{ padding: '12px 10px' }}>XP Progress</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px' }}>Joined Date</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{user.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>
                    </td>

                    <td style={{ padding: '12px 10px' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: user.role === 'Admin' ? 'rgba(244, 63, 94, 0.2)' : user.role === 'Instructor' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                          color: user.role === 'Admin' ? 'var(--accent)' : user.role === 'Instructor' ? 'var(--secondary)' : 'var(--primary)',
                          fontWeight: '700',
                          border: 'none',
                          fontSize: '11.5px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Instructor">Instructor</option>
                        <option value="Student">Student</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px 10px', color: 'var(--warning)', fontWeight: '700' }}>
                      {user.xp}
                    </td>

                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: user.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                        color: user.status === 'Active' ? 'var(--success)' : 'var(--accent)',
                        fontWeight: '700'
                      }}>
                        {user.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 10px', color: 'var(--text-subtle)', fontSize: '12px' }}>
                      {user.joined}
                    </td>

                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleUserStatus(user.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: user.status === 'Active' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: user.status === 'Active' ? 'var(--accent)' : 'var(--success)',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          border: 'none'
                        }}
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
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Gamification Engine Rules</h3>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Global XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={systemConfig.globalXpMultiplier}
                onChange={(e) => setSystemConfig({ ...systemConfig, globalXpMultiplier: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Applied across all quiz submissions and daily challenge rewards</span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Max Streak Freeze Tokens Per Student</label>
              <input
                type="number"
                value={systemConfig.dailyStreakFreezeCap}
                onChange={(e) => setSystemConfig({ ...systemConfig, dailyStreakFreezeCap: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <button
              onClick={() => alert('Global Gamification Configuration Saved Successfully!')}
              style={{ marginTop: 'auto', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Gamification Settings
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>AI Safety & Guardrail Parameters</h3>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Max Weekly Study Hours Guard (Hours/Week)</label>
              <input
                type="number"
                value={systemConfig.aiMaxWeeklyHoursConstraint}
                onChange={(e) => setSystemConfig({ ...systemConfig, aiMaxWeeklyHoursConstraint: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Deterministic safety limit enforced by the Python Validation Guard</span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Minimum Student Goal Text Length</label>
              <input
                type="number"
                value={systemConfig.aiMinGoalLengthConstraint}
                onChange={(e) => setSystemConfig({ ...systemConfig, aiMinGoalLengthConstraint: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <button
              onClick={() => alert('AI Guardrail Constraints Saved Successfully!')}
              style={{ marginTop: 'auto', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--accent), #E11D48)', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}
            >
              Save AI Guardrails
            </button>
          </div>
        </div>
      )}

      {/* 3. Infrastructure & System Health */}
      {activeSubTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {[
            { title: 'PostgreSQL 16 Database', status: 'Connected (Neon Cloud)', latency: '34ms', icon: Database, color: 'var(--success)' },
            { title: 'LangGraph AI Microservice', status: 'Healthy (FastAPI :8000)', latency: '12ms', icon: Cpu, color: 'var(--primary)' },
            { title: 'SignalR Real-Time Hub', status: 'Active (WebSockets WSS)', latency: '8ms', icon: Activity, color: 'var(--secondary)' },
            { title: 'JWT Auth & Security', status: 'Enforcing 24h Expiry', latency: '0ms', icon: Lock, color: 'var(--warning)' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.color
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{ fontSize: '11px', color: item.color, fontWeight: '700' }}>● {item.latency}</span>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{item.title}</h4>
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
