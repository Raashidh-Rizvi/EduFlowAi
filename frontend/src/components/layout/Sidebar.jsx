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
  LayoutDashboard,
  Flame,
  User,
  ChevronUp,
  Shield,
  Settings,
  Layers
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

  // Categorized Navigation Sections
  const navSections = [
    {
      label: 'Platform',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, minRole: 'Instructor' }
      ]
    },
    {
      label: 'Academics & Content',
      items: [
        { id: 'courses', label: 'Curriculum & Modules', icon: BookOpen, minRole: 'All' },
        { id: 'assessments', label: 'Assessments & Quizzes', icon: CheckCircle2, minRole: 'All' }
      ]
    },
    {
      label: 'AI & Intelligence',
      items: [
        { 
          id: 'ai-review', 
          label: 'AI Study Approvals', 
          icon: Sparkles, 
          badge: pendingCount > 0 ? `${pendingCount} Pending` : null, 
          badgeType: 'primary',
          minRole: 'Instructor' 
        }
      ]
    },
    {
      label: 'Analytics & Rewards',
      items: [
        { id: 'gamification', label: 'Gamification & XP', icon: Trophy, minRole: 'All' },
        ...(isInstructor ? [
          { id: 'insights', label: 'Cohort Insights', icon: BarChart3, minRole: 'Instructor' }
        ] : [])
      ]
    },
    {
      label: 'Governance & Comms',
      items: [
        ...(isAdmin ? [
          { id: 'admin', label: 'Platform Governance', icon: Shield, badge: 'Root', badgeType: 'danger', minRole: 'Admin' }
        ] : []),
        ...(isInstructor ? [
          { id: 'communications', label: 'Communications Hub', icon: Bell, minRole: 'Instructor' }
        ] : [])
      ]
    }
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-card)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      flexShrink: 0,
      userSelect: 'none',
      position: 'relative'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingLeft: '8px' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
        }}>
          <Sparkles size={18} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              EduFlow
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: 'var(--primary-soft)',
              color: '#818CF8',
              border: '1px solid var(--primary-border)'
            }}>
              AI
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
            {isAdmin ? 'System Admin Portal' : isInstructor ? 'Instructor Console' : 'Student Portal'}
          </p>
        </div>
      </div>

      {/* Categorized Nav List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        paddingRight: '2px'
      }}>
        {navSections.map((section, sIdx) => {
          if (!section.items || section.items.length === 0) return null;
          return (
            <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-subtle)',
                fontWeight: '700',
                paddingLeft: '10px',
                marginBottom: '4px'
              }}>
                {section.label}
              </div>

              {section.items.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: isActive ? '600' : '500',
                      border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <Icon size={16} color={isActive ? '#818CF8' : 'var(--text-muted)'} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tab.label}
                    </span>
                    {tab.badge && (
                      <span className={`badge-pill ${tab.badgeType === 'danger' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Profile Popover Menu */}
      {showProfileMenu && (
        <div style={{
          position: 'absolute',
          bottom: '75px',
          left: '12px',
          right: '12px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-card)',
          padding: '14px',
          boxShadow: 'var(--shadow-popover)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isAdmin ? 'var(--accent)' : 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '12.5px'
            }}>
              {getInitials(user.fullName)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            padding: '6px 8px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11.5px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Role:</span>
            <span style={{
              fontWeight: '600',
              color: user.role === 'Admin' ? 'var(--accent)' : 'var(--primary)'
            }}>
              {user.role}
            </span>
          </div>

          <button
            onClick={() => {
              setShowProfileMenu(false);
              if (onLogout) onLogout();
            }}
            className="btn-danger"
            style={{
              width: '100%',
              padding: '7px',
              fontSize: '12px',
              gap: '6px'
            }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}

      {/* Footer Profile Pill */}
      <div 
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        style={{
          marginTop: 'auto',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: showProfileMenu ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isAdmin ? 'var(--accent)' : 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '12px'
        }}>
          {getInitials(user.fullName)}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {user.fullName}
          </div>
          <div style={{
            fontSize: '10.5px',
            color: user.role === 'Admin' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: '500'
          }}>
            {user.role}
          </div>
        </div>
        <ChevronUp size={14} color="var(--text-muted)" style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </div>
    </aside>
  );
}
