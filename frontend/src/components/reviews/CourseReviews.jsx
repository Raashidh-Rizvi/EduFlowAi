import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Pencil, Trash2, Star } from 'lucide-react';
import StarRating from '../marketplace/StarRating';
import { reviewService } from '../../services/reviewService';
import StarInput from './StarInput';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Course rating + review section shared by every surface that shows a course.
 *
 * - Everyone sees the live average, the total count and the approved reviews.
 * - Signed-in students see a submit form; when they already reviewed, the form
 *   becomes an editor prefilled with their own review (plus delete).
 * - Instructors and anonymous visitors get the read-only list (instructors can
 *   never modify student ratings — the backend rejects it by role policy).
 */
export default function CourseReviews({ courseId, currentUser, onChanged }) {
  const [reviews, setReviews] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState({ rating: 5, comment: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: 'success'|'error', text }

  const isStudent = currentUser?.role === 'Student';

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await reviewService.listCourseReviews(courseId);
      setReviews(Array.isArray(list) ? list : []);
      if (isStudent) {
        try {
          const own = await reviewService.getMyReview(courseId);
          if (own?.hasReview && own.review) {
            setMine(own.review);
            if (!editing) setDraft({ rating: own.review.rating || 5, comment: own.review.comment || '' });
          } else {
            setMine(null);
          }
        } catch {
          setMine(null); // students without access simply have no editable review
        }
      } else {
        setMine(null);
      }
    } catch (err) {
      setLoadError(err?.friendlyMessage || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, [courseId, isStudent, editing]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const count = reviews.length;
    const average = count > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => Number(r.rating) === star).length
    }));
    return { count, average, distribution };
  }, [reviews]);

  const submitErrorText = (err) =>
    err?.response?.status === 403
      ? (err?.response?.data?.message || 'Only students actively enrolled in this course can leave a review.')
      : (err?.friendlyMessage || 'We could not save your review.');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await reviewService.submitReview(courseId, {
        rating: Number(draft.rating),
        comment: draft.comment
      });
      const saved = result?.review || null;
      setMine(saved);
      setEditing(false);
      setDraft({ rating: saved?.rating || 5, comment: saved?.comment || '' });
      setNotice({
        tone: 'success',
        text: saved?.status === 'Pending'
          ? 'Thanks — your review was submitted and is awaiting moderation.'
          : 'Thanks — your rating is now live.'
      });
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setNotice({ tone: 'error', text: submitErrorText(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!mine || removing) return;
    if (!window.confirm('Delete your review for this course? This cannot be undone.')) return;
    setRemoving(true);
    setNotice(null);
    try {
      await reviewService.deleteReview(courseId, mine.id);
      setMine(null);
      setDraft({ rating: 5, comment: '' });
      setEditing(false);
      setNotice({ tone: 'success', text: 'Your review was deleted.' });
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setNotice({ tone: 'error', text: submitErrorText(err) });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card-premium" style={{ padding: '20px 22px' }}>
        <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '10px' }}>
          RATINGS &amp; REVIEWS
        </div>
        {loading ? (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Loading reviews…</div>
        ) : loadError ? (
          <div style={{ fontSize: '12.5px', color: 'var(--danger)' }}>{loadError}</div>
        ) : (
          <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <div style={{ fontSize: '34px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {summary.count > 0 ? summary.average.toFixed(1) : '–'}
              </div>
              <StarRating value={summary.average} count={summary.count} size={15} />
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {summary.count} review{summary.count === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {summary.distribution.map((d) => (
                <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', width: '30px' }}>
                    {d.star} <Star size={10} fill="var(--warning)" color="var(--warning)" style={{ verticalAlign: 'middle' }} />
                  </span>
                  <div style={{ flex: 1, height: '7px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${summary.count > 0 ? (d.count / summary.count) * 100 : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--warning), var(--accent))',
                      borderRadius: '999px'
                    }} />
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isStudent && (
        <div className="card-premium" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            {mine ? 'Your review' : 'Rate this course'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {mine
              ? 'You can update your rating at any time — only your latest review counts.'
              : 'Only students with a verified (active or completed) enrollment can leave a review.'}
          </div>

          {notice && (
            <div
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={`badge-pill ${notice.tone === 'error' ? 'badge-danger' : 'badge-success'}`}
              style={{ marginBottom: '12px', whiteSpace: 'normal', textAlign: 'left' }}
            >
              {notice.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StarInput value={Number(draft.rating) || 0} onChange={(v) => setDraft((d) => ({ ...d, rating: v }))} disabled={saving} />
            <label className="form-label" htmlFor={`review-comment-${courseId}`}>
              Written review <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id={`review-comment-${courseId}`}
              className="form-textarea"
              rows={3}
              maxLength={2000}
              placeholder="What did you think of this course?"
              value={draft.comment}
              onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
              disabled={saving}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="submit" className="btn-primary" disabled={saving || !(Number(draft.rating) >= 1)} style={{ padding: '8px 18px', fontSize: '12.5px' }}>
                {saving ? 'Saving…' : mine ? 'Update review' : 'Submit review'}
              </button>
              {mine && (
                <button type="button" className="btn-ghost" disabled={removing || saving} onClick={handleDelete} style={{ padding: '8px 14px', fontSize: '12.5px', color: 'var(--danger)' }}>
                  <Trash2 size={14} /> {removing ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {mine && editing && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setDraft({ rating: mine.rating || 5, comment: mine.comment || '' });
                  }}
                  style={{ padding: '8px 14px', fontSize: '12.5px' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!loading && !loadError && reviews.length === 0 && (
          <div className="card-premium" style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            <MessageSquareText size={20} style={{ marginBottom: '6px' }} />
            <div>No reviews yet — be the first enrolled student to rate this course.</div>
          </div>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="card-premium" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 800, color: 'var(--primary)', flexShrink: 0
                }}>
                  {(r.studentName || 'S')[0]}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {r.studentName || 'Student'}
                    {mine && r.id === mine.id && (
                      <span className="badge-pill badge-secondary" style={{ marginLeft: '8px', fontSize: '10px' }}>Your review</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</div>
                </div>
              </div>
              <StarRating value={r.rating} size={13} showCount={false} />
            </div>
            {r.comment ? (
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic', margin: 0 }}>No written comment was left with this rating.</p>
            )}
            {mine && r.id === mine.id && !editing && (
              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(true);
                    setDraft({ rating: mine.rating || 5, comment: mine.comment || '' });
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                >
                  <Pencil size={13} /> Edit your review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
