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

const INITIAL_COURSES = [];
const QUIZZES = [];

// ─── Sub-Components ────────────────────────────────────────────────────────────

function HomeTab({ profile, onMissionClaim, onFreezeUse, onNavigate, onStartQuiz }) {
  const pct = Math.min(100, Math.round((profile.xpInLevel / profile.xpToNext) * 100));
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onMissionClaim(100, 40);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Level Progress Card */}
      <div className="card-premium" style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700', letterSpacing: '0.04em', marginBottom: '4px' }}>
              LEVEL {profile.level} — {profile.levelName.toUpperCase()}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
              {profile.totalXp.toLocaleString()} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Total XP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--warning)' }}>{profile.coins}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Coins</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', height: '8px', overflow: 'hidden', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          {profile.xpInLevel.toLocaleString()} / {profile.xpToNext.toLocaleString()} XP to Level {profile.level + 1} ({pct}%)
        </div>
      </div>

      {/* Streak & Freeze Card */}
      <div className="card-premium" style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
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
        <div className="card-premium" style={{
          padding: '18px 20px',
          borderColor: claimed ? 'var(--success-border)' : 'var(--border-card)'
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
              className="btn-primary"
              style={{ flex: 1, padding: '9px', fontSize: '12.5px' }}
            >
              Start Mission Assessment
            </button>
            <button
              disabled={claimed}
              onClick={handleClaim}
              className={claimed ? 'btn-ghost' : 'btn-secondary'}
              style={{ padding: '9px 14px', fontSize: '12px', color: claimed ? 'var(--success)' : undefined }}
            >
              {claimed ? '✓ Completed' : 'Claim Reward'}
            </button>
          </div>
        </div>
      </div>

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
      <div className="card-premium" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>
          {passed ? 'Assessment Completed' : 'Assessment Finished'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
          Score: {score}% ({totalCorrect}/{quiz.questions.length} correct) • Required: {quiz.passingScore || 70}%
        </div>
        <div style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: 'var(--radius-sm)',
          background: passed ? 'var(--success-soft)' : 'var(--primary-soft)',
          border: `1px solid ${passed ? 'var(--success-border)' : 'var(--primary-border)'}`,
          color: passed ? 'var(--success)' : 'var(--text-main)',
          fontWeight: '700',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {passed ? `Earned +${quiz.xpReward} XP • +${quiz.coinReward || 25} Coins` : '+20 Effort XP'}
        </div>
        <div>
          <button
            onClick={onCancel}
            className="btn-primary"
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
          if (submitted) {
            if (i === q.correct) { bg = 'var(--success-soft)'; border = 'var(--success-border)'; textColor = 'var(--success)'; }
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
                fontSize: '11.5px', fontWeight: '700', color: '#FFFFFF', flexShrink: 0
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
          <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {q.explanation}
        </div>
      )}

      <button
        disabled={selected === null}
        onClick={submitted ? handleNext : handleSubmit}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '11px',
          opacity: selected === null ? 0.5 : 1,
          cursor: selected === null ? 'default' : 'pointer'
        }}
      >
        {submitted
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

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { sender: 'user', text }]);
    setInput('');

    let reply = 'Let me break down that concept for you:';
    const t = text.toLowerCase();
    if (t.includes('index')) reply = 'In PostgreSQL, a composite index (col1, col2) evaluates left-to-right. Queries must filter by col1 to leverage the index structure. Always place higher cardinality columns first.';
    else if (t.includes('acid') || t.includes('ef core') || t.includes('transaction')) reply = 'In EF Core, DbContext.SaveChangesAsync() operates inside an explicit transaction scope. If any constraint validation fails, all operations roll back deterministically to maintain atomicity.';
    else if (t.includes('clean') || t.includes('architecture')) reply = 'Clean Architecture separates core enterprise domain entities from frameworks and databases. All dependencies point strictly inward toward domain models.';
    else reply = 'Review the curriculum module PDFs and test your understanding with the integrated assessments.';

    setTimeout(() => {
      setMessages(m => [...m, { sender: 'ai', text: reply }]);
    }, 500);
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
              color: '#FFFFFF', fontSize: '12.5px', lineHeight: '1.5'
            }}>
              {msg.text}
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

function LeaderboardTab({ profile }) {
  const LEADERBOARD = [
    { rank: 1, name: profile.fullName || 'Alex Rivera', level: profile.level, xp: profile.totalXp, streak: profile.streak, isMe: true }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Cohort Rankings</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Weekly progress leaderboard across all enrolled learners.</div>
      </div>

      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
        {LEADERBOARD.map(s => (
          <div key={s.rank} style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--warning)', width: '24px', flexShrink: 0 }}>
              #{s.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {s.name} <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>YOU</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Level {s.level} • {s.streak}d streak</div>
            </div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--warning)', flexShrink: 0 }}>
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
  const [activeTab, setActiveTab] = useState('curriculum');
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
    alert(`Streak freeze activated for today. ${profile.freezeTokens - 1} remaining.`);
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
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'coach', label: 'AI Assistant', icon: Bot },
    { id: 'ranks', label: 'Rankings', icon: Trophy },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: 'var(--radius-xs)',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={16} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>EduFlow AI</div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Student Workspace</div>
          </div>
        </div>

        {/* Stat Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge-pill badge-warning" style={{ fontSize: '11px' }}>
            <Zap size={11} /> {profile.totalXp.toLocaleString()} XP
          </span>
          <span className="badge-pill badge-danger" style={{ fontSize: '11px' }}>
            <Flame size={11} /> {profile.streak}d streak
          </span>
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
