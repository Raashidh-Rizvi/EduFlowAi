import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import useApiHealth from '../../hooks/useApiHealth';

export default function NavbarV2({ activeTab, unreadNotifications = 0, currentUser, onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const health = useApiHealth();

  const user = currentUser || { fullName: '', email: '', role: '' };
  const isAdmin = user.role === 'Admin';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

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

      {/* API status — live probe against GET /health, not a hard-coded string */}
      <div
        className="v2-api-badge"
        title={
          health
            ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString()}`
            : 'Checking API…'
        }
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: health?.ok ? '#10B981' : '#EF4444',
          boxShadow: health?.ok ? '0 0 6px #10B981' : '0 0 6px #EF4444',
          flexShrink: 0,
          animation: 'none'
        }} />
        {health ? health.message : 'API …'}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

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
            <span style={{ fontWeight: 700, color: isAdmin ? 'var(--v2-danger-text)' : 'var(--v2-accent-text)' }}>{user.role}</span>
          </div>

          {/* Sign out */}
          {onLogout && (
            <button
              onClick={() => { setShowProfileMenu(false); onLogout(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                width: '100%', padding: '8px 12px',
                borderRadius: '9px', border: '1px solid rgba(236,72,153,0.25)',
                background: 'rgba(236,72,153,0.1)', color: 'var(--v2-danger-text)',
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
