import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  BarChart3, 
  Trophy, 
  Bell, 
  ShieldCheck, 
  LogOut,
  Layers,
  Flame,
  User,
  ChevronUp,
  Shield,
  Settings
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, pendingCount = 1, currentUser, onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const user = currentUser || {
    fullName: 'Dr. Sarah Jenkins',
    email: 'instructor@eduflow.ai',
    role: 'Instructor'
  };

  const isAdmin = user.role === 'Admin';
  const isInstructor = user.role === 'Instructor' || isAdmin;

  // Role-filtered navigation items
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Layers, minRole: 'Instructor' },
    ...(isAdmin ? [{ id: 'admin', label: 'System Admin & Users', icon: Shield, badge: 'Root', badgeColor: 'accent', minRole: 'Admin' }] : []),
    { id: 'ai-review', label: 'AI Study Approvals', icon: Sparkles, badge: pendingCount > 0 ? `${pendingCount} Pending` : null, badgeColor: 'accent', minRole: 'Instructor' },
    { id: 'courses', label: 'Curriculum & Maps', icon: BookOpen, minRole: 'All' },
    { id: 'assessments', label: 'Quizzes & Boss Battles', icon: CheckCircle2, minRole: 'All' },
    { id: 'gamification', label: 'Gamification & XP', icon: Trophy, badge: 'Live', badgeColor: 'warning', minRole: 'All' },
    ...(isInstructor ? [
      { id: 'insights', label: 'Cohort Insights', icon: BarChart3, minRole: 'Instructor' },
      { id: 'communications', label: 'Communications', icon: Bell, minRole: 'Instructor' }
    ] : [])
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <aside style={{
      width: '270px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
      userSelect: 'none',
      position: 'relative'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Sparkles size={22} color="#FFFFFF" />
        </div>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            EduFlow <span style={{ color: 'var(--secondary)', fontSize: '15px' }}>AI</span>
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
            {isAdmin ? 'System Admin Console' : isInstructor ? 'Instructor Console' : 'Student Portal'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', fontWeight: '700', paddingLeft: '12px', marginBottom: '8px' }}>
        {isAdmin ? 'Full Administrator Access' : isInstructor ? 'Instructor Tools' : 'Learning Space'}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
        {navItems.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: isActive ? '600' : '500',
                border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
              <span style={{ flex: 1, fontSize: '13.5px' }}>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: tab.badgeColor === 'accent' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: tab.badgeColor === 'accent' ? 'var(--accent)' : 'var(--warning)',
                  fontWeight: '700'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Popover */}
      {showProfileMenu && (
        <div style={{
          position: 'absolute',
          bottom: '84px',
          left: '16px',
          right: '16px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-accent)',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isAdmin ? 'var(--accent)' : 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '13px'
            }}>
              {getInitials(user.fullName)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            fontSize: '11.5px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Role Scope:</span>
            <span style={{
              fontWeight: '700',
              color: user.role === 'Admin' ? 'var(--accent)' : user.role === 'Instructor' ? 'var(--secondary)' : 'var(--primary)'
            }}>
              {user.role}
            </span>
          </div>

          <button
            onClick={() => {
              setShowProfileMenu(false);
              if (onLogout) onLogout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: 'var(--accent)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={15} /> Sign Out / Logout
          </button>
        </div>
      )}

      {/* Footer Profile Pill */}
      <div 
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        style={{
          marginTop: 'auto',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: showProfileMenu ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
          border: showProfileMenu ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: isAdmin ? 'var(--accent)' : 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: isAdmin ? '0 0 12px rgba(244, 63, 94, 0.4)' : '0 0 10px rgba(99, 102, 241, 0.4)'
        }}>
          {getInitials(user.fullName)}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {user.fullName}
          </h4>
          <span style={{
            fontSize: '10.5px',
            color: user.role === 'Admin' ? 'var(--accent)' : 'var(--secondary)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <ShieldCheck size={12} /> {user.role}
          </span>
        </div>
        <ChevronUp size={16} color="var(--text-muted)" style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </div>
    </aside>
  );
}
