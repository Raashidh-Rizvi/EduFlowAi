import React from 'react';
import { Search, Bell, Sparkles, Activity, ShieldCheck, LogOut, Shield } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function Navbar({ activeTab, unreadNotifications = 3, currentUser, onLogout }) {
  const titles = {
    'dashboard': { 
      title: 'Executive Overview', 
      subtitle: 'Real-time telemetry on curriculum progression, student mastery, and AI agent queues' 
    },
    'admin': { 
      title: 'Platform Governance & Administration', 
      subtitle: 'Global directory management, RBAC elevations, system settings, and microservice health' 
    },
    'ai-review': { 
      title: 'Human-in-the-Loop AI Review', 
      subtitle: 'Review, modify, and authorize agentic personalized study roadmaps and remedial quests' 
    },
    'courses': { 
      title: 'Curriculum & Learning Journey', 
      subtitle: 'Manage modular course units, video resources, technical documentation, and visual roadmap nodes' 
    },
    'assessments': { 
      title: 'Assessments & Evaluation Engine', 
      subtitle: 'Author interactive quizzes, milestone challenges, rubric scoring, and code evaluation suites' 
    },
    'gamification': { 
      title: 'Gamification & Reward Mechanics', 
      subtitle: 'Monitor XP economy, streak velocity, unlockable milestone badges, and squad competitions' 
    },
    'insights': { 
      title: 'Cohort Insights & Risk Telemetry', 
      subtitle: 'Inspect student learning velocity, topic comprehension heatmaps, and automated intervention vectors' 
    },
    'communications': { 
      title: 'Communications & Notification Center', 
      subtitle: 'Broadcast course announcements, automated AI study nudges, and urgent milestone alerts' 
    }
  };

  const current = titles[activeTab] || { 
    title: 'EduFlow AI Enterprise Console', 
    subtitle: 'Adaptive Learning System' 
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '28px',
      gap: '24px',
      flexWrap: 'wrap',
      paddingBottom: '20px',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.025em', margin: 0 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
          {current.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search Bar with Keyboard Hint */}
        <div className="glass-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          width: '260px',
          transition: 'all 0.15s ease'
        }}>
          <Search size={14} color="var(--primary)" />
          <input 
            type="text" 
            placeholder="Search resources, students..." 
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '12.5px',
              width: '100%'
            }}
          />
          <kbd style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 5px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)'
          }}>
            ⌘K
          </kbd>
        </div>

        {/* Live Backend Telemetry Indicator */}
        <div className="glass-badge" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          backgroundColor: 'var(--success-soft)',
          color: 'var(--success)',
          fontSize: '12px',
          fontWeight: '700',
          border: '1px solid var(--success-border)'
        }}>
          <span className="status-dot-active"></span>
          <span>API 8.0: 18ms</span>
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle compact />

        {/* Notification Icon */}
        <div 
          title="Notifications"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Bell size={15} color="var(--text-muted)" />
          {unreadNotifications > 0 && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              fontSize: '9px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--bg-canvas)'
            }}>
              {unreadNotifications}
            </span>
          )}
        </div>

        {/* Quick Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out of Session"
            className="btn-ghost"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              gap: '6px',
              color: 'var(--text-muted)'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
