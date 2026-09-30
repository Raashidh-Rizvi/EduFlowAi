import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, GraduationCap, BookOpen, Shield } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function NavbarV2({ activeTab, unreadNotifications = 3, currentUser, onLogout, onSwitchRole }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const user = currentUser || { fullName: '', email: '', role: '' };
  const isAdmin = user.role === 'Admin';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  const portalOptions = [
    { role: 'Student',    icon: GraduationCap, label: 'Student' },
    { role: 'Instructor', icon: BookOpen,       label: 'Instructor' },
    { role: 'Admin',      icon: Shield,         label: 'Admin' },
  ];

  return (
    <header className="v2-navbar" style={{ position: 'relative' }}>
      {/* Search */}
      <div className="v2-navbar-search">
        <Search size={14} color="var(--v2-text-muted)" />
        <input
          type="text"
          placeholder="Search resources, students, courses..."
          id="v2-global-search"
        />
        <kbd className="v2-search-kbd">⌘K</kbd>
      </div>

      {/* API status */}
      <div className="v2-api-badge">
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0,
          animation: 'none'
        }} />
        API 8.0: 18ms
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Portal switcher */}
      {onSwitchRole && (
        <div className="v2-portal-tabs">
          {portalOptions.map(({ role, icon: Icon, label }) => (
            <button
              key={role}
              className={`v2-portal-tab${user.role === role ? ' active' : ''}`}
              onClick={() => onSwitchRole(role)}
              aria-label={`Switch to ${label} portal`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Theme toggle */}
      <ThemeToggle compact />

      {/* Notification bell */}
      <div className="v2-icon-btn" title="Notifications" id="v2-notif-btn">
        <Bell size={15} color="var(--v2-text-sub)" />
        {unreadNotifications > 0 && (
          <span className="v2-notif-dot">{unreadNotifications}</span>
        )}
      </div>

      {/* User pill */}
      <div
        className="v2-user-pill"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        id="v2-user-pill"
      >
        <div
          className="v2-avatar"
          style={{ background: isAdmin ? 'var(--accent)' : 'linear-gradient(135deg,#8B5CF6,#3B82F6)' }}
        >
          {getInitials(user.fullName)}
        </div>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--v2-text-main)' }}>
          {user.fullName || 'User'}
        </span>
        <ChevronDown
          size={13}
          color="var(--v2-text-muted)"
          style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        />
      </div>

      {/* Profile dropdown */}
      {showProfileMenu && (
        <div className="v2-profile-popover">
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="v2-avatar" style={{ width: 36, height: 36, fontSize: '13px' }}>
              {getInitials(user.fullName)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--v2-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--v2-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Role badge */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)',
            fontSize: '11.5px'
          }}>
            <span style={{ color: 'var(--v2-text-muted)' }}>Role:</span>
            <span style={{ fontWeight: 700, color: isAdmin ? '#F472B6' : '#C4B5FD' }}>{user.role}</span>
          </div>

          {/* Switch portal */}
          {onSwitchRole && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--v2-text-muted)', marginBottom: '6px' }}>
                Switch Portal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
                {['Student', 'Instructor', 'Admin'].map(r => (
                  <button
                    key={r}
                    onClick={() => { setShowProfileMenu(false); onSwitchRole(r); }}
                    style={{
                      padding: '5px 6px',
                      fontSize: '11px',
                      fontWeight: user.role === r ? 700 : 500,
                      borderRadius: '7px',
                      border: '1px solid',
                      borderColor: user.role === r ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.2)',
                      background: user.role === r ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                      color: user.role === r ? '#C4B5FD' : 'var(--v2-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sign out */}
          {onLogout && (
            <button
              onClick={() => { setShowProfileMenu(false); onLogout(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                width: '100%', padding: '8px 12px',
                borderRadius: '9px', border: '1px solid rgba(236,72,153,0.25)',
                background: 'rgba(236,72,153,0.1)', color: '#F472B6',
                fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
