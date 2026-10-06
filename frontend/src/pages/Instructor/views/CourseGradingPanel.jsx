import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { gradingService, ATTEMPT_SCORING } from '../../../services/gradingService';
import { LoadingBlock, ErrorBanner } from '../shared';

const FIELD = {
  padding: '8px 10px', fontSize: '13px', color: 'var(--text-main)',
  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)', outline: 'none'
};

/**
 * Edits a course's grading configuration: assessment weights, which attempt counts, and
 * activation. Weights are stored by the server, which also enforces that they total exactly
 * 100% before grading can be activated; this panel never normalizes them.
 */
export default function CourseGradingPanel({ course, onClose }) {
  const [config, setConfig] = useState(null);
  const [weights, setWeights] = useState({});
  const [attemptScoring, setAttemptScoring] = useState('Highest');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gradingService.getConfiguration(course.id);
      setConfig(data);
      setAttemptScoring(data.attemptScoring);
      setWeights(Object.fromEntries(data.assessments.map(a => [a.assessmentId, a.weightPercent ?? ''])));
      setGrades(data.status === 'Active' ? await gradingService.getCourseGrades(course.id) : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load the grading configuration.');
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(
    () => Object.values(weights).reduce((sum, w) => sum + (w === '' ? 0 : Number(w) || 0), 0),
    [weights]
  );

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await gradingService.saveConfiguration(course.id, {
        attemptScoring: ATTEMPT_SCORING[attemptScoring],
        weights: Object.entries(weights).map(([assessmentId, w]) => ({
          assessmentId,
          weightPercent: w === '' ? null : Number(w)
        }))
      });
      setNotice(res.message);
      await load();
    } catch (err) {
      const details = err.response?.data?.errors;
      setError([err.friendlyMessage || 'Could not save grading.', ...(details || [])].join(' '));
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await gradingService.activate(course.id);
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err.friendlyMessage || 'Could not activate grading.');
    } finally {
      setSaving(false);
    }
  };

  const override = async (student) => {
    const grade = window.prompt(`Override grade for ${student.studentName} (leave empty to remove the override):`, student.overrideGrade || '');
    if (grade === null) return;
    const reason = window.prompt('Reason for this change (required):');
    if (!reason || !reason.trim()) return;
    try {
      await gradingService.overrideGrade(course.id, student.studentId, grade.trim() || null, reason.trim());
      await load();
    } catch (err) {
      setError(err.friendlyMessage || 'Could not override the grade.');
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Grading for ${course.title}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4, 8, 18, 0.72)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '6vh 16px 32px', overflowY: 'auto'
      }}
    >
      <div className="card-premium" style={{ width: '100%', maxWidth: '680px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Grading — {course.code}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Weights must total exactly 100% before grading can be activated.
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close" style={{ padding: '7px' }}>
            <X size={16} />
          </button>
        </div>

        {error && <ErrorBanner message={error} />}
        {notice && <div style={{ fontSize: '12.5px', color: 'var(--success)', fontWeight: 600 }}>{notice}</div>}

        {loading || !config ? <LoadingBlock /> : (
          <>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge-pill ${config.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>{config.status}</span>
              <label style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Attempt that counts:{' '}
                <select value={attemptScoring} onChange={(e) => setAttemptScoring(e.target.value)} style={FIELD}>
                  <option value="Highest">Highest</option>
                  <option value="Latest">Latest</option>
                </select>
              </label>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Scale: {config.policy.name} ({config.policy.bands.map(b => `${b.label} ≥${b.minPercentage}`).join(', ')})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {config.assessments.length === 0 && (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>This course has no assessments yet.</div>
              )}
              {config.assessments.map(a => (
                <div key={a.assessmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    {a.title} <span style={{ color: 'var(--text-muted)' }}>({a.status})</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Not graded"
                      aria-label={`Weight for ${a.title}`}
                      value={weights[a.assessmentId] ?? ''}
                      onChange={(e) => setWeights(prev => ({ ...prev, [a.assessmentId]: e.target.value }))}
                      style={{ ...FIELD, width: '110px' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
                  </span>
                </div>
              ))}
              <div style={{ fontSize: '13px', fontWeight: 700, color: total === 100 ? 'var(--success)' : 'var(--warning)' }}>
                Total: {total}%{total !== 100 && ' — must be exactly 100% to activate'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save weights'}
              </button>
              {config.status !== 'Active' && (
                <button type="button" className="btn-primary" onClick={activate} disabled={saving || !config.canActivate}>
                  Activate grading
                </button>
              )}
            </div>

            {config.status === 'Active' && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>Course results</div>
                {grades.length === 0 && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No results yet.</div>}
                {grades.map(g => (
                  <div key={g.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--text-main)' }}>{g.studentName}</span>
                    <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {g.coursePercentage}%{!g.isComplete && ` (assessed ${g.assessedWeight}%)`}
                      </span>
                      <strong>{g.overrideGrade ? `${g.overrideGrade} (override; calculated ${g.calculatedGrade})` : g.calculatedGrade}</strong>
                      <button type="button" className="btn-ghost" onClick={() => override(g)} style={{ padding: '3px 8px', fontSize: '11px' }}>
                        Override
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
