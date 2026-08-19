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
import { BrandLogo } from '../common/BrandLogo';

export default function Sidebar({ activeTab, setActiveTab, pendingCount = 1, currentUser, onLogout, onLogoClick }) {
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
    <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px 0 24px', width: '100%' }}>
      <nav className="liquid-glass" style={{
        width: '100%',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        userSelect: 'none',
        position: 'relative'
      }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <BrandLogo 
          size="sm" 
          subtitle={isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Student'} 
          onClick={onLogoClick}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Horizontal Nav List */}
      <div style={{ 
        flex: 1, 
        overflowX: 'auto', 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center',
        gap: '8px',
        padding: '0 24px',
        scrollbarWidth: 'none', // hide scrollbar for firefox
        msOverflowStyle: 'none' // hide scrollbar for IE
      }}>
        {navSections.map((section) => {
          if (!section.items || section.items.length === 0) return null;
          return section.items.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: isActive ? '600' : '500',
                  border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <Icon size={15} color={isActive ? 'var(--primary-text)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`badge-pill ${tab.badgeType === 'danger' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10px', padding: '1px 6px', marginLeft: '4px' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          });
        })}
      </div>

      {/* Profile Popover Menu */}
      {showProfileMenu && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          width: '260px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-card)',
          padding: '16px',
          boxShadow: 'var(--shadow-popover)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: '16px',
          borderLeft: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
            {user.fullName}
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            {user.role}
          </span>
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
          background: isAdmin ? 'var(--accent)' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '13px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {getInitials(user.fullName)}
        </div>
      </div>

    </nav>
    </div>
  );
}
