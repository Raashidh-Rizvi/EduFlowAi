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
  ChevronDown,
  Send,
  MessageCircle,
  ShieldCheck,
  Coins,
  Target,
  FileText,
  Eye,
  Download,
  X,
  Play,
  HelpCircle,
  Sparkles
} from 'lucide-react';

// ─── Seed Data for Student Portal ─────────────────────────────────────────────
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
      { id: 'FIRST_STEP', name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { id: 'QUIZ_ACE', name: 'Quiz Ace', icon: '🎯', unlocked: true, desc: 'Scored 100% on a quiz' },
      { id: 'UNSTOPPABLE', name: 'Unstoppable', icon: '🔥', unlocked: false, desc: '7-day study streak' },
      { id: 'BOSS_SLAYER', name: 'Boss Slayer', icon: '👹', unlocked: false, desc: 'Defeat 5 boss encounters' },
      { id: 'TEAM_PLAYER', name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { id: 'AI_MASTER', name: 'AI Master', icon: '🤖', unlocked: false, desc: 'Complete 10 AI study plans' },
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
      { id: 'FIRST_STEP', name: 'First Step', icon: '🌱', unlocked: true, desc: 'Completed first lesson' },
      { id: 'QUIZ_ACE', name: 'Quiz Ace', icon: '🎯', unlocked: true, desc: 'Scored 100% on a quiz' },
      { id: 'UNSTOPPABLE', name: 'Unstoppable', icon: '🔥', unlocked: true, desc: '7-day streak achieved' },
      { id: 'BOSS_SLAYER', name: 'Boss Slayer', icon: '👹', unlocked: true, desc: 'Defeated 5 boss encounters' },
      { id: 'TEAM_PLAYER', name: 'Team Player', icon: '🤝', unlocked: true, desc: 'Joined a student squad' },
      { id: 'AI_MASTER', name: 'AI Master', icon: '🤖', unlocked: true, desc: 'Completed 10 AI study plans' },
    ]
  }
};

const INITIAL_COURSES = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    code: 'SE3090',
    title: 'Software Engineering Frameworks & Adaptive Systems',
    description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Clean Architecture & Gamification Mechanics',
        description: 'Core concepts of domain modeling, repository abstraction, and deterministic reward ledgers.',
        pdfUrl: '/uploads/pdfs/module1_clean_architecture_guide.pdf',
        attachmentFileName: 'module1_clean_architecture_guide.pdf',
        lessons: [
          {
            id: 'l1',
            title: '1.1 Clean Architecture & Repository Pattern',
            type: 'video',
            duration: '35m',
            xp: 30,
            completed: true,
            content: 'Understanding inner domain layers and abstract repository interfaces in .NET 8.',
            pdfUrl: '/uploads/pdfs/lesson1_1_clean_arch_slides.pdf',
            attachmentFileName: 'lesson1_1_clean_arch_slides.pdf'
          },
          {
            id: 'l2',
            title: '1.2 PostgreSQL Relational Schemas & Indexes',
            type: 'doc',
            duration: '25m',
            xp: 40,
            completed: true,
            content: 'Deep dive into composite B-Tree indexes and query execution planning.',
            pdfUrl: '/uploads/pdfs/lesson1_2_postgresql_indexing_handbook.pdf',
            attachmentFileName: 'lesson1_2_postgresql_indexing_handbook.pdf'
          },
          {
            id: 'l3',
            title: '1.3 Hands-on: EF Core Migrations & Foreign Keys',
            type: 'lab',
            duration: '45m',
            xp: 50,
            completed: false,
            content: 'Step-by-step lab configuring DbContext and applying relational migrations.',
            pdfUrl: null,
            attachmentFileName: null
          }
        ]
      },
      {
        id: 'm2',
        title: 'Module 2: Agentic AI Orchestration (LangGraph)',
        description: 'Multi-agent state machines, deterministic schema guards, and human-in-the-loop oversight.',
        pdfUrl: '/uploads/pdfs/module2_agentic_ai_orchestration.pdf',
        attachmentFileName: 'module2_agentic_ai_orchestration.pdf',
        lessons: [
          {
            id: 'l4',
            title: '2.1 Multi-Agent StateGraph Architecture',
            type: 'video',
            duration: '40m',
            xp: 60,
            completed: false,
            content: 'Orchestrating Planner, Tool, Analysis, and Safety agents.',
            pdfUrl: '/uploads/pdfs/lesson2_1_stategraph_spec.pdf',
            attachmentFileName: 'lesson2_1_stategraph_spec.pdf'
          },
          {
            id: 'l5',
            title: '2.2 Midterm Boss Encounter: Concurrency Dungeon',
            type: 'boss',
            duration: '30m',
            xp: 500,
            isBoss: true,
            completed: false,
            content: '15-question deadlock raid testing optimistic locking and distributed transactions.',
            pdfUrl: null,
            attachmentFileName: null
          }
        ]
      }
    ]
  }
];

