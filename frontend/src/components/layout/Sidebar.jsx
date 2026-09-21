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
    <div style={{ padding: '24px 0 24px 24px', display: 'flex', height: '100vh', position: 'sticky', top: 0 }}>
      <nav className="liquid-glass" style={{
        width: '260px',
        height: '100%',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        userSelect: 'none',
        position: 'relative'
      }}>
      {/* Brand Header */}
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <BrandLogo 
          size="sm" 
          subtitle={isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Student'} 
          onClick={onLogoClick}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Vertical Nav List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        paddingRight: '4px',
      }}>
        {navSections.map((section, sIdx) => {
          if (!section.items || section.items.length === 0) return null;
          return (
            <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-subtle)',
                fontWeight: '800',
                paddingLeft: '12px',
                marginBottom: '6px'
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
                    className="hover-scale"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: isActive ? '700' : '600',
                      border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      width: '100%'
                    }}
                  >
                    <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span style={{ flex: 1 }}>{tab.label}</span>
                    {tab.badge && (
                      <span className={`badge-pill ${tab.badgeType === 'danger' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
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
    </nav>
    </div>
  );
}
