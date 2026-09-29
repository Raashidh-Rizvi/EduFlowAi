import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, PlusCircle, Users, Layers, FileQuestion, Search, Filter, Pencil, X } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import { courseService } from '../../../services/courseService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StarRating, fmtMoney, fmtNumber
} from '../shared';
import CourseMetadataFields, { metadataPayload, metadataFormState } from './CourseMetadataFields';

const FIELD = {
  width: '100%', padding: '10px 13px', fontSize: '13px', color: 'var(--text-main)',
  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)', outline: 'none', transition: 'border-color 0.15s ease'
};

const LABEL = {
  display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px'
};

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
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

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

  const openEdit = (course) => {
    setEditing(course);
    setEditError('');
    setEditForm({
      code: course.code || '',
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      term: course.term || 'Fall 2026',
      difficulty: course.difficulty || 'Medium',
      durationHours: course.durationHours ?? 0,
      isFree: Boolean(course.isFree),
      price: course.price ?? 0,
      thumbnailUrl: course.thumbnailUrl || '',
      ...metadataFormState(course)
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm(null);
    setEditError('');
  };

  const updateEdit = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || !editForm) return;
    if (!editForm.title.trim() || !editForm.code.trim() || !editForm.category.trim()) {
      setEditError('Course title, code and category are required.');
      return;
    }
    if (!editForm.isFree && Number(editForm.price) <= 0) {
      setEditError('Set a price greater than zero, or mark the course as free.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const payload = {
        code: editForm.code.trim(),
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        thumbnailUrl: editForm.thumbnailUrl.trim() || null,
        term: editForm.term.trim() || 'Fall 2026',
        difficulty: editForm.difficulty,
        durationHours: Number(editForm.durationHours) || 0,
        price: editForm.isFree ? 0 : Number(editForm.price),
        isFree: Boolean(editForm.isFree),
        ...metadataPayload(editForm)
      };
      const updated = await courseService.updateCourse(editing.id, payload);
      setCourses(prev => prev.map(c => (c.id === editing.id ? { ...c, ...updated } : c)));
      closeEdit();
    } catch (err) {
      setEditError(err.friendlyMessage || 'Could not save your changes.');
    } finally {
      setSaving(false);
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
                <button className="btn-secondary" onClick={() => openEdit(c)} style={{ fontSize: '12px', padding: '8px 10px' }}>
                  <Pencil size={13} /> Edit Course
                </button>
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
                <button className="btn-danger" onClick={() => removeCourse(c)} disabled={busyId === c.id} style={{ fontSize: '12px', padding: '8px 10px', gridColumn: '1 / -1' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && editForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editing.title}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4, 8, 18, 0.72)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '6vh 16px 32px', overflowY: 'auto'
          }}
        >
          <form
            onSubmit={saveEdit}
            className="card-premium"
            style={{ width: '100%', maxWidth: '620px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Edit course</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Ownership and publish state are never changed from this form.
                </p>
              </div>
              <button type="button" className="btn-ghost" onClick={closeEdit} aria-label="Close" style={{ padding: '7px' }}>
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div role="alert" style={{
                padding: '11px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 600,
                backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)'
              }}>
                {editError}
              </div>
            )}

            <div>
              <label style={LABEL}>Course Title <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input aria-label="Course Title" value={editForm.title} onChange={updateEdit('title')} style={FIELD} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '14px' }}>
              <div>
                <label style={LABEL}>Course Code <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input aria-label="Course Code" value={editForm.code} onChange={updateEdit('code')} style={FIELD} />
              </div>
              <div>
                <label style={LABEL}>Category <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input aria-label="Category" value={editForm.category} onChange={updateEdit('category')} style={FIELD} />
              </div>
            </div>

            <div>
              <label style={LABEL}>Description</label>
              <textarea
                aria-label="Description"
                value={editForm.description}
                onChange={updateEdit('description')}
                rows={4}
                style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={LABEL}>Term</label>
                <input aria-label="Term" value={editForm.term} onChange={updateEdit('term')} style={FIELD} />
              </div>
              <div>
                <label style={LABEL}>Difficulty</label>
                <select aria-label="Difficulty" value={editForm.difficulty} onChange={updateEdit('difficulty')} style={FIELD}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Boss">Boss</option>
                </select>
              </div>
              <div>
                <label style={LABEL}>Duration (hours)</label>
                <input aria-label="Duration (hours)" type="number" min="0" value={editForm.durationHours} onChange={updateEdit('durationHours')} style={FIELD} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={LABEL}>Thumbnail URL</label>
                <input aria-label="Thumbnail URL" value={editForm.thumbnailUrl} onChange={updateEdit('thumbnailUrl')} placeholder="https://…" style={FIELD} />
              </div>
              <div>
                <label style={LABEL}>{editForm.isFree ? 'Price' : 'Price (USD)'}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={editForm.isFree ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => setEditForm(p => ({ ...p, isFree: true, price: 0 }))}
                    style={{ flex: 1, fontSize: '12.5px' }}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    className={!editForm.isFree ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => setEditForm(p => ({ ...p, isFree: false }))}
                    style={{ flex: 1, fontSize: '12.5px' }}
                  >
                    Paid
                  </button>
                </div>
                {!editForm.isFree && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={updateEdit('price')}
                    style={{ ...FIELD, marginTop: '8px' }}
                  />
                )}
              </div>
            </div>

            <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }} />

            <CourseMetadataFields form={editForm} update={updateEdit} />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
              <button type="button" className="btn-ghost" onClick={closeEdit} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
