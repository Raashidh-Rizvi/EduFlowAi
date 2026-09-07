import React, { useState, useEffect } from 'react';
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
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { aiService } from '../../services/aiService';
import { courseService } from '../../services/courseService';
import { quizService } from '../../services/quizService';
import { gamificationService } from '../../services/gamificationService';

// ─── Seed Data for Student Portal ─────────────────────────────────────────────
const STUDENT_DATA = {
  'student@eduflow.ai': {
    fullName: 'Alex Rivera',
    level: 1,
    levelName: 'Novice Explorer',
    totalXp: 0,
    xpInLevel: 0,
    xpToNext: 500,
    coins: 0,
    streak: 0,
    freezeTokens: 1,
    badges: [
      { id: 'FIRST_STEP', name: 'First Step', icon: '🌱', unlocked: false, desc: 'Completed first lesson' },
      { id: 'QUIZ_ACE', name: 'Quiz Ace', icon: '🎯', unlocked: false, desc: 'Scored 100% on a quiz' },
      { id: 'UNSTOPPABLE', name: 'Unstoppable', icon: '🔥', unlocked: false, desc: '7-day study streak' },
      { id: 'BOSS_SLAYER', name: 'Boss Slayer', icon: '👹', unlocked: false, desc: 'Defeat 5 boss encounters' },
      { id: 'TEAM_PLAYER', name: 'Team Player', icon: '🤝', unlocked: false, desc: 'Joined a student squad' },
      { id: 'AI_MASTER', name: 'AI Master', icon: '🤖', unlocked: false, desc: 'Complete 10 AI study plans' },
    ]
  }
};

const INITIAL_COURSES = [
  {
    id: 'course-cs301',
    code: 'CS-301',
    title: 'Advanced Database Architecture & EF Core',
    modules: [
      {
        id: 'm1',
        title: 'High-Performance Indexing & Query Execution',
        pdfUrl: '/materials/db-indexing-guide.pdf',
        attachmentFileName: 'PostgreSQL_Indexing_Architecture.pdf',
        lessons: [
          { id: 'l1', title: 'B-Tree & Composite Index Selectivity', duration: '30 mins', xp: 40, completed: false },
          { id: 'l2', title: 'Query Execution Plans & EXPLAIN ANALYZE', duration: '45 mins', xp: 60, completed: false }
        ]
      },
      {
        id: 'm2',
        title: 'Transactional Integrity & Deadlock Resolution',
        pdfUrl: '/materials/acid-transactions.pdf',
        attachmentFileName: 'ACID_Transactions_Concurrency.pdf',
        lessons: [
          { id: 'l3', title: 'Isolation Levels & Concurrency Anomalies', duration: '40 mins', xp: 50, completed: false },
          { id: 'l4', title: 'Two-Phase Locking & Graph Deadlock Detection', duration: '50 mins', xp: 75, completed: false }
        ]
      }
    ]
  }
];

