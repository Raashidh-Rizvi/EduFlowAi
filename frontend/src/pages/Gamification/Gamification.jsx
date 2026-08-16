import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Award, 
  Coins, 
  Zap, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Sliders,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function Gamification() {
  const [leaderboardTab, setLeaderboardTab] = useState('cohort'); // 'cohort' | 'squads'
  const [xpMultiplier, setXpMultiplier] = useState(1.0);

  const cohortLeaderboard = [
    { rank: '01', name: 'Alex Rivera', id: 'IT22104500', level: 'Level 1 Novice', xp: 0, streak: 0, badges: 0, avatar: 'AR' }
  ];

  const squads = [];

  const badges = [
    { name: 'Boss Slayer', desc: 'Complete milestone evaluation test with ≥ 80% score', tier: 'Legendary', icon: '🎯', count: 0, badgeClass: 'badge-pill badge-primary' },
    { name: 'Quiz Master', desc: 'Score 100% on 5 consecutive technical evaluations', tier: 'Gold', icon: '🏅', count: 0, badgeClass: 'badge-gold' },
    { name: '7-Day Learner', desc: 'Maintain an unbroken 7-day active study streak', tier: 'Silver', icon: '🔥', count: 0, badgeClass: 'badge-silver' },
    { name: 'First Step', desc: 'Complete your first interactive lesson module', tier: 'Bronze', icon: '🌱', count: 0, badgeClass: 'badge-bronze' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner with XP Multiplier & Global Stats */}
      <div className="card-premium" style={{
        padding: '22px 28px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-pill badge-warning">
              REWARD ENGINE ACTIVE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SE3090 Deterministic Ledger</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Gamification & Experience Progression
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Reward genuine learning progress across daily missions, quizzes, streaks, and collaborative team squads.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-card)'
          }}>
            <Zap size={15} color="var(--warning)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Global Event Multiplier:</span>
            <button
              onClick={() => setXpMultiplier(prev => prev === 1.0 ? 2.0 : 1.0)}
              style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: xpMultiplier > 1 ? 'var(--warning)' : 'var(--bg-surface)',
                color: xpMultiplier > 1 ? '#000000' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              {xpMultiplier}x {xpMultiplier > 1 ? 'DOUBLE XP' : 'Standard'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Leaderboard + Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: '20px' }}>
        {/* Left Column: Multi-Tier Leaderboards */}
        <section className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Leaderboard Standings</h3>
            </div>

            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border-subtle)',
              gap: '4px'
            }}>
              <button
                onClick={() => setLeaderboardTab('cohort')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: leaderboardTab === 'cohort' ? 'var(--bg-card)' : 'transparent',
                  color: leaderboardTab === 'cohort' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: leaderboardTab === 'cohort' ? '1px solid var(--border-card)' : '1px solid transparent'
                }}
              >
                Individual Learners
              </button>
              <button
                onClick={() => setLeaderboardTab('squads')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: leaderboardTab === 'squads' ? 'var(--bg-card)' : 'transparent',
                  color: leaderboardTab === 'squads' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: leaderboardTab === 'squads' ? '1px solid var(--border-card)' : '1px solid transparent'
                }}
              >
                Squads & Teams
              </button>
            </div>
          </div>

          {/* Individual Cohort Rankings */}
          {leaderboardTab === 'cohort' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cohortLeaderboard.map((user, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      color: idx === 0 ? 'var(--warning)' : 'var(--text-muted)',
                      width: '20px'
                    }}>
                      {user.rank}
                    </span>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: idx === 0 ? 'var(--warning)' : 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {user.avatar}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{user.name}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.level} • {user.id}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={13} color="var(--warning)" /> {user.streak}d Streak
                    </span>
                    <span className="badge-pill badge-neutral" style={{ fontSize: '11px' }}>
                      {user.badges} Badges
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--secondary)',
                      minWidth: '75px',
                      textAlign: 'right'
                    }}>
                      {user.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Squad Teams */}
          {leaderboardTab === 'squads' && (
            squads.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No student squads formed yet. Squad challenges will appear here when student squads are created.
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {squads.map((sq, i) => (
                <div key={i} style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{sq.name}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '8px' }}>({sq.members} Members)</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--secondary)' }}>{sq.combinedXp}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Active Project: {sq.activeQuest}</span>
                      <span>{sq.completion}% Completed</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${sq.completion}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )
          )}
        </section>

        {/* Right Column: Badges & Virtual Currency Items */}
        <aside className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Milestone Registry</h3>
            </div>
            <span className="badge-pill badge-neutral">4 Rarity Tiers</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {badges.map((b, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '20px' }}>{b.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{b.name}</strong>
                    <span className={b.badgeClass} style={{ fontSize: '10px' }}>{b.tier}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.desc}</p>
                  <span style={{ fontSize: '10.5px', color: 'var(--success)', marginTop: '2px', display: 'inline-block' }}>
                    Unlocked by {b.count} learners
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Virtual Economy Box */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginTop: 'auto'
          }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={14} color="var(--warning)" /> Virtual Reward Items
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Streak freeze insurance tokens, theme identifiers, and certificate credential verification.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
