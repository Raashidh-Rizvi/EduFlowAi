import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, PlusCircle, Users, Layers, FileQuestion, Search, Filter } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import { courseService } from '../../../services/courseService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StarRating, fmtMoney, fmtNumber
} from '../shared';

const DIFFICULTY_TONE = {
  Easy: 'badge-success',
  Medium: 'badge-primary',
  Hard: 'badge-warning',
  Boss: 'badge-danger'
};

export default function MyCoursesView({ onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await instructorService.getMyCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load your courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (course) => {
    setBusyId(course.id);
    try {
      const next = !course.isPublished;
      await courseService.publishCourse(course.id, next);
      setCourses(prev => prev.map(c =>
        c.id === course.id ? { ...c, isPublished: next, status: next ? 'Published' : 'Draft' } : c
      ));
    } catch (err) {
      setError(err.friendlyMessage || 'Could not update this course.');
    } finally {
      setBusyId(null);
    }
  };

  const removeCourse = async (course) => {
    const ok = window.confirm(`Delete ${course.code}: ${course.title}? This cannot be undone.`);
    if (!ok) return;
    setBusyId(course.id);
    try {
      await courseService.deleteCourse(course.id);
      setCourses(prev => prev.filter(c => c.id !== course.id));
    } catch (err) {
      setError(err.friendlyMessage || 'Could not delete this course.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter(c => {
      const matchesQuery = !q ||
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'published' && c.isPublished) ||
        (filter === 'draft' && !c.isPublished) ||
        (filter === 'pending' && (c.pendingEnrollmentCount || 0) > 0);
      return matchesQuery && matchesFilter;
    });
  }, [courses, query, filter]);

  const pendingTotal = courses.reduce((sum, c) => sum + (c.pendingEnrollmentCount || 0), 0);

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <SectionHeading
        title="My Courses"
        subtitle="Every course below is owned by you. Other instructors' courses are never visible here."
        actions={
          <button className="btn-primary" onClick={() => onNavigate('create-course')}>
            <PlusCircle size={15} /> Create Course
          </button>
        }
      />

      <div className="card-premium" style={{ padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="glass-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 13px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '220px' }}>
          <Search size={14} color="var(--primary)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your courses by title, code or category"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-muted)" />
          {[
            { id: 'all', label: 'All' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Draft' },
            { id: 'pending', label: `Pending (${pendingTotal})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading your courses" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={courses.length === 0 ? 'You have not created a course yet' : 'No courses match your filters'}
          description={courses.length === 0
            ? 'Create a course, add modules and lessons, then publish it to start enrolling students.'
            : 'Try a different search term or clear the active filter.'}
          action={courses.length === 0
            ? <button className="btn-primary" onClick={() => onNavigate('create-course')}>Create Course</button>
            : <button className="btn-secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
          {visible.map(c => (
            <div key={c.id} className="card-premium glass-card-interactive" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary-soft), var(--secondary-soft))',
                  border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <BookOpen size={20} color="var(--primary)" />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`badge-pill ${c.isPublished ? 'badge-success' : 'badge-neutral'}`}>
                    {c.isPublished ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                  <span className={`badge-pill ${DIFFICULTY_TONE[c.difficulty] || 'badge-neutral'}`}>
                    {c.difficulty || 'All levels'}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.04em' }}>
                  {c.code} · {c.category}
                </div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-main)', margin: '5px 0 0', lineHeight: 1.35 }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '7px 0 0', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.description || 'No description yet.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={13} /> {c.enrollmentCount ?? 0} enrolled
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Layers size={13} /> {c.modulesCount ?? 0} modules
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <FileQuestion size={13} /> {c.quizzesCount ?? 0} quizzes
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                <StarRating value={c.averageRating} size={13} showValue count={c.ratingCount ?? 0} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {c.isFree ? 'Free' : fmtMoney(c.price)}
                </span>
              </div>

              {(c.pendingEnrollmentCount || 0) > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate('enrollment-requests')}
                  style={{ fontSize: '12px', justifyContent: 'center' }}
                >
                  {c.pendingEnrollmentCount} pending enrollment request{c.pendingEnrollmentCount === 1 ? '' : 's'}
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                <button className="btn-primary" onClick={() => onNavigate('courses')} style={{ fontSize: '12px', padding: '8px 10px' }}>
                  Manage Curriculum
                </button>
                <button
                  className={c.isPublished ? 'btn-secondary' : 'btn-success'}
                  onClick={() => togglePublish(c)}
                  disabled={busyId === c.id}
                  style={{ fontSize: '12px', padding: '8px 10px' }}
                >
                  {c.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn-ghost" onClick={() => onNavigate('assessments')} style={{ fontSize: '12px', padding: '8px 10px' }}>
                  Assessments
                </button>
                <button className="btn-danger" onClick={() => removeCourse(c)} disabled={busyId === c.id} style={{ fontSize: '12px', padding: '8px 10px' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