const QUIZZES = [
  {
    id: 'quiz-1',
    title: 'Clean Architecture & PostgreSQL Indexing Diagnostic',
    passingScore: 70,
    xpReward: 80,
    coinReward: 30,
    questions: [
      {
        id: 'q1',
        prompt: 'What does the "I" represent in the ACID properties of relational databases?',
        question: 'What does the "I" represent in the ACID properties of relational databases?',
        options: ['Isolation', 'Integration', 'Iteration', 'Indexing'],
        correct: 0,
        explanation: 'Isolation ensures concurrent transactions execute independently without interfering with each other.'
      },
      {
        id: 'q2',
        prompt: 'In PostgreSQL, how are composite B-Tree indexes (colA, colB) evaluated during queries?',
        question: 'In PostgreSQL, how are composite B-Tree indexes (colA, colB) evaluated during queries?',
        options: ['Left-to-right starting with colA', 'Right-to-left starting with colB', 'Any order arbitrarily', 'Only when both columns are hashed'],
        correct: 0,
        explanation: 'Composite B-Tree indexes evaluate left-to-right; the leading column must be present in the WHERE clause.'
      },
      {
        id: 'q3',
        prompt: 'What is the primary role of the ValidationGuardAgent in EduFlow\'s LangGraph pipeline?',
        question: 'What is the primary role of the ValidationGuardAgent in EduFlow\'s LangGraph pipeline?',
        options: ['Enforce safety invariants like ≤ 20h/wk workload ceiling', 'Generate random quiz questions', 'Bypass instructor approval', 'Format CSS stylesheets'],
        correct: 0,
        explanation: 'ValidationGuardAgent enforces pedagogical safety, workload limits, and schema invariants.'
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
      <div className="card-premium glass-card-hover" style={{
        padding: '28px',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '800', letterSpacing: '0.04em', marginBottom: '4px' }}>
              LEVEL {profile.level} — {profile.levelName.toUpperCase()}
            </div>
            <div className="metric-gradient" style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>
              {profile.totalXp.toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>Total XP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--warning)' }}>{profile.coins}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Coins</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', height: '10px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease', boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }} />
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {profile.xpInLevel.toLocaleString()} / {profile.xpToNext.toLocaleString()} XP to Level {profile.level + 1} ({pct}%)
        </div>
      </div>

      {/* Streak & Freeze Card */}
      <div className="card-premium glass-card-hover" style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <Flame size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>{profile.streak} Day Learning Streak</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{profile.freezeTokens} streak freeze protection available</div>
        </div>
        <button
          onClick={onFreezeUse}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '11.5px' }}
        >
          <Shield size={13} /> 
          <span>Use Freeze</span>
        </button>
      </div>

      {/* Daily Mission */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '8px' }}>
          RECOMMENDED STUDY MISSION
        </div>
        <div className="card-premium glass-card-hover" style={{
          padding: '24px',
          borderColor: claimed ? 'var(--success-border)' : 'var(--primary-border)',
          background: claimed ? 'rgba(16, 185, 129, 0.05)' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span className="badge-pill badge-primary">
              Standard Objective
            </span>
            <span style={{ color: 'var(--warning)', fontWeight: '700', fontSize: '12.5px' }}>+100 XP • +40 Coins</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>
            Clean Architecture & PostgreSQL Indexing
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
            Read the curriculum specification PDF, review composite index selectivity, and complete the diagnostic evaluation.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onStartQuiz(QUIZZES[0])}
              className="btn-primary hover-scale"
              style={{ flex: 1, padding: '9px', fontSize: '12.5px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', border: 'none' }}
            >
              Start Mission Assessment
            </button>
            <button
              onClick={handleClaim}
              disabled={claimed}
              className={claimed ? "glass-badge" : "btn-secondary hover-scale"}
              style={claimed ? { padding: '8px 16px', color: 'var(--success)' } : { padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
            >
              {claimed ? '✓ Completed' : 'Claim Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* Deep Work Focus Sprint Launcher */}
      <button
        onClick={() => onNavigate('focus')}
        className="card-premium glass-card-hover"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: '1px solid var(--primary-border)',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Deep Work Focus Sprint <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>+35-75 XP</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Lock in uninterrupted concentration, grow your Mind Garden, and preserve your streak.
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="var(--primary)" />
      </button>

      {/* AI Coach Shortcut */}
      <button
        onClick={() => onNavigate('coach')}
        className="card-premium"
        style={{
          width: '100%',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--secondary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
          <Bot size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13.5px', marginBottom: '2px' }}>AI Learning Assistant</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Get personalized tutoring or clarify complex topics.</div>
        </div>
        <ChevronRight size={16} color="var(--text-muted)" />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Curriculum Modules & Documents</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Inspect syllabus PDFs, study lecture materials, and complete units for progress.
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card-premium" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <BookOpen size={24} />
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>No Enrolled Courses Found</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.5' }}>
            When instructors publish courses and materials with attached PDFs, they will appear here.
          </div>
        </div>
      ) : (
        courses.map(course => (
          <div key={course.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-pill badge-primary">
                {course.code}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>{course.title}</span>
            </div>

            {course.modules.map((mod, modIdx) => {
              const isExpanded = !!expandedMods[mod.id];
              return (
                <div
                  key={mod.id}
                  className="card-premium"
                  style={{
                    overflow: 'hidden',
                    padding: 0
                  }}
                >
                  {/* Module Header */}
                  <div
                    onClick={() => toggleMod(mod.id)}
                    style={{
                      padding: '12px 16px',
                      background: isExpanded ? 'var(--primary-soft)' : 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--secondary)', fontWeight: '700' }}>MODULE {modIdx + 1}</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>{mod.title}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {mod.pdfUrl && (
                        <span className="badge-pill badge-secondary" style={{ fontSize: '10.5px' }}>
                          <FileText size={11} /> PDF
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {mod.lessons.length} Lessons
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Attached Module PDF Material */}
                      {mod.pdfUrl && (
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="var(--secondary)" />
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                                {mod.attachmentFileName || 'Module Reading Material.pdf'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Official module documentation
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => onOpenPdf({
                                title: `${mod.title} – PDF Material`,
                                url: mod.pdfUrl,
                                fileName: mod.attachmentFileName || 'module_syllabus.pdf'
                              })}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11.5px', gap: '4px' }}
                            >
                              <Eye size={12} /> View PDF
                            </button>
                            <a
                              href={mod.pdfUrl}
                              download={mod.attachmentFileName || 'material.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '11.5px', gap: '4px' }}
                            >
                              <Download size={12} /> Download
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Lessons List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {mod.lessons.map(les => (
                          <div
                            key={les.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: les.completed ? 'var(--success-soft)' : 'var(--bg-surface)',
                              border: `1px solid ${les.completed ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: les.completed ? 'var(--success-soft)' : 'var(--primary-soft)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: les.completed ? 'var(--success)' : 'var(--primary)'
                              }}>
                                {les.completed ? <CheckCircle2 size={14} /> : <BookOpen size={12} />}
                              </div>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>{les.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{les.content}</div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {les.pdfUrl && (
                                <button
                                  onClick={() => onOpenPdf({
                                    title: les.title,
                                    url: les.pdfUrl,
                                    fileName: les.attachmentFileName || 'lesson_attachment.pdf'
                                  })}
                                  className="badge-pill badge-secondary"
                                  style={{ cursor: 'pointer', fontSize: '10.5px' }}
                                >
                                  PDF
                                </button>
                              )}

                              <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--warning)' }}>
                                +{les.xp} XP
                              </span>

                              {!les.completed ? (
                                <button
                                  onClick={() => onCompleteLesson(les.id, les.xp, course.id, mod.id)}
                                  className="btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '11px' }}
                                >
                                  Complete
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
                                  ✓ Done
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Module End Assessment Trigger */}
                      <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Ready for evaluation?
                        </span>
                        <button
                          onClick={() => onStartQuiz(QUIZZES[modIdx % QUIZZES.length])}
                          className="btn-primary"
                          style={{ padding: '5px 12px', fontSize: '11.5px', gap: '4px' }}
                        >
                          <HelpCircle size={13} /> Take Quiz (+80 XP)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

function QuizRunner({ quiz, onComplete, onCancel }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [answersPayload, setAnswersPayload] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="card-premium" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>No Questions Available</div>
        <button onClick={onCancel} className="btn-primary" style={{ marginTop: '12px' }}>
          Back to Curriculum
        </button>
      </div>
    );
  }

  const q = quiz.questions[qIdx];
  const isSelectedCorrect = selected !== null && (
    (q.correctAnswer && q.options && q.options[selected] === q.correctAnswer) ||
    selected === q.correct
  );

  const handleSubmit = () => {
    if (isSelectedCorrect) setCorrectCount(c => c + 1);
    setSubmitted(true);
  };

  const handleNext = async () => {
    const currentAnswerObj = {
      questionId: q.id,
      selectedAnswer: q.options[selected] || ''
    };
    const updatedAnswers = [...answersPayload, currentAnswerObj];
    setAnswersPayload(updatedAnswers);

    if (qIdx < quiz.questions.length - 1) {
      setQIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setSubmitting(true);
      const totalCorrect = correctCount + (isSelectedCorrect ? 1 : 0);
      const score = Math.round((totalCorrect / quiz.questions.length) * 100);
      const passed = score >= (quiz.passingScore || quiz.passingScorePercent || 70);

      try {
        const res = await onComplete(quiz, updatedAnswers, { totalCorrect, score, passed });
        if (res) {
          setRewardResult(res);
        }
      } catch (err) {
        console.warn('Backend quiz submission fallback:', err);
      } finally {
        setSubmitting(false);
        setDone(true);
      }
    }
  };

  if (done) {
    const totalCorrect = correctCount;
    const score = Math.round((totalCorrect / quiz.questions.length) * 100);
    const passed = rewardResult ? rewardResult.passed : (score >= (quiz.passingScore || quiz.passingScorePercent || 70));
    const finalScore = rewardResult ? Math.round(rewardResult.percentageScore) : score;
    const xpWon = rewardResult ? rewardResult.xpEarned : (passed ? (finalScore === 100 ? (quiz.xpReward || 80) + 30 : (quiz.xpReward || 80)) : 20);
    const coinsWon = rewardResult ? rewardResult.coinsEarned : (passed ? (quiz.coinReward || 25) : 5);
    const feedbackMsg = rewardResult?.feedback || (passed ? 'Mastery confirmed! You demonstrated solid technical understanding.' : 'Targeted practice recommended.');
    const badge = rewardResult?.badgeUnlocked;

    return (
      <div className="card-premium" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>
          {passed ? '🎉 Assessment Completed & Points Awarded!' : 'Assessment Finished'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Score: {finalScore}% • Required: {quiz.passingScore || quiz.passingScorePercent || 70}%
        </div>
        <div style={{
          display: 'inline-block',
          padding: '14px 28px',
          borderRadius: 'var(--radius-md)',
          background: passed ? 'var(--success-soft)' : 'var(--primary-soft)',
          border: `1px solid ${passed ? 'var(--success-border)' : 'var(--primary-border)'}`,
          color: passed ? 'var(--success)' : 'var(--text-main)',
          fontWeight: '700',
          fontSize: '15px',
          marginBottom: '16px'
        }}>
          +{xpWon} XP • +{coinsWon} EduCoins Earned
        </div>
        {badge && (
          <div style={{
            margin: '0 auto 16px auto',
            maxWidth: '380px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--warning-soft)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning)',
            fontWeight: '700',
            fontSize: '13px'
          }}>
            🏆 New Badge Unlocked: {badge.replace(/_/g, ' ')}!
          </div>
        )}
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
          {feedbackMsg}
        </div>
        <div>
          <button
            onClick={onCancel}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Return to Curriculum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>{quiz.title}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Question {qIdx + 1} of {quiz.questions.length}</div>
        </div>
        <button onClick={onCancel} className="btn-ghost" style={{ padding: '4px' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', height: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        <div style={{ height: '100%', width: `${((qIdx + 1) / quiz.questions.length) * 100}%`, background: 'var(--primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease' }} />
      </div>

      <div className="card-premium" style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.5' }}>{q.prompt}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {q.options.map((opt, i) => {
          let bg = 'var(--bg-card)';
          let border = 'var(--border-card)';
          let textColor = 'var(--text-main)';
          const isOptionCorrect = (q.correctAnswer && opt === q.correctAnswer) || i === q.correct;
          if (submitted) {
            if (isOptionCorrect) { bg = 'var(--success-soft)'; border = 'var(--success-border)'; textColor = 'var(--success)'; }
            else if (i === selected) { bg = 'var(--accent-soft)'; border = 'var(--accent-border)'; textColor = 'var(--accent)'; }
          } else if (i === selected) {
            bg = 'var(--primary-soft)'; border = 'var(--primary-border)';
          }

          return (
            <div
              key={i}
              onClick={() => !submitted && setSelected(i)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: bg,
                border: `1px solid ${border}`,
                cursor: submitted ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: i === selected ? 'var(--primary)' : 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11.5px', fontWeight: '700', color: i === selected ? '#FFFFFF' : 'var(--text-main)', flexShrink: 0
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: '500', color: textColor }}>{opt}</span>
            </div>
          );
        })}
      </div>

      {submitted && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {q.explanation || 'Evaluated by EduFlow AI.'}
        </div>
      )}

      <button
        disabled={selected === null || submitting}
        onClick={submitted ? handleNext : handleSubmit}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '11px',
          opacity: selected === null || submitting ? 0.5 : 1,
          cursor: selected === null || submitting ? 'default' : 'pointer'
        }}
      >
        {submitting
          ? 'Submitting & Recording Rewards...'
          : submitted
            ? (qIdx === quiz.questions.length - 1 ? 'Finish & Record XP' : 'Next Question →')
            : 'Submit Answer'}
      </button>
    </div>
  );
}

function CoachTab() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello. I am your AI Learning Assistant. I analyze curriculum progress and clarify technical concepts. What topic are you studying today?' }
  ]);
  const [input, setInput] = useState('');

  const PROMPTS = [
    'Explain PostgreSQL Composite Indexes',
    'How do ACID transactions work in EF Core?',
    'What is Clean Architecture domain isolation?'
  ];

  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    setMessages(m => [...m, { sender: 'user', text }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiService.chatWithCoach(text);
      if (res && res.reply) {
        setMessages(m => [
          ...m, 
          { 
            sender: 'ai', 
            text: res.reply,
            action: res.suggested_action,
            topic: res.identified_weak_topic
          }
        ]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend coach chat fallback', err);
    }

    let reply = 'Let me break down that concept for you:';
    const t = text.toLowerCase();
    let action = null;
    if (t.includes('index')) {
      reply = 'In PostgreSQL, a composite index (col1, col2) evaluates left-to-right. Queries must filter by col1 to leverage the index structure. Always place higher cardinality columns first.';
      action = 'Review PostgreSQL Composite Index Slicing';
    } else if (t.includes('acid') || t.includes('ef core') || t.includes('transaction')) {
      reply = 'In EF Core, DbContext.SaveChangesAsync() operates inside an explicit transaction scope. If any constraint validation fails, all operations roll back deterministically to maintain atomicity.';
      action = 'Practice Transaction Isolation Lab';
    } else if (t.includes('clean') || t.includes('architecture')) {
      reply = 'Clean Architecture separates core enterprise domain entities from frameworks and databases. All dependencies point strictly inward toward domain models.';
      action = 'Explore Dependency Inversion Rules';
    } else {
      reply = 'Review the curriculum module PDFs and test your understanding with the integrated assessments.';
      action = 'Take Diagnostic Module Quiz';
    }

    setTimeout(() => {
      setMessages(m => [...m, { sender: 'ai', text: reply, action }]);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '480px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>AI Learning Assistant</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Context-aware tutoring for your curriculum modules.</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
              border: msg.sender === 'ai' ? '1px solid var(--border-subtle)' : 'none',
              color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-main)', fontSize: '12.5px', lineHeight: '1.5'
            }}>
              <div>{msg.text}</div>
              {msg.action && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary-soft)',
                  border: '1px solid var(--primary-border)',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Sparkles size={12} />
                  <span>Suggested Action: {msg.action}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            className="btn-ghost"
            style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)' }}
          >{p}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask a technical or conceptual question..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px' }}
        />
        <button onClick={() => sendMessage(input)} className="btn-ghost" style={{ padding: '4px', color: 'var(--primary)' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function FocusFlowTab({ profile, onSessionCompleted }) {
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState('PostgreSQL B-Tree Index Selectivity');
  const [customTask, setCustomTask] = useState('');
  const [soundMode, setSoundMode] = useState('binaural'); // 'none' | 'binaural' | 'rain'
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      return Number(localStorage.getItem('eduflow_focus_count') || 0);
    } catch { return 0; }
  });
  const [gardenArtifacts, setGardenArtifacts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eduflow_mind_garden') || '["🌱 Focus Seedling", "🌳 Golden Oak Sapling"]');
    } catch { return ['🌱 Focus Seedling', '🌳 Golden Oak Sapling']; }
  });
  const [celebrationModal, setCelebrationModal] = useState(null);

  // Web Audio synthesizer for ambient focus soundscapes
  useEffect(() => {
    let ctx = null;
    let osc = null;
    let gain = null;

    if (isActive && audioPlaying && soundMode !== 'none') {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gain = ctx.createGain();
        gain.gain.setValueAtTime(0.03, ctx.currentTime);

        if (soundMode === 'binaural') {
          osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(216, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
        } else if (soundMode === 'rain') {
          const bufferSize = ctx.sampleRate * 2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 1.5;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          noise.connect(gain);
          gain.connect(ctx.destination);
          noise.start();
          osc = noise;
        }
      } catch (err) {
        console.warn('Web Audio error:', err);
      }
    }

    return () => {
      try {
        if (osc) osc.stop();
        if (ctx) ctx.close();
      } catch {}
    };
  }, [isActive, audioPlaying, soundMode]);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleFinishSprint();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSelectPreset = (mins) => {
    setIsActive(false);
    setPresetMinutes(mins);
    setTimeLeft(mins * 60);
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const handleFinishSprint = async () => {
    playChime();
    const taskName = customTask.trim() || selectedTask;
    const minutes = presetMinutes;

    try {
      const res = await gamificationService.recordFocusSession({
        studentId: profile.studentId || '33333333-3333-3333-3333-333333333333',
        durationMinutes: minutes,
        topicOrTask: taskName,
        focusTechnique: `Pomodoro (${minutes}m)`
      });

      const artifact = res.focusArtifactAwarded || (minutes >= 45 ? '💎 Ancient Focus Crystal' : (minutes >= 25 ? '🌳 Golden Oak Sapling' : '🌱 Emerald Sprout'));

      const newGarden = [...gardenArtifacts, artifact];
      setGardenArtifacts(newGarden);
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      try {
        localStorage.setItem('eduflow_focus_count', String(newCount));
        localStorage.setItem('eduflow_mind_garden', JSON.stringify(newGarden));
      } catch {}

      setCelebrationModal({
        xp: res.xpAwarded || (minutes * 2),
        coins: res.coinsAwarded || 15,
        artifact,
        task: taskName,
        message: res.message
      });

      if (onSessionCompleted) {
        onSessionCompleted(res.xpAwarded || (minutes * 2), res.coinsAwarded || 15, res.newStreak || (profile.streak + 1));
      }
    } catch (err) {
      console.warn('Session recording error:', err);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSec = presetMinutes * 60;
  const progressPct = Math.round(((totalSec - timeLeft) / totalSec) * 100);

  let growthEmoji = '🌱';
  let growthLabel = 'Focus Seed Planted';
  if (progressPct >= 75) {
    growthEmoji = presetMinutes >= 45 ? '💎' : '🌳';
    growthLabel = presetMinutes >= 45 ? 'Ancient Crystal Resonating' : 'Golden Oak Thriving';
  } else if (progressPct >= 35) {
    growthEmoji = '🌿';
    growthLabel = 'Deep Flow State Reached';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card-premium" style={{
        padding: '22px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-pill badge-primary">DEEP WORK STUDIO</span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Flow State & Pomodoro Motivation</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Study Focus & Mind Garden
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Lock in uninterrupted concentration. Uninterrupted focus awards +XP, grows your Mind Garden, and protects your streak!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="card-premium" style={{ padding: '8px 14px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>{completedSessions}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Sprints Finished</div>
          </div>
          <div className="card-premium" style={{ padding: '8px 14px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--warning)' }}>{gardenArtifacts.length}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Mind Garden</div>
          </div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="card-premium glass-card-hover" style={{
        padding: '32px 24px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Interval Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { mins: 25, label: '25m Classic Sprint', xp: '+35 XP' },
            { mins: 45, label: '45m Deep Work', xp: '+75 XP' },
            { mins: 15, label: '15m Quick Burst', xp: '+20 XP' },
            { mins: 1, label: '1m Test Demo', xp: '+10 XP' }
          ].map(p => (
            <button
              key={p.mins}
              onClick={() => handleSelectPreset(p.mins)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: presetMinutes === p.mins ? 'var(--primary)' : 'var(--bg-card)',
                color: presetMinutes === p.mins ? '#ffffff' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: '700',
                border: presetMinutes === p.mins ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{p.label}</span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>({p.xp})</span>
            </button>
          ))}
        </div>

        {/* Growing Mind Garden Visualization */}
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '4px solid var(--border-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: isActive ? '0 0 35px rgba(139, 92, 246, 0.35)' : 'none',
          transition: 'all 0.5s ease'
        }}>
          <div style={{ fontSize: '46px', animation: isActive ? 'pulse 2s infinite' : 'none' }}>
            {growthEmoji}
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
            marginTop: '4px'
          }}>
            {formatTime(timeLeft)}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--secondary)', fontWeight: '700' }}>
            {growthLabel}
          </div>
        </div>

        {/* Focus Progress Bar */}
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>Flow State Progress</span>
            <span>{progressPct}% Completed</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Active Study Objective */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Concentration Topic:
          </label>
          <select
            value={selectedTask}
            onChange={e => setSelectedTask(e.target.value)}
            disabled={isActive}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-main)',
              fontSize: '12.5px'
            }}
          >
            <option value="PostgreSQL B-Tree Index Selectivity">PostgreSQL B-Tree Index Selectivity (Module 1)</option>
            <option value="ACID Transactions & Graph Deadlocks">ACID Transactions & Graph Deadlocks (Module 2)</option>
            <option value="Clean Architecture & DIP Invariants">Clean Architecture & DIP Invariants</option>
            <option value="Custom Technical Research">Custom Technical Sprint...</option>
          </select>

          {selectedTask === 'Custom Technical Research' && (
            <input
              type="text"
              placeholder="What are you focusing on?"
              value={customTask}
              onChange={e => setCustomTask(e.target.value)}
              disabled={isActive}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                fontSize: '12px'
              }}
            />
          )}
        </div>

        {/* Ambient Audio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <button
              onClick={() => setAudioPlaying(!audioPlaying)}
              className="btn-ghost"
              style={{ padding: '6px', color: audioPlaying ? 'var(--primary)' : 'var(--text-muted)' }}
              title={audioPlaying ? 'Mute ambient sound' : 'Unmute ambient sound'}
            >
              {audioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <span>Ambient Sound:</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'binaural', label: 'Gamma 40Hz Wave' },
              { id: 'rain', label: 'Rain Resonance' },
              { id: 'none', label: 'Silent' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => { setSoundMode(s.id); setAudioPlaying(s.id !== 'none'); }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: soundMode === s.id ? 'var(--bg-card)' : 'transparent',
                  color: soundMode === s.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: soundMode === s.id ? '700' : '500',
                  border: soundMode === s.id ? '1px solid var(--border-card)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <button
            onClick={() => {
              if (!isActive && audioPlaying && soundMode !== 'none') {
                // Audio will start automatically
              }
              setIsActive(!isActive);
            }}
            className="btn-primary hover-scale"
            style={{
              padding: '10px 32px',
              fontSize: '14px',
              fontWeight: '800',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
            }}
          >
            {isActive ? <Pause size={16} /> : <Play size={16} />}
            {isActive ? 'Pause Sprint' : (timeLeft === totalSec ? 'Start Focus Sprint' : 'Resume Sprint')}
          </button>

          <button
            onClick={() => {
              setIsActive(false);
              setTimeLeft(presetMinutes * 60);
            }}
            className="btn-secondary hover-scale"
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reset timer"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '360px', marginTop: '4px' }}>
          💡 <strong>Psychology Tip:</strong> Completing a continuous focus sprint activates the dopamine reward pathways, reinforcing deep academic recall.
        </div>
      </div>

      {/* Mind Garden Showcase */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '8px' }}>
          MIND GARDEN & FOCUS ARTIFACTS
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {gardenArtifacts.map((art, idx) => (
            <div key={idx} className="card-premium" style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-main)'
            }}>
              <span>{art.split(' ')[0]}</span>
              <span>{art.slice(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Celebration Modal upon Completion */}
      {celebrationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: 'var(--bg-card)',
            padding: '28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '2px solid var(--success-border)'
          }}>
            <div style={{ fontSize: '56px' }}>🎉</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Focus Sprint Conquered!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              You completed your sprint on <strong>{celebrationModal.task}</strong> without losing concentration!
            </p>

            <div style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--success-soft)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              fontWeight: '800',
              fontSize: '16px'
            }}>
              +{celebrationModal.xp} XP • +{celebrationModal.coins} Coins Awarded!
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              Unlocked Focus Artifact: <strong>{celebrationModal.artifact}</strong> added to your Mind Garden!
            </div>

            <button
              onClick={() => setCelebrationModal(null)}
              className="btn-primary hover-scale"
              style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '800', marginTop: '6px' }}
            >
              Collect Rewards & Keep Flowing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardTab({ profile }) {
  const [standings, setStandings] = useState([]);
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanks() {
      try {
        const [lb, sq] = await Promise.all([
          gamificationService.getLeaderboard('weekly', 10),
          gamificationService.getAllSquads()
        ]);
        setStandings(lb || []);
        setSquads(sq || []);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRanks();
  }, []);

  const mySquad = squads.find(s => 
    s.members && s.members.some(m => m.studentId === profile.studentId || m.studentName === profile.fullName)
  ) || squads[0];

  const targetXp = 2500;
  const squadProgressPct = mySquad ? Math.min(100, Math.round(((mySquad.combinedXp || 0) / targetXp) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Collaborative Squad Banner */}
      {mySquad && (
        <div className="card-premium glass-card-hover" style={{
          padding: '20px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '4px solid var(--secondary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{mySquad.avatarUrl || '🚀'}</span>
              <div>
                <span className="badge-pill badge-neutral" style={{ fontSize: '10px', marginBottom: '2px' }}>
                  MY SQUAD COLLABORATIVE GOAL
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  {mySquad.name}
                </h4>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--secondary)' }}>
              {mySquad.combinedXp?.toLocaleString() || 0} XP
            </span>
          </div>

          <div style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quest: {mySquad.description || 'Sprint Quest'}</span>
              <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{squadProgressPct}% Completed</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${squadProgressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Teammates:</span>
            {(mySquad.members || []).map(m => (
              <span key={m.studentId} className="badge-pill badge-neutral" style={{ fontSize: '11px' }}>
                {m.studentName} ({m.totalXp} XP)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Leaderboard */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Cohort Standings</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Weekly ranking of all learners based on genuine lesson mastery and focus sprints.</div>
      </div>

      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
        {standings.map((s, idx) => {
          const isMe = s.studentName === profile.fullName || s.studentId === profile.studentId;
          return (
            <div key={s.studentId || idx} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              background: isMe ? 'var(--primary-soft)' : (idx === 0 ? 'var(--warning-soft)' : 'var(--bg-surface)'),
              border: isMe ? '1px solid var(--primary-border)' : (idx === 0 ? '1px solid var(--warning-border)' : '1px solid var(--border-subtle)'),
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: idx === 0 ? 'var(--warning)' : 'var(--text-muted)', width: '26px', flexShrink: 0 }}>
                {idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {s.studentName} {isMe && <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>YOU</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Level {s.level || 1} • {s.streak || 0}d streak</div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '13.5px', color: isMe ? 'var(--primary)' : 'var(--secondary)', flexShrink: 0 }}>
                {(s.scoreXp || 0).toLocaleString()} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ profile, onLogout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card-premium" style={{ padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: 'var(--radius-sm)',
          background: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: '800', color: 'var(--primary)', flexShrink: 0
        }}>
          {profile.fullName[0]}
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{profile.fullName}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--secondary)', fontWeight: '600', marginBottom: '4px' }}>Level {profile.level} — {profile.levelName}</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--warning)', fontWeight: '700' }}>{profile.totalXp.toLocaleString()} XP</span>
            <span style={{ fontSize: '11.5px', color: 'var(--secondary)', fontWeight: '700' }}>{profile.coins} Coins</span>
            <span style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: '700' }}>{profile.streak} Day Streak</span>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '8px' }}>
          EARNED CREDENTIALS & BADGES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {profile.badges.map(b => (
            <div key={b.id || b.name} className="card-premium" style={{
              padding: '14px',
              textAlign: 'center', opacity: b.unlocked ? 1 : 0.45
            }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{b.unlocked ? b.icon : '🔒'}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: b.unlocked ? 'var(--text-main)' : 'var(--text-muted)', marginBottom: '2px' }}>{b.name}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance / Theme Toggle */}
      <div className="card-premium" style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>Interface Theme</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Toggle between high-contrast Dark and Light modes</div>
        </div>
        <ThemeToggle showLabel />
      </div>

      <button
        onClick={onLogout}
        className="btn-danger"
        style={{
          width: '100%', padding: '10px', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}
      >
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  );
}

// ─── Main StudentPortal Component ─────────────────────────────────────────────
export default function StudentPortal({ user, onLogout }) {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('eduflow_student_active_tab') || 'curriculum';
    } catch {
      return 'curriculum';
    }
  });

  const setActiveTab = (tab) => {
    try {
      sessionStorage.setItem('eduflow_student_active_tab', tab);
    } catch {}
    setActiveTabState(tab);
  };
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [serverQuiz, setServerQuiz] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [courses, setCourses] = useState(INITIAL_COURSES);

  useEffect(() => {
    async function loadStudentData() {
      // 1. Load Courses
      try {
        const data = await courseService.getCourses();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(c => ({
            id: c.id,
            code: c.code || 'CS-301',
            title: c.title,
            modules: (c.modules || []).map((m, idx) => ({
              id: m.id || `m_${idx}`,
              title: m.title,
              pdfUrl: m.pdfUrl || null,
              attachmentFileName: m.attachmentFileName || 'Course Notes.pdf',
              lessons: (m.lessons || []).map((l, lIdx) => ({
                id: l.id || `l_${lIdx}`,
                title: l.title,
                duration: `${l.estimatedMinutes || 30} mins`,
                xp: l.xpReward || 40,
                completed: l.isCompleted || false
              }))
            }))
          }));
          const validCourses = mapped.filter(c => c.modules && c.modules.length > 0);
          if (validCourses.length > 0) {
            setCourses(validCourses);
          }
        }
      } catch (err) {
        console.warn('Could not load courses, using seed:', err);
      }

      // 2. Load Real Course Quizzes from PostgreSQL
      try {
        const qList = await quizService.getQuizzes('44444444-4444-4444-4444-444444444444');
        if (Array.isArray(qList) && qList.length > 0) {
          const detailedQuiz = await quizService.getQuizById(qList[0].id);
          if (detailedQuiz && detailedQuiz.questions) {
            setServerQuiz(detailedQuiz);
          }
        }
      } catch (err) {
        console.warn('Could not load backend quizzes, using seed:', err);
      }

      // 3. Load Live Gamification Dashboard Profile
      try {
        const studentId = user?.id || '33333333-3333-3333-3333-333333333333';
        const gameData = await gamificationService.getGameDashboard(studentId);
        if (gameData && gameData.profile) {
          const prof = gameData.profile;
          setProfile(prev => ({
            ...prev,
            fullName: prof.studentName || user?.fullName || prev.fullName,
            totalXp: prof.totalXp,
            level: prof.currentLevel,
            levelName: prof.levelName || prev.levelName,
            xpInLevel: prof.xpProgressInCurrentLevel,
            xpToNext: prof.xpRequiredForNextLevel,
            coins: prof.coins,
            streak: prof.currentStreak,
            freezeTokens: prof.freezeTokensAvailable,
            badges: prof.recentBadges && prof.recentBadges.length > 0
              ? prof.recentBadges.map(b => ({
                  id: b.id,
                  name: b.title,
                  icon: b.iconUrl || '🏅',
                  unlocked: b.isUnlocked,
                  desc: b.description
                }))
              : prev.badges
          }));
        }
      } catch (err) {
        console.warn('Could not load gamification dashboard:', err);
      }
    }
    loadStudentData();
  }, [user]);

  const profileData = STUDENT_DATA[user?.email] || STUDENT_DATA['student@eduflow.ai'];
  const [profile, setProfile] = useState({ ...profileData });

  const handleMissionClaim = async (xp, coins) => {
    try {
      const studentId = user?.id || '33333333-3333-3333-3333-333333333333';
      await gamificationService.claimGrandReward(studentId);
    } catch {}
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

  const handleFreezeUse = async () => {
    if (profile.freezeTokens <= 0) return;
    try {
      const studentId = user?.id || '33333333-3333-3333-3333-333333333333';
      await gamificationService.useStreakFreeze(studentId);
    } catch {}
    setProfile(p => ({ ...p, freezeTokens: p.freezeTokens - 1 }));
    alert(`Streak freeze activated for today. ${profile.freezeTokens - 1} remaining.`);
  };

  const handleStartQuiz = async (quizToRun) => {
    const target = quizToRun || serverQuiz || QUIZZES[0];
    if (target && (!target.questions || target.questions.length === 0)) {
      try {
        const detailed = await quizService.getQuizById(target.id);
        if (detailed && detailed.questions) {
          setActiveQuiz(detailed);
          return;
        }
      } catch (err) {
        console.warn('Failed to load quiz detail:', err);
      }
    }
    setActiveQuiz(target);
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
  };

  const handleQuizComplete = async (quiz, answers, localStats) => {
    // Attempt authoritative backend submission if quiz ID is a valid Guid
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quiz?.id);
    if (isGuid && answers && answers.length > 0) {
      try {
        const res = await quizService.submitQuiz(quiz.id, answers);
        if (res) {
          setProfile(p => {
            const newTotal = res.newTotalXp ?? (p.totalXp + (res.xpEarned || 0));
            const newLevel = res.newLevel ?? p.level;
            const updatedBadges = p.badges.map(b => {
              if (res.badgeUnlocked && b.id === res.badgeUnlocked) return { ...b, unlocked: true };
              if (b.id === 'QUIZ_ACE' && res.percentageScore >= 100) return { ...b, unlocked: true };
              if (b.id === 'FIRST_STEP') return { ...b, unlocked: true };
              return b;
            });
            return {
              ...p,
              totalXp: newTotal,
              xpInLevel: newTotal % 1000,
              level: newLevel,
              coins: p.coins + (res.coinsEarned || 0),
              streak: res.passed ? p.streak + 1 : p.streak,
              badges: updatedBadges
            };
          });
          return res;
        }
      } catch (err) {
        console.warn('Backend quiz submission fallback to client evaluation:', err);
      }
    }

    // Client fallback evaluation
    const xpEarned = localStats.passed ? (localStats.score === 100 ? (quiz.xpReward || 80) + 30 : (quiz.xpReward || 80)) : 20;
    const coinsEarned = localStats.passed ? (quiz.coinReward || 25) : 5;
    setProfile(p => {
      const newTotal = p.totalXp + xpEarned;
      const newLevel = Math.floor(newTotal / 1000) + 1;
      const updatedBadges = p.badges.map(b => {
        if (b.id === 'QUIZ_ACE' && localStats.score === 100) return { ...b, unlocked: true };
        if (b.id === 'FIRST_STEP') return { ...b, unlocked: true };
        return b;
      });
      return {
        ...p,
        totalXp: newTotal,
        xpInLevel: newTotal % 1000,
        level: newLevel,
        coins: p.coins + coinsEarned,
        streak: localStats.passed ? p.streak + 1 : p.streak,
        badges: updatedBadges
      };
    });

    return {
      passed: localStats.passed,
      percentageScore: localStats.score,
      xpEarned,
      coinsEarned,
      feedback: localStats.passed ? 'Well done! You passed the assessment.' : 'Keep practicing to master these topics.'
    };
  };

  const TABS = [
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'focus', label: 'Focus & Flow', icon: Zap },
    { id: 'coach', label: 'AI Assistant', icon: Bot },
    { id: 'ranks', label: 'Rankings & Squad', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-canvas)',
      maxWidth: '720px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Student Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0
      }}>
        <BrandLogo size="sm" subtitle="Student Workspace" />

        {/* Stat Pills & Theme Toggle */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge-pill badge-warning" style={{ fontSize: '11px' }}>
            <Zap size={11} /> {profile.totalXp.toLocaleString()} XP
          </span>
          <span className="badge-pill badge-danger" style={{ fontSize: '11px' }}>
            <Flame size={11} /> {profile.streak}d streak
          </span>
          <ThemeToggle compact />
        </div>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto', paddingBottom: '80px' }}>
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
                onStartQuiz={(quiz) => handleStartQuiz(quiz)}
              />
            )}
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                onMissionClaim={handleMissionClaim}
                onFreezeUse={handleFreezeUse}
                onNavigate={(tab) => setActiveTab(tab)}
                onStartQuiz={(quiz) => handleStartQuiz(quiz)}
              />
            )}
            {activeTab === 'focus' && (
              <FocusFlowTab
                profile={profile}
                onSessionCompleted={(xp, coins, streak) => {
                  setProfile(p => {
                    const newTotal = p.totalXp + xp;
                    const newLevel = Math.floor(newTotal / 1000) + 1;
                    return {
                      ...p,
                      totalXp: newTotal,
                      xpInLevel: newTotal % 1000,
                      level: newLevel,
                      coins: p.coins + coins,
                      streak: Math.max(p.streak, streak)
                    };
                  });
                }}
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
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%', maxWidth: '780px', height: '80vh',
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <div style={{
              padding: '14px 18px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="var(--secondary)" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>{pdfDoc.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pdfDoc.fileName} • Document Viewer</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={pdfDoc.url}
                  download={pdfDoc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px' }}
                >
                  <Download size={12} /> Download
                </a>
                <button
                  onClick={() => setPdfDoc(null)}
                  className="btn-ghost"
                  style={{ padding: '5px' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: 'var(--bg-canvas)', padding: '20px', overflowY: 'auto' }}>
              <div style={{
                maxWidth: '620px', margin: '0 auto', background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)', padding: '24px', border: '1px solid var(--border-card)'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>COURSE SPECIFICATION MATERIAL</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', marginBottom: '14px' }}>{pdfDoc.title}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p>
                    <strong>Architecture Standards:</strong> Strict isolation of domain entities and separation of database persistence layers.
                  </p>
                  <p>
                    <strong>PostgreSQL Indexing:</strong> Composite indexes evaluated left-to-right according to query predicate selectivity.
                  </p>
                  <p>
                    <strong>Gamification Verification:</strong> Append-only transactions record all earned rewards to ensure state integrity.
                  </p>
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', color: 'var(--text-main)', fontSize: '11.5px' }}>
                    💡 Once finished reading, return to complete the knowledge assessment for this unit.
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
        padding: '8px 0 10px',
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
                gap: '3px',
                padding: '0 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
