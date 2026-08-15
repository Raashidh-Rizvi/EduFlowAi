import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sword, 
  FileSpreadsheet, 
  Plus, 
  Clock, 
  HelpCircle, 
  Sliders, 
  Award, 
  Flame, 
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Assessments() {
  const [activeSubTab, setActiveSubTab] = useState('quizzes'); // 'quizzes' | 'bosses' | 'rubrics'
  const [showBossModal, setShowBossModal] = useState(false);

  const quizzes = [
    {
      id: 'q-101',
      title: 'Diagnostic Quiz: PostgreSQL Indexing & Query Execution Plans',
      course: 'SE3090',
      questionsCount: 10,
      timeLimit: '20 mins',
      avgScore: 78.4,
      xpReward: '+30 XP',
      status: 'Active'
    },
    {
      id: 'q-102',
      title: 'Clean Architecture & Repository Abstractions',
      course: 'SE3090',
      questionsCount: 15,
      timeLimit: '30 mins',
      avgScore: 82.1,
      xpReward: '+40 XP',
      status: 'Active'
    },
    {
      id: 'q-103',
      title: 'LangGraph Multi-Agent Workflows & Deterministic Guards',
      course: 'SE3090',
      questionsCount: 8,
      timeLimit: '15 mins',
      avgScore: 71.0,
      xpReward: '+35 XP',
      status: 'Scheduled'
    }
  ];

  const bossEncounters = [
    {
      id: 'b-1',
      bossName: '👹 PostgreSQL Concurrency Dungeon Boss',
      course: 'SE3090: Architecture & Frameworks',
      questions: 15,
      timeLimit: '20 mins',
      passThreshold: '80%',
      xpReward: '+500 XP',
      badgeReward: 'Boss Slayer Badge',
      attemptedCount: 184,
      passedCount: 118,
      status: 'Active Live Raid'
    },
    {
      id: 'b-2',
      bossName: '⚔️ Entity Framework Transaction Overlord',
      course: 'SE3090: Architecture & Frameworks',
      questions: 20,
      timeLimit: '30 mins',
      passThreshold: '85%',
      xpReward: '+600 XP',
      badgeReward: 'Transaction Master',
      attemptedCount: 92,
      passedCount: 54,
      status: 'Scheduled for Week 6'
    }
  ];

  const rubrics = [
    {
      id: 'r-1',
      title: 'SE3090 Clean Architecture Code Review Rubric',
      criteria: [
        { name: 'Separation of Concerns', weight: '30%', excellent: 'Entities and Core isolated with zero UI/DB references', poor: 'Coupled abstractions' },
        { name: 'Repository & DbContext Pattern', weight: '30%', excellent: 'Generic repository with unit of work', poor: 'Direct queries in controllers' },
        { name: 'Unit Testing & Mocking', weight: '40%', excellent: 'Comprehensive xUnit test coverage > 85%', poor: 'No automated assertions' }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          border: '1px solid var(--border-subtle)'
        }}>
          {[
            { id: 'quizzes', label: 'Quizzes & Diagnostics', icon: CheckCircle2 },
            { id: 'bosses', label: 'Boss Battle Encounters 👹', icon: Sword, badge: 'Live' },
            { id: 'rubrics', label: 'Grading Rubric Matrices', icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowBossModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent), #E11D48)',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '13px',
            boxShadow: '0 0 15px rgba(244, 63, 94, 0.4)'
          }}
        >
          <Plus size={16} /> Create Boss Encounter
        </button>
      </div>

      {/* SUBTAB 1: QUIZZES */}
      {activeSubTab === 'quizzes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {quizzes.map(q => (
            <div key={q.id} className="glass-panel" style={{
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>{q.course}</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--success)',
                    fontWeight: '700'
                  }}>
                    {q.status}
                  </span>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{q.title}</h4>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{q.questionsCount} Questions</span>
                  <span>⏱️ {q.timeLimit}</span>
                  <span style={{ color: 'var(--warning)', fontWeight: '700' }}>{q.xpReward}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cohort Avg</span>
                  <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>{q.avgScore}%</p>
                </div>
                <button style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Edit Questions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: BOSS BATTLE ENCOUNTERS */}
      {activeSubTab === 'bosses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {bossEncounters.map(boss => {
            const passRate = Math.round((boss.passedCount / boss.attemptedCount) * 100);
            return (
              <div key={boss.id} className="glass-panel" style={{
                padding: '24px',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(0, 0, 0, 0.3))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: '700' }}>
                      Milestone Boss Encounter
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px', color: 'var(--text-main)' }}>
                      {boss.bossName}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    color: 'var(--accent)',
                    fontWeight: '700'
                  }}>
                    {boss.status}
                  </span>
                </div>

                <div style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Time Limit</span>
                    <p style={{ fontSize: '13px', fontWeight: '700' }}>{boss.timeLimit}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Threshold</span>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)' }}>{boss.passThreshold}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Reward</span>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>{boss.xpReward}</p>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Cohort Slay Rate: {passRate}%</span>
                    <span>{boss.passedCount}/{boss.attemptedCount} Students</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${passRate}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-main)'
                }}>
                  <Award size={16} color="var(--warning)" />
                  <span>Unlocks Trophy: <strong>{boss.badgeReward}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 3: SCORING RUBRICS */}
      {activeSubTab === 'rubrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rubrics.map(rub => (
            <div key={rub.id} className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>{rub.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rub.criteria.map((crit, idx) => (
                  <div key={idx} style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 1fr',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{crit.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', fontWeight: '700' }}>Weight: {crit.weight}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase' }}>Excellent (100%)</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{crit.excellent}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase' }}>Deficient (0-50%)</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{crit.poor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Boss Encounter Modal */}
      {showBossModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid rgba(244, 63, 94, 0.5)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>Spawn Topic Boss Challenge 👹</h3>
            <input 
              type="text" 
              placeholder="Boss Encounter Title (e.g. LangGraph Cyclic Dungeon)" 
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Time Limit (Minutes)</label>
                <input type="number" defaultValue={20} style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '13px', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>XP Bounty</label>
                <input type="number" defaultValue={500} style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '13px', marginTop: '4px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button onClick={() => setShowBossModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '12px' }}>Cancel</button>
              <button onClick={() => setShowBossModal(false)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '12px', fontWeight: '700' }}>Publish Boss Raid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
