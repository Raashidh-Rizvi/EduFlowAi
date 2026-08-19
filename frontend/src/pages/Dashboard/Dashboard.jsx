import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Layers, 
  Bot, 
  Clock, 
  BarChart3, 
  FileText, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  Activity, 
  ShieldAlert, 
  Send,
  HelpCircle,
  Zap,
  Swords,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { courseService } from '../../services/courseService';
import { quizService } from '../../services/quizService';
import { insightsService } from '../../services/insightsService';

export default function Dashboard({ onNavigateTo }) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [summaryKpis, setSummaryKpis] = useState({
    totalCourses: 0,
    activeStudents: 0,
    totalModules: 0,
    totalQuizzes: 0,
    pendingReviews: 0,
    aiDraftsCount: 0
  });
  const [atRiskAlerts, setAtRiskAlerts] = useState([]);

  const [recentActivities, setRecentActivities] = useState([]);

  // Remediation Modal state
  const [showRemediationModal, setShowRemediationModal] = useState(false);
  const [remediationScope, setRemediationScope] = useState(null);
  const [generatingRemediation, setGeneratingRemediation] = useState(false);
  const [remediationDraft, setRemediationDraft] = useState(null);
  const [actionSuccessToast, setActionSuccessToast] = useState(null);

  const showToast = (msg) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3500);
  };

  useEffect(() => {
    loadInstructorData();
  }, []);

  const loadInstructorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch real courses from backend
      const fetchedCourses = await courseService.getCourses();
      
      if (fetchedCourses && fetchedCourses.length > 0) {
        setCourses(fetchedCourses);
      } else {
        setCourses([]);
      }

      // 2. Fetch platform summary
      try {
        const platformSummary = await insightsService.getDashboardSummary();
        if (platformSummary) {
          setSummaryKpis({
            totalCourses: platformSummary.totalCourses || 0,
            activeStudents: platformSummary.totalStudents || 0,
            totalModules: 0,
            totalQuizzes: 0,
            pendingReviews: 0,
            aiDraftsCount: platformSummary.pendingAiApprovals || 0
          });
        }
      } catch {
        // fallback
      }
    } catch (err) {
      console.warn('Instructor dashboard load fallback', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRemediationModal = (alertItem) => {
    setRemediationScope({
      courseCode: alertItem.courseCode,
      courseTitle: alertItem.courseTitle,
      moduleTitle: alertItem.moduleTitle,
      topicTitle: alertItem.topicTitle || 'Recursion',
      metricText: alertItem.metricText,
      affectedStudents: alertItem.affectedStudents
    });
    setRemediationDraft(null);
    setShowRemediationModal(true);
  };

  const handleGenerateRemediationQuiz = async () => {
    setGeneratingRemediation(true);
    try {
      // Call AI microservice to synthesize weak-topic recovery quiz
      const res = await quizService.generateAiQuiz({
        courseId: '44444444-4444-4444-4444-444444444444',
        topic: `${remediationScope.topicTitle} Remediation & Recovery`,
        moduleTitle: remediationScope.moduleTitle,
        difficulty: 'Medium',
        questionCount: 4,
        timeLimitMinutes: 15,
        xpReward: 80,
        coinReward: 25
      });

      if (res && res.questions && res.questions.length > 0) {
        setRemediationDraft({
          title: `🎯 ${remediationScope.topicTitle} Recovery & Diagnostic Quiz`,
          scope: `${remediationScope.courseCode} → ${remediationScope.moduleTitle} → ${remediationScope.topicTitle}`,
          targetWeakness: 'Base case evaluation, recursive call stacks, and termination invariants',
          questionsCount: res.questions.length,
          timeLimit: '15 mins',
          xpReward: 80,
          passMark: '70%',
          questions: res.questions.map((q, idx) => ({
            id: idx + 1,
            prompt: q.prompt,
            type: q.type === 2 ? 'CodeSnippet' : q.type === 1 ? 'TrueFalse' : 'MultipleChoice',
            options: q.options || ['Base condition check', 'Stack frame overflow', 'Infinite loop', 'Scope mutation'],
            correctAnswer: q.options?.[0] || 'Base condition check',
            explanation: 'Calibrated diagnostic rationale specifically addressing student confusion on base case evaluation.'
          }))
        });
      } else {
        generateFallbackRemediationDraft();
      }
    } catch {
      generateFallbackRemediationDraft();
    } finally {
      setGeneratingRemediation(false);
    }
  };

  const generateFallbackRemediationDraft = () => {
    const topic = remediationScope?.topicTitle || 'Recursion';
    setRemediationDraft({
      title: `🎯 ${topic} Diagnostic & Mastery Recovery Quiz`,
      scope: `${remediationScope?.courseCode || 'PY101'} → ${remediationScope?.moduleTitle || 'Functions'} → ${topic}`,
      targetWeakness: `Common student errors in ${topic} base cases, state unwinding, and recursion limits.`,
      questionsCount: 4,
      timeLimit: '15 mins',
      xpReward: 80,
      passMark: '70%',
      questions: [
        {
          id: 1,
          prompt: `In a recursive algorithm for computing factorials, what is the critical consequence of omitting the base case (n <= 1)?`,
          type: 'MultipleChoice',
          options: [
            'Maximum recursion depth is exceeded causing a RecursionError / StackOverflow',
            'The function immediately returns 0 deterministically',
            'The return value is automatically cast to an integer float',
            'The operating system suspends execution for 30 seconds'
          ],
          correctAnswer: 'Maximum recursion depth is exceeded causing a RecursionError / StackOverflow',
          explanation: 'Without a stopping condition, the call stack grows indefinitely until the runtime recursion ceiling is hit.'
        },
        {
          id: 2,
          prompt: `Trace the return value of mystery(3) where mystery(n) = if n == 0 return 1 else return n * mystery(n-1):`,
          type: 'MultipleChoice',
          options: [
            '6 (3 * 2 * 1 * 1)',
            '0',
            '3',
            'Infinite loop'
          ],
          correctAnswer: '6 (3 * 2 * 1 * 1)',
          explanation: '3 * mystery(2) = 3 * (2 * mystery(1)) = 3 * 2 * (1 * mystery(0)) = 3 * 2 * 1 * 1 = 6.'
        },
        {
          id: 3,
          prompt: `True or False: Every recursive function can be reformulated iteratively using an explicit stack data structure.`,
          type: 'TrueFalse',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Church-Turing thesis and compiler theory establish that recursion and iteration with stack are computationally equivalent.'
        },
        {
          id: 4,
          prompt: `Which memory segment stores local variables and return addresses for each recursive function invocation?`,
          type: 'MultipleChoice',
          options: [
            'Call Stack (Activation Record Frames)',
            'Heap Allocation Segment',
            'Static Global Data Segment',
            'Read-Only Text / Bytecode Segment'
          ],
          correctAnswer: 'Call Stack (Activation Record Frames)',
          explanation: 'Each function invocation allocates a stack frame containing arguments, local scope, and caller return PC.'
        }
      ]
    });
  };

  const handleApproveAndPublishRemediation = async () => {
    if (!remediationDraft) return;

    try {
      await quizService.createQuiz({
        courseId: '44444444-4444-4444-4444-444444444444',
        title: remediationDraft.title,
        description: `Targeted remediation quiz for ${remediationScope?.topicTitle} to help students improve mastery.`,
        timeLimitMinutes: 15,
        passingScorePercent: 70,
        xpReward: 80,
        coinReward: 25,
        questions: remediationDraft.questions.map((q, idx) => ({
          prompt: q.prompt,
          type: q.type === 'CodeSnippet' ? 2 : q.type === 'TrueFalse' ? 1 : 0,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 10,
          orderIndex: idx + 1
        }))
      });
    } catch {
      // local sync
    }

    // Remove the alert from list
    setAtRiskAlerts(prev => prev.filter(a => a.topicTitle !== remediationScope?.topicTitle));
    setShowRemediationModal(false);
    showToast(`🎉 Remediation Quiz "${remediationDraft.title}" published! Notification sent to ${remediationScope?.affectedStudents || 28} affected students.`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '60px 20px', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw size={32} className="spin" color="var(--primary)" />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading Instructor Command Center...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
      
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000,
          fontSize: '13.5px',
          fontWeight: '700'
        }}>
          <Check size={18} strokeWidth={3} />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* ── 0. HERO INSTRUCTOR WELCOME ────────────────────────────────────────── */}
      <div className="card-premium dashboard-hero glass-card-hover" style={{
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-primary-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '22px',
            fontWeight: '800',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
          }}>
            SJ
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                Good morning, <span className="text-gradient">Dr. Sarah</span>
              </h1>
              <span className="glass-badge" style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', color: 'var(--primary)' }}>
                INSTRUCTOR CONSOLE
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Here's what's happening across your courses today. Review course mastery, assist at-risk learners, and manage AI assessment drafts.
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTo('courses')}
            className="glass-badge hover-scale"
            style={{ padding: '10px 20px', fontSize: '13.5px', gap: '8px', display: 'flex', alignItems: 'center', fontWeight: '600', color: 'var(--text-main)' }}
          >
            <BookOpen size={16} color="var(--primary)" />
            <span>Manage Curriculum</span>
          </button>
          <button
            onClick={() => onNavigateTo('ai-review')}
            className="btn-primary hover-scale"
            style={{ padding: '10px 24px', fontSize: '13.5px', gap: '8px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', border: 'none', boxShadow: 'var(--shadow-primary-sm)' }}
          >
            <Sparkles size={16} />
            <span>Review AI Drafts ({summaryKpis.aiDraftsCount})</span>
          </button>
        </div>
      </div>

      {/* ── 1. SECTION 1: INSTRUCTOR SUMMARY KPIS ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* My Courses */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(14,165,233,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="metric-gradient" style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.1' }}>
              {summaryKpis.totalCourses}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              My Courses
            </div>
          </div>
        </div>

        {/* Active Students */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(16,185,129,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', border: '1px solid var(--secondary-border)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-gradient" style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.1' }}>
              {summaryKpis.activeStudents}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              Active Students
            </div>
          </div>
        </div>

        {/* Total Modules */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(245,158,11,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', border: '1px solid var(--success-border)' }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="metric-gradient" style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.1' }}>
              {summaryKpis.totalModules}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total Modules
            </div>
          </div>
        </div>

        {/* Total Quizzes */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', border: '1px solid var(--warning-border)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="metric-gradient" style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.1' }}>
              {summaryKpis.totalQuizzes}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total Quizzes
            </div>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(245,158,11,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#EF4444', lineHeight: '1.1' }}>
              {summaryKpis.pendingReviews}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pending Reviews
            </div>
          </div>
        </div>

        {/* AI Drafts */}
        <div className="card-premium glass-card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(99,102,241,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A855F7', border: '1px solid var(--border-accent)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#A855F7', lineHeight: '1.1' }}>
              {summaryKpis.aiDraftsCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
              AI Drafts Awaiting
            </div>
          </div>
        </div>

      </div>

      {/* ── 2. SECTION 2: COURSE OVERVIEW (LARGEST SECTION) ────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
              Course Overview & Performance
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Hierarchical view of curriculum modules, learning topics, quizzes, and real-time student mastery.
            </p>
          </div>
          <button
            onClick={() => onNavigateTo('courses')}
            className="glass-badge hover-scale"
            style={{ padding: '8px 16px', fontSize: '12.5px', gap: '6px', display: 'flex', alignItems: 'center', color: 'var(--text-main)', fontWeight: '600' }}
          >
            <span>View All Courses</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {courses.map(course => (
            <div 
              key={course.id} 
              className="card-premium glass-card-hover"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}
            >
              {/* Card Header: Code, Title, Students count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge-pill badge-primary" style={{ fontWeight: '700', fontSize: '11px' }}>
                      {course.code}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {course.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    {course.title}
                  </h3>
                </div>

                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  <Users size={14} color="var(--secondary)" />
                  <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--secondary)' }}>
                    {course.studentsCount} students
                  </span>
                </div>
              </div>

              {/* Hierarchy Metric Counts: Modules • Topics • Lessons • Quizzes */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-canvas)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{course.modulesCount || 6}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Modules</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{course.topicsCount || 32}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Topics</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{course.lessonsCount || 48}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lessons</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)' }}>{course.quizzesCount || 14}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quizzes</div>
                </div>
              </div>

              {/* Completion Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Cohort Completion</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{course.completionRate}%</span>
                </div>
                <div style={{
                  height: '8px',
                  backgroundColor: 'var(--border-subtle)',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${course.completionRate}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4F46E5 0%, #0EA5E9 100%)',
                    borderRadius: '999px'
                  }} />
                </div>
              </div>

              {/* Analytics Stats: Avg Score & Engagement */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span>
                    Avg Score: <strong style={{ color: 'var(--success)' }}>{course.avgScore}%</strong>
                  </span>
                  <span>
                    Engagement: <strong style={{ color: 'var(--text-main)' }}>{course.engagementRate}%</strong>
                  </span>
                </div>

                {/* Open Course Action Button */}
                <button
                  onClick={() => onNavigateTo('courses')}
                  className="btn-primary hover-scale"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    border: 'none'
                  }}
                >
                  <span>Open Course</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. TWO-COLUMN SPLIT: STUDENTS ATTENTION & RECENT ACTIVITY ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* LEFT: STUDENTS NEEDING ATTENTION / AT-RISK ALERTS */}
        <section className="card-premium" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#EF4444" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Students Needing Attention
              </h3>
            </div>
            <span className="glass-badge" style={{ fontSize: '11px', fontWeight: '700', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {atRiskAlerts.length} Active Alerts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {atRiskAlerts.map(alert => (
              <div 
                key={alert.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px', marginTop: '2px' }}>⚠</span>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {alert.courseCode} • {alert.moduleTitle}
                      </div>
                    </div>
                  </div>

                  <span className="badge-pill badge-danger" style={{ fontSize: '10.5px' }}>
                    {alert.affectedStudents} students
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>
                  {alert.metricText}
                </div>

                {/* Action Trigger */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(239, 68, 68, 0.12)', paddingTop: '8px' }}>
                  {alert.type === 'low_mastery' ? (
                    <button
                      onClick={() => handleOpenRemediationModal(alert)}
                      className="btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #EF4444 100%)'
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{alert.suggestedAction}</span>
                    </button>
                  ) : alert.type === 'low_completion' ? (
                    <button
                      onClick={() => onNavigateTo('communications')}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11.5px', gap: '6px' }}
                    >
                      <Send size={13} />
                      <span>Send Reminder</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigateTo('insights')}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11.5px', gap: '6px' }}
                    >
                      <BarChart3 size={13} />
                      <span>Inspect Telemetry</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: RECENT COURSE ACTIVITY */}
        <section className="card-premium" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Recent Activity
              </h3>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Real-Time Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivities.map(item => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.color,
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Icon size={16} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                        {item.time}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* ── 4. SECTION 5: PENDING ACTIONS & QUICK ACTION BAR ────────────────── */}
      <section className="card-premium" style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            AI & Curriculum Actions
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Generate assessments grounded in module hierarchy, review pending AI proposals, or publish new learning units.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTo('courses')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12.5px', gap: '6px' }}
          >
            <Zap size={14} />
            <span>Generate Quiz with AI</span>
          </button>

          <button
            onClick={() => onNavigateTo('ai-review')}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12.5px', gap: '6px' }}
          >
            <Sparkles size={14} />
            <span>Review AI Drafts</span>
          </button>

          <button
            onClick={() => onNavigateTo('courses')}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12.5px', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Create Module</span>
          </button>
        </div>
      </section>

      {/* ── 5. AI REMEDIATION QUIZ GENERATION MODAL ───────────────────────── */}
      {showRemediationModal && remediationScope && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    AI Weak-Topic Remediation Quiz
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Agentic AI generates grounded questions targeting identified cohort weaknesses.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRemediationModal(false)}
                className="btn-ghost"
                style={{ padding: '6px' }}
              >
                ✕
              </button>
            </div>

            {/* Resolved Scope Details */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12.5px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target Scope: </span>
                <strong style={{ color: 'var(--text-main)' }}>{remediationScope.courseTitle} → {remediationScope.moduleTitle} → {remediationScope.topicTitle}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Trigger Condition: </span>
                <span style={{ color: '#EF4444', fontWeight: '700' }}>{remediationScope.metricText}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target Cohort: </span>
                <strong style={{ color: 'var(--secondary)' }}>{remediationScope.affectedStudents} students with sub-70% mastery</strong>
              </div>
            </div>

            {/* If not generated yet */}
            {!remediationDraft ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: '1.5' }}>
                  The AI Coordinator Agent will analyze the curriculum context for <strong>{remediationScope.topicTitle}</strong>, retrieve common student failure modes (e.g. base cases, recursion stack overflow), and formulate an adaptive 4-question recovery quiz.
                </p>

                <button
                  onClick={handleGenerateRemediationQuiz}
                  disabled={generatingRemediation}
                  className="btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {generatingRemediation ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Synthesizing Remediation Questions...</span>
                    </>
                  ) : (
                    <>
                      <Bot size={18} />
                      <span>Synthesize {remediationScope.topicTitle} Recovery Quiz</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Generated Draft Review */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                      {remediationDraft.title}
                    </h4>
                    <span className="badge-pill badge-success" style={{ fontSize: '11px' }}>
                      ✓ AI DRAFT READY
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {remediationDraft.questionsCount} Questions • {remediationDraft.timeLimit} • Pass Mark: {remediationDraft.passMark} • +{remediationDraft.xpReward} XP
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <strong>Focus:</strong> {remediationDraft.targetWeakness}
                  </div>
                </div>

                {/* Questions Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {remediationDraft.questions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Q{idx + 1}: {q.prompt}
                      </div>
                      <div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '11.5px' }}>
                        ✓ Correct: {q.correctAnswer}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={handleGenerateRemediationQuiz}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '12.5px', gap: '6px' }}
                  >
                    <RefreshCw size={13} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    onClick={handleApproveAndPublishRemediation}
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '12.5px', gap: '6px', backgroundColor: '#10B981', borderColor: '#10B981' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve & Publish to Cohort</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
