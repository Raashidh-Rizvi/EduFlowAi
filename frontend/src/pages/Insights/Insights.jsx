import React, { useState, useEffect } from 'react';
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
  Search,
  Activity,
  ArrowUpRight,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { insightsService } from '../../services/insightsService';

export default function Insights({ onTriggerRemedial }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalEnrollments: 0,
    totalSubmissions: 0,
    passedSubmissions: 0,
    quizPassRate: 0,
    totalChallenges: 0,
    totalXpAwarded: 0,
    totalBadgesUnlocked: 0
  });
  const [topicHeatmap, setTopicHeatmap] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [platform, topics, atRisk] = await Promise.all([
        insightsService.getPlatformAnalytics(),
        insightsService.getTopicMastery(),
        insightsService.getAtRiskStudents()
      ]);

      if (platform) setPlatformStats(platform);
      if (Array.isArray(topics)) {
        setTopicHeatmap(topics);
        if (topics.length > 0 && !selectedTopic) {
          setSelectedTopic(topics[0].id);
        }
      }
      if (Array.isArray(atRisk)) {
        setAtRiskStudents(atRisk);
      }
    } catch (err) {
      alert(err.friendlyMessage || 'We were unable to load the latest telemetry insights. Please try refreshing the page.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = atRiskStudents.filter(s => {
    const term = searchFilter.toLowerCase();
    const name = (s.studentName || s.name || '').toLowerCase();
    const id = (s.studentId || s.id || s.studentEmail || '').toLowerCase();
    const assessment = (s.assessmentTitle || '').toLowerCase();
    return name.includes(term) || id.includes(term) || assessment.includes(term);
  });

  const cohortVelocity = platformStats.totalEnrollments > 0 
    ? ((platformStats.totalSubmissions || 0) / platformStats.totalEnrollments * 1.5).toFixed(1)
    : '0.0';

  const metrics = [
    { 
      label: 'Cohort Average Velocity', 
      value: `${cohortVelocity} hrs/wk`, 
      status: platformStats.totalStudents > 0 ? `Across ${platformStats.totalStudents} enrolled learner${platformStats.totalStudents === 1 ? '' : 's'}` : 'Awaiting learner activity', 
      color: 'var(--success)', 
      badgeType: 'badge-success' 
    },
    { 
      label: 'Overall Curriculum Mastery', 
      value: `${Number(platformStats.quizPassRate || 0).toFixed(1)}%`, 
      status: `Across ${platformStats.publishedCourses || platformStats.totalCourses || 0} active course${(platformStats.publishedCourses || platformStats.totalCourses) === 1 ? '' : 's'}`, 
      color: 'var(--primary)', 
      badgeType: 'badge-primary' 
    },
    { 
      label: 'Identified At-Risk Learners', 
      value: `${atRiskStudents.length}`, 
      status: atRiskStudents.length === 0 ? 'No active risk flags' : 'Requires remedial quest dispatch', 
      color: 'var(--accent)', 
      badgeType: atRiskStudents.length === 0 ? 'badge-success' : 'badge-danger', 
      alert: atRiskStudents.length > 0 
    },
    { 
      label: 'Intervention & Pass Rate', 
      value: `${platformStats.totalSubmissions > 0 ? Number(platformStats.quizPassRate || 0).toFixed(1) + '%' : '0.0%'}`, 
      status: platformStats.totalSubmissions > 0 ? `${platformStats.passedSubmissions || 0}/${platformStats.totalSubmissions} submissions passed` : 'Awaiting quiz submissions', 
      color: 'var(--secondary)', 
      badgeType: 'badge-secondary' 
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Velocity & Intervention Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {metrics.map((item, idx) => (
          <div key={idx} className="metric-card" style={{
            border: item.alert ? '1px solid var(--accent-border)' : undefined
          }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.label}</span>
              <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 6px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {item.value}
              </h3>
              <span className={`badge-pill ${item.badgeType}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Topic Mastery Heatmap + At-Risk Student Intervention Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: '20px' }}>
        {/* Topic Comprehension Heatmap */}
        <section className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Topic Comprehension Matrix</h3>
            <span className="badge-pill badge-neutral">
              {topicHeatmap.length} Tracked Topic{topicHeatmap.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topicHeatmap.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <BookOpen size={24} style={{ margin: '0 auto 8px', color: 'var(--text-muted)', opacity: 0.6 }} />
                <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>No Topic Mastery Data</p>
                <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
                  Topics and comprehension heatmaps will populate automatically as courses and assessments receive submissions.
                </p>
              </div>
            ) : (
              topicHeatmap.map(topic => (
                <div 
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: selectedTopic === topic.id ? 'var(--primary-soft)' : 'var(--bg-surface)',
                    border: selectedTopic === topic.id ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{topic.name}</span>
                    <span style={{
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: topic.mastery < 65 ? 'var(--accent)' : topic.mastery < 80 ? 'var(--warning)' : 'var(--success)'
                    }}>
                      {topic.mastery}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, topic.mastery))}%`,
                      height: '100%',
                      backgroundColor: topic.mastery < 65 ? 'var(--accent)' : topic.mastery < 80 ? 'var(--warning)' : 'var(--success)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{topic.atRiskCount || 0} struggling students</span>
                    <span className={`badge-pill ${topic.badgeType || 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                      {topic.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid var(--primary-border)',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            marginTop: 'auto'
          }}>
            <strong style={{ color: 'var(--text-main)' }}>Diagnostic Telemetry:</strong>{' '}
            {platformStats.totalSubmissions > 0 
              ? `${platformStats.totalSubmissions} quiz submission${platformStats.totalSubmissions === 1 ? '' : 's'} recorded with a ${Number(platformStats.quizPassRate || 0).toFixed(1)}% overall pass rate.`
              : 'Real-time telemetry pipeline active. Telemetry updates dynamically as students complete curriculum lessons and assessments.'}
          </div>
        </section>

        {/* At-Risk Student Early Intervention Table */}
        <section className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--accent)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Early-Warning At-Risk Interventions</h3>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              width: '210px'
            }}>
              <Search size={13} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Filter student or ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No at-risk students detected. All learners are progressing on track.
              </div>
            ) : (
              filteredStudents.map((std, i) => {
                const sName = std.studentName || std.name || 'Student';
                const sEmail = std.studentEmail || std.id || '';
                const sScore = std.score !== undefined ? std.score : std.avgQuizScore || 0;
                const sAssessment = std.assessmentTitle || std.weakTopic || 'Assessment';
                const sRisk = std.riskFactor || (sScore < 50 ? 'High Risk' : 'Moderate Risk');

                return (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{sName}</strong>
                        {sEmail && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({sEmail})</span>}
                        <span className={`badge-pill ${sScore < 50 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                          Score: {sScore}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        <span>Target Quiz: <strong style={{ color: 'var(--text-main)' }}>{sAssessment}</strong></span>
                        <span>Risk Factor: <strong style={{ color: 'var(--accent)' }}>{sRisk}</strong></span>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          alert(`Remedial Quest queued for ${sName} targeting ${sAssessment}. Dispatched to HITL Review Queue!`);
                          if (onTriggerRemedial) onTriggerRemedial();
                        }}
                        className="btn-primary"
                        style={{ padding: '7px 12px', fontSize: '12px', gap: '6px' }}
                      >
                        <Sparkles size={13} />
                        <span>Dispatch Remedial Quest</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
