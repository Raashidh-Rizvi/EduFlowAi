import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, Search, Check, X, Inbox, BookOpen } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StatusPill, Avatar, fmtDate
} from '../shared';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' }
];

export default function EnrollmentRequestsView({ onNavigate, onDecisionMade }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [courseId, setCourseId] = useState('all');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await instructorService.getEnrollmentRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load enrollment requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courses = useMemo(() => {
    const map = new Map();
    requests.forEach(r => map.set(r.courseId, { id: r.courseId, code: r.courseCode, title: r.courseTitle }));
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [requests]);

  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    requests.forEach(r => {
      const s = String(r.status || '').toLowerCase();
      if (s === 'pending') c.pending++;
      else if (s === 'active' || s === 'completed') c.approved++;
      else if (s === 'rejected') c.rejected++;
      else if (s === 'cancelled') c.cancelled++;
    });
    return c;
  }, [requests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      const s = String(r.status || '').toLowerCase();
      const tabOk =
        tab === 'all' ||
        (tab === 'pending' && s === 'pending') ||
        (tab === 'approved' && (s === 'active' || s === 'completed')) ||
        (tab === 'rejected' && s === 'rejected') ||
        (tab === 'cancelled' && s === 'cancelled');
      const courseOk = courseId === 'all' || r.courseId === courseId;
      const searchOk = !q ||
        r.studentName.toLowerCase().includes(q) ||
        (r.studentEmail || '').toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q);
      return tabOk && courseOk && searchOk;
    });
  }, [requests, tab, courseId, search]);

  const decide = async (enrollmentId, action) => {
    setBusyId(enrollmentId);
    try {
      const note = (notes[enrollmentId] || '').trim();
      if (action === 'approve') await instructorService.approveEnrollment(enrollmentId, note || undefined);
      else await instructorService.declineEnrollment(enrollmentId, note || undefined);

      setRequests(prev => prev.map(r =>
        r.enrollmentId === enrollmentId
          ? {
              ...r,
              status: action === 'approve' ? 'Active' : 'Rejected',
              statusLabel: action === 'approve' ? 'APPROVED' : 'REJECTED',
              reviewNotes: note || (action === 'approve' ? 'Approved by instructor.' : 'Rejected by instructor.'),
              reviewedAt: new Date().toISOString()
            }
          : r
      ));
      setNotes(prev => ({ ...prev, [enrollmentId]: '' }));
      if (onDecisionMade) onDecisionMade();
    } catch (err) {
      setError(err.friendlyMessage || 'The decision could not be saved.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <SectionHeading
        title="Enrollment Requests"
        subtitle="Students must be approved before they can open your course materials."
        actions={
          <button className="btn-ghost" onClick={() => onNavigate('my-courses')} style={{ fontSize: '12.5px' }}>
            <BookOpen size={14} /> My Courses
          </button>
        }
      />

      <div className="card-premium" style={{ padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: '12px', padding: '6px 13px' }}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            style={{
              padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-main)',
              background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', outline: 'none', maxWidth: '230px'
            }}
          >
            <option value="all">All my courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
            ))}
          </select>

          <div className="glass-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 13px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '180px' }}>
            <Search size={14} color="var(--primary)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or course"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading enrollment requests" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing to review here"
          description="No enrollment requests match the selected status, course or search."
          action={search || courseId !== 'all'
            ? <button className="btn-secondary" onClick={() => { setSearch(''); setCourseId('all'); }}>Clear filters</button>
            : null}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map(r => (
            <div key={r.enrollmentId} className="card-premium" style={{ padding: '17px 19px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Avatar name={r.studentName} url={r.studentAvatarUrl} size={44} />

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)' }}>{r.studentName}</span>
                    <StatusPill status={r.statusLabel || r.status} />
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {r.studentEmail}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '7px' }}>
                    <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{r.courseCode}</strong>
                    {' · '}{r.courseTitle}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    Requested {fmtDate(r.requestedAt)}
                    {r.reviewedAt && <> · Reviewed {fmtDate(r.reviewedAt)}</>}
                    {r.studentProfileSummary && <> · {r.studentProfileSummary}</>}
                  </div>
                  {r.reviewNotes && (
                    <div style={{
                      fontSize: '12px', color: 'var(--text-secondary)', marginTop: '9px',
                      padding: '7px 11px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)'
                    }}>
                      {r.reviewNotes}
                    </div>
                  )}
                </div>

                {String(r.status).toLowerCase() === 'pending' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '250px' }}>
                    <input
                      value={notes[r.enrollmentId] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.enrollmentId]: e.target.value }))}
                      placeholder="Note to student (optional)"
                      style={{
                        padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-main)',
                        background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)', outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-success"
                        onClick={() => decide(r.enrollmentId, 'approve')}
                        disabled={busyId === r.enrollmentId}
                        style={{ flex: 1, fontSize: '12.5px' }}
                      >
                        <Check size={14} /> {busyId === r.enrollmentId ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => decide(r.enrollmentId, 'decline')}
                        disabled={busyId === r.enrollmentId}
                        style={{ flex: 1, fontSize: '12.5px' }}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <UserCheck size={14} /> Decided
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
