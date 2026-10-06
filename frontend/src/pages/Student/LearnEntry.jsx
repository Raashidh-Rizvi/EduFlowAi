import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Lock, GraduationCap } from 'lucide-react';
import CrescentLoader from '../../components/common/CrescentLoader';
import { enrollmentService } from '../../services/enrollmentService';
import { useAuth } from '../../context/AuthContext';

/**
 * /learn/:courseId — entry point to the student learning experience.
 *
 * SECURITY MODEL: authorization is decided by the backend. The client never
 * infers access from locally cached data — GET /courses/{id}/access resolves
 * the caller from the JWT and reports whether protected materials may open.
 *   * not logged in            → redirected to login, then straight back here
 *   * approved enrollment      → into the student portal for this course
 *   * pending / none / unpaid  → explanation screen + back to the course page
 */
export default function LearnEntry() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [access, setAccess] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('eduflow_token')));

  useEffect(() => {
    // Anonymous visitors go straight to login with a return path — no API probe needed.
    if (!localStorage.getItem('eduflow_token')) {
      setChecking(false);
      return;
    }
    let alive = true;
    enrollmentService.getCourseAccess(courseId)
      .then((result) => {
        if (alive) setAccess(result);
      })
      .catch(() => {
        if (alive) setAccess({ hasAccess: false, reason: 'We could not verify your enrollment for this course.' });
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => { alive = false; };
  }, [courseId]);

  if (checking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
        <span className="crescent-arc" style={{ '--crescent-size': '20px' }} aria-hidden="true" />
        <span>Checking your enrollment…</span>
      </div>
    );
  }

  if (!currentUser) {
    // `next` returns the student to this exact learning entry after sign-in.
    return <Navigate to={`/login?next=${encodeURIComponent(`/learn/${courseId}`)}`} replace />;
  }

  if (access?.hasAccess) {
    // Enrolled (or owner/admin): open the student console on the Enrollment
    // workspace with this course's page on top (details, curriculum, quiz).
    // The portal re-verifies the same access server-side before rendering it.
    try {
      sessionStorage.setItem('eduflow_student_active_tab', 'enrollments');
      sessionStorage.setItem('eduflow_student_open_course', String(courseId));
    } catch { /* ignore */ }
    return <Navigate to="/console" replace />;
  }

  return (
    <div className="mk-container" style={{ minHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="mk-detail__side-card" style={{ maxWidth: 460, textAlign: 'center', padding: '34px 30px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'var(--primary-soft, rgba(99,102,241,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
        }}>
          <Lock size={26} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 20, fontFamily: 'var(--font-display, inherit)', margin: 0 }}>Learning materials locked</h1>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
          {access?.reason || 'You are not enrolled in this course yet.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
          <Link to={`/courses/${courseId}`} className="btn-primary">
            <GraduationCap size={15} aria-hidden="true" /> Back to course page
          </Link>
          <button type="button" className="btn-secondary" onClick={() => navigate('/courses')}>
            Browse other courses
          </button>
        </div>
      </div>
    </div>
  );
}

