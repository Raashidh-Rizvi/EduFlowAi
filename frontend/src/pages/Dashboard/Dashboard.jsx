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
  Sword
} from 'lucide-react';

export default function Dashboard({ onNavigateTo }) {
  const stats = [
    { label: 'Active Learners', value: '1,428', change: '+12% this week', icon: Users, color: 'var(--primary)' },
    { label: 'Total XP Awarded', value: '482.6k', change: '+24.5k today', icon: Zap, color: 'var(--secondary)' },
    { label: 'Active Streaks 🔥', value: '892', change: '84% cohort habit', icon: Flame, color: '#F97316' },
    { label: 'Pending AI Approvals', value: '3', change: 'Action required', icon: Sparkles, color: 'var(--accent)', alert: true }
  ];

  const recentActivity = [
    { student: 'Alex Rivera', action: 'completed Daily Mission: PostgreSQL Indexing', xp: '+120 XP', time: '2m ago', avatar: 'AR' },
    { student: 'Maya Patel', action: 'slayed Boss Challenge: EF Core Concurrency', xp: '+500 XP', time: '8m ago', avatar: 'MP', isBoss: true },
    { student: 'Chen Wei', action: 'unlocked 7-Day Silver Streak Badge 🔥', xp: '+50 XP', time: '15m ago', avatar: 'CW' },
    { student: 'Elena Rostova', action: 'requested AI Personalized Study Plan', xp: 'AI Queue', time: '22m ago', avatar: 'ER', isAi: true }
  ];

  const topStudents = [
    { rank: '🥇', name: 'Maya Patel', level: 'Lvl 6 Master', xp: '8,420 XP', streak: '18 Days' },
    { rank: '🥈', name: 'Alex Rivera', level: 'Lvl 4 Scholar', xp: '4,890 XP', streak: '12 Days' },
    { rank: '🥉', name: 'Chen Wei', level: 'Lvl 4 Scholar', xp: '4,650 XP', streak: '9 Days' },
    { rank: '4', name: 'Elena Rostova', level: 'Lvl 3 Learner', xp: '2,940 XP', streak: '6 Days' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '24px 30px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.12))',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(99, 102, 241, 0.25)',
              color: 'var(--text-main)',
              fontWeight: '700'
            }}>
              SE3090 LIVE COHORT 2026
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Semester 1</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
            Welcome back, Dr. Jenkins 👋
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '600px' }}>
            Gamification systems are active across 4 core engineering modules. 3 student study proposals are currently awaiting your verification in the HITL review queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => onNavigateTo('ai-review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Sparkles size={16} />
            Review AI Proposals (3)
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="glass-panel" style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              border: item.alert ? '1px solid rgba(244, 63, 94, 0.4)' : undefined
            }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.label}</p>
                <h3 style={{ fontSize: '26px', fontWeight: '800', margin: '6px 0 4px', color: 'var(--text-main)' }}>{item.value}</h3>
                <span style={{ fontSize: '11px', color: item.alert ? 'var(--accent)' : 'var(--success)', fontWeight: '600' }}>
                  {item.change}
                </span>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} color={item.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Live Feed & Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
        {/* Real-Time Learning Gamification Feed */}
        <section className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Live Learning & XP Stream</h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated real-time</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((act, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: act.isBoss ? 'rgba(244, 63, 94, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                border: act.isBoss ? '1px solid rgba(244, 63, 94, 0.2)' : '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: act.isBoss ? 'var(--accent)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#FFFFFF'
                  }}>
                    {act.avatar}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{act.student}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> {act.action}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: act.isBoss ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: act.isBoss ? 'var(--accent)' : 'var(--success)'
                  }}>
                    {act.xp}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)', width: '45px', textAlign: 'right' }}>{act.time}</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onNavigateTo('gamification')}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            View Complete Gamification Analytics <ChevronRight size={14} />
          </button>
        </section>

        {/* Top Cohort Leaderboard */}
        <aside className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Cohort Leaderboard</h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '600' }}>Week 4</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topStudents.map((std, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', width: '22px' }}>{std.rank}</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{std.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{std.level}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>{std.xp}</p>
                  <p style={{ fontSize: '10px', color: '#F97316' }}>🔥 {std.streak}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick World Map status */}
          <div style={{
            marginTop: '20px',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid var(--border-accent)'
          }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sword size={14} color="var(--accent)" /> Midterm Boss Fight Live
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              "PostgreSQL Index & Concurrency Dungeon" — 64% cohort pass rate.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
