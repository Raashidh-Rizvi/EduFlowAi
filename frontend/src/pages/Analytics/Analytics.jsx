import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Users, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert,
  Search
} from 'lucide-react';

export default function Analytics({ onTriggerRemedial }) {
  const [selectedTopic, setSelectedTopic] = useState('ef-core');
  const [searchFilter, setSearchFilter] = useState('');

  const topicHeatmap = [
    { id: 'ef-core', name: 'EF Core Transactions & Concurrency', mastery: 58, atRiskCount: 42, status: 'Needs Intervention' },
    { id: 'postgres-idx', name: 'PostgreSQL Composite Indexes & VACUUM', mastery: 74, atRiskCount: 18, status: 'Moderate' },
    { id: 'clean-arch', name: 'Clean Architecture Domain Isolation', mastery: 86, atRiskCount: 8, status: 'Strong' },
    { id: 'langgraph', name: 'LangGraph Deterministic Agent Guards', mastery: 69, atRiskCount: 26, status: 'Moderate' }
  ];

  const atRiskStudents = [
    {
      id: 'IT22765431',
      name: 'Tariq Mansoor',
      avgQuizScore: 54.2,
      velocity: '2.5 hrs/wk (Low)',
      streak: '0 Days (Broken)',
      weakTopic: 'EF Core Transactions',
      riskLevel: 'High Risk',
      status: 'Intervention Needed'
    },
    {
      id: 'IT22881023',
      name: 'Samantha Gomez',
      avgQuizScore: 59.0,
      velocity: '3.0 hrs/wk',
      streak: '1 Day',
      weakTopic: 'PostgreSQL Indexes',
      riskLevel: 'Moderate Risk',
      status: 'AI Plan Dispatched'
    },
    {
      id: 'IT22119042',
      name: 'Jordan Lee',
      avgQuizScore: 61.5,
      velocity: '4.0 hrs/wk',
      streak: '2 Days',
      weakTopic: 'LangGraph Cyclic State',
      riskLevel: 'Moderate Risk',
      status: 'Intervention Needed'
    }
  ];

  const filteredStudents = atRiskStudents.filter(s => 
    s.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    s.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Velocity & Intervention Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {[
          { label: 'Cohort Velocity', value: '7.8 hrs/wk', status: '+1.2 hrs vs target', color: 'var(--success)' },
          { label: 'Overall Topic Mastery', value: '71.8%', status: 'Across 4 phases', color: 'var(--primary)' },
          { label: 'Identified At-Risk Learners', value: '42', status: 'Requires remedial AI quest', color: 'var(--accent)', alert: true },
          { label: 'Remediation Success Rate', value: '88.4%', status: 'Post-AI intervention', color: 'var(--secondary)' }
        ].map((item, idx) => (
          <div key={idx} className="glass-panel" style={{
            padding: '20px',
            border: item.alert ? '1px solid rgba(244, 63, 94, 0.4)' : undefined
          }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.label}</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '6px 0 4px', color: 'var(--text-main)' }}>{item.value}</h3>
            <span style={{ fontSize: '11px', color: item.alert ? 'var(--accent)' : 'var(--success)', fontWeight: '600' }}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Main Grid: Topic Mastery Heatmap + At-Risk Student Intervention Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
        {/* Topic Comprehension Heatmap */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Topic Mastery & Comprehension Heatmap</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SE3090 Modules</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topicHeatmap.map(topic => (
              <div 
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: selectedTopic === topic.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedTopic === topic.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{topic.name}</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: topic.mastery < 65 ? 'var(--accent)' : topic.mastery < 80 ? 'var(--warning)' : 'var(--success)'
                  }}>
                    {topic.mastery}%
                  </span>
                </div>

                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${topic.mastery}%`,
                    height: '100%',
                    backgroundColor: topic.mastery < 65 ? 'var(--accent)' : topic.mastery < 80 ? 'var(--warning)' : 'var(--success)',
                    borderRadius: 'var(--radius-full)'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                  <span>{topic.atRiskCount} struggling learners</span>
                  <span style={{ color: topic.mastery < 65 ? 'var(--accent)' : 'var(--text-muted)' }}>{topic.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid var(--border-accent)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.4',
            marginTop: 'auto'
          }}>
            💡 <strong>Learning Analysis Agent Diagnostic:</strong> Students completing &gt; 2 coding labs show a 34% higher score on midterm Boss Battles.
          </div>
        </section>

        {/* At-Risk Student Early Intervention Table */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--accent)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Early-Warning At-Risk Interventions</h3>
            </div>

            <input 
              type="text" 
              placeholder="Filter by student name or ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '11.5px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredStudents.map((std, i) => (
              <div key={i} style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{std.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({std.id})</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: std.riskLevel === 'High Risk' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: std.riskLevel === 'High Risk' ? 'var(--accent)' : 'var(--warning)',
                      fontWeight: '700'
                    }}>
                      {std.riskLevel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>Avg Quiz: <strong style={{ color: 'var(--accent)' }}>{std.avgQuizScore}%</strong></span>
                    <span>Velocity: {std.velocity}</span>
                    <span>Weak Area: <strong style={{ color: 'var(--text-main)' }}>{std.weakTopic}</strong></span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => alert(`Generated AI Remedial Study Quest for ${std.name} targeting ${std.weakTopic}. Dispatched to HITL Review Queue!`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '700',
                      boxShadow: 'var(--shadow-glow)'
                    }}
                  >
                    <Sparkles size={14} /> Trigger AI Remedial Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
