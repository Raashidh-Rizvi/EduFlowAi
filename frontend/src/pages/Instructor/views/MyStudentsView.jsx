import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Search, BookOpen, Inbox } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import {
  SectionHeading, LoadingBlock, EmptyState, ErrorBanner, StatusPill, Avatar, fmtDate, fmtNumber
} from '../shared';

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'var(--bg-input)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '999px',
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', minWidth: '34px', textAlign: 'right' }}>
        {fmtNumber(pct, 0)}%
      </span>
    </div>
  );
}

export default function MyStudentsView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await instructorService.getMyStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load your students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courses = useMemo(() => {
    const map = new Map();
    students.forEach(s => map.set(s.courseId, { id: s.courseId, code: s.courseCode, title: s.courseTitle }));
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [students]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      const courseOk = courseId === 'all' || s.courseId === courseId;
      const searchOk = !q ||
        s.fullName.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        s.courseTitle.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q);
      return courseOk && searchOk;
    });
  }, [students, search, courseId]);

  const uniqueStudents = new Set(visible.map(s => s.studentId)).size;
  const avgProgress = visible.length
    ? visible.reduce((sum, s) => sum + (Number(s.progressPercentage) || 0), 0) / visible.length
    : 0;

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <SectionHeading
        title="My Students"
        subtitle="Roster across every course you own — enrollments you do not own are never returned."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {[
          { label: 'Roster Entries', value: visible.length },
          { label: 'Unique Students', value: uniqueStudents },
          { label: 'My Courses', value: courses.length },
          { label: 'Avg Progress', value: `${fmtNumber(avgProgress, 0)}%` }
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>{m.value}</div>
            </div>
            <Users size={18} color="var(--primary)" />
          </div>
        ))}
      </div>

      <div className="card-premium" style={{ padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="glass-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 13px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '220px' }}>
          <Search size={14} color="var(--primary)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students by name, email or course"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '12.5px', width: '100%' }}
          />
        </div>
        <select
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          style={{
            padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-main)',
            background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', outline: 'none', maxWidth: '250px'
          }}
        >
          <option value="all">All my courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingBlock label="Loading your roster" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No students found"
          description="Approve enrollment requests to build your roster, or adjust the current filters."
        />
      ) : (
        <div className="card-premium" style={{ padding: '6px 0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                {['Student', 'Course', 'Progress', 'Status', 'Enrolled'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '13px 18px', fontSize: '11px', fontWeight: 800,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => (
                <tr key={`${s.studentId}-${s.courseId}-${i}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <Avatar name={s.fullName} url={s.avatarUrl} size={34} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.fullName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                      <BookOpen size={13} color="var(--primary)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>{s.courseCode}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', maxWidth: '260px' }}>
                      {s.courseTitle}
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}><ProgressBar value={s.progressPercentage} /></td>
                  <td style={{ padding: '13px 18px' }}><StatusPill status={s.status} /></td>
                  <td style={{ padding: '13px 18px', color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{fmtDate(s.enrolledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
