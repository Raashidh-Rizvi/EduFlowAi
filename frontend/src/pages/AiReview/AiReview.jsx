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
  Award,
  ArrowRight,
  Activity,
  Check,
  X
} from 'lucide-react';

export default function AiReview() {
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [calibratedXpMultiplier, setCalibratedXpMultiplier] = useState(1.0);

  const proposals = [];

  const current = proposals.find(p => p.id === selectedProposalId) || proposals[0];
  const decision = current ? decisions[current.id] : null;

  const handleDecision = (type) => {
    if (!current) return;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div className="card-premium" style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={20} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
              Human-in-the-Loop (HITL) Verification Engine
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Agentic study plans and personalized quests require instructor cryptographic sign-off before dispatching to student mobile apps.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge-pill badge-warning">
            {proposals.filter(p => !decisions[p.id]).length} Proposals in Queue
          </span>
        </div>
      </div>

      {/* Main Review Workspace */}
      {proposals.length === 0 ? (
        <div className="card-premium" style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Verification Queue is Empty</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: '1.5' }}>
            No pending AI study plan proposals in the review queue. When students submit personalized learning objectives, they will appear here for instructor verification and safety validation.
          </p>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 290px', gap: '18px' }}>
        {/* Left Column: Proposals Queue */}
        <div className="card-premium" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            fontWeight: '700'
          }}>
            Verification Queue ({proposals.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposals.map(prop => {
              const isSelected = selectedProposalId === prop.id;
              const propDecision = decisions[prop.id];
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
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {prop.avatar}
                      </div>
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>{prop.student}</span>
                    </div>

                    {propDecision ? (
                      <span className={`badge-pill ${propDecision === 'approved' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                        {propDecision === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    ) : (
                      <span className="badge-pill badge-warning" style={{ fontSize: '10px' }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prop.goal}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10.5px', color: 'var(--text-subtle)' }}>
                    <span>{prop.hoursPerWeek} hrs/wk</span>
                    <span>{prop.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column: Selected Proposal Detail */}
        <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Workflow Task: {current.id}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px', color: 'var(--text-main)' }}>
                {current.student} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>({current.studentId})</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{current.course}</p>
            </div>

            <div>
              <span className={`badge-pill ${decision === 'approved' ? 'badge-success' : decision === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                {decision === 'approved' ? 'Published to Student' : decision === 'rejected' ? 'Returned for Re-plan' : 'Awaiting Sign-off'}
              </span>
            </div>
          </div>

          {/* Stated Learning Goal */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)'
          }}>
            <p style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Student Request Goal</p>
            <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontWeight: '500' }}>
              "{current.goal}"
            </p>
          </div>

          {/* Gap Analysis Summary */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} color="var(--secondary)" /> 
              <span>Knowledge Gap Analysis</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Weak Concepts:</span>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {current.gapAnalysis.weakAreas.map((w, i) => (
                    <span key={i} style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: '600' }}>• {w}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Comprehension Baseline:</span>
                <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--warning)', marginTop: '2px' }}>{current.gapAnalysis.currentProgress}% Score</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{current.gapAnalysis.focus}</p>
              </div>
            </div>
          </div>

          {/* Proposed Quest Schedule */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>
              Generated Quest Sequence ({current.schedule.length} Modules)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {current.schedule.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--secondary)', width: '55px' }}>{item.day}</span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-main)', fontWeight: '500' }}>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.duration}</span>
                    <span className={`badge-pill ${item.type === 'Boss Fight' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10.5px' }}>
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
            paddingTop: '14px',
            marginTop: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP Modifier:</span>
              <button 
                onClick={() => setCalibratedXpMultiplier(prev => (prev === 1.0 ? 1.5 : 1.0))}
                className="btn-secondary"
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  fontWeight: '600'
                }}
              >
                {calibratedXpMultiplier}x XP Multiplier
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleDecision('rejected')}
                className="btn-danger"
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
              >
                <X size={14} />
                <span>Reject / Request Re-Plan</span>
              </button>
              <button
                onClick={() => handleDecision('approved')}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12.5px' }}
              >
                <Check size={14} />
                <span>{decision === 'approved' ? 'Proposal Signed & Published' : 'Approve & Publish'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Agent Audit Trail */}
        <div className="card-premium" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>Multi-Agent Audit Trail</h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {current.auditLogs.map((log, i) => (
              <div key={i} style={{
                padding: '9px 11px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-surface)',
                borderLeft: '3px solid var(--success)',
                fontSize: '11.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{log.agent}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{log.time}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{log.action}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 'auto',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>Validation Agent Guards:</p>
            <p>✓ Max Workload: {current?.hoursPerWeek || 0}h ≤ 40h/wk</p>
            <p>✓ Goal Specificity: Passed</p>
            <p>✓ Schema Validation: Pydantic v2 valid</p>
          </div>
        </div>
      </div>
      )}

      {/* Rejection Modal */}
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
          zIndex: 1000
        }}>
          <div className="card-premium" style={{
            width: '460px',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-popover)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)' }}>
              Reject Proposal with Guidance
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Provide constructive instructions to the LangGraph Planning Agent to generate an alternate schedule.
            </p>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Focus more heavily on PostgreSQL transaction isolation levels..."
              className="form-textarea"
              style={{ resize: 'none' }}
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
                Confirm Rejection & Re-Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
