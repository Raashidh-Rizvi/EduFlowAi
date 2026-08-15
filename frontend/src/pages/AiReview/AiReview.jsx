import React, { useState } from 'react';
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
  UserCheck,
  Flame,
  Award
} from 'lucide-react';

export default function AiReview() {
  const [selectedProposalId, setSelectedProposalId] = useState('wf-78a9c2');
  const [decisions, setDecisions] = useState({
    'wf-78a9c2': null,
    'wf-12b4e9': null,
    'wf-99f1a0': null
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [calibratedXpMultiplier, setCalibratedXpMultiplier] = useState(1.0);

  const proposals = [
    {
      id: 'wf-78a9c2',
      student: 'Alex Rivera',
      studentId: 'IT22104500',
      avatar: 'AR',
      course: 'SE3090: Architecture & Frameworks',
      goal: 'Master Entity Framework Core indexing, transactions, and prepare for Midterm Quiz in 2 weeks (8 hrs/week).',
      targetWeeks: 2,
      hoursPerWeek: 8.0,
      createdAt: '12 minutes ago',
      gapAnalysis: {
        weakAreas: ['EF Core Transactions & Rollbacks', 'PostgreSQL Composite Indexes'],
        currentProgress: 35,
        focus: 'Focus on database consistency and transaction boundaries'
      },
      milestones: [
        { id: 1, title: 'Foundations & Relational Modeling', topics: ['PostgreSQL Schema Design', 'Foreign Keys', 'Indexes'], hours: 3.2 },
        { id: 2, title: 'Architecture & State Validation', topics: ['ASP.NET Core Controllers', 'EF Core Migrations', 'Agentic Workflows'], hours: 4.8 }
      ],
      schedule: [
        { day: 'Day 1-2', title: 'Review: PostgreSQL Relational Indexes & Schema Constraints', type: 'Lesson', duration: '90m', xp: '+40 XP' },
        { day: 'Day 3-4', title: 'Interactive Lab: EF Core Migrations & Foreign Key Cascades', type: 'Lab', duration: '120m', xp: '+60 XP' },
        { day: 'Day 5', title: 'Knowledge Check: Quiz 1 – Agentic AI & Clean Architecture', type: 'Quiz', duration: '45m', xp: '+50 XP' },
        { day: 'Day 6-7', title: 'Review & Boss Battle: Transactional ACID Boundaries', type: 'Boss Fight', duration: '60m', xp: '+150 XP' }
      ],
      auditLogs: [
        { agent: 'Planning Agent', action: 'Decomposed goal into 2 milestones across 2 weeks', time: '142ms', passed: true },
        { agent: 'Learning Analysis Agent', action: 'Evaluated quiz history; 2 knowledge gaps identified in indexing', time: '210ms', passed: true },
        { agent: 'Recommendation Agent', action: 'Generated 4 tailored adaptive quests with reward points', time: '195ms', passed: true },
        { agent: 'Validation Agent', action: 'Passed 5 deterministic checks: Schema, Hours cap, Safety rules', time: '65ms', passed: true }
      ]
    },
    {
      id: 'wf-12b4e9',
      student: 'Elena Rostova',
      studentId: 'IT22894102',
      avatar: 'ER',
      course: 'SE3090: Architecture & Frameworks',
      goal: 'Prepare for LangGraph Multi-Agent implementation & state graph routing.',
      targetWeeks: 1,
      hoursPerWeek: 6.0,
      createdAt: '35 minutes ago',
      gapAnalysis: {
        weakAreas: ['State Graph Cyclic Loops', 'Pydantic Schema Validation'],
        currentProgress: 52,
        focus: 'Strengthen deterministic guardrails and error interceptors'
      },
      milestones: [
        { id: 1, title: 'LangGraph State Reducers & Tool allow-listing', topics: ['StateGraph', 'MemorySaver', 'Deterministic Nodes'], hours: 6.0 }
      ],
      schedule: [
        { day: 'Day 1-3', title: 'Hands-on Lab: Constructing 4-Agent LangGraph Pipeline', type: 'Lab', duration: '150m', xp: '+80 XP' },
        { day: 'Day 4-5', title: 'Agentic Testing: Golden Test Case Suite with PyTest', type: 'Quiz', duration: '60m', xp: '+50 XP' }
      ],
      auditLogs: [
        { agent: 'Planning Agent', action: 'Decomposed 1 milestone for rapid 1-week sprint', time: '110ms', passed: true },
        { agent: 'Learning Analysis Agent', action: 'Analyzed prior assignment submissions; strong Python fundamentals', time: '160ms', passed: true },
        { agent: 'Recommendation Agent', action: 'Structured LangGraph hands-on code challenges', time: '180ms', passed: true },
        { agent: 'Validation Agent', action: 'Deterministic validation passed with 0 warnings', time: '55ms', passed: true }
      ]
    }
  ];

  const current = proposals.find(p => p.id === selectedProposalId) || proposals[0];
  const decision = decisions[current.id];

  const handleDecision = (type) => {
    if (type === 'rejected') {
      setShowFeedbackModal(true);
    } else {
      setDecisions(prev => ({ ...prev, [current.id]: 'approved' }));
    }
  };

  const confirmRejection = () => {
    setDecisions(prev => ({ ...prev, [current.id]: 'rejected' }));
    setShowFeedbackModal(false);
    setFeedbackText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid var(--border-accent)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
              Human-in-the-Loop (HITL) Safety Protocol Active
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No AI-generated study sequence or personalized challenge is published until cryptographically signed by an instructor.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: '700',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--warning)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            {proposals.filter(p => !decisions[p.id]).length} Proposals Awaiting Review
          </span>
        </div>
      </div>

      {/* Main Review Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '20px' }}>
        {/* Left Column: Proposals Queue */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Review Queue ({proposals.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposals.map(prop => {
              const isSelected = selectedProposalId === prop.id;
              const propDecision = decisions[prop.id];
              return (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProposalId(prop.id)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {prop.avatar}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{prop.student}</span>
                    </div>

                    {propDecision ? (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: propDecision === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                        color: propDecision === 'approved' ? 'var(--success)' : 'var(--accent)',
                        fontWeight: '700'
                      }}>
                        {propDecision === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: 'var(--warning)',
                        fontWeight: '700'
                      }}>
                        PENDING
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prop.goal}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-subtle)' }}>
                    <span>{prop.hoursPerWeek} hrs/wk</span>
                    <span>{prop.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column: Selected Proposal Detail */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                Workflow: {current.id}
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>
                {current.student} ({current.studentId})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{current.course}</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: decision === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: decision === 'approved' ? 'var(--success)' : 'var(--warning)',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {decision === 'approved' ? '✓ Approved & Live on Flutter App' : decision === 'rejected' ? '✗ Rejected & Returned to Agent' : 'Awaiting Review'}
              </span>
            </div>
          </div>

          {/* Stated Learning Goal */}
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)'
          }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: '700' }}>Student Request Goal</p>
            <p style={{ fontSize: '13.5px', color: 'var(--text-main)', marginTop: '4px', fontWeight: '500' }}>
              "{current.goal}"
            </p>
          </div>

          {/* Gap Analysis Summary */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} /> Knowledge Gap Diagnosis (Learning Analysis Agent)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Identified Knowledge Gaps:</span>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {current.gapAnalysis.weakAreas.map((w, i) => (
                    <span key={i} style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>• {w}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Baseline Readiness:</span>
                <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--warning)', marginTop: '2px' }}>{current.gapAnalysis.currentProgress}% Comprehension</p>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{current.gapAnalysis.focus}</p>
              </div>
            </div>
          </div>

          {/* Proposed 7-Day Action Plan */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>
              Generated Quest Sequence ({current.schedule.length} Activities)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {current.schedule.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.type === 'Boss Fight' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: item.type === 'Boss Fight' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--secondary)', width: '60px' }}>{item.day}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.duration}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: item.type === 'Boss Fight' ? 'var(--accent)' : 'var(--success)' }}>
                      {item.xp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            marginTop: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP Calibrator:</span>
              <button 
                onClick={() => setCalibratedXpMultiplier(prev => (prev === 1.0 ? 1.5 : 1.0))}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: calibratedXpMultiplier > 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: calibratedXpMultiplier > 1 ? 'var(--warning)' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: '700'
                }}
              >
                {calibratedXpMultiplier}x XP Boost
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleDecision('rejected')}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(244, 63, 94, 0.1)',
                  color: 'var(--accent)',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  border: '1px solid rgba(244, 63, 94, 0.25)'
                }}
              >
                Reject / Request Re-Plan
              </button>
              <button
                onClick={() => handleDecision('approved')}
                style={{
                  padding: '9px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                {decision === 'approved' ? '✓ Proposal Published' : 'Approve & Publish to Mobile'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 4-Agent Execution Audit & Verification */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--primary)" />
            <h4 style={{ fontSize: '14px', fontWeight: '700' }}>Multi-Agent Audit Trail</h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {current.auditLogs.map((log, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderLeft: '3px solid var(--success)',
                fontSize: '11.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{log.agent}</strong>
                  <span style={{ color: 'var(--text-subtle)', fontSize: '10px' }}>{log.time}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>{log.action}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 'auto',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid var(--border-accent)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <p><strong>Validation Agent Rules:</strong></p>
            <p>✓ Hours cap: {current.hoursPerWeek}h ≤ 40h</p>
            <p>✓ Goal specificity: Passed</p>
            <p>✓ Schema format: Pydantic v2 valid</p>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            width: '450px',
            padding: '24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent)' }}>
              Reject AI Proposal with Instructor Guidance
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Provide constructive feedback to the LangGraph orchestration engine to re-generate the schedule.
            </p>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Include more coding challenges on transaction rollback mechanisms..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '12.5px',
                outline: 'none',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowFeedbackModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Confirm Rejection & Re-Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
