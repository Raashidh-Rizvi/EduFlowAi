import React, { useState } from 'react';
import { 
  BookOpen, 
  BarChart3, 
  CheckCircle2, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  FileCheck,
  Award,
  Users,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [approvalDecision, setApprovalDecision] = useState(null);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', paddingLeft: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>EduFlow AI</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Instructor Dashboard</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'approvals', label: 'AI Study Approvals', icon: Sparkles, badge: '1 Pending' },
            { id: 'courses', label: 'Course Management', icon: BookOpen },
            { id: 'assessments', label: 'Assessment Engine', icon: CheckCircle2 },
            { id: 'analytics', label: 'Student Analytics', icon: BarChart3 },
            { id: 'notifications', label: 'Communications', icon: Bell }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: isActive ? '600' : '500',
                  border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                <span style={{ flex: 1, fontSize: '14px' }}>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    color: 'var(--accent)',
                    fontWeight: '700'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div style={{
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '13px'
          }}>
            SJ
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Dr. Sarah Jenkins</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lead Instructor</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700' }}>
              {activeTab === 'approvals' && 'Human-in-the-Loop AI Plan Review 🤖'}
              {activeTab === 'courses' && 'Curriculum & Course Management 📚'}
              {activeTab === 'assessments' && 'Assessment & Rubric Grading Engine 📝'}
              {activeTab === 'analytics' && 'Cohort Performance & At-Risk Analytics 📊'}
              {activeTab === 'notifications' && 'Broadcasts & Communication Hub 📢'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              SE3090 Software Engineering Frameworks – Assignment 1 Live Environment
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--success)',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
              ASP.NET Core API Connected
            </span>
          </div>
        </header>

        {/* AI Approvals View */}
        {activeTab === 'approvals' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Plan Details Panel */}
            <section className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--primary)',
                    fontWeight: '700'
                  }}>
                    SE3090 Personalized Study Proposal
                  </span>
                  <h3 style={{ fontSize: '20px', marginTop: '4px' }}>Student: Alex Rivera (IT22104500)</h3>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: approvalDecision === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: approvalDecision === 'approved' ? 'var(--success)' : 'var(--warning)',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {approvalDecision === 'approved' ? 'Approved & Dispatched' : 'Pending Instructor Approval'}
                </span>
              </div>

              {/* Goal Box */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Student's Learning Goal:</p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)', marginTop: '4px' }}>
                  "Master Entity Framework Core indexing, transactions, and prepare for Midterm Quiz in 2 weeks (8 hrs/week)."
                </p>
              </div>

              {/* Proposed Study Sequence */}
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>AI Recommended 7-Day Sequence:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {[
                  { day: 'Day 1-2', title: 'Review: PostgreSQL Relational Indexes & Schema Constraints', est: '90 mins', type: 'Lesson' },
                  { day: 'Day 3-4', title: 'Interactive Lab: EF Core Migrations & Foreign Key Cascades', est: '120 mins', type: 'Lab' },
                  { day: 'Day 5', title: 'Knowledge Check: Quiz 1 – Agentic AI & Clean Architecture', est: '45 mins', type: 'Quiz' },
                  { day: 'Day 6-7', title: 'Review & Self-Test: Transactional ACID Boundaries', est: '60 mins', type: 'Self-Test' }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>{item.day}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.title}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.est}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setApprovalDecision('rejected')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    color: 'var(--accent)',
                    fontWeight: '600',
                    fontSize: '13px',
                    border: '1px solid rgba(244, 63, 94, 0.2)'
                  }}
                >
                  Reject with Feedback
                </button>
                <button
                  onClick={() => setApprovalDecision('approved')}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: '13px',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  {approvalDecision === 'approved' ? '✓ Approved' : 'Approve & Deliver to Student'}
                </button>
              </div>
            </section>

            {/* Agent Observability & Audit Log */}
            <aside className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldCheck size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Agentic Execution Audit</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { agent: 'Planning Agent', status: 'Decomposed 4 milestones', time: '412ms', ok: true },
                  { agent: 'Learning Analysis Agent', status: 'Found 2 quiz gaps in EF Core', time: '630ms', ok: true },
                  { agent: 'Recommendation Agent', status: 'Generated 7-day schedule', time: '520ms', ok: true },
                  { agent: 'Validation Agent', status: 'Deterministic check PASSED (0 errors)', time: '110ms', ok: true }
                ].map((log, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderLeft: '3px solid var(--success)',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{log.agent}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{log.time}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>{log.status}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--border-accent)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  🔒 <strong>HITL Safety Rule</strong>: AI proposal held in state until instructor cryptographic approval token is signed.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* Other Tabs (Placeholder previews for Course, Assessments, Analytics) */}
        {activeTab !== 'approvals' && (
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
              Component module view for <strong>{activeTab.toUpperCase()}</strong> is connected to ASP.NET Core REST API.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
