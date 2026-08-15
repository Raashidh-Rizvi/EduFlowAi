import React, { useState } from 'react';
import {
  Home,
  Map,
  Bot,
  Trophy,
  User,
  Zap,
  Flame,
  Shield,
  BookOpen,
  CheckCircle2,
  Lock,
  Star,
  Award,
  LogOut,
  ChevronRight,
  Send,
  MessageCircle,
  ShieldCheck,
  Coins,
  Target
} from 'lucide-react';

// ─── Static seed data for student portal ──────────────────────────────────────
const STUDENT_DATA = {
  'student@eduflow.ai': {
    fullName: 'Alex Rivera',
    level: 2,
    levelName: 'Code Apprentice',
    totalXp: 1250,
    xpInLevel: 750,
    xpToNext: 1000,
    coins: 180,
    streak: 5,
    freezeTokens: 2,
    badges: [
      { name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { name: 'Quiz Ace', icon: '🎯', unlocked: true, desc: 'Scored 100% on a quiz' },
      { name: 'Unstoppable', icon: '🔥', unlocked: false, desc: '7-day streak' },
      { name: 'Boss Slayer', icon: '👹', unlocked: false, desc: 'Defeat 5 boss encounters' },
      { name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { name: 'AI Master', icon: '🤖', unlocked: false, desc: 'Complete 10 AI study plans' },
    ]
  },
  'maya@eduflow.ai': {
    fullName: 'Maya Patel',
    level: 6,
    levelName: 'Architecture Master',
    totalXp: 8420,
    xpInLevel: 420,
    xpToNext: 1500,
    coins: 940,
    streak: 18,
    freezeTokens: 3,
    badges: [
      { name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { name: 'Quiz Ace', icon: '🎯', unlocked: true, desc: 'Scored 100% on a quiz' },
      { name: 'Unstoppable', icon: '🔥', unlocked: true, desc: '7-day streak achieved' },
      { name: 'Boss Slayer', icon: '👹', unlocked: true, desc: 'Defeated 5 boss encounters' },
      { name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { name: 'AI Master', icon: '🤖', unlocked: true, desc: 'Completed 10 AI study plans' },
    ]
  },
  'chen@eduflow.ai': {
    fullName: 'Chen Wei',
    level: 4,
    levelName: 'Code Scholar',
    totalXp: 4650,
    xpInLevel: 150,
    xpToNext: 1200,
    coins: 520,
    streak: 9,
    freezeTokens: 1,
    badges: [
      { name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { name: 'Quiz Ace', icon: '🎯', unlocked: true, desc: 'Scored 100% on a quiz' },
      { name: 'Unstoppable', icon: '🔥', unlocked: true, desc: '7-day streak achieved' },
      { name: 'Boss Slayer', icon: '👹', unlocked: false, desc: 'Defeat 5 boss encounters' },
      { name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { name: 'AI Master', icon: '🤖', unlocked: false, desc: 'Complete 10 AI study plans' },
    ]
  },
  'elena@eduflow.ai': {
    fullName: 'Elena Rostova',
    level: 3,
    levelName: 'Logic Learner',
    totalXp: 2940,
    xpInLevel: 440,
    xpToNext: 1100,
    coins: 310,
    streak: 6,
    freezeTokens: 2,
    badges: [
      { name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { name: 'Quiz Ace', icon: '🎯', unlocked: false, desc: 'Score 100% on a quiz' },
      { name: 'Unstoppable', icon: '🔥', unlocked: false, desc: '7-day streak' },
      { name: 'Boss Slayer', icon: '👹', unlocked: false, desc: 'Defeat 5 boss encounters' },
      { name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { name: 'AI Master', icon: '🤖', unlocked: false, desc: 'Complete 10 AI study plans' },
    ]
  }
};

const LEADERBOARD = [
  { rank: 1, name: 'Maya Patel', email: 'maya@eduflow.ai', level: 6, xp: 8420, streak: 18 },
  { rank: 2, name: 'Chen Wei', email: 'chen@eduflow.ai', level: 4, xp: 4650, streak: 9 },
  { rank: 3, name: 'Alex Rivera', email: 'student@eduflow.ai', level: 2, xp: 1250, streak: 5 },
  { rank: 4, name: 'Elena Rostova', email: 'elena@eduflow.ai', level: 3, xp: 2940, streak: 6 },
  { rank: 5, name: 'Tariq Mansoor', email: 'tariq@eduflow.ai', level: 3, xp: 2810, streak: 5 },
];

const JOURNEY_NODES = [
  { id: 1, title: 'Clean Architecture Domain Isolation', icon: '🌱', status: 'completed', xp: 150, duration: '25m', type: 'lesson', desc: 'Core entities, domain rules, dependency inversion in .NET 8.' },
  { id: 2, title: 'PostgreSQL Relational Schemas & Indexes', icon: '🧩', status: 'completed', xp: 200, duration: '35m', type: 'lab', desc: 'Composite indexing, EXPLAIN ANALYZE, and table partitions.' },
  { id: 3, title: 'EF Core Migrations & Transactions', icon: '⚔️', status: 'active', xp: 350, duration: '40m', type: 'challenge', desc: 'ACID boundaries, concurrency tokens, and optimistic locking.' },
  { id: 4, title: 'Multi-Agent LangGraph Swarm Node', icon: '🤖', status: 'locked', xp: 400, duration: '45m', type: 'ai', desc: 'State machine graphs, deterministic schema guards, and audit trails.' },
  { id: 5, title: 'Dungeon Boss: PostgreSQL Concurrency Raid', icon: '👹', status: 'locked', xp: 500, duration: '20m', type: 'boss', desc: 'Defeat the 15-scenario deadlock raid to unlock the Boss Slayer Trophy!' },
];

const QUIZ_QUESTIONS = [
  {
    prompt: 'In PostgreSQL, which index type best optimizes a multi-column WHERE clause?',
    options: ['Composite B-Tree index ordered by column selectivity', 'Single unindexed text scan', 'No index at all', 'Random hash table'],
    correct: 0,
    explanation: 'Composite B-Tree indexes match filters efficiently when ordered from highest to lowest selectivity.'
  },
  {
    prompt: 'What does EF Core SaveChangesAsync() guarantee about multiple entity modifications?',
    options: ['All modifications are wrapped atomically — if any fails, all roll back', 'Each entity is saved in separate database connections', 'It never rolls back', 'It bypasses foreign key constraints'],
    correct: 0,
    explanation: 'SaveChangesAsync wraps all pending changes in a single ACID transaction boundary.'
  },
  {
    prompt: 'Why is an Immutable XP Transaction Ledger required in EduFlow?',
    options: ['To prevent duplicate reward exploits and guarantee mathematical auditability', 'Because PostgreSQL cannot update integers', 'To let LLMs modify business rules', 'To slow down student progress'], 
    correct: 0,
    explanation: 'An append-only ledger records every XP change atomically and is audit-safe.'
  }
];

// ─── Sub-Components ────────────────────────────────────────────────────────────

function HomeTab({ profile, onMissionClaim, onFreezeUse, onNavigate }) {
  const pct = Math.round((profile.xpInLevel / profile.xpToNext) * 100);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onMissionClaim(100, 40);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Level Progress Card */}
      <div style={{
        padding: '22px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
        border: '1px solid rgba(99,102,241,0.4)',
        boxShadow: '0 4px 24px rgba(99,102,241,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#06B6D4', fontWeight: '800', letterSpacing: '0.07em', marginBottom: '4px' }}>
              LEVEL {profile.level} — {profile.levelName.toUpperCase()}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF' }}>
              {profile.totalXp.toLocaleString()} <span style={{ fontSize: '14px', color: '#94A3B8' }}>Total XP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#F59E0B' }}>{profile.coins}</div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>🪙 Coins</div>
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366F1, #06B6D4)', borderRadius: '8px', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
          {profile.xpInLevel.toLocaleString()} / {profile.xpToNext.toLocaleString()} XP to Level {profile.level + 1}
        </div>
      </div>

      {/* Streak & Freeze Card */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '14px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <span style={{ fontSize: '32px' }}>🔥</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '15px' }}>{profile.streak} Day Streak!</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{profile.freezeTokens} Freeze Shield{profile.freezeTokens !== 1 ? 's' : ''} in inventory</div>
        </div>
        <button
          onClick={onFreezeUse}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.3)',
            color: '#06B6D4',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          🛡️ Use Freeze
        </button>
      </div>

      {/* Daily Mission */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-subtle)', letterSpacing: '0.07em', marginBottom: '10px' }}>
          TODAY'S ADAPTIVE MISSION
        </div>
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          border: `1px solid ${claimed ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.45)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{
              fontSize: '10.5px',
              padding: '3px 9px',
              borderRadius: '5px',
              background: 'rgba(99,102,241,0.2)',
              color: '#818CF8',
              fontWeight: '800'
            }}>MEDIUM DIFFICULTY</span>
            <span style={{ color: '#F59E0B', fontWeight: '800', fontSize: '13px' }}>+100 XP • +40 🪙</span>
          </div>
          <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px' }}>
            Clean Architecture Deep Dive
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
            Complete 1 lesson on Dependency Inversion and score ≥ 75% on the adaptive quiz to claim your reward.
          </div>
          <button
            disabled={claimed}
            onClick={handleClaim}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: claimed ? 'rgba(16,185,129,0.25)' : 'linear-gradient(135deg, #6366F1, #06B6D4)',
              color: claimed ? '#10B981' : '#FFFFFF',
              border: claimed ? '1px solid rgba(16,185,129,0.4)' : 'none',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: claimed ? 'default' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {claimed ? '✓ Completed & Claimed' : 'Complete & Claim (+100 XP)'}
          </button>
        </div>
      </div>

      {/* AI Coach Shortcut */}
      <button
        onClick={() => onNavigate('coach')}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
          border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ fontSize: '32px' }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '14px', marginBottom: '3px' }}>Ask AI Learning Coach</div>
          <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>Get personalized help or generate a 5-min practice quest.</div>
        </div>
        <ChevronRight size={18} color="#06B6D4" />
      </button>
    </div>
  );
}

function JourneyTab({ onStartQuiz }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>World Journey Map 🗺️</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>Your personalized learning path — complete nodes to unlock boss encounters.</div>
      </div>

      {JOURNEY_NODES.map((node, index) => {
        const isCompleted = node.status === 'completed';
        const isActive = node.status === 'active';
        const isBoss = node.type === 'boss';

        return (
          <div key={node.id}>
            <div
              onClick={() => isActive && onStartQuiz(node)}
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: isCompleted ? 'rgba(16,185,129,0.08)' : isActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-surface)',
                border: `1px solid ${isBoss ? 'rgba(244,63,94,0.45)' : isCompleted ? 'rgba(16,185,129,0.3)' : isActive ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)'}`,
                cursor: isActive ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isCompleted ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isCompleted ? '20px' : '22px',
                flexShrink: 0,
                color: isCompleted ? '#10B981' : undefined
              }}>
                {isCompleted ? '✓' : node.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                  <div style={{
                    fontWeight: '800',
                    fontSize: '13.5px',
                    color: isCompleted || isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '320px'
                  }}>{node.title}</div>
                  <span style={{ fontWeight: '800', fontSize: '12px', color: isBoss ? '#F43F5E' : '#F59E0B', flexShrink: 0 }}>
                    +{node.xp} XP
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{node.desc}</div>
                {isActive && (
                  <div style={{ marginTop: '8px' }}>
                    <button style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Start Challenge ⚔️
                    </button>
                  </div>
                )}
                {node.status === 'locked' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                    <Lock size={11} /> Complete previous node to unlock
                  </div>
                )}
              </div>
            </div>
            {index < JOURNEY_NODES.length - 1 && (
              <div style={{
                width: '3px',
                height: '20px',
                background: isCompleted ? 'rgba(16,185,129,0.35)' : 'var(--border-subtle)',
                margin: '0 auto',
                borderRadius: '2px'
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuizRunner({ node, onComplete }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZ_QUESTIONS[qIdx];

  const handleSubmit = () => {
    const isCorrect = selected === q.correct;
    if (isCorrect) setCorrect(c => c + 1);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (qIdx < QUIZ_QUESTIONS.length - 1) {
      setQIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setDone(true);
      const score = ((correct + (selected === q.correct ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100;
      onComplete(score >= 70 ? 80 : 20, score >= 70 ? 30 : 5);
    }
  };

  if (done) {
    const score = Math.round(((correct) / QUIZ_QUESTIONS.length) * 100);
    const passed = score >= 70;
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '🎉' : '📚'}</div>
        <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
          {passed ? 'Challenge Conquered!' : 'Keep Practicing!'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          You scored {score}% ({correct}/{QUIZ_QUESTIONS.length} correct)
        </div>
        <div style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: '14px',
          background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${passed ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)'}`,
          color: passed ? '#10B981' : '#818CF8',
          fontWeight: '800',
          fontSize: '16px',
          marginBottom: '28px'
        }}>
          {passed ? `🏆 Earned +80 XP • +30 Coins` : '+20 Effort XP'}
        </div>
        <div>
          <button
            onClick={() => setDone(false)}
            style={{ padding: '10px 28px', borderRadius: '10px', background: 'var(--primary)', color: '#FFF', fontWeight: '800', cursor: 'pointer', border: 'none' }}
          >
            Return to Journey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Knowledge Check</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Q{qIdx + 1} of {QUIZ_QUESTIONS.length}</div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((qIdx + 1) / QUIZ_QUESTIONS.length) * 100}%`, background: '#06B6D4', borderRadius: '8px', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid rgba(99,102,241,0.4)' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.5' }}>{q.prompt}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {q.options.map((opt, i) => {
          let bg = 'var(--bg-surface)';
          let border = 'var(--border-subtle)';
          if (submitted) {
            if (i === q.correct) { bg = 'rgba(16,185,129,0.18)'; border = 'rgba(16,185,129,0.6)'; }
            else if (i === selected) { bg = 'rgba(244,63,94,0.18)'; border = 'rgba(244,63,94,0.6)'; }
          } else if (i === selected) {
            bg = 'rgba(99,102,241,0.18)'; border = 'rgba(99,102,241,0.7)';
          }

          return (
            <div
              key={i}
              onClick={() => !submitted && setSelected(i)}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: bg,
                border: `1.5px solid ${border}`,
                cursor: submitted ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: i === selected ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '800',
                color: '#FFFFFF',
                flexShrink: 0
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{opt}</span>
            </div>
          );
        })}
      </div>

      {submitted && (
        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          💡 <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {q.explanation}
        </div>
      )}

      <button
        disabled={selected === null}
        onClick={submitted ? handleNext : handleSubmit}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          background: selected === null ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
          color: selected === null ? 'var(--text-subtle)' : '#FFFFFF',
          fontWeight: '800',
          fontSize: '14px',
          border: 'none',
          cursor: selected === null ? 'default' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {submitted
          ? (qIdx === QUIZ_QUESTIONS.length - 1 ? 'Finish & Claim XP 🏆' : 'Next Question →')
          : 'Submit Answer'}
      </button>
    </div>
  );
}

function CoachTab() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your EduFlow AI Learning Coach 🤖. I analyze your quiz attempts to craft personalized learning quests. What concept would you like to master today?' }
  ]);
  const [input, setInput] = useState('');

  const PROMPTS = [
    'Explain PostgreSQL Composite Indexes 🧩',
    'How do ACID transactions work in EF Core? ⚡',
    'Generate a 5-min practice challenge for me 🎯',
  ];

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { sender: 'user', text }]);
    setInput('');

    let reply = 'Great question! Let me help you with that…';
    const t = text.toLowerCase();
    if (t.includes('index')) reply = 'In PostgreSQL, a composite index (col1, col2) only optimizes queries when col1 is present in the WHERE clause. Always order index columns from highest to lowest selectivity!';
    else if (t.includes('acid') || t.includes('ef core') || t.includes('transaction')) reply = 'In EF Core, DbContext.SaveChangesAsync() wraps all entity changes in a single atomic transaction. If any constraint fails, all modifications roll back safely — this is the "A" in ACID!';
    else if (t.includes('challenge') || t.includes('practice') || t.includes('quest')) reply = "I have calibrated a 5-minute EF Core Transactions quest targeting your detected weaknesses. Head to Journey tab \u2014 it's unlocked and ready with +80 XP bonus!";
    else if (t.includes('clean') || t.includes('architecture')) reply = 'Clean Architecture isolates your domain entities from frameworks. The golden rule: dependencies point inward only. Your EduFlow.Core project should reference nothing external.';
    else reply = 'I recommend revisiting Module 1.2: Deterministic Ledgers. It directly addresses this pattern and has a diagnostic quiz ready for you.';

    setTimeout(() => {
      setMessages(m => [...m, { sender: 'ai', text: reply }]);
    }, 700);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>AI Learning Coach 🤖</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Personalized tutoring powered by LangGraph multi-agent AI.</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: '16px',
              background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
              border: msg.sender === 'ai' ? '1px solid var(--border-subtle)' : 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: '#06B6D4',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >{p}</button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 14px',
        background: 'var(--bg-surface)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)'
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask your AI Coach anything..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '13px' }}
        />
        <button onClick={() => sendMessage(input)} style={{ background: 'transparent', border: 'none', color: '#06B6D4', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function LeaderboardTab({ email }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Weekly Sprint Podium 🏆</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>Compete with your cohort — top 3 earn bonus XP multipliers every Monday.</div>
      </div>

      {/* Top 3 Podium */}
      <div style={{
        padding: '24px 16px',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
        display: 'flex',
        justifyContent: 'space-evenly',
        alignItems: 'flex-end'
      }}>
        {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((s, i) => {
          const positions = ['🥈', '👑', '🥉'];
          const heights = [80, 110, 70];
          const colors = ['#06B6D4', '#F59E0B', '#D97706'];
          return (
            <div key={s.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '22px' }}>{positions[i]}</div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF' }}>{s.name.split(' ')[0]}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: colors[i] }}>{s.xp.toLocaleString()} XP</div>
              <div style={{
                width: '72px',
                height: `${heights[i]}px`,
                borderRadius: '10px 10px 0 0',
                background: `${colors[i]}22`,
                border: `1px solid ${colors[i]}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '18px',
                color: colors[i]
              }}>#{s.rank}</div>
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {LEADERBOARD.map(s => {
          const isMe = s.email === email;
          return (
            <div key={s.rank} style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: isMe ? 'rgba(99,102,241,0.12)' : 'var(--bg-surface)',
              border: `1px solid ${isMe ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ fontWeight: '900', fontSize: '14px', color: s.rank <= 3 ? '#F59E0B' : 'var(--text-muted)', width: '28px', flexShrink: 0 }}>
                #{s.rank}
              </div>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#FFFFFF', flexShrink: 0 }}>
                {s.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: isMe ? '#818CF8' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {s.name} {isMe && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', padding: '2px 6px', borderRadius: '10px', color: '#818CF8' }}>YOU</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Level {s.level} • {s.streak}d streak 🔥</div>
              </div>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#F59E0B', flexShrink: 0 }}>
                {s.xp.toLocaleString()} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ profile, email, onLogout }) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* User Card */}
      <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg-surface)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: '900', color: '#FFFFFF',
          boxShadow: '0 0 18px rgba(99,102,241,0.4)', flexShrink: 0
        }}>
          {profile.fullName[0]}
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{profile.fullName}</div>
          <div style={{ fontSize: '12px', color: '#06B6D4', fontWeight: '700', marginBottom: '6px' }}>Level {profile.level} — {profile.levelName}</div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '800' }}>⭐ {profile.totalXp.toLocaleString()} XP</span>
            <span style={{ fontSize: '12px', color: '#06B6D4', fontWeight: '800' }}>🪙 {profile.coins} Coins</span>
            <span style={{ fontSize: '12px', color: '#F43F5E', fontWeight: '800' }}>🔥 {profile.streak} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-subtle)', letterSpacing: '0.07em', marginBottom: '12px' }}>
          BADGES & TROPHIES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {profile.badges.map(b => (
            <div key={b.name} style={{
              padding: '16px',
              borderRadius: '14px',
              background: b.unlocked ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${b.unlocked ? 'rgba(99,102,241,0.35)' : 'var(--border-subtle)'}`,
              textAlign: 'center',
              opacity: b.unlocked ? 1 : 0.5
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{b.unlocked ? b.icon : '🔒'}</div>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: b.unlocked ? 'var(--text-main)' : 'var(--text-subtle)', marginBottom: '3px' }}>{b.name}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      {!confirmLogout ? (
        <button
          onClick={() => setConfirmLogout(true)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(244,63,94,0.12)',
            border: '1px solid rgba(244,63,94,0.35)',
            color: '#F43F5E',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <LogOut size={16} /> Sign Out / Logout
        </button>
      ) : (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.4)', textAlign: 'center' }}>
          <div style={{ fontWeight: '800', color: '#FFFFFF', marginBottom: '12px', fontSize: '14px' }}>
            Confirm sign out from EduFlow AI?
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setConfirmLogout(false)} style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: '700', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onLogout} style={{ padding: '8px 20px', borderRadius: '8px', background: '#F43F5E', border: 'none', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
              Yes, Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main StudentPortal Component ─────────────────────────────────────────────
export default function StudentPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [quizNode, setQuizNode] = useState(null);

  const profileData = STUDENT_DATA[user?.email] || STUDENT_DATA['student@eduflow.ai'];
  const [profile, setProfile] = useState({ ...profileData });

  const handleMissionClaim = (xp, coins) => {
    setProfile(p => ({
      ...p,
      totalXp: p.totalXp + xp,
      xpInLevel: p.xpInLevel + xp,
      coins: p.coins + coins
    }));
  };

  const handleFreezeUse = () => {
    if (profile.freezeTokens <= 0) return;
    setProfile(p => ({ ...p, freezeTokens: p.freezeTokens - 1 }));
    alert(`🛡️ Streak Freeze Shield activated for today! ${profile.freezeTokens - 1} remaining.`);
  };

  const handleQuizComplete = (xp, coins) => {
    setProfile(p => ({
      ...p,
      totalXp: p.totalXp + xp,
      xpInLevel: p.xpInLevel + xp,
      coins: p.coins + coins
    }));
    setTimeout(() => {
      setQuizNode(null);
      setActiveTab('journey');
    }, 2000);
  };

  const TABS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'journey', label: 'Journey', icon: Map },
    { id: 'coach', label: 'AI Coach', icon: Bot },
    { id: 'ranks', label: 'Ranks', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      maxWidth: '680px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Student Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>EduFlow AI</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Student Learning Arena</div>
          </div>
        </div>

        {/* Quick stat pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Zap size={12} color="#F59E0B" />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#F59E0B' }}>{profile.totalXp.toLocaleString()} XP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}>
            <span style={{ fontSize: '13px' }}>🔥</span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#F43F5E' }}>{profile.streak}d</span>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', paddingBottom: '90px' }}>
        {quizNode ? (
          <QuizRunner node={quizNode} onComplete={handleQuizComplete} />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                onMissionClaim={handleMissionClaim}
                onFreezeUse={handleFreezeUse}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === 'journey' && (
              <JourneyTab onStartQuiz={(node) => setQuizNode(node)} />
            )}
            {activeTab === 'coach' && <CoachTab />}
            {activeTab === 'ranks' && <LeaderboardTab email={user?.email} />}
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                email={user?.email}
                onLogout={onLogout}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '680px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 14px',
        zIndex: 100
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !quizNode;
          return (
            <button
              key={tab.id}
              onClick={() => { setQuizNode(null); setActiveTab(tab.id); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '0 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#06B6D4' : '#64748B'
              }}
            >
              <Icon size={22} />
              <span style={{ fontSize: '10.5px', fontWeight: isActive ? '800' : '500' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
