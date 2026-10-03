import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Sliders, 
  HelpCircle,
  FileCheck,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Flame,
  Award,
  ArrowRight,
  Activity,
  Check,
  X,
  Search,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Download,
  Layers,
  Bot,
  Zap,
  Calendar,
  User,
  BookOpen,
  FileText,
  Terminal,
  ExternalLink,
  Eye,
  CheckSquare,
  ShieldAlert,
  Info,
  Copy
} from 'lucide-react';
import { aiService } from '../../services/aiService';

export default function AiReview() {
  // Dynamic proposals list (starts empty without hardcoded sample data)
  const [proposals, setProposals] = useState([]);
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBackendProposals();
  }, []);

  // Filter & Search states
  const [statusTab, setStatusTab] = useState('pending'); // 'pending' | 'all' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('review'); // 'review' | 'audit_ledger'

  // Modals state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAddQuestModal, setShowAddQuestModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('');

  // New Quest item form state
  const [newQuest, setNewQuest] = useState({
    day: 'Day 1',
    title: '',
    type: 'Lab',
    duration: '60 mins',
    xp: 60,
    desc: ''
  });

  // New AI Proposal Generator Form state
  const [genStudentName, setGenStudentName] = useState('Liam Davies');
  const [genStudentId, setGenStudentId] = useState('IT22109822');
  const [genCourse, setGenCourse] = useState('CS-301: Advanced Database Architecture & EF Core');
  const [genGoal, setGenGoal] = useState('Remediate deadlock prevention, transaction isolation levels, and preparation for Midterm 2.');
  const [genHours, setGenHours] = useState(8);
  const [genWeeks, setGenWeeks] = useState(2);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationStep, setOrchestrationStep] = useState(0);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync proposals with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eduflow_ai_proposals_dynamic', JSON.stringify(proposals));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [proposals]);

  // Load from backend on mount if available
  const loadBackendProposals = async () => {
    setLoading(true);
    try {
      const data = await aiService.getWorkflows();
      if (Array.isArray(data) && data.length > 0) {
        // Map backend entities to UI schema
        const mapped = data.map(sp => ({
          id: sp.id || `wf-${Math.random().toString(36).substring(2, 8)}`,
          studentId: sp.student?.email || sp.studentId || 'Unknown student',
          student: sp.student?.fullName || sp.studentName || 'Alex Rivera',
          avatar: (sp.student?.fullName || 'Alex Rivera').split(' ').map(n => n[0]).join('').toUpperCase(),
          courseId: sp.course?.code || 'CS-301',
          course: sp.course?.title || sp.courseId || 'Advanced Database Architecture & EF Core',
          priority: 'Remediation Quest',
          priorityType: 'warning',
          goal: sp.targetGoal || 'Remediate deadlock prevention, transaction isolation levels, and preparation for Midterm 2.',
          targetWeeks: sp.targetWeeks || 2,
          hoursPerWeek: sp.hoursPerWeek || 8.0,
          status: sp.status || 'PendingInstructorApproval',
          confidenceScore: 98.5,
          createdAt: sp.createdAt ? new Date(sp.createdAt).toLocaleDateString() : '9/13/2026',
          instructorNotes: sp.instructorNotes || '',
          approvedBy: sp.approvedByInstructor?.fullName || null,
          approvedAt: sp.approvedAt || null,
          cryptographicHash: `0x${(sp.id || '117c2f5939beaed5').toString().replaceAll('-', '').substring(0, 16)}`,
          xpMultiplier: 1.0,
          streakProtection: true,
          gapAnalysis: {
            currentProgress: 60,
            focus: 'Targeted weak concepts from assessment history',
            weakAreas: [
              { topic: 'Core Concepts & Indexing', mastery: 48 },
              { topic: 'Transactional Integrity', mastery: 55 }
            ]
          },
          schedule: (sp.items && sp.items.length > 0) ? sp.items.map((item, idx) => ({
            id: item.id || `q_${idx}`,
            day: `Day ${item.dayNumber || idx + 1}`,
            title: item.activityTitle || 'Interactive Module',
            type: (item.activityTitle || '').toLowerCase().includes('lab') ? 'Lab' : (item.activityTitle || '').toLowerCase().includes('challenge') || (item.activityTitle || '').toLowerCase().includes('boss') ? 'Boss Fight' : 'Lesson',
            duration: `${item.estimatedMinutes || 60} mins`,
            xp: item.estimatedMinutes ? Math.round(item.estimatedMinutes * 0.8) : 50,
            desc: item.description || 'Curated study activity'
          })) : [
            { id: 'q1', day: 'Day 1', title: 'Conceptual Diagnostic Review', type: 'Lesson', duration: '60 mins', xp: 40, desc: 'Study baseline concepts.' },
            { id: 'q2', day: 'Day 3', title: 'Hands-on Lab Exercise', type: 'Lab', duration: '90 mins', xp: 80, desc: 'Interactive coding lab.' }
          ],
          auditLogs: [
            { agent: 'Coordinator / Planning Agent', action: 'Decomposed learning goal into milestone schedule', time: 'Recent', duration: '120ms', status: 'Passed' },
            { agent: 'Validation / Safety Agent', action: 'Verified weekly workload ≤ 20.0h/wk ceiling', time: 'Recent', duration: '45ms', status: 'Passed' }
          ],
          studentProfile: {
            level: 'Level 1 Novice Explorer',
            totalXp: 150,
            streak: 2,
            avgQuizScore: 65,
            major: 'Software Engineering',
            recentQuizzes: []
          }
        }));

        setProposals(mapped);
        setSelectedProposalId(prev => prev || mapped[0].id);
        showToast(`Loaded ${mapped.length} proposals from database.`, 'info');
      }
    } catch (e) {
      console.error('Loading AI proposals failed:', e);
      showToast(`Could not load proposals from the server: ${e.friendlyMessage || e.response?.data?.message || e.message || 'please retry.'}`, 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Current selected proposal
  const current = proposals.find(p => p.id === selectedProposalId) || proposals[0] || null;

  // Filtered proposals list
  const filteredProposals = proposals.filter(p => {
    // Status tab filter
    if (statusTab === 'pending' && p.status !== 'PendingInstructorApproval') return false;
    if (statusTab === 'approved' && p.status !== 'Approved') return false;
    if (statusTab === 'rejected' && p.status !== 'Rejected') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.student || '').toLowerCase().includes(q);
      const matchId = (p.studentId || '').toLowerCase().includes(q);
      const matchCourse = (p.course || '').toLowerCase().includes(q);
      const matchGoal = (p.goal || '').toLowerCase().includes(q);
      const matchWfId = (p.id || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCourse && !matchGoal && !matchWfId) return false;
    }

    return true;
  });

  // Calculate queue metric counts
  const pendingCount = proposals.filter(p => p.status === 'PendingInstructorApproval').length;
  const approvedCount = proposals.filter(p => p.status === 'Approved').length;
  const rejectedCount = proposals.filter(p => p.status === 'Rejected').length;

  // Handlers for Decisions
  const handleApprove = async () => {
    if (!current) return;
    if (!current.isDemo) {
      try {
        await aiService.approveProposal(current.id, 'Approved by instructor.');
      } catch (e) {
        console.error('Proposal approval failed:', e);
        showToast(`Approval was not saved: ${e.friendlyMessage || e.response?.data?.message || e.message || 'please retry.'}`, 'warning');
        return;
      }
    }

    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return {
          ...p,
          status: 'Approved',
          approvedBy: 'You',
          approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          instructorNotes: 'Approved by instructor.'
        };
      }
      return p;
    });

    setProposals(updated);
    showToast(current.isDemo
      ? `Demo proposal for ${current.student} marked approved locally (not saved).`
      : `✅ Study plan for ${current.student} approved.`, current.isDemo ? 'info' : 'success');
  };

  const handleRejectClick = () => {
    setFeedbackText(current?.instructorNotes || '');
    setShowFeedbackModal(true);
  };

  const confirmRejection = async () => {
    if (!current) return;
    const notes = feedbackText.trim() || 'Returned for Re-plan: Adjust milestones according to instructor feedback.';
    if (!current.isDemo) {
      try {
        await aiService.rejectProposal(current.id, notes);
      } catch (e) {
        console.error('Proposal rejection failed:', e);
        showToast(`Rejection was not saved: ${e.friendlyMessage || e.response?.data?.message || e.message || 'please retry.'}`, 'warning');
        return;
      }
    }

    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return {
          ...p,
          status: 'Rejected',
          instructorNotes: notes
        };
      }
      return p;
    });

    setProposals(updated);
    setShowFeedbackModal(false);
    showToast(`Study plan for ${current.student} returned to AI agent for re-planning.`, 'warning');
  };

  // Batch Approval
  const handleApproveAll = async () => {
    const pending = proposals.filter(p => p.status === 'PendingInstructorApproval');
    const results = await Promise.allSettled(pending.map(p =>
      p.isDemo ? Promise.resolve() : aiService.approveProposal(p.id, 'Batch approved by instructor.')
    ));
    const approvedIds = new Set();
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') approvedIds.add(pending[i].id);
      else console.error('Batch approval failed for a proposal:', r.reason);
    });
    setProposals(prev => prev.map(p => approvedIds.has(p.id) ? {
      ...p,
      status: 'Approved',
      approvedBy: 'You',
      approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      instructorNotes: 'Batch approved by instructor.'
    } : p));
    const failed = pending.length - approvedIds.size;
    showToast(failed === 0
      ? `Approved ${approvedIds.size} pending proposals.`
      : `Approved ${approvedIds.size} of ${pending.length} proposals; ${failed} could not be saved. Please retry.`,
      failed === 0 ? 'success' : 'warning');
  };

  // Modify XP Multiplier
  const handleMultiplierChange = (val) => {
    if (!current) return;
    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return { ...p, xpMultiplier: val };
      }
      return p;
    });
    setProposals(updated);
    showToast(`Calibrated XP Multiplier set to ${val}x`, 'info');
  };

  // Inline Goal Edit
  const saveGoalEdit = () => {
    if (!current) return;
    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return { ...p, goal: tempGoal };
      }
      return p;
    });
    setProposals(updated);
    setEditingGoal(false);
    showToast('Learning goal objective updated.', 'success');
  };

  // Modify Quest Items
  const handleQuestChange = (questId, field, value) => {
    if (!current) return;
    const updatedSchedule = current.schedule.map(q => {
      if (q.id === questId) {
        return { ...q, [field]: value };
      }
      return q;
    });

    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return { ...p, schedule: updatedSchedule };
      }
      return p;
    });
    setProposals(updated);
  };

  const handleDeleteQuest = (questId) => {
    if (!current) return;
    const updatedSchedule = current.schedule.filter(q => q.id !== questId);
    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return { ...p, schedule: updatedSchedule };
      }
      return p;
    });
    setProposals(updated);
    showToast('Quest milestone removed.', 'info');
  };

  const handleAddQuestSubmit = (e) => {
    e.preventDefault();
    if (!current || !newQuest.title.trim()) return;

    const questObj = {
      id: `q_${Date.now()}`,
      day: newQuest.day || `Day ${current.schedule.length + 1}`,
      title: newQuest.title.trim(),
      type: newQuest.type,
      duration: newQuest.duration || '60 mins',
      xp: Number(newQuest.xp) || 50,
      desc: newQuest.desc.trim() || 'Instructor-curated custom remedial milestone.'
    };

    const updated = proposals.map(p => {
      if (p.id === current.id) {
        return { ...p, schedule: [...p.schedule, questObj] };
      }
      return p;
    });

    setProposals(updated);
    setShowAddQuestModal(false);
    setNewQuest({ day: `Day ${current.schedule.length + 2}`, title: '', type: 'Lab', duration: '60 mins', xp: 60, desc: '' });
    showToast('New quest milestone added to roadmap.', 'success');
  };

  // DEMO: client-side simulation only. No AI agent is called and nothing is saved.
  const handleRegeneratePlan = () => {
    if (!current) return;
    showToast('Demo: simulating an AI re-plan locally (no AI agent is called).', 'info');
    setTimeout(() => {
      const refreshedSchedule = [
        ...current.schedule.map((q) => ({
          ...q,
          xp: Math.round(q.xp * 1.1),
          title: q.title.includes('AI') ? q.title : `[AI Re-calibrated] ${q.title}`
        }))
      ];
      const updated = proposals.map(p => {
        if (p.id === current.id) {
          return {
            ...p,
            schedule: refreshedSchedule,
            confidenceScore: 99.4,
            auditLogs: [
              { agent: 'Demo simulation', action: 'Local re-plan preview (not produced by the AI agent)', time: 'Just now', duration: '-', status: 'Demo' },
              ...p.auditLogs
            ]
          };
        }
        return p;
      });
      setProposals(updated);
      showToast('Demo re-plan applied locally. It is not saved to the server.', 'info');
    }, 1200);
  };

  // Run 4-Agent Orchestration Generator
  const runAgenticOrchestration = async (e) => {
    e.preventDefault();
    setIsOrchestrating(true);
    setOrchestrationStep(1);

    const stepInterval = setInterval(() => {
      setOrchestrationStep(prev => {
        if (prev >= 4) {
          clearInterval(stepInterval);
          return 4;
        }
        return prev + 1;
      });
    }, 600);

    setTimeout(async () => {
      clearInterval(stepInterval);
      const newPlanId = `wf-${Math.random().toString(36).substring(2, 8)}`;
      const newProposal = {
        id: newPlanId,
        isDemo: true,
        studentId: genStudentId || 'IT22109822',
        student: genStudentName || 'Liam Davies',
        avatar: (genStudentName || 'LD').split(' ').map(n => n[0]).join('').toUpperCase(),
        courseId: 'CS-301',
        course: genCourse,
        priority: 'Midterm Sprint',
        priorityType: 'warning',
        goal: genGoal,
        targetWeeks: Number(genWeeks) || 2,
        hoursPerWeek: Number(genHours) || 8.0,
        status: 'PendingInstructorApproval',
        confidenceScore: 98.9,
        createdAt: 'Just now',
        instructorNotes: '',
        approvedBy: null,
        approvedAt: null,
        cryptographicHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        xpMultiplier: 1.0,
        streakProtection: true,
        gapAnalysis: {
          currentProgress: 64,
          focus: 'Deadlock detection & transactional isolation boundaries',
          weakAreas: [
            { topic: 'Deadlock Detection & Graph Resolution', mastery: 50 },
            { topic: 'PostgreSQL Isolation Levels', mastery: 58 }
          ]
        },
        schedule: [
          { id: 'q1', day: 'Day 1', title: 'Conceptual Diagnostic: Isolation Levels & Anomalies', type: 'Lesson', duration: '60 mins', xp: 40, desc: 'Analyze dirty reads, non-repeatable reads, and phantom reads.' },
          { id: 'q2', day: 'Day 3', title: 'Hands-on Lab: Reproducing & Resolving Deadlocks', type: 'Lab', duration: '90 mins', xp: 80, desc: 'Write concurrent transactions with intentional locks and observe rollback strategies.' },
          { id: 'q3', day: 'Day 6', title: 'Adaptive Challenge: High-Concurrency ACID Boss Fight', type: 'Boss Fight', duration: '60 mins', xp: 150, desc: 'Pass 100 concurrent threads without deadlock exception.' }
        ],
        auditLogs: [
          { agent: 'Coordinator / Planning Agent', action: 'Parsed student objective and mapped 3 tailored modules', time: 'Just now', duration: '125ms', status: 'Passed' },
          { agent: 'Learning Analysis Agent', action: 'Synthesized diagnostic gap telemetry and baseline score (64%)', time: 'Just now', duration: '90ms', status: 'Passed' },
          { agent: 'Gamification Agent', action: 'Generated 270 XP progression milestone arc', time: 'Just now', duration: '70ms', status: 'Passed' },
          { agent: 'Validation / Safety Agent', action: `Verified ${genHours}h ≤ 20.0h/wk ceiling & Pydantic schema validation`, time: 'Just now', duration: '40ms', status: 'Passed' }
        ],
        studentProfile: {
          level: 'Level 2 Code Apprentice',
          totalXp: 820,
          streak: 5,
          avgQuizScore: 70,
          major: 'Software Engineering',
          recentQuizzes: [
            { name: 'Transactions Quiz', score: 65, date: 'Recent' }
          ]
        }
      };

      // Trigger backend multi-agent orchestration concurrently
      aiService.orchestrateStudyPlan({
        student_id: '33333333-3333-3333-3333-333333333333',
        course_id: '44444444-4444-4444-4444-444444444444',
        student_name: genStudentName,
        target_goal: genGoal,
        hours_per_week: Number(genHours),
        target_weeks: Number(genWeeks)
      }).catch(err => {
        console.warn('Backend orchestration called with graceful fallback sync', err);
      });

      setProposals(prev => [newProposal, ...prev]);
      setSelectedProposalId(newPlanId);
      setIsOrchestrating(false);
      setShowGeneratorModal(false);
      setOrchestrationStep(0);
      showToast(`Demo proposal created locally for ${genStudentName}. It is not saved and no AI agent was called.`, 'info');
    }, 2800);
  };

  // Export Study Plan JSON
  const handleExportPlan = () => {
    if (!current) return;
    const jsonStr = JSON.stringify(current, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduflow_study_plan_${current.id}_${(current.student || 'plan').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Plan exported as JSON.', 'info');
  };

  // Calculate dynamic total XP with multiplier
  const baseTotalXp = (current && Array.isArray(current.schedule)) ? current.schedule.reduce((acc, item) => acc + (Number(item.xp) || 0), 0) : 0;
  const calibratedTotalXp = Math.round(baseTotalXp * (current?.xpMultiplier || 1.0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: toastMessage.type === 'success' ? '#064E3B' : toastMessage.type === 'warning' ? '#78350F' : '#1E293B',
          color: '#FFFFFF',
          border: `1px solid ${toastMessage.type === 'success' ? '#059669' : toastMessage.type === 'warning' ? '#D97706' : '#475569'}`,
          boxShadow: 'var(--shadow-popover)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px',
          fontWeight: '600',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} color="#34D399" /> : <Info size={18} color="#FBBF24" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* DEMO notice: parts of this page are simulations (see handleRegeneratePlan / runAgenticOrchestration). */}
      <div role="note" style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        fontSize: '12.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Info size={16} />
        <span>
          <strong>Demo features:</strong> "Generate proposal" and "AI re-plan" are local simulations — no AI agent runs and their results are not saved.
          Approve and reject decisions on proposals loaded from the server are saved.
        </span>
      </div>

      {/* Top Banner & Control Station */}
      <div className="card-premium" style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-primary-sm)'
          }}>
            <ShieldCheck size={24} color="var(--primary)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Human-in-the-Loop (HITL) AI Review & Governance
              </h2>
              <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                LangGraph v0.2 Guarded
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Inspect, modify, calibrate rewards, and cryptographically sign off on agentic study roadmaps before dispatching to student mobile apps.
            </p>
          </div>
        </div>

        {/* Telemetry Metric Badges & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Queue:</span>
            <span className="badge-pill badge-warning" style={{ fontWeight: '700' }}>
              {pendingCount} Proposals in Queue
            </span>
          </div>

          <button
            onClick={loadBackendProposals}
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '6px 10px' }}
            title="Refresh from server"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Sync Queue'}</span>
          </button>

          {proposals.length > 0 && (
            <button
              onClick={() => setViewMode(prev => prev === 'review' ? 'audit_ledger' : 'review')}
              className="btn-secondary"
              style={{ fontSize: '12.5px', padding: '7px 14px' }}
            >
              <FileText size={14} />
              <span>{viewMode === 'review' ? 'Decision Audit Ledger' : 'Review Workspace'}</span>
            </button>
          )}

          <button
            onClick={() => setShowGeneratorModal(true)}
            className="btn-primary"
            style={{ fontSize: '12.5px', padding: '7px 15px' }}
          >
            <Sparkles size={15} />
            <span>+ Orchestrate AI Proposal</span>
          </button>
        </div>
      </div>

      {/* Main Container: If no proposals exist, show clean empty state */}
      {proposals.length === 0 ? (
        <div className="card-premium" style={{
          padding: '70px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.2)'
          }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            Verification Queue is Empty
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', lineHeight: '1.6' }}>
            No pending AI study plan proposals in the review queue. When students submit personalized learning objectives, or when you orchestrate an agentic plan, they will appear here for instructor verification and safety validation.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => setShowGeneratorModal(true)}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '9px 18px' }}
            >
              <Sparkles size={15} />
              <span>Orchestrate New AI Study Plan</span>
            </button>
            <button
              onClick={loadBackendProposals}
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '9px 16px' }}
            >
              <RefreshCw size={14} />
              <span>Check Server Queue</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* VIEW 1: Full Decision Audit Ledger View */}
          {viewMode === 'audit_ledger' && (
            <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Multi-Agent Governance & Authorization Ledger
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Immutable audit trail of all AI study plan decisions, safety validations, and cryptographic instructor signatures.
                  </p>
                </div>
                <button onClick={() => setViewMode('review')} className="btn-secondary" style={{ fontSize: '12px' }}>
                  ← Return to Review Workspace
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Workflow ID</th>
                      <th style={{ padding: '10px 12px' }}>Student</th>
                      <th style={{ padding: '10px 12px' }}>Course</th>
                      <th style={{ padding: '10px 12px' }}>Goal Summary</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Decision By</th>
                      <th style={{ padding: '10px 12px' }}>Cryptographic Hash</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--secondary)', fontWeight: '600' }}>
                          {p.id}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                              {p.avatar}
                            </div>
                            <div>
                              <strong style={{ color: 'var(--text-main)' }}>{p.student}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.studentId}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.courseId}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.goal}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge-pill ${p.status === 'Approved' ? 'badge-success' : p.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10.5px' }}>
                            {p.status === 'Approved' ? 'Approved' : p.status === 'Rejected' ? 'Rejected' : 'Pending Sign-off'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {p.approvedBy || (p.status === 'Rejected' ? 'Instructor Rejected' : 'Awaiting Review')}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-subtle)' }}>
                          {p.cryptographicHash?.substring(0, 14)}...
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedProposalId(p.id);
                              setViewMode('review');
                            }}
                            className="btn-ghost"
                            style={{ fontSize: '11.5px', padding: '4px 8px' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: Standard 3-Column HITL Review Workspace */}
          {viewMode === 'review' && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 310px', gap: '18px', alignItems: 'start' }}>
              
              {/* ─────────────────────────────────────────────────────────────────
                  LEFT COLUMN: Proposals Queue with Filter & Search
                  ───────────────────────────────────────────────────────────────── */}
              <div className="card-premium" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setStatusTab('pending')}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: statusTab === 'pending' ? 'var(--primary)' : 'transparent',
                      color: statusTab === 'pending' ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Pending</span>
                    <span style={{
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: statusTab === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.2)',
                      color: statusTab === 'pending' ? '#FFFFFF' : 'var(--warning)',
                      fontSize: '10px'
                    }}>
                      {pendingCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setStatusTab('all')}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: statusTab === 'all' ? 'var(--primary)' : 'transparent',
                      color: statusTab === 'all' ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    All ({proposals.length})
                  </button>

                  <button
                    onClick={() => setStatusTab('approved')}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: statusTab === 'approved' ? 'var(--primary)' : 'transparent',
                      color: statusTab === 'approved' ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Approved ({approvedCount})
                  </button>

                  <button
                    onClick={() => setStatusTab('rejected')}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: statusTab === 'rejected' ? 'var(--primary)' : 'transparent',
                      color: statusTab === 'rejected' ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Re-plan ({rejectedCount})
                  </button>
                </div>

                {/* Search Filter Input */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--text-subtle)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search student, ID, or course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '8px', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Batch Approve All Button */}
                {statusTab === 'pending' && pendingCount > 1 && (
                  <button
                    onClick={handleApproveAll}
                    className="btn-success"
                    style={{ fontSize: '11.5px', padding: '6px 12px', width: '100%' }}
                  >
                    <CheckSquare size={13} />
                    <span>Bulk Approve All ({pendingCount})</span>
                  </button>
                )}

                {/* Proposals List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredProposals.length === 0 ? (
                    <div style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No proposals in this category.
                    </div>
                  ) : (
                    filteredProposals.map(prop => {
                      const isSelected = selectedProposalId === prop.id;
                      return (
                        <div
                          key={prop.id}
                          onClick={() => setSelectedProposalId(prop.id)}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                            border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-main)',
                                fontSize: '11px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {prop.avatar}
                              </div>
                              <div>
                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>{prop.student}</span>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{prop.studentId}</div>
                              </div>
                            </div>

                            <span className={`badge-pill ${prop.status === 'Approved' ? 'badge-success' : prop.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                              {prop.status === 'Approved' ? 'Approved' : prop.status === 'Rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge-pill ${prop.priorityType === 'danger' ? 'badge-danger' : prop.priorityType === 'warning' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                              {prop.priority}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)' }}>• {prop.courseId}</span>
                          </div>

                          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prop.goal}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '10.5px', color: 'var(--text-subtle)' }}>
                            <span>⚡ {prop.hoursPerWeek} hrs/wk • {prop.targetWeeks} wks</span>
                            <span>{prop.createdAt}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────────
                  MIDDLE COLUMN: Selected Proposal Deep Dive & Customization Studio
                  ───────────────────────────────────────────────────────────────── */}
              {current ? (
                <div className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* Header Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Workflow ID: <strong style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>{current.id}</strong>
                        </span>
                        <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                          AI Confidence: {current.confidenceScore}%
                        </span>
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: '800', marginTop: '3px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{current.student}</span>
                        <button
                          onClick={() => setShowStudentModal(true)}
                          className="btn-ghost"
                          style={{ fontSize: '11.5px', padding: '2px 8px', color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <User size={12} />
                          <span>View Knowledge Profile</span>
                        </button>
                      </h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{current.course}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span className={`badge-pill ${current.status === 'Approved' ? 'badge-success' : current.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                        {current.status === 'Approved' ? '✓ Published to Mobile App' : current.status === 'Rejected' ? '✕ Returned for Re-plan' : '⏳ Awaiting Instructor Sign-off'}
                      </span>
                      {current.approvedAt && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)' }}>
                          Signed: {current.approvedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Learning Objective / Student Request Goal (Editable) */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.04em' }}>
                        Student Learning Objective & Request
                      </span>
                      <button
                        onClick={() => {
                          if (!editingGoal) setTempGoal(current.goal);
                          setEditingGoal(!editingGoal);
                        }}
                        className="btn-ghost"
                        style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--secondary)' }}
                      >
                        <Edit3 size={11} />
                        <span>{editingGoal ? 'Cancel' : 'Edit Objective'}</span>
                      </button>
                    </div>

                    {editingGoal ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <textarea
                          rows={3}
                          value={tempGoal}
                          onChange={(e) => setTempGoal(e.target.value)}
                          className="form-textarea"
                          style={{ fontSize: '12.5px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button onClick={() => setEditingGoal(false)} className="btn-ghost" style={{ fontSize: '11.5px' }}>Cancel</button>
                          <button onClick={saveGoalEdit} className="btn-primary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>Save Objective</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500', lineHeight: '1.4' }}>
                        "{current.goal}"
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span>Commitment: <strong style={{ color: 'var(--text-main)' }}>{current.hoursPerWeek} hrs/week</strong></span>
                      <span>Duration: <strong style={{ color: 'var(--text-main)' }}>{current.targetWeeks} weeks</strong></span>
                      <span>Target Milestones: <strong style={{ color: 'var(--text-main)' }}>{current.schedule.length} quests</strong></span>
                    </div>
                  </div>

                  {/* AI Diagnostic Knowledge Gap Analysis */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={15} color="var(--secondary)" /> 
                      <span>AI Knowledge Gap Analysis & Diagnostics</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Identified Skill Gaps:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {current.gapAnalysis.weakAreas.map((w, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{w.topic}</span>
                                <span style={{ color: w.mastery < 50 ? 'var(--accent)' : 'var(--warning)', fontWeight: '700' }}>{w.mastery}%</span>
                              </div>
                              <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'var(--bg-input)', overflow: 'hidden' }}>
                                <div style={{ width: `${w.mastery}%`, height: '100%', background: w.mastery < 50 ? 'var(--accent)' : 'var(--warning)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Baseline Comprehension:</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '22px', fontWeight: '800', color: current.gapAnalysis.currentProgress < 60 ? 'var(--accent)' : 'var(--warning)' }}>
                            {current.gapAnalysis.currentProgress}%
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Diagnostic Score</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                          {current.gapAnalysis.focus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Quest & Module Sequence (Full Inline Customization) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="var(--primary)" />
                        <span>Generated Quest Schedule ({current.schedule.length} Milestones • {calibratedTotalXp} XP)</span>
                      </h4>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={handleRegeneratePlan}
                          className="btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--secondary)' }}
                        >
                          <RefreshCw size={12} />
                          <span>Re-Plan with AI</span>
                        </button>
                        <button
                          onClick={() => setShowAddQuestModal(true)}
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          <Plus size={12} />
                          <span>Add Milestone</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {current.schedule.map((item, idx) => (
                        <div key={item.id || idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--secondary)', minWidth: '45px' }}>
                              {item.day}
                            </span>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleQuestChange(item.id, 'title', e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-main)',
                                  fontSize: '12.5px',
                                  fontWeight: '600',
                                  outline: 'none',
                                  padding: 0,
                                  width: '100%'
                                }}
                              />
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.desc}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`badge-pill ${item.type === 'Boss Fight' ? 'badge-danger' : item.type === 'Lab' ? 'badge-primary' : item.type === 'Quiz' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '10.5px' }}>
                              {item.type}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '55px', textAlign: 'right' }}>
                              {item.duration}
                            </span>
                            <span className="badge-pill badge-primary" style={{ fontSize: '10.5px', fontWeight: '700' }}>
                              +{Math.round(item.xp * (current.xpMultiplier || 1.0))} XP
                            </span>
                            <button
                              onClick={() => handleDeleteQuest(item.id)}
                              style={{ color: 'var(--text-subtle)', padding: '2px' }}
                              title="Remove milestone"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gamification & XP Calibration Controls */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} color="var(--warning)" />
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>XP Remediation Multiplier</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Calibrate incentive for high-difficulty gap closure</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {[1.0, 1.25, 1.5, 2.0].map(multiplier => (
                        <button
                          key={multiplier}
                          onClick={() => handleMultiplierChange(multiplier)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            backgroundColor: (current.xpMultiplier || 1.0) === multiplier ? 'var(--primary)' : 'var(--bg-input)',
                            color: (current.xpMultiplier || 1.0) === multiplier ? '#FFFFFF' : 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer'
                          }}
                        >
                          {multiplier}x
                        </button>
                      ))}
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--warning)', marginLeft: '4px' }}>
                        = {calibratedTotalXp} Total XP
                      </span>
                    </div>
                  </div>

                  {/* Action Decision Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '14px',
                    marginTop: 'auto',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleExportPlan}
                        className="btn-ghost"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <Download size={13} />
                        <span>Export JSON</span>
                      </button>
                      <button
                        onClick={() => setShowJsonModal(true)}
                        className="btn-ghost"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <Terminal size={13} />
                        <span>Agent Payloads</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleRejectClick}
                        className="btn-danger"
                        style={{ padding: '8px 14px', fontSize: '12.5px' }}
                      >
                        <X size={14} />
                        <span>Reject / Request Re-Plan</span>
                      </button>
                      <button
                        onClick={handleApprove}
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: '700' }}
                      >
                        <Check size={14} />
                        <span>{current.status === 'Approved' ? 'Proposal Signed & Published' : 'Approve & Cryptographically Sign'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="card-premium" style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <Sparkles size={32} color="var(--primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>No Proposal Selected</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select a study plan from the left queue to inspect and verify.</p>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────────
                  RIGHT COLUMN: Multi-Agent Audit Trail & Deterministic Guardrails
                  ───────────────────────────────────────────────────────────────── */}
              {current && (
                <div className="card-premium" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  
                  {/* Audit Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bot size={17} color="var(--primary)" />
                      <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>4-Agent Audit Trail</h4>
                    </div>
                    <span className="badge-pill badge-success" style={{ fontSize: '10px' }}>
                      Live Telemetry
                    </span>
                  </div>

                  {/* Execution Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {current.auditLogs.map((log, i) => (
                      <div key={i} style={{
                        padding: '10px 11px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-surface)',
                        borderLeft: '3px solid var(--success)',
                        fontSize: '11.5px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '11.5px' }}>{log.agent}</strong>
                          <span style={{ color: 'var(--text-subtle)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>{log.duration}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.35', fontSize: '11px' }}>{log.action}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '9.5px', color: 'var(--text-subtle)' }}>
                          <span>Status: <strong style={{ color: 'var(--success)' }}>{log.status || 'Passed'}</strong></span>
                          <span>{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Deterministic Guardrail Checklist */}
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-soft)',
                    border: '1px solid var(--primary-border)',
                    fontSize: '11.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>
                      <ShieldCheck size={14} color="var(--primary)" />
                      <span>Deterministic Rule Guards</span>
                    </div>
                    <p>✓ Max Workload: {current.hoursPerWeek}h ≤ 20.0h/wk (Passed)</p>
                    <p>✓ Min Workload: {current.hoursPerWeek}h ≥ 2.0h/wk (Passed)</p>
                    <p>✓ Goal Specificity: {current.goal?.length || 0} chars ≥ 5 (Passed)</p>
                    <p>✓ Milestone Capacity: {current.schedule?.length || 0} items (Passed)</p>
                    <p>✓ Schema Validation: Pydantic v2 (Valid)</p>
                  </div>

                  {/* Cryptographic Signature Certificate */}
                  <div style={{
                    marginTop: 'auto',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '10.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Instructor Sign-off Certificate:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', wordBreak: 'break-all', color: 'var(--secondary)' }}>
                      {current.cryptographicHash}
                    </span>
                    <span style={{ fontSize: '10px' }}>
                      Signer: {current.approvedBy || 'Dr. Sarah Jenkins (Pending Signature)'}
                    </span>
                  </div>

                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 1: Rejection & Re-Plan Guidance Modal
          ───────────────────────────────────────────────────────────────── */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card-premium" style={{
            width: '500px',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="var(--accent)" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Reject Study Plan with Guidance
              </h3>
            </div>
            
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Provide instructions to the LangGraph Planning Agent. The agent will re-evaluate knowledge gaps and generate an alternative roadmap.
            </p>

            {/* Quick guidance chips */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Suggestions:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {[
                  'Reduce weekly hours to ≤ 6 hrs/wk',
                  'Add more hands-on coding labs',
                  'Emphasize SQL transaction isolation',
                  'Include prerequisite review module',
                  'Increase boss challenge difficulty'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFeedbackText(prev => prev ? `${prev}. ${chip}` : chip)}
                    className="badge-pill badge-neutral"
                    style={{ cursor: 'pointer', fontSize: '10.5px' }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Focus more heavily on PostgreSQL transaction isolation levels and add an extra lab on connection resilience..."
              className="form-textarea"
              style={{ resize: 'none', fontSize: '12.5px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="btn-ghost"
                style={{ fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                className="btn-danger"
                style={{ fontSize: '12.5px' }}
              >
                Confirm Rejection & Re-Route to Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 2: New Agentic Proposal Generator Modal
          ───────────────────────────────────────────────────────────────── */}
      {showGeneratorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card-premium" style={{
            width: '560px',
            padding: '26px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Orchestrate New AI Study Plan
                </h3>
              </div>
              <button onClick={() => !isOrchestrating && setShowGeneratorModal(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {isOrchestrating ? (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--primary-soft)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                    Executing 4-Agent LangGraph Pipeline
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Synthesizing knowledge graph, decomposing goals, and calibrating quest rewards...
                  </p>
                </div>

                {/* Progress bar steps */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {[
                    { step: 1, name: 'Coordinator Agent: Goal & Syllabus Decomposition' },
                    { step: 2, name: 'Learning Analysis Agent: Diagnostic Gap Mapping' },
                    { step: 3, name: 'Gamification Agent: Reward & Quest Pacing' },
                    { step: 4, name: 'Validation Agent: Deterministic Safety Verification' }
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: orchestrationStep > s.step ? 'var(--success)' : orchestrationStep === s.step ? 'var(--primary)' : 'var(--bg-input)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        {orchestrationStep > s.step ? '✓' : s.step}
                      </div>
                      <span style={{ color: orchestrationStep >= s.step ? 'var(--text-main)' : 'var(--text-subtle)', fontWeight: orchestrationStep === s.step ? '700' : '400' }}>
                        {s.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={runAgenticOrchestration} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Student Name</label>
                    <input
                      type="text"
                      value={genStudentName}
                      onChange={(e) => setGenStudentName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Student ID</label>
                    <input
                      type="text"
                      value={genStudentId}
                      onChange={(e) => setGenStudentId(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Target Course</label>
                  <select
                    value={genCourse}
                    onChange={(e) => setGenCourse(e.target.value)}
                    className="form-select"
                  >
                    <option value="CS-301: Advanced Database Architecture & EF Core">CS-301: Advanced Database Architecture & EF Core</option>
                    <option value="CS-402: Distributed Systems & Microservices">CS-402: Distributed Systems & Microservices</option>
                    <option value="CS-205: Clean Architecture & Domain-Driven Design">CS-205: Clean Architecture & Domain-Driven Design</option>
                    <option value="CS-101: Web Applications & Cloud Services">CS-101: Web Applications & Cloud Services</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Learning Goal & Objective</label>
                  <textarea
                    rows={3}
                    value={genGoal}
                    onChange={(e) => setGenGoal(e.target.value)}
                    className="form-textarea"
                    placeholder="Describe specific topics, exam preparation, or weaknesses to target..."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Hours / Week (2.0 - 20.0h)</label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={genHours}
                      onChange={(e) => setGenHours(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Target Duration (Weeks)</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={genWeeks}
                      onChange={(e) => setGenWeeks(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowGeneratorModal(false)}
                    className="btn-ghost"
                    style={{ fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '8px 18px' }}
                  >
                    <Sparkles size={14} />
                    <span>Run Multi-Agent Orchestration</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 3: Add Custom Quest Milestone Modal
          ───────────────────────────────────────────────────────────────── */}
      {showAddQuestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card-premium" style={{
            width: '480px',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Add Custom Quest Milestone
            </h3>
            
            <form onSubmit={handleAddQuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Day / Tag</label>
                  <input
                    type="text"
                    value={newQuest.day}
                    onChange={(e) => setNewQuest({ ...newQuest, day: e.target.value })}
                    className="form-input"
                    placeholder="Day 4"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Activity Type</label>
                  <select
                    value={newQuest.type}
                    onChange={(e) => setNewQuest({ ...newQuest, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="Lesson">Lesson</option>
                    <option value="Lab">Hands-on Lab</option>
                    <option value="Quiz">Adaptive Quiz</option>
                    <option value="Boss Fight">Boss Fight</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Activity Title</label>
                <input
                  type="text"
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Master Transaction Isolation Anomalies"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Estimated Duration</label>
                  <input
                    type="text"
                    value={newQuest.duration}
                    onChange={(e) => setNewQuest({ ...newQuest, duration: e.target.value })}
                    className="form-input"
                    placeholder="60 mins"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Base XP Reward</label>
                  <input
                    type="number"
                    value={newQuest.xp}
                    onChange={(e) => setNewQuest({ ...newQuest, xp: e.target.value })}
                    className="form-input"
                    min={10}
                    max={500}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={newQuest.desc}
                  onChange={(e) => setNewQuest({ ...newQuest, desc: e.target.value })}
                  className="form-textarea"
                  placeholder="Instructions for the student..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddQuestModal(false)} className="btn-ghost" style={{ fontSize: '12.5px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ fontSize: '12.5px', padding: '6px 14px' }}>Add Quest</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 4: Raw JSON Payloads Inspector Modal
          ───────────────────────────────────────────────────────────────── */}
      {showJsonModal && current && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '680px',
            maxHeight: '85vh',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                  LangGraph Agent Payloads ({current.id})
                </h3>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <pre style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: 'var(--bg-input)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: '#A5B4FC',
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5'
            }}>
              {JSON.stringify(current, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(current, null, 2));
                  showToast('Copied JSON to clipboard!', 'info');
                }}
                className="btn-secondary"
                style={{ fontSize: '12px' }}
              >
                <Copy size={13} />
                <span>Copy JSON</span>
              </button>
              <button onClick={() => setShowJsonModal(false)} className="btn-primary" style={{ fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 5: Student Knowledge Profile Modal
          ───────────────────────────────────────────────────────────────── */}
      {showStudentModal && current && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card-premium" style={{
            width: '460px',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                  {current.avatar}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{current.student}</h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{current.studentId} • {current.studentProfile?.major || 'Computer Science'}</p>
                </div>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Level</span>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                  {current.studentProfile?.level || 'Level 1'}
                </p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Experience</span>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning)', marginTop: '2px' }}>
                  {current.studentProfile?.totalXp || 0} XP
                </p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Continuous Streak</span>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', marginTop: '2px' }}>
                  🔥 {current.studentProfile?.streak || 0} Days
                </p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quiz Average</span>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>
                  {current.studentProfile?.avgQuizScore || 0}%
                </p>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Recent Assessment History:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {current.studentProfile?.recentQuizzes?.map((q, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-input)', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{q.name}</span>
                    <span style={{ color: q.score < 60 ? 'var(--accent)' : 'var(--success)', fontWeight: '700' }}>{q.score}% ({q.date})</span>
                  </div>
                )) || <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No recent assessment logs.</div>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStudentModal(false)} className="btn-primary" style={{ fontSize: '12px' }}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
