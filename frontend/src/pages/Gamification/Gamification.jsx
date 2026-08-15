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
  const [leaderboardTab, setLeaderboardTab] = useState('cohort'); // 'cohort' | 'squads' | 'streaks'
  const [xpMultiplier, setXpMultiplier] = useState(1.0);

  const cohortLeaderboard = [
    { rank: '🥇 1', name: 'Maya Patel', id: 'IT22301920', level: 'Level 6 Master', xp: 8420, streak: 18, badges: 14, avatar: 'MP' },
    { rank: '🥈 2', name: 'Alex Rivera', id: 'IT22104500', level: 'Level 4 Scholar', xp: 4890, streak: 12, badges: 9, avatar: 'AR' },
    { rank: '🥉 3', name: 'Chen Wei', id: 'IT22894102', level: 'Level 4 Scholar', xp: 4650, streak: 9, badges: 8, avatar: 'CW' },
    { rank: '4', name: 'Elena Rostova', id: 'IT22987011', level: 'Level 3 Learner', xp: 2940, streak: 6, badges: 5, avatar: 'ER' },
    { rank: '5', name: 'Tariq Mansoor', id: 'IT22765431', level: 'Level 3 Learner', xp: 2810, streak: 5, badges: 6, avatar: 'TM' }
  ];

  const squads = [
    { rank: '1', name: '🛡️ Alpha Architects', members: 5, combinedXp: '24,850 XP', activeQuest: 'PostgreSQL Index Raid', completion: 88 },
    { rank: '2', name: '⚡ Byte Brawlers', members: 4, combinedXp: '19,200 XP', activeQuest: 'Clean Architecture Dungeon', completion: 65 },
    { rank: '3', name: '🤖 Agentic Slayers', members: 5, combinedXp: '16,740 XP', activeQuest: 'LangGraph Cyclic Quest', completion: 42 }
  ];

  const badges = [
    { name: 'Boss Slayer', desc: 'Defeat a topic Boss Encounter with ≥ 80% score', tier: 'Legendary', icon: '👹', count: 118 },
    { name: 'Quiz Master', desc: 'Score 100% on 5 consecutive quizzes', tier: 'Gold', icon: '🏅', count: 64 },
    { name: '7-Day Learner', desc: 'Maintain an unbroken 7-day study streak', tier: 'Silver', icon: '🔥', count: 289 },
    { name: 'First Step', desc: 'Complete your first interactive lesson module', tier: 'Bronze', icon: '🌱', count: 342 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner with XP Multiplier & Global Stats */}
      <div className="glass-panel" style={{
        padding: '22px 28px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.1))',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(245, 158, 11, 0.25)',
              color: 'var(--warning)',
              fontWeight: '700'
            }}>
              LIVE XP ECONOMY
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SE3090 Gamification Engine</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Experience Points, Levels & Squad Trophies</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Reward genuine learning progress across daily missions, quizzes, streaks, and collaborative team raids.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Zap size={16} color="var(--warning)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Global Event Multiplier:</span>
            <button
              onClick={() => setXpMultiplier(prev => prev === 1.0 ? 2.0 : 1.0)}
              style={{
                fontSize: '12px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: xpMultiplier > 1 ? 'var(--warning)' : 'rgba(255, 255, 255, 0.1)',
                color: xpMultiplier > 1 ? '#000000' : 'var(--text-main)'
              }}
            >
              {xpMultiplier}x {xpMultiplier > 1 ? '🔥 DOUBLE XP ACTIVE' : 'Normal'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Leaderboard + Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '24px' }}>
        {/* Left Column: Multi-Tier Leaderboards */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="var(--warning)" />
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>Real-Time Leaderboard Rankings</h3>
            </div>

            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setLeaderboardTab('cohort')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: leaderboardTab === 'cohort' ? 'var(--primary)' : 'transparent',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Individual Cohort
              </button>
              <button
                onClick={() => setLeaderboardTab('squads')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: leaderboardTab === 'squads' ? 'var(--primary)' : 'transparent',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Squads & Teams 👥
              </button>
            </div>
          </div>

          {/* Individual Cohort Rankings */}
          {leaderboardTab === 'cohort' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cohortLeaderboard.map((user, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: idx < 3 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: idx < 3 ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', width: '30px' }}>{user.rank}</span>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#F59E0B' : 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {user.avatar}
                    </div>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>{user.name}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.level} • {user.id}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '12px', color: '#F97316', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} /> {user.streak}d Streak
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '700' }}>
                      🏅 {user.badges} Badges
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '800',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {squads.map((sq, i) => (
                <div key={i} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{sq.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>({sq.members} Members)</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--secondary)' }}>{sq.combinedXp}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Active Raid: {sq.activeQuest}</span>
                      <span>{sq.completion}% Completed</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${sq.completion}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Badges & Virtual Currency Items */}
        <aside className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Badge Registry</h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>4 Active Tiers</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {badges.map((b, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '24px' }}>{b.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{b.name}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: '700' }}>{b.tier}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.desc}</p>
                  <span style={{ fontSize: '10px', color: 'var(--success)', marginTop: '4px', display: 'inline-block' }}>
                    Earned by {b.count} students
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Virtual Economy Box */}
          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={15} /> EduCoins Cosmetic Shop
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Non-pay-to-win items: Avatar robes, custom glowing title borders, and ❄️ Streak Freeze insurance tokens.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
