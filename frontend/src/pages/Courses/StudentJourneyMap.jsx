import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flag,
  Play,
  Swords,
  Target,
  Trophy,
  Users,
  Zap
} from 'lucide-react';

/**
 * Student Journey Map
 * -------------------
 * Read-only, chronological view of how a learner moves through a course:
 * enrollment → each module (topics, lessons, quizzes, mastery) → final
 * assessment. Complements the "Hierarchy & Quizzes Tree" view, which is
 * focused on authoring/management instead of the learner's path.
 */
export default function StudentJourneyMap({ course, currentUser }) {
  const [openStage, setOpenStage] = useState(null);

  if (!course) return null;

  const isStaff = currentUser?.role === 'Instructor' || currentUser?.role === 'Admin';

  const modules = [...(course.modules || [])].sort(
    (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  // ── Aggregate journey stats (quizzes de-duplicated by id/title) ──────────
  const seenQuizzes = new Set();
  let totalTopics = 0;
  let totalLessons = 0;
  let completedLessons = 0;
  let totalXp = 0;
  let quizCount = 0;

  const countQuiz = (quiz) => {
    if (!quiz) return;
    const key = quiz.id || quiz.title;
    if (seenQuizzes.has(key)) return;
    seenQuizzes.add(key);
    quizCount += 1;
    totalXp += Number(quiz.xpReward) || 0;
  };

  modules.forEach((mod) => {
    (mod.topics || []).forEach((topic) => {
      totalTopics += 1;
      (topic.lessons || []).forEach((lesson) => {
        totalLessons += 1;
        if (lesson.completed) completedLessons += 1;
        totalXp += Number(lesson.xp) || 0;
      });
      countQuiz(topic.quiz);
    });
    (mod.quizzes || []).forEach(countQuiz);
  });

  const finalAssessment = course.finalAssessment || null;
  if (finalAssessment) {
    totalXp += Number(finalAssessment.xpReward) || 0;
  }

  const completionRate = Number(course.completionRate) || 0;

  const masteryColor = (value) =>
    value >= 70 ? 'var(--success)' : value >= 40 ? '#F59E0B' : '#EF4444';

  const toggleStage = (key) => setOpenStage((prev) => (prev === key ? null : key));

  // ── Enrollment stage ─────────────────────────────────────────────────────
  const enrollmentStage = (
    <JourneyNode
      key="stage-enrollment"
      step="START"
      icon={<Users size={16} />}
      tone="primary"
      title="Enrollment & Onboarding"
      subtitle={
        isStaff
          ? `${course.studentsCount || 0} students enrolled · ${completionRate}% cohort completion`
          : 'Access granted to the full curriculum, quizzes and XP rewards'
      }
      badge={
        <span
          className="badge-pill badge-primary"
          style={{ fontSize: '10px', fontWeight: '700' }}
        >
          ENTRY POINT
        </span>
      }
      footer={
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text-main)' }}>{course.studentsCount || 0}</strong> enrolled</span>
          <span><strong style={{ color: 'var(--success)' }}>{completionRate}%</strong> completion</span>
          <span><strong style={{ color: 'var(--text-main)' }}>{modules.length}</strong> module{modules.length === 1 ? '' : 's'} ahead</span>
        </div>
      }
      isOpen={false}
      onToggle={null}
    />
  );

  // ── Module stages ────────────────────────────────────────────────────────
  const moduleStages = modules.map((mod, idx) => {
    const mastery = Number(mod.masteryRate) || 0;
    const topics = mod.topics || [];
    const lessons = topics.reduce((sum, t) => sum + (t.lessons || []).length, 0);
    const flaggedTopics = topics.filter((t) => t.hasWarning).length;
    const moduleXp = topics.reduce(
      (sum, t) =>
        sum +
        (t.lessons || []).reduce((s, l) => s + (Number(l.xp) || 0), 0) +
        (t.quiz ? Number(t.quiz.xpReward) || 0 : 0),
      0
    );
    const isOpen = openStage === `module-${mod.id}`;

    return (
      <JourneyNode
        key={`stage-${mod.id}`}
        step={`STAGE ${idx + 1}`}
        icon={<BookOpen size={16} />}
        tone={mastery >= 70 ? 'success' : mastery >= 40 ? 'warning' : 'danger'}
        title={mod.title}
        subtitle={mod.description}
        badge={
          <span
            style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '3px 9px',
              borderRadius: '12px',
              color: masteryColor(mastery),
              backgroundColor: `${masteryColor(mastery)}1f`,
              border: `1px solid ${masteryColor(mastery)}40`
            }}
          >
            {mastery >= 70 ? 'ON TRACK' : mastery >= 40 ? 'IN PROGRESS' : 'NEEDS SUPPORT'}
          </span>
        }
        progress={{
          label: isStaff ? 'Cohort mastery' : 'Module mastery',
          value: mastery
        }}
        footer={
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <span><strong style={{ color: 'var(--text-main)' }}>{topics.length}</strong> topic{topics.length === 1 ? '' : 's'}</span>
            <span><strong style={{ color: 'var(--text-main)' }}>{lessons}</strong> lesson{lessons === 1 ? '' : 's'}</span>
            <span><strong style={{ color: 'var(--text-main)' }}>{(mod.quizzes || []).length}</strong> quiz{(mod.quizzes || []).length === 1 ? '' : 'zes'}</span>
            <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>+{moduleXp} XP</span>
            {flaggedTopics > 0 && (
              <span style={{ color: '#F59E0B', fontWeight: '700' }}>
                ⚠ {flaggedTopics} topic{flaggedTopics === 1 ? '' : 's'} need remediation
              </span>
            )}
          </div>
        }
        isOpen={isOpen}
        onToggle={() => toggleStage(`module-${mod.id}`)}
      >
        {/* Expanded detail: topics → lessons → quiz */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topics.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No topics published yet for this module.
            </div>
          )}
          {topics.map((topic, tIdx) => (
            <div
              key={topic.id || tIdx}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-canvas)',
                border: topic.hasWarning
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '800'
                  }}>
                    {tIdx + 1}
                  </div>
                  <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{topic.title}</strong>
                  {topic.hasWarning && (
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#F59E0B' }}>
                      ⚠ Low mastery: {Number(topic.masteryPercent) || 0}%
                    </span>
                  )}
                </div>
              </div>

              {(topic.lessons || []).map((lesson) => (
                <div
                  key={lesson.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: '28px',
                    fontSize: '12px',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    {lesson.completed ? (
                      <CheckCircle2 size={13} color="var(--success)" />
                    ) : (
                      <Play size={12} color="var(--text-muted)" />
                    )}
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{lesson.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>· {lesson.duration}</span>
                  </div>
                  <span style={{ color: 'var(--secondary)', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    +{lesson.xp} XP
                  </span>
                </div>
              ))}

              {topic.quiz && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: '28px',
                  fontSize: '12px',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Target size={13} color="var(--primary)" />
                    <strong style={{ color: 'var(--text-main)' }}>{topic.quiz.title}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    {topic.quiz.avgScore != null && (
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
                        Avg {topic.quiz.avgScore}%
                      </span>
                    )}
                    <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>
                      +{topic.quiz.xpReward} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Module boss / quiz quests not attached to a topic */}
          {(mod.quizzes || []).filter((q) => !topics.some((t) => t.quiz && t.quiz.id === q.id)).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Swords size={13} color="#EF4444" />
              <span>
                {(mod.quizzes || []).filter((q) => !topics.some((t) => t.quiz && t.quiz.id === q.id)).length} module
                quiz quest{(mod.quizzes || []).filter((q) => !topics.some((t) => t.quiz && t.quiz.id === q.id)).length === 1 ? '' : 's'} on this stage
                (module quiz / boss battle / remediation)
              </span>
            </div>
          )}
        </div>
      </JourneyNode>
    );
  });

  // ── Final assessment stage ───────────────────────────────────────────────
  const finalStage = (
    <JourneyNode
      key="stage-final"
      step="FINISH"
      icon={<Trophy size={16} />}
      tone="gold"
      title={finalAssessment ? finalAssessment.title : 'Course Final Assessment'}
      subtitle={
        finalAssessment
          ? 'Summative checkpoint covering every module and learning outcome.'
          : 'No final assessment generated yet — the journey ends after the last module.'
      }
      badge={
        <span
          className="badge-pill"
          style={{
            fontSize: '10px',
            fontWeight: '800',
            color: '#B45309',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)'
          }}
        >
          🏆 CERTIFICATION
        </span>
      }
      footer={
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          {finalAssessment ? (
            <>
              <span><strong style={{ color: 'var(--text-main)' }}>{finalAssessment.questionsCount}</strong> questions</span>
              <span><strong style={{ color: 'var(--text-main)' }}>{finalAssessment.timeLimitMinutes}</strong> mins</span>
              <span>Pass mark <strong style={{ color: 'var(--text-main)' }}>{finalAssessment.passPercentage}%</strong></span>
              <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>+{finalAssessment.xpReward} XP</span>
            </>
          ) : (
            <span>Use “⚡ Generate Course Final Assessment” to add this stage.</span>
          )}
        </div>
      }
      isOpen={false}
      onToggle={null}
    />
  );

  const summaryChips = [
    { label: 'Modules', value: modules.length, icon: <BookOpen size={12} /> },
    { label: 'Topics', value: totalTopics, icon: <Flag size={12} /> },
    { label: 'Lessons', value: totalLessons, icon: <CheckCircle2 size={12} /> },
    { label: 'Quiz quests', value: quizCount, icon: <Target size={12} /> },
    { label: 'XP available', value: `+${totalXp}`, icon: <Zap size={12} /> },
    isStaff
      ? { label: 'Cohort completion', value: `${completionRate}%`, icon: <Users size={12} /> }
      : { label: 'Lessons done', value: `${completedLessons}/${totalLessons}`, icon: <CheckCircle2 size={12} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} data-testid="student-journey-map">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
            Student Journey Map
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            The learner's path from enrollment to certification — click a module stage to preview its topics, lessons and quizzes.
          </p>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
          {modules.length + 2} Stages Total
        </span>
      </div>

      {/* Summary chips */}
      <div className="card-premium" style={{ padding: '16px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: 'var(--bg-surface)' }}>
        {summaryChips.map((chip) => (
          <div
            key={chip.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              fontWeight: '600'
            }}
          >
            <span style={{ color: 'var(--primary)', display: 'flex' }}>{chip.icon}</span>
            <strong style={{ color: 'var(--text-main)', fontWeight: '800' }}>{chip.value}</strong>
            <span>{chip.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {modules.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {enrollmentStage}
          {moduleStages}
          {finalStage}
        </div>
      ) : (
        <div className="card-premium" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            No modules created yet. Add modules to map out the student journey.
          </p>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Timeline node                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

const TONES = {
  primary: { fg: '#4F46E5', bg: 'rgba(79, 70, 229, 0.12)', ring: 'rgba(79, 70, 229, 0.3)' },
  success: { fg: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', ring: 'rgba(16, 185, 129, 0.3)' },
  warning: { fg: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', ring: 'rgba(245, 158, 11, 0.3)' },
  danger: { fg: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', ring: 'rgba(239, 68, 68, 0.3)' },
  gold: { fg: '#D97706', bg: 'rgba(245, 158, 11, 0.15)', ring: 'rgba(245, 158, 11, 0.35)' }
};

function JourneyNode({ step, icon, tone = 'primary', title, subtitle, badge, progress, footer, children, isOpen, onToggle }) {
  const colors = TONES[tone] || TONES.primary;
  const expandable = typeof onToggle === 'function';

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '42px', flexShrink: 0 }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          backgroundColor: colors.bg,
          border: `2px solid ${colors.ring}`,
          color: colors.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, width: '2px', minHeight: '20px', background: 'linear-gradient(180deg, var(--border-subtle) 0%, transparent 100%)' }} />
      </div>

      {/* Card */}
      <div
        className="card-premium"
        onClick={expandable ? onToggle : undefined}
        style={{
          flex: 1,
          marginBottom: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          cursor: expandable ? 'pointer' : 'default',
          border: isOpen ? '1px solid var(--primary-border)' : '1px solid var(--border-card)',
          backgroundColor: isOpen ? 'rgba(79, 70, 229, 0.03)' : 'var(--bg-surface)'
        }}
        data-testid="journey-stage"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              letterSpacing: '0.06em',
              color: colors.fg,
              backgroundColor: colors.bg,
              border: `1px solid ${colors.ring}`,
              borderRadius: '12px',
              padding: '3px 9px',
              whiteSpace: 'nowrap'
            }}>
              {step}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  {title}
                </h3>
                {badge}
                {expandable && (
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                )}
              </div>
              {subtitle && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0', lineHeight: 1.5 }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {progress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-canvas)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, progress.value))}%`,
                height: '100%',
                borderRadius: '6px',
                background: `linear-gradient(90deg, ${colors.fg} 0%, ${colors.fg}aa 100%)`,
                transition: 'width 0.4s ease'
              }} />
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: '800', color: colors.fg, whiteSpace: 'nowrap' }}>
              {progress.value}%
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{progress.label}</span>
          </div>
        )}

        {footer && <div>{footer}</div>}

        {isOpen && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      </div>
    </div>
  );
}
