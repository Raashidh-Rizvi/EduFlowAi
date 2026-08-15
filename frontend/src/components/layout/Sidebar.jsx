import React from 'react';
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
  Flame
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, pendingCount = 1 }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Layers },
    { id: 'ai-review', label: 'AI Study Approvals', icon: Sparkles, badge: pendingCount > 0 ? `${pendingCount} Pending` : null, badgeColor: 'accent' },
    { id: 'courses', label: 'Curriculum & Maps', icon: BookOpen },
    { id: 'assessments', label: 'Quizzes & Boss Battles', icon: CheckCircle2 },
    { id: 'gamification', label: 'Gamification & XP', icon: Trophy, badge: 'Live', badgeColor: 'warning' },
    { id: 'insights', label: 'Cohort Insights', icon: BarChart3 },
    { id: 'communications', label: 'Communications', icon: Bell }
  ];

  return (
    <aside style={{
      width: '270px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
      userSelect: 'none'
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
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Gamified LMS Console</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', fontWeight: '700', paddingLeft: '12px', marginBottom: '8px' }}>
        Navigation
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
                position: 'relative'
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

      {/* Footer / Instructor Profile Pill */}
      <div style={{
        marginTop: 'auto',
        padding: '14px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)'
        }}>
          DJ
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            Dr. Jenkins
          </h4>
          <span style={{
            fontSize: '10px',
            color: 'var(--secondary)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <ShieldCheck size={12} /> Course Lead
          </span>
        </div>
      </div>
    </aside>
  );
}