const QUIZZES = [
  {
    id: 'q-indexing',
    title: 'Diagnostic Quiz: PostgreSQL Indexing & Query Plans',
    timeLimit: 15,
    xpReward: 80,
    coinReward: 30,
    passingScore: 70,
    questions: [
      {
        prompt: 'In PostgreSQL, which index type best optimizes a multi-column WHERE clause?',
        options: [
          'Composite B-Tree index ordered by column selectivity',
          'Single unindexed sequential text scan',
          'No index at all with parallel workers',
          'Random hash table distribution'
        ],
        correct: 0,
        explanation: 'Composite B-Tree indexes match filters efficiently when ordered from highest to lowest selectivity.'
      },
      {
        prompt: 'What does EF Core SaveChangesAsync() guarantee about multiple entity modifications?',
        options: [
          'All modifications are wrapped atomically in a single ACID transaction',
          'Each entity is saved in completely separate database connections',
          'It never rolls back on failure',
          'It bypasses foreign key constraints'
        ],
        correct: 0,
        explanation: 'SaveChangesAsync wraps all pending changes in a single ACID transaction boundary.'
      },
      {
        prompt: 'Why is an Immutable XP Transaction Ledger required in EduFlow?',
        options: [
          'To prevent duplicate reward exploits and guarantee mathematical auditability',
          'Because PostgreSQL cannot update integers',
          'To let LLMs modify business rules',
          'To slow down student progress'
        ],
        correct: 0,
        explanation: 'An append-only ledger records every XP change atomically and is audit-safe.'
      }
    ]
  },
  {
    id: 'q-clean-arch',
    title: 'Clean Architecture Domain Boundaries',
    timeLimit: 20,
    xpReward: 70,
    coinReward: 25,
    passingScore: 70,
    questions: [
      {
        prompt: 'What is the fundamental dependency rule of Clean Architecture?',
        options: [
          'Dependencies point inward exclusively toward Domain core',
          'Domain layers depend directly on UI Frameworks and DB Drivers',
          'All database models inherit directly from Controller classes',
          'Circular references between domain and presentation layers'
        ],
        correct: 0,
        explanation: 'Clean architecture dictates that inner layers know nothing of outer layers or third-party frameworks.'
      },
      {
        prompt: 'Where should Core Domain Entities and Interfaces reside in the project hierarchy?',
        options: [
          'EduFlow.Core',
          'EduFlow.Api',
          'EduFlow.Infrastructure',
          'EduFlow.Tests'
        ],
        correct: 0,
        explanation: 'EduFlow.Core defines pure business entities and contracts without external dependencies.'
      }
    ]
  }
];

// ─── Sub-Components ────────────────────────────────────────────────────────────

function HomeTab({ profile, onMissionClaim, onFreezeUse, onNavigate, onStartQuiz }) {
  const pct = Math.min(100, Math.round((profile.xpInLevel / profile.xpToNext) * 100));
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
          {profile.xpInLevel.toLocaleString()} / {profile.xpToNext.toLocaleString()} XP to Level {profile.level + 1} ({pct}%)
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
            Clean Architecture & Postgres Master Quest
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
            Read the attached module syllabus PDF, review indexing rules, and pass the diagnostic quiz to earn full XP!
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onStartQuiz(QUIZZES[0])}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              Start Mission Quiz ⚔️
            </button>
            <button
              disabled={claimed}
              onClick={handleClaim}
              style={{
                padding: '11px 16px',
                borderRadius: '10px',
                background: claimed ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)',
                color: claimed ? '#10B981' : '#FFFFFF',
                border: claimed ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-subtle)',
                fontWeight: '800',
                fontSize: '12px',
                cursor: claimed ? 'default' : 'pointer'
              }}
            >
              {claimed ? '✓ Claimed' : 'Quick Claim'}
            </button>
          </div>
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
          <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>Get personalized tutoring or generate a 5-min practice challenge.</div>
        </div>
        <ChevronRight size={18} color="#06B6D4" />
      </button>
    </div>
  );
}

