import React from 'react';
import { Search, Bell, Sparkles, Activity, ShieldCheck, Flame, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, unreadNotifications = 3, currentUser, onLogout }) {
  const titles = {
    'dashboard': { title: 'Executive Command Center 🚀', subtitle: 'Real-time overview of curriculum health, active missions, and AI queues' },
    'ai-review': { title: 'Human-in-the-Loop AI Review & Approval 🤖', subtitle: 'Review, modify, and authorize agent-generated personalized quests and study plans' },
    'courses': { title: 'Curriculum & Learning Journey Map 🗺️', subtitle: 'Design modular courses, video lessons, and interactive RPG-style world map nodes' },
    'assessments': { title: 'Assessment Engine & Boss Battles ⚔️', subtitle: 'Author dynamic quizzes, timed Boss Battles, rubric scoring matrices, and coding tests' },
    'gamification': { title: 'Gamification Engine, XP & Leaderboards 🏆', subtitle: 'Manage XP multipliers, streaks, unlockable badges, and squad competitions' },
    'insights': { title: 'Cohort Insights & At-Risk Early Warning 📊', subtitle: 'Inspect learning pace velocity, comprehension heatmaps, and early risk intervention' },
    'communications': { title: 'Communications & Notification Hub 📢', subtitle: 'Broadcast course-wide announcements, AI study nudges, and urgent milestone alerts' }
  };

  const current = titles[activeTab] || { title: 'EduFlow AI Console', subtitle: 'SE3090 Assignment 1 Live Environment' };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '28px',
      gap: '24px',
      flexWrap: 'wrap'
    }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {current.title}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
          {current.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          width: '220px'
        }}>
          <Search size={15} color="var(--text-subtle)" />
          <input 
            type="text" 
            placeholder="Search students, quests..." 
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>

        {/* Live Backend Status */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--success)',
          fontSize: '12px',
          fontWeight: '600',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
          .NET 8 API: 18ms
        </div>

        {/* Notification Icon */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer'
        }}>
          <Bell size={16} color="var(--text-muted)" />
          {unreadNotifications > 0 && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              fontSize: '9px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadNotifications}
            </span>
          )}
        </div>

        {/* Quick Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out / Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
