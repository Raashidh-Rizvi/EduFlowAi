import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Search, BookOpen, Inbox, TrendingUp } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StarRating, Avatar, fmtDate, fmtNumber
} from '../shared';

export default function ReviewsView() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [minRating, setMinRating] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await instructorService.getMyReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courses = useMemo(() => {
    const map = new Map();
    reviews.forEach(r => map.set(r.courseId, { id: r.courseId, code: r.courseCode, title: r.courseTitle }));
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [reviews]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter(r => {
      const courseOk = courseId === 'all' || r.courseId === courseId;
      const ratingOk = (Number(r.rating) || 0) >= minRating;
      const searchOk = !q ||
        r.studentName.toLowerCase().includes(q) ||
        (r.comment || '').toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q);
      return courseOk && ratingOk && searchOk;
    });
  }, [reviews, search, courseId, minRating]);

  const average = useMemo(() => {
    // The public score averages APPROVED reviews only (same rule as the
    // backend aggregates), while the list below shows every status.
    const approved = visible.filter((r) => (r.status || 'Approved') === 'Approved');
    return {
      value: approved.length
        ? approved.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / approved.length
        : 0,
      count: approved.length
    };
  }, [visible]);

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: visible.filter(r => Number(r.rating) === star).length
  }));
  const maxCount = Math.max(1, ...distribution.map(d => d.count));

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <SectionHeading
        title="Reviews & Ratings"
        subtitle="Feedback left by students on courses you own."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '20px', alignItems: 'start', marginBottom: '18px' }}>
        <div className="card-premium" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '44px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {fmtNumber(average.value, 1)}
            </div>
            <StarRating value={average.value} size={18} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Based on {average.count} approved review{average.count === 1 ? '' : 's'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '18px' }}>
            {distribution.map(d => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', width: '34px' }}>
                  {d.star} <Star size={10} fill="var(--warning)" color="var(--warning)" style={{ verticalAlign: 'middle' }} />
                </span>
                <div style={{ flex: 1, height: '7px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(d.count / maxCount) * 100}%`, height: '100%',
                    background: 'linear-gradient(90deg, var(--warning), var(--accent))', borderRadius: '999px'
                  }} />
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{d.count}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px', padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
            <TrendingUp size={14} /> Only approved reviews are averaged into your score.
          </div>
        </div>

        <div className="card-premium" style={{ padding: '14px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="glass-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 13px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '200px' }}>
            <Search size={14} color="var(--primary)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reviews by student, comment or course"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
            />
          </div>

          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            style={{
              padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-main)',
              background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', outline: 'none', maxWidth: '240px'
            }}
          >
            <option value="all">All my courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>

          <select
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
            style={{
              padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-main)',
              background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', outline: 'none'
            }}
          >
            <option value={0}>Any rating</option>
            <option value={4}>4★ and up</option>
            <option value={3}>3★ and up</option>
            <option value={2}>2★ and up</option>
            <option value={1}>1★ only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading reviews" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No reviews found"
          description="Reviews appear once enrolled students rate your courses. Adjust the filters to see others."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
          {visible.map(r => (
            <div key={r.id} className="card-premium" style={{ padding: '19px 20px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Avatar name={r.studentName} url={r.studentAvatarUrl} size={38} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)' }}>{r.studentName}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{fmtDate(r.createdAt)}</div>
                  </div>
                </div>
                <StarRating value={r.rating} size={14} />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                <BookOpen size={13} color="var(--primary)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{r.courseCode}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>· {r.courseTitle}</span>
                {r.status && r.status !== 'Approved' && (
                  <span
                    className={`badge-pill ${r.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}
                    style={{ fontSize: '10px' }}
                    title={r.status === 'Pending' ? 'Awaiting administrator moderation — hidden publicly until approved.' : 'Hidden by an administrator — excluded from every aggregate.'}
                  >
                    {r.status}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {r.comment || 'No written comment was left with this rating.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
