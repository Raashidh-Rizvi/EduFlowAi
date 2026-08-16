import React from 'react';
import { 
  Users, 
  Flame, 
  Trophy, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  Zap,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function Dashboard({ onNavigateTo }) {
  const stats = [
    { label: 'Active Enrolled Learners', value: '1', change: 'Enrolled cohort', icon: Users, color: '#4F46E5', badgeType: 'badge-primary' },
    { label: 'Total Experience Points', value: '0 XP', change: 'Clean baseline', icon: Zap, color: '#0EA5E9', badgeType: 'badge-secondary' },
    { label: 'Active Study Streaks', value: '0', change: 'Awaiting student check-ins', icon: Flame, color: '#F59E0B', badgeType: 'badge-warning' },
    { label: 'Pending AI Verifications', value: '0', change: 'Queue clear', icon: Sparkles, color: '#F43F5E', badgeType: 'badge-danger', alert: false }
  ];

  const recentActivity = [];

  const topStudents = [
    { rank: '01', name: 'Alex Rivera', level: 'Level 1 Novice', xp: '0 XP', streak: '0 Days', avatar: 'AR' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Welcome Banner */}
      <div className="card-premium" style={{
        padding: '24px 28px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge-pill badge-primary">
              SE3090 LIVE COHORT
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Semester 1 • Adaptive Systems</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Welcome back, Dr. Jenkins
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '620px' }}>
            All gamification ledgers and learning analytics pipelines are synchronized. 3 adaptive study sequence proposals await your review in the human-in-the-loop queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => onNavigateTo('ai-review')}
            className="btn-primary"
            style={{ padding: '9px 16px', fontSize: '13px' }}
          >
            <Sparkles size={15} />
            <span>Review AI Proposals (3)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="metric-card" style={{
              border: item.alert ? '1px solid var(--accent-border)' : undefined
            }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.label}</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 6px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {item.value}
                </h3>
                <span className={`badge-pill ${item.badgeType}`}>
                  {item.change}
                </span>
              </div>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color
              }}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Activity Stream & Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        {/* Live Learning Stream */}
        <section className="card-premium" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Live Learning Telemetry</h3>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Updated real-time</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No telemetry recorded yet. Active student actions will stream here in real time.
              </div>
            ) : (
              recentActivity.map((act, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--text-main)'
                  }}>
                    {act.avatar}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{act.student}</span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}> {act.action}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge-pill ${act.type === 'boss' ? 'badge-danger' : act.type === 'ai' ? 'badge-primary' : 'badge-success'}`}>
                    {act.xp}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)', width: '48px', textAlign: 'right' }}>
                    {act.time}
                  </span>
                </div>
              </div>
            ))
          )}
          </div>

          <button 
            onClick={() => onNavigateTo('gamification')}
            className="btn-secondary"
            style={{
              marginTop: '14px',
              width: '100%',
              padding: '8px',
              fontSize: '12.5px',
              gap: '6px'
            }}
          >
            <span>View Full Reward Telemetry</span>
            <ChevronRight size={14} />
          </button>
        </section>

        {/* Cohort Leaderboard */}
        <aside className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="var(--warning)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Cohort Rankings</h3>
            </div>
            <span className="badge-pill badge-neutral">Week 4 Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topStudents.map((std, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    color: i === 0 ? 'var(--warning)' : 'var(--text-muted)',
                    width: '20px'
                  }}>
                    {std.rank}
                  </span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{std.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{std.level}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--secondary)' }}>{std.xp}</p>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{std.streak} streak</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Curriculum Callout */}
          <div style={{
            marginTop: 'auto',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>
                Active Evaluation Module
              </span>
              <span className="badge-pill badge-primary">SE3090</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              "Clean Architecture & Concurrency" — 68% cohort progress.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
