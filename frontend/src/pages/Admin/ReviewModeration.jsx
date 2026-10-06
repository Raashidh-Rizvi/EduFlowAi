import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Search, ShieldCheck, EyeOff, Trash2 } from 'lucide-react';
import StarRating from '../../components/marketplace/StarRating';
import { adminReviewService } from '../../services/adminReviewService';

function statusTone(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'rejected': return 'badge-danger';
    default: return 'badge-neutral';
  }
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Platform review moderation (administrators only).
 * Approve publishes a review into every aggregate, reject hides it while
 * keeping the row auditable and reversible, delete removes it permanently.
 */
export default function ReviewModeration() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null); // review id being moderated
  const [notice, setNotice] = useState(null); // { tone, text }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { take: 200 };
      if (statusFilter !== 'All') params.status = statusFilter;
      const data = await adminReviewService.listReviews(params);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.friendlyMessage || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) =>
      (r.studentName || '').toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q) ||
      (r.courseTitle || '').toLowerCase().includes(q) ||
      (r.courseCode || '').toLowerCase().includes(q));
  }, [reviews, search]);

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => r.status === 'Pending').length,
    total: reviews.length
  }), [reviews]);

  const moderate = async (review, action) => {
    if (acting) return;
    if (action === 'delete' && !window.confirm(`Permanently delete this review by ${review.studentName || 'a student'}?`)) return;
    setActing(review.id);
    setNotice(null);
    try {
      if (action === 'approve') {
        await adminReviewService.approveReview(review.id);
        setNotice({ tone: 'success', text: 'Review approved — it is now visible and counted.' });
      } else if (action === 'reject') {
        await adminReviewService.rejectReview(review.id);
        setNotice({ tone: 'success', text: 'Review rejected — it is hidden from every aggregate.' });
      } else {
        await adminReviewService.deleteReview(review.id);
        setNotice({ tone: 'success', text: 'Review deleted permanently.' });
      }
      await load();
    } catch (err) {
      setNotice({ tone: 'error', text: err?.friendlyMessage || 'Moderation failed. Please try again.' });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--primary)" /> Course review moderation
            {counts.pending > 0 && (
              <span className="badge-pill badge-warning" style={{ fontSize: '10.5px' }}>{counts.pending} pending</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Only approved reviews are visible publicly and counted in course and instructor ratings.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px',
            borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-card)', width: '260px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter by student, course or text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
            />
          </div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: '12.5px' }}
            aria-label="Filter by moderation status"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {notice && (
        <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`badge-pill ${notice.tone === 'error' ? 'badge-danger' : 'badge-success'}`} style={{ whiteSpace: 'normal', textAlign: 'left' }}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Loading reviews…</div>
      ) : error ? (
        <div style={{ fontSize: '12.5px', color: 'var(--danger)' }}>{error}</div>
      ) : visible.length === 0 ? (
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
          No reviews match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map((r) => (
            <div key={r.id} className="glass-panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
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
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{r.studentName || 'Student'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {r.courseCode} · {r.courseTitle} · {formatDate(r.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StarRating value={r.rating} size={13} showCount={false} />
                  <span className={`badge-pill ${statusTone(r.status)}`} style={{ fontSize: '10.5px' }}>{r.status}</span>
                </div>
              </div>

              {r.comment ? (
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic', margin: 0 }}>No written comment.</p>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button" className="btn-success" disabled={acting === r.id || r.status === 'Approved'}
                  onClick={() => moderate(r, 'approve')} style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                >
                  <ShieldCheck size={13} /> Approve
                </button>
                <button
                  type="button" className="btn-secondary" disabled={acting === r.id || r.status === 'Rejected'}
                  onClick={() => moderate(r, 'reject')} style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                >
                  <EyeOff size={13} /> Reject
                </button>
                <button
                  type="button" className="btn-ghost" disabled={acting === r.id}
                  onClick={() => moderate(r, 'delete')} style={{ padding: '6px 12px', fontSize: '12px', gap: '6px', color: 'var(--danger)' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
                {acting === r.id && <Star size={14} className="spin" color="var(--primary)" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
