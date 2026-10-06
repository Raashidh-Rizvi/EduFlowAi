import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, Users, Clock3, Star, Layers, GraduationCap, PlusCircle,
  ArrowRight, TrendingUp, BadgeCheck, Activity
} from 'lucide-react';
import instructorService from '../../../services/instructorService';
import { courseService } from '../../../services/courseService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StarRating, Avatar, fmtDate, fmtNumber
} from '../shared';

function KpiCard({ icon: Icon, label, value, hint, tone = 'primary', onClick }) {
  const palette = {
    primary: ['var(--primary-soft)', 'var(--primary-border)', 'var(--primary)'],
    secondary: ['var(--secondary-soft)', 'var(--secondary-border)', 'var(--secondary)'],
    accent: ['var(--accent-soft)', 'var(--accent-border)', 'var(--accent)'],
    success: ['var(--success-soft)', 'var(--success-border)', 'var(--success)'],
    warning: ['var(--warning-soft)', 'var(--warning-border)', 'var(--warning)']
  }[tone] || ['var(--primary-soft)', 'var(--primary-border)', 'var(--primary)'];

  return (
    <div
      className="metric-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </div>
        {hint && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '7px' }}>{hint}</div>
        )}
      </div>
      <div style={{
        width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
        backgroundColor: palette[0], border: `1px solid ${palette[1]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={19} color={palette[2]} />
      </div>
    </div>
  );
}

export default function DashboardView({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, pending] = await Promise.all([
        instructorService.getDashboard(),
        instructorService.getEnrollmentRequests({ status: 'pending' }).catch(() => [])
      ]);
      setData(dashboard);
      setRequests(Array.isArray(pending) ? pending : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load your instructor dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (enrollmentId, action) => {
    setBusyId(enrollmentId);
    try {
      if (action === 'approve') await instructorService.approveEnrollment(enrollmentId);
      else await instructorService.declineEnrollment(enrollmentId);
      setRequests(prev => prev.filter(r => r.enrollmentId !== enrollmentId));
      setData(prev => prev ? {
        ...prev,
        stats: { ...prev.stats, pendingEnrollmentRequests: Math.max(0, (prev.stats?.pendingEnrollmentRequests || 1) - 1) }
      } : prev);
    } catch (err) {
      setError(err.friendlyMessage || 'The decision could not be saved.');
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (course) => {
    setBusyId(course.id);
    try {
      await courseService.publishCourse(course.id, !course.isPublished);
      setData(prev => prev ? {
        ...prev,
        courses: (prev.courses || []).map(c =>
          c.id === course.id
            ? { ...c, isPublished: !c.isPublished, status: !c.isPublished ? 'Published' : 'Draft' }
            : c
        )
      } : prev);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not update the publish state.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingBlock label="Loading your console" />;
  if (!data) {
    return (
      <>
        <ErrorBanner message={error} onRetry={load} />
        <EmptyState
          icon={Activity}
          title="Dashboard unavailable"
          description="We could not reach the instructor API. Sign in again or retry."
          action={<button className="btn-primary" onClick={load}>Retry</button>}
        />
      </>
    );
  }

  const stats = data.stats || {};
  const instructor = data.instructor || {};
  const courses = data.courses || [];
  const reviews = data.recentReviews || [];

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <div className="dashboard-hero" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)',
        padding: '30px 32px', marginBottom: '22px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(99,102,241,0.92) 55%, rgba(14,165,233,0.88) 100%)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 18px 44px rgba(79,70,229,0.32)'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.28), transparent 42%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span className="badge-pill" style={{
              background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
              letterSpacing: '0.14em', fontSize: '10.5px', fontWeight: 800, padding: '4px 12px'
            }}>
              INSTRUCTOR CONSOLE
            </span>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', margin: '14px 0 6px', letterSpacing: '-0.03em' }}>
              {instructor.fullName || user?.fullName || 'Instructor'}
            </h1>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.86)', margin: 0, maxWidth: '560px' }}>
              Your own courses, enrollment pipeline, students and reviews — everything is scoped to the courses you own.
            </p>
            <div style={{ display: 'flex', gap: '26px', marginTop: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Courses', value: stats.totalCourses ?? 0, target: 'my-courses' },
                { label: 'Students', value: stats.enrolledStudents ?? stats.totalStudents ?? 0, target: 'my-students' },
                { label: 'Avg Rating', value: fmtNumber(stats.averageRating, 1), target: 'reviews' },
                { label: 'Pending', value: stats.pendingEnrollmentRequests ?? 0, target: 'enrollment-requests' }
              ].map(s => (
                <div
                  key={s.label}
                  onClick={() => onNavigate(s.target)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(s.target); } }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title={`View ${s.label}`}
                >
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '5px', fontWeight: 700 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '190px' }}>
            <button className="btn-secondary" onClick={() => onNavigate('create-course')} style={{ background: 'rgba(255,255,255,0.94)', border: 'none', color: '#4F46E5', fontWeight: 700, cursor: 'pointer' }}>
              <PlusCircle size={15} /> Create Course
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('enrollment-requests')} style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.42)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              <BadgeCheck size={15} /> Review Requests
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <KpiCard icon={BookOpen} label="Total Courses" value={stats.totalCourses ?? 0} hint={`${stats.publishedCourses ?? 0} published · ${stats.draftCourses ?? 0} draft`} tone="primary" onClick={() => onNavigate('my-courses')} />
        <KpiCard icon={Users} label="Enrolled Students" value={stats.enrolledStudents ?? stats.totalStudents ?? 0} hint="Active enrollments only" tone="secondary" onClick={() => onNavigate('my-students')} />
        <KpiCard icon={Clock3} label="Pending Requests" value={stats.pendingEnrollmentRequests ?? 0} hint="Awaiting your approval" tone="warning" onClick={() => onNavigate('enrollment-requests')} />
        <KpiCard icon={Star} label="Average Rating" value={fmtNumber(stats.averageRating, 1)} hint={`${stats.totalReviews ?? 0} reviews`} tone="accent" onClick={() => onNavigate('reviews')} />
        <KpiCard icon={Layers} label="Modules" value={stats.totalModules ?? 0} hint={`${stats.totalLessons ?? 0} lessons`} tone="success" onClick={() => onNavigate('courses')} />
        <KpiCard icon={GraduationCap} label="Teaching Since" value={instructor.memberSince ? fmtDate(instructor.memberSince) : '—'} hint={instructor.email || ''} tone="primary" onClick={() => onNavigate('profile')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <section className="card-premium" style={{ padding: '22px 24px' }}>
          <SectionHeading
            title="Your Courses"
            subtitle="Only courses owned by your account appear here."
            actions={
              <button className="btn-ghost" onClick={() => onNavigate('my-courses')} style={{ fontSize: '12.5px', padding: '6px 12px', cursor: 'pointer' }}>
                Manage all <ArrowRight size={14} />
              </button>
            }
          />

          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Create your first course to start enrolling students."
              action={<button className="btn-primary" onClick={() => onNavigate('create-course')}>Create Course</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {courses.slice(0, 6).map(c => (
                <div
                  key={c.id}
                  className="glass-card-interactive"
                  onClick={() => onNavigate('courses', { courseId: c.id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('courses', { courseId: c.id }); } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 15px',
                    border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary-soft), var(--secondary-soft))',
                    border: '1px solid var(--border-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <BookOpen size={18} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 700 }}>{c.code}</span>
                      <span className={`badge-pill ${c.isPublished ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '9.5px', padding: '2px 8px' }}>
                        {c.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span>{c.enrollmentCount ?? 0} students</span>
                      <span>{c.modulesCount ?? 0} modules</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <StarRating value={c.averageRating} size={11} /> {fmtNumber(c.averageRating, 1)} ({c.ratingCount ?? 0})
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="btn-ghost"
                      onClick={(e) => { e.stopPropagation(); togglePublish(c); }}
                      disabled={busyId === c.id}
                      style={{ fontSize: '11.5px', padding: '6px 11px', cursor: 'pointer' }}
                    >
                      {c.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={(e) => { e.stopPropagation(); onNavigate('courses', { courseId: c.id }); }}
                      style={{ fontSize: '11.5px', padding: '6px 11px', cursor: 'pointer' }}
                    >
                      Curriculum
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="card-premium" style={{ padding: '22px 24px' }}>
            <SectionHeading
              title="Pending Requests"
              subtitle="Approve or decline student access."
              actions={
                <button className="btn-ghost" onClick={() => onNavigate('enrollment-requests')} style={{ fontSize: '12.5px', padding: '6px 12px', cursor: 'pointer' }}>
                  All <ArrowRight size={14} />
                </button>
              }
            />

            {requests.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                No pending enrollment requests.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requests.slice(0, 4).map(r => (
                  <div
                    key={r.enrollmentId}
                    onClick={() => onNavigate('enrollment-requests')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 12px',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-card)',
                      cursor: 'pointer'
                    }}
                  >
                    <Avatar name={r.studentName} url={r.studentAvatarUrl} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.studentName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.courseCode} · {fmtDate(r.requestedAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn-success" onClick={(e) => { e.stopPropagation(); decide(r.enrollmentId, 'approve'); }} disabled={busyId === r.enrollmentId} style={{ fontSize: '11.5px', padding: '5px 10px', cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button className="btn-danger" onClick={(e) => { e.stopPropagation(); decide(r.enrollmentId, 'decline'); }} disabled={busyId === r.enrollmentId} style={{ fontSize: '11.5px', padding: '5px 10px', cursor: 'pointer' }}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-premium" style={{ padding: '22px 24px' }}>
            <SectionHeading
              title="Recent Reviews"
              subtitle="What students say about your teaching."
              actions={
                <button className="btn-ghost" onClick={() => onNavigate('reviews')} style={{ fontSize: '12.5px', padding: '6px 12px', cursor: 'pointer' }}>
                  All <ArrowRight size={14} />
                </button>
              }
            />

            {reviews.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                No reviews yet. Reviews appear once students finish your courses.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {reviews.slice(0, 4).map(r => (
                  <div
                    key={r.id}
                    onClick={() => onNavigate('reviews')}
                    className="glass-card-interactive"
                    style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', cursor: 'pointer', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Avatar name={r.studentName} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{r.studentName}</span>
                        <StarRating value={r.rating} size={12} />
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        {r.courseCode} · {fmtDate(r.createdAt)}
                      </div>
                      {r.comment && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{r.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div
            onClick={() => onNavigate('my-courses')}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('my-courses'); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px', padding: '13px 15px',
              borderRadius: 'var(--radius-md)', background: 'var(--success-soft)',
              border: '1px solid var(--success-border)', fontSize: '12.5px', fontWeight: 600, color: 'var(--success)',
              cursor: 'pointer'
            }}
          >
            <TrendingUp size={15} />
            {stats.publishedCourses ?? 0} of {stats.totalCourses ?? 0} courses published
          </div>
        </div>
      </div>
    </div>
  );
}