function CurriculumTab({ courses, onOpenPdf, onCompleteLesson, onStartQuiz }) {
  const [expandedMods, setExpandedMods] = useState({ 'm1': true, 'm2': true });

  const toggleMod = (id) => {
    setExpandedMods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>Course Modules & Materials 📚</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
          Click any module to inspect syllabus PDFs, view lecture notes, and complete lessons for XP.
        </div>
      </div>

      {courses.map(course => (
        <div key={course.id} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.25)', color: '#818CF8', fontWeight: '800' }}>
              {course.code}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>{course.title}</span>
          </div>

          {course.modules.map((mod, modIdx) => {
            const isExpanded = !!expandedMods[mod.id];
            return (
              <div
                key={mod.id}
                style={{
                  borderRadius: '14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden'
                }}
              >
                {/* Module Header (Clickable & Expandable) */}
                <div
                  onClick={() => toggleMod(mod.id)}
                  style={{
                    padding: '16px 20px',
                    background: isExpanded ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#818CF8' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#06B6D4', fontWeight: '800' }}>MODULE {modIdx + 1}</div>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#FFFFFF' }}>{mod.title}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {mod.pdfUrl && (
                      <span style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                        background: 'rgba(6,182,212,0.15)', color: '#06B6D4',
                        display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700'
                      }}>
                        <FileText size={12} /> PDF
                      </span>
                    )}
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {mod.lessons.length} Lessons
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Attached Module PDF Material */}
                    {mod.pdfUrl && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(6,182,212,0.08)',
                        border: '1px solid rgba(6,182,212,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={20} color="#06B6D4" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>
                              {mod.attachmentFileName || 'Module Reading Material.pdf'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Official curriculum guide for this module
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => onOpenPdf({
                              title: `${mod.title} – PDF Material`,
                              url: mod.pdfUrl,
                              fileName: mod.attachmentFileName || 'module_syllabus.pdf'
                            })}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#06B6D4',
                              color: '#000',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={13} /> Read PDF
                          </button>
                          <a
                            href={mod.pdfUrl}
                            download={mod.attachmentFileName || 'material.pdf'}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-subtle)',
                              color: '#FFF',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Download size={13} /> Download
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Lessons List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-subtle)' }}>
                        LESSONS & ACTIVITIES
                      </div>
                      {mod.lessons.map(les => (
                        <div
                          key={les.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: les.completed ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${les.completed ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: les.completed ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: les.completed ? '#10B981' : '#818CF8'
                            }}>
                              {les.completed ? <CheckCircle2 size={16} /> : <BookOpen size={14} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFF' }}>{les.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{les.content}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {les.pdfUrl && (
                              <button
                                onClick={() => onOpenPdf({
                                  title: les.title,
                                  url: les.pdfUrl,
                                  fileName: les.attachmentFileName || 'lesson_attachment.pdf'
                                })}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: 'rgba(6,182,212,0.15)',
                                  border: '1px solid rgba(6,182,212,0.3)',
                                  color: '#06B6D4',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                📄 PDF
                              </button>
                            )}

                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#F59E0B' }}>
                              +{les.xp} XP
                            </span>

                            {!les.completed ? (
                              <button
                                onClick={() => onCompleteLesson(les.id, les.xp, course.id, mod.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  background: 'var(--primary)',
                                  color: '#FFF',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Complete ✓
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '800' }}>
                                ✓ Done
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Module End Assessment Trigger */}
                    <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Ready for knowledge check?
                      </span>
                      <button
                        onClick={() => onStartQuiz(QUIZZES[modIdx % QUIZZES.length])}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                          color: '#FFF',
                          fontWeight: '800',
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <HelpCircle size={14} /> Take Module Quiz (+80 XP)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function QuizRunner({ quiz, onComplete, onCancel }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz.questions[qIdx];

  const handleSubmit = () => {
    const isCorrect = selected === q.correct;
    if (isCorrect) setCorrectCount(c => c + 1);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (qIdx < quiz.questions.length - 1) {
      setQIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setDone(true);
      const totalCorrect = correctCount + (selected === q.correct ? 1 : 0);
      const score = Math.round((totalCorrect / quiz.questions.length) * 100);
      const passed = score >= (quiz.passingScore || 70);
      const xpEarned = passed ? (score === 100 ? quiz.xpReward + 30 : quiz.xpReward) : 20;
      const coinsEarned = passed ? quiz.coinReward || 25 : 5;
      onComplete(xpEarned, coinsEarned, passed, score);
    }
  };

  if (done) {
    const totalCorrect = correctCount;
    const score = Math.round((totalCorrect / quiz.questions.length) * 100);
    const passed = score >= (quiz.passingScore || 70);
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '🎉' : '📚'}</div>
        <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
          {passed ? 'Assessment Conquered!' : 'Keep Practicing!'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          You scored {score}% ({totalCorrect}/{quiz.questions.length} correct) • Threshold: {quiz.passingScore || 70}%
        </div>
        <div style={{
          display: 'inline-block',
          padding: '14px 28px',
          borderRadius: '14px',
          background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${passed ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)'}`,
          color: passed ? '#10B981' : '#818CF8',
          fontWeight: '900',
          fontSize: '16px',
          marginBottom: '28px'
        }}>
          {passed ? `🏆 Earned +${quiz.xpReward} XP • +${quiz.coinReward || 25} Coins` : '+20 Effort XP'}
        </div>
        <div>
          <button
            onClick={onCancel}
            style={{ padding: '10px 28px', borderRadius: '10px', background: 'var(--primary)', color: '#FFF', fontWeight: '800', cursor: 'pointer', border: 'none' }}
          >
            Return to Curriculum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{quiz.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Question {qIdx + 1} of {quiz.questions.length}</div>
        </div>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((qIdx + 1) / quiz.questions.length) * 100}%`, background: '#06B6D4', borderRadius: '8px', transition: 'width 0.4s ease' }} />
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
                width: '28px', height: '28px', borderRadius: '50%',
                background: i === selected ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '800', color: '#FFFFFF', flexShrink: 0
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
          width: '100%', padding: '14px', borderRadius: '12px',
          background: selected === null ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
          color: selected === null ? 'var(--text-subtle)' : '#FFFFFF',
          fontWeight: '800', fontSize: '14px', border: 'none',
          cursor: selected === null ? 'default' : 'pointer'
        }}
      >
        {submitted
          ? (qIdx === quiz.questions.length - 1 ? 'Finish & Record XP 🏆' : 'Next Question →')
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
    'What is Clean Architecture domain isolation? 🏛️'
  ];

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { sender: 'user', text }]);
    setInput('');

    let reply = 'Great question! Let me help you with that…';
    const t = text.toLowerCase();
    if (t.includes('index')) reply = 'In PostgreSQL, a composite index (col1, col2) only optimizes queries when col1 is present in the WHERE clause. Always order index columns from highest to lowest selectivity!';
    else if (t.includes('acid') || t.includes('ef core') || t.includes('transaction')) reply = 'In EF Core, DbContext.SaveChangesAsync() wraps all entity changes in a single atomic transaction. If any constraint fails, all modifications roll back safely — this is the "A" in ACID!';
    else if (t.includes('clean') || t.includes('architecture')) reply = 'Clean Architecture isolates your domain entities from frameworks. The golden rule: dependencies point inward only. Your EduFlow.Core project should reference nothing external.';
    else reply = 'I recommend reading the attached Module 1 PDF material and attempting the diagnostic quiz to test your comprehension.';

    setTimeout(() => {
      setMessages(m => [...m, { sender: 'ai', text: reply }]);
    }, 600);
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
              maxWidth: '75%', padding: '12px 16px', borderRadius: '16px',
              background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
              border: msg.sender === 'ai' ? '1px solid var(--border-subtle)' : 'none',
              color: '#FFFFFF', fontSize: '13px', lineHeight: '1.5'
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
            style={{ padding: '5px 12px', borderRadius: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: '#06B6D4', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
          >{p}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
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

function LeaderboardTab({ profile }) {
  const LEADERBOARD = [
    { rank: 1, name: 'Maya Patel', level: 6, xp: 8420, streak: 18 },
    { rank: 2, name: profile.fullName || 'Alex Rivera', level: profile.level, xp: profile.totalXp, streak: profile.streak, isMe: true },
    { rank: 3, name: 'Chen Wei', level: 4, xp: 4650, streak: 9 },
    { rank: 4, name: 'Elena Rostova', level: 3, xp: 2940, streak: 6 },
    { rank: 5, name: 'Tariq Mansoor', level: 3, xp: 2810, streak: 5 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Weekly Sprint Podium 🏆</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>Compete with your cohort — top 3 earn bonus XP multipliers every Monday.</div>
      </div>

      <div style={{
        padding: '24px 16px', borderRadius: '18px', background: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)',
        border: '1px solid rgba(99,102,241,0.35)', display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-end'
      }}>
        {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((s, i) => {
          const positions = ['🥈', '👑', '🥉'];
          const heights = [80, 110, 70];
          const colors = ['#06B6D4', '#F59E0B', '#D97706'];
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '22px' }}>{positions[i]}</div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF' }}>{s.name.split(' ')[0]}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: colors[i] }}>{s.xp.toLocaleString()} XP</div>
              <div style={{
                width: '72px', height: `${heights[i]}px`, borderRadius: '10px 10px 0 0',
                background: `${colors[i]}22`, border: `1px solid ${colors[i]}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', fontSize: '18px', color: colors[i]
              }}>#{s.rank}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {LEADERBOARD.map(s => (
          <div key={s.rank} style={{
            padding: '12px 16px', borderRadius: '12px',
            background: s.isMe ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface)',
            border: `1px solid ${s.isMe ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)'}`,
            display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{ fontWeight: '900', fontSize: '14px', color: s.rank <= 3 ? '#F59E0B' : 'var(--text-muted)', width: '28px', flexShrink: 0 }}>
              #{s.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: s.isMe ? '#818CF8' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {s.name} {s.isMe && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', padding: '2px 6px', borderRadius: '10px', color: '#818CF8' }}>YOU</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Level {s.level} • {s.streak}d streak 🔥</div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#F59E0B', flexShrink: 0 }}>
              {s.xp.toLocaleString()} XP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ profile, onLogout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-subtle)', letterSpacing: '0.07em', marginBottom: '12px' }}>
          UNLOCKED BADGES & ACHIEVEMENTS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {profile.badges.map(b => (
            <div key={b.id || b.name} style={{
              padding: '16px', borderRadius: '14px',
              background: b.unlocked ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${b.unlocked ? 'rgba(99,102,241,0.35)' : 'var(--border-subtle)'}`,
              textAlign: 'center', opacity: b.unlocked ? 1 : 0.5
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{b.unlocked ? b.icon : '🔒'}</div>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: b.unlocked ? 'var(--text-main)' : 'var(--text-subtle)', marginBottom: '3px' }}>{b.name}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onLogout}
        style={{
          width: '100%', padding: '12px', borderRadius: '12px',
          background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)',
          color: '#F43F5E', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}
      >
        <LogOut size={16} /> Sign Out / Logout
      </button>
    </div>
  );
}

// ─── Main StudentPortal Component ─────────────────────────────────────────────
export default function StudentPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('curriculum'); // 'home' | 'curriculum' | 'coach' | 'ranks' | 'profile'
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [courses, setCourses] = useState(INITIAL_COURSES);

  const profileData = STUDENT_DATA[user?.email] || STUDENT_DATA['student@eduflow.ai'];
  const [profile, setProfile] = useState({ ...profileData });

  const handleMissionClaim = (xp, coins) => {
    setProfile(p => {
      const newTotal = p.totalXp + xp;
      const newLevel = Math.floor(newTotal / 1000) + 1;
      return {
        ...p,
        totalXp: newTotal,
        xpInLevel: newTotal % 1000,
        level: newLevel,
        coins: p.coins + coins
      };
    });
  };

  const handleFreezeUse = () => {
    if (profile.freezeTokens <= 0) return;
    setProfile(p => ({ ...p, freezeTokens: p.freezeTokens - 1 }));
    alert(`🛡️ Streak Freeze Shield activated for today! ${profile.freezeTokens - 1} remaining.`);
  };

  const handleCompleteLesson = (lessonId, xpReward, courseId, modId) => {
    setCourses(prevCourses => {
      return prevCourses.map(c => {
        if (c.id === courseId) {
          return {
            ...c,
            modules: c.modules.map(m => {
              if (m.id === modId) {
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id === lessonId) {
                      return { ...l, completed: true };
                    }
                    return l;
                  })
                };
              }
              return m;
            })
          };
        }
        return c;
      });
    });

    setProfile(p => {
      const newTotal = p.totalXp + xpReward;
      const newLevel = Math.floor(newTotal / 1000) + 1;
      return {
        ...p,
        totalXp: newTotal,
        xpInLevel: newTotal % 1000,
        level: newLevel,
        coins: p.coins + 15
      };
    });

    alert(`🎉 Lesson completed! +${xpReward} XP and +15 Coins awarded to your profile.`);
  };

  const handleQuizComplete = (xpEarned, coinsEarned, passed, score) => {
    setProfile(p => {
      const newTotal = p.totalXp + xpEarned;
      const newLevel = Math.floor(newTotal / 1000) + 1;
      const updatedBadges = p.badges.map(b => {
        if (b.id === 'QUIZ_ACE' && score === 100) return { ...b, unlocked: true };
        if (b.id === 'FIRST_STEP') return { ...b, unlocked: true };
        return b;
      });

      return {
        ...p,
        totalXp: newTotal,
        xpInLevel: newTotal % 1000,
        level: newLevel,
        coins: p.coins + coinsEarned,
        streak: passed ? p.streak + 1 : p.streak,
        badges: updatedBadges
      };
    });
  };

  const TABS = [
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'home', label: 'Home', icon: Home },
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
      maxWidth: '720px',
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

        {/* Stat Pills */}
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
        {activeQuiz ? (
          <QuizRunner
            quiz={activeQuiz}
            onComplete={handleQuizComplete}
            onCancel={() => setActiveQuiz(null)}
          />
        ) : (
          <>
            {activeTab === 'curriculum' && (
              <CurriculumTab
                courses={courses}
                onOpenPdf={(doc) => setPdfDoc(doc)}
                onCompleteLesson={handleCompleteLesson}
                onStartQuiz={(quiz) => setActiveQuiz(quiz)}
              />
            )}
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                onMissionClaim={handleMissionClaim}
                onFreezeUse={handleFreezeUse}
                onNavigate={(tab) => setActiveTab(tab)}
                onStartQuiz={(quiz) => setActiveQuiz(quiz)}
              />
            )}
            {activeTab === 'coach' && <CoachTab />}
            {activeTab === 'ranks' && <LeaderboardTab profile={profile} />}
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                onLogout={onLogout}
              />
            )}
          </>
        )}
      </div>

      {/* In-App PDF Reader Modal */}
      {pdfDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '780px', height: '80vh',
            backgroundColor: '#0F172A', border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#06B6D4" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>{pdfDoc.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pdfDoc.fileName} • In-App Document Viewer</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={pdfDoc.url}
                  download={pdfDoc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px', borderRadius: '6px', background: 'var(--primary)',
                    color: '#FFF', fontSize: '11.5px', fontWeight: '700', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setPdfDoc(null)}
                  style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#0B0F19', padding: '24px', overflowY: 'auto' }}>
              <div style={{
                maxWidth: '620px', margin: '0 auto', background: '#1E293B',
                borderRadius: '12px', padding: '28px', border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <span style={{ fontSize: '11px', color: '#06B6D4', fontWeight: '800' }}>EDULOW AI CURRICULUM MATERIAL</span>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#FFF', marginTop: '4px', marginBottom: '16px' }}>{pdfDoc.title}</h3>
                <div style={{ color: '#CBD5E1', fontSize: '13px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p>
                    <strong>Key Architecture Guidelines:</strong> Isolate domain entities from third-party frameworks. Enforce clean dependency inversion rules.
                  </p>
                  <p>
                    <strong>PostgreSQL Relational Design:</strong> Utilize composite B-Tree indexes for multi-column WHERE clauses. Verify execution plans with EXPLAIN ANALYZE.
                  </p>
                  <p>
                    <strong>Deterministic Gamification Ledger:</strong> Record every XP award in an append-only ledger transaction to prevent duplicate exploits.
                  </p>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#C7D2FE', fontSize: '12px' }}>
                    💡 Once you finish reading, head back to take the module knowledge check quiz!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '720px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 14px',
        zIndex: 100
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !activeQuiz;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveQuiz(null); setActiveTab(tab.id); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '0 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#06B6D4' : '#64748B'
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: '10.5px', fontWeight: isActive ? '800' : '500' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
