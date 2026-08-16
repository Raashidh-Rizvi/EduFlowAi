import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  Zap,
  Award,
  Layers,
  ArrowRight,
  Coins,
  Target,
  Brain,
  Swords,
  BookOpen,
  RefreshCw,
  Star,
  Check,
  Play,
  HelpCircle,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import gamificationService from '../../services/gamificationService';

export default function Dashboard({ onNavigateTo }) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('missions'); // 'missions' | 'mastery' | 'leaderboard'

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await gamificationService.getGameDashboard();
      setGameData(data);
    } catch (err) {
      console.error('Failed to load game dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimGrandReward = async () => {
    try {
      const res = await gamificationService.claimDailyGrandMission();
      setClaimStatus(res.message);
      loadDashboard();
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  if (loading || !gameData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw size={28} className="spin" color="var(--primary)" />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading Learning Game Hub...</span>
      </div>
    );
  }

  const { profile, dailyMissions, canClaimGrandReward, masteryMatrix, nextBestAction, topLeaderboard, personalBests } = gameData;
  const xpPercent = Math.min(100, Math.round((profile.xpProgressInCurrentLevel / profile.xpRequiredForNextLevel) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      
      {/* 1. HERO GAME PROGRESSION HEADER */}
      <div className="card-premium" style={{
        padding: '24px 28px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(14, 165, 233, 0.03) 100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Avatar & Level Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              fontWeight: '800',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {profile.studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  Welcome back, {profile.studentName}
                </h2>
                <span className="badge-pill badge-primary" style={{ fontWeight: '700', fontSize: '11px' }}>
                  LEVEL {profile.currentLevel}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{profile.levelName}</span> • Python Architecture & Relational Engineering
              </p>
            </div>
          </div>

          {/* Gamification Stats: Streak & EduCoins */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Streak Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)'
            }}>
              <Flame size={20} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#F59E0B' }}>
                  {profile.currentStreak} DAY STREAK
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  🛡️ {profile.freezeTokensAvailable} Freeze tokens
                </div>
              </div>
            </div>

            {/* EduCoins */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 'var(--radius-md)'
            }}>
              <Coins size={18} color="#0EA5E9" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0EA5E9' }}>
                  {profile.coins} Coins
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Cosmetics & Perks
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* XP Progression Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
              <Zap size={14} color="var(--primary)" />
              <strong>{profile.totalXp.toLocaleString()} XP Total</strong> ({profile.xpProgressInCurrentLevel} / {profile.xpRequiredForNextLevel} XP this level)
            </span>
            <span>Next Level: {profile.maxXpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div style={{
            height: '10px',
            backgroundColor: 'var(--border-subtle)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${xpPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4F46E5 0%, #0EA5E9 100%)',
              borderRadius: '999px',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>
      </div>

      {/* 2. SIGNATURE AI FEATURE: NEXT BEST ACTION (EduBuddy Companion) */}
      <div className="card-premium" style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--primary-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
        background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(79, 70, 229, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            flexShrink: 0
          }}>
            <Brain size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                🤖 EDUBUDDY • NEXT BEST ACTION
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {nextBestAction.estimatedTimeMinutes} mins • +{nextBestAction.rewardXp} XP
              </span>
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 2px' }}>
              {nextBestAction.title}
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {nextBestAction.description}
            </p>
          </div>
        </div>

        <button 
          onClick={() => onNavigateTo('assessments')}
          className="btn-primary"
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
          }}
        >
          <Play size={15} fill="currentColor" />
          <span>Start AI Challenge</span>
        </button>
      </div>

      {/* 3. MAIN GAME HUB GRID: Daily Missions, Skill Mastery & Leaderboards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Daily Missions + Skill Mastery Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 🎯 TODAY'S MISSION CARD */}
          <section className="card-premium" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Today's Mission</h3>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>
                Grand Reward: +150 XP • +30 🪙
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dailyMissions.map((m, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: m.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                  border: m.isCompleted ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: m.isCompleted ? '#10B981' : 'var(--border-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px'
                    }}>
                      {m.isCompleted ? <Check size={14} strokeWidth={3} /> : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{idx + 1}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {m.description} ({m.currentCount}/{m.targetCount})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge-pill ${m.isCompleted ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                      +{m.rewardXp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Claim Grand Reward Action */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {canClaimGrandReward ? '🎉 All 4 tasks completed!' : 'Complete remaining daily quests to unlock grand XP.'}
              </span>
              
              <button
                onClick={handleClaimGrandReward}
                disabled={!canClaimGrandReward}
                className="btn-primary"
                style={{
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  opacity: canClaimGrandReward ? 1 : 0.5,
                  cursor: canClaimGrandReward ? 'pointer' : 'not-allowed'
                }}
              >
                <Trophy size={14} />
                <span>Claim Grand Reward (+150 XP)</span>
              </button>
            </div>

            {claimStatus && (
              <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                {claimStatus}
              </div>
            )}
          </section>

          {/* 🧠 SKILL MASTERY MATRIX (Academic Proof distinct from XP) */}
          <section className="card-premium" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} color="var(--secondary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Skill Mastery Matrix</h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Overall Mastery: <strong style={{ color: 'var(--text-main)' }}>{masteryMatrix.overallMasteryPercent}%</strong>
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Mastery measures proven academic understanding across topics, calibrated from individual question outcomes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {masteryMatrix.skills.map((s, idx) => {
                const colorMap = {
                  green: '#10B981',
                  yellow: '#F59E0B',
                  red: '#EF4444'
                };
                const color = colorMap[s.statusColor] || '#4F46E5';

                return (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{s.topicName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({s.correctAttempts}/{s.totalAttempts} correct)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color }}>{s.masteryPercentage}%</span>
                        {s.masteryPercentage < 60 && (
                          <button
                            onClick={() => onNavigateTo('assessments')}
                            className="badge-pill badge-danger"
                            style={{ cursor: 'pointer', border: 'none', padding: '4px 8px', fontSize: '10.5px', fontWeight: '700' }}
                          >
                            ⚡ Practice {s.topicName.split(' ')[0]}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: '7px',
                      backgroundColor: 'var(--border-card)',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${s.masteryPercentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '999px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 👹 MODULE BOSS QUIZ GATE */}
          <section className="card-premium" style={{
            padding: '20px 22px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444'
              }}>
                <Swords size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-pill badge-danger" style={{ fontSize: '10.5px' }}>
                    👹 MODULE 1 BOSS CHALLENGE
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Hard • 20 Mins • +200 XP
                  </span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  Relational Architecture & Indexing Boss
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Defeat the Boss to claim the 🏆 <strong>Boss Slayer</strong> badge and unlock Module 2!
                </p>
              </div>
            </div>

            <button 
              onClick={() => onNavigateTo('assessments')}
              className="btn-danger"
              style={{
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Swords size={15} />
              <span>Enter Boss Arena</span>
            </button>
          </section>
        </div>

        {/* Right Column: Achievements, Personal Bests & Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 🏆 ACHIEVEMENTS & BADGES */}
          <section className="card-premium" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--warning)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Achievements</h3>
              </div>
              <span className="badge-pill badge-neutral">{profile.badgesCount} Unlocked</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {profile.recentBadges.map((b, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'center',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '24px', marginBottom: '2px' }}>{b.iconUrl}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{b.title}</span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.2' }}>{b.description}</span>
                  <span className="badge-pill badge-primary" style={{ fontSize: '9.5px', marginTop: '4px' }}>+{b.xpBonus} XP</span>
                </div>
              ))}
            </div>
          </section>

          {/* 🚀 PERSONAL BESTS */}
          <section className="card-premium" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Personal Bests</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Self-Improvement</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {personalBests.map((pb, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>{pb.assessmentTitle}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Time: {Math.floor(pb.bestTimeSeconds / 60)}m {pb.bestTimeSeconds % 60}s</div>
                  </div>
                  <span className="badge-pill badge-success" style={{ fontSize: '11.5px', fontWeight: '800' }}>
                    {pb.bestScorePercent}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 🏅 WEEKLY LEADERBOARD */}
          <section className="card-premium" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={16} color="var(--warning)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Weekly Cohort Leaderboard</h3>
              </div>
              <span className="badge-pill badge-primary">Rank #{gameData.studentRank}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topLeaderboard.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.isCurrentStudent ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-surface)',
                  border: item.isCurrentStudent ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: idx === 0 ? '#F59E0B' : (idx === 1 ? '#94A3B8' : (idx === 2 ? '#B45309' : 'var(--text-muted)')),
                      width: '20px'
                    }}>
                      #{item.rank}
                    </span>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: item.isCurrentStudent ? '800' : '600', color: 'var(--text-main)' }}>
                        {item.studentName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        Lvl {item.level}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--secondary)' }}>
                      {item.scoreXp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
