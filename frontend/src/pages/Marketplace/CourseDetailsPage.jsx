import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Clock, BookOpen, Layers, Users, BarChart3,
  CheckCircle2, PlayCircle, Star, ShieldCheck, AlertCircle, Loader2, GraduationCap, Send,
  Zap, Award, Target, Globe2, Eye, Lock, X, ListChecks, FileText, List, Plus, Trash2, Edit3, Save, Wand2, Sparkles, MessageSquare, Bell, Type, ChevronRight, ChevronUp, MoreVertical
} from 'lucide-react';
import Avatar from '../../components/marketplace/Avatar';
import StarRating from '../../components/marketplace/StarRating';
import { SkeletonBlock } from '../../components/marketplace/Skeletons';
import { ErrorState, EmptyState } from '../../components/marketplace/States';
import { generateUUID } from '../../services/supportService';
import { aiService } from '../../services/aiService';
import { quizService } from '../../services/quizService';
import { marketplaceService } from '../../services/marketplaceService';
import { reviewService } from '../../services/reviewService';
import { courseService } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import {
  formatMinutes, formatPrice, formatCount, levelLabel, timeAgo
} from '../../utils/marketplaceFormat';

/**
 * Keeps the document head in sync with the loaded course: title, meta
 * description, Open Graph tags and a canonical URL, so a shared course link
 * previews correctly everywhere. Restores nothing on unmount — the next page
 * overwrites the tags it owns.
 */
function useCourseDocumentMeta(course) {
  useEffect(() => {
    if (!course) return undefined;
    const title = `${course.title} | EduFlow`;
    const description = (course.shortDescription || course.description || '').slice(0, 160);
    const canonical = `${window.location.origin}/courses/${course.id}`;

    document.title = title;

    const setMeta = (selector, attr, content) => {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        const [, name] = selector.match(/\[(?:name|property)="([^"]+)"\]/) || [];
        if (selector.includes('property=')) tag.setAttribute('property', name);
        else tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
      tag.setAttribute(attr, content);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:url"]', 'content', canonical);
    if (course.thumbnailUrl) {
      setMeta('meta[property="og:image"]', 'content', course.thumbnailUrl);
    }

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    // Course structured data (schema.org) for search engines.
    const LD_ID = 'eduflow-course-jsonld';
    document.getElementById(LD_ID)?.remove();
    const ld = document.createElement('script');
    ld.id = LD_ID;
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description,
      provider: { '@type': 'Organization', name: 'EduFlow' },
      inLanguage: course.language || 'English',
      ...(course.averageRating > 0
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: course.averageRating, reviewCount: course.ratingCount || 1 } }
        : {})
    });
    document.head.appendChild(ld);

    return () => {
      document.getElementById(LD_ID)?.remove();
    };
  }, [course]);
}

/** Modal that streams a single free-preview lesson body to an anonymous visitor. */
function FreePreviewModal({ preview, loading, error, onClose }) {
  if (!loading && !error && !preview) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={preview ? `Free preview: ${preview.title}` : 'Free preview'}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        backgroundColor: 'rgba(10, 15, 30, 0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="mk-preview__dialog"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'var(--bg-card, #fff)', color: 'var(--text-main, #111)',
          borderRadius: 'var(--radius-lg, 16px)', maxWidth: '760px', width: '100%',
          maxHeight: '86vh', overflowY: 'auto', padding: '26px 28px', position: 'relative',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {loading && (
          <p style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <Loader2 size={16} className="spin" aria-hidden="true" /> Loading preview…
          </p>
        )}

        {error && (
          <p style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--danger, #b91c1c)' }}>
            <Lock size={16} aria-hidden="true" /> {error}
          </p>
        )}

        {preview && (
          <>
            <span className="mk-chip mk-chip--category" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Eye size={12} aria-hidden="true" /> Free Preview
            </span>
            <h2 style={{ margin: '12px 0 6px', fontSize: 22, fontFamily: 'var(--font-display, inherit)' }}>{preview.title}</h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted, #666)' }}>
              {preview.courseTitle} · {preview.estimatedMinutes ? `${preview.estimatedMinutes} min read` : 'Self-paced'}
            </p>
            <div className="mk-preview__body" style={{
              marginTop: 18, fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-main, #111)'
            }}>
              {preview.content}
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to={`/courses/${preview.courseId}`} className="btn-primary" onClick={onClose}>
                Enroll to unlock every lesson
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mk-detail" aria-hidden="true">
      <div className="mk-detail__hero">
        <div className="mk-detail__hero-text">
          <SkeletonBlock width={120} height={12} />
          <SkeletonBlock width="85%" height={34} />
          <SkeletonBlock width="70%" height={34} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="90%" height={14} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <SkeletonBlock width={130} height={20} radius="var(--radius-full)" />
            <SkeletonBlock width={130} height={20} radius="var(--radius-full)" />
            <SkeletonBlock width={130} height={20} radius="var(--radius-full)" />
          </div>
        </div>
        <SkeletonBlock width={380} height={240} radius="var(--radius-lg)" />
      </div>
      <div className="mk-detail__layout">
        <div className="mk-detail__main">
          <SkeletonBlock height={120} radius="var(--radius-md)" />
          <SkeletonBlock height={220} radius="var(--radius-md)" />
        </div>
        <div className="mk-detail__side">
          <SkeletonBlock height={320} radius="var(--radius-md)" />
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [course, setCourse] = useState(null);
  const [xpSummary, setXpSummary] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModules, setOpenModules] = useState({});
  // Per-module content drafts (instructor selects the AI-generated course content assets).
  const [moduleContentDrafts, setModuleContentDrafts] = useState({});
  // Instructor notes, notices and free text saved per module.
  const [moduleNotes, setModuleNotes] = useState({});
  const [moduleNotices, setModuleNotices] = useState({});
  const [moduleFreeTexts, setModuleFreeTexts] = useState({});
  // Module-scoped quizzes pending instructor review/approval.
  const [moduleQuizzes, setModuleQuizzes] = useState({});
  const [enrollment, setEnrollment] = useState(null);
  const [enrollState, setEnrollState] = useState({ status: 'idle', message: '' });

  // Free-preview lesson modal state
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' });
  const [reviewState, setReviewState] = useState({ status: 'idle', message: '' });
  const [myReview, setMyReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await marketplaceService.getCourse(id);
      setCourse(detail);

      const firstModule = detail?.modules?.[0];
      setOpenModules(firstModule ? { [firstModule.id]: true } : {});

      marketplaceService.getXpSummary(id)
        .then(setXpSummary)
        .catch(() => setXpSummary(null));

      marketplaceService.getSimilarCourses(id, detail?.category, 4)
        .then(setSimilar)
        .catch(() => setSimilar([]));
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('This course could not be found. It may have been unpublished.');
      } else {
        setError(err?.friendlyMessage || 'We could not load this course.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  useCourseDocumentMeta(course);

  // Route the "Continue Learning" CTA through the enrollment-gated student portal.
  const goToLearning = () => {
    navigate(`/learn/${id}`);
  };

  // Which enrollment state does the signed-in student already have?
  // The student's own review (if any) is prefetched so the form edits it.
  useEffect(() => {
    let active = true;
    if (currentUser?.role === 'Student') {
      courseService.getMyCourses()
        .then((list) => {
          if (!active) return;
          const mine = (list || []).find((item) => item.courseId === id);
          if (mine) setEnrollment(mine);
        })
        .catch(() => {});
      reviewService.getMyReview(id)
        .then((own) => {
          if (!active) return;
          if (own?.hasReview && own.review) {
            setMyReview(own.review);
            setReviewDraft({ rating: own.review.rating || 5, comment: own.review.comment || '' });
          } else {
            setMyReview(null);
          }
        })
        .catch(() => {});
    } else {
      setEnrollment(null);
      setMyReview(null);
    }
    return () => { active = false; };
  }, [currentUser, id, enrollState.status]);

  const handleEnroll = async () => {
    if (!currentUser) {
      navigate(`/login?next=${encodeURIComponent(`/courses/${id}`)}`);
      return;
    }
    if (currentUser.role !== 'Student') {
      setEnrollState({ status: 'error', message: 'Only student accounts can request enrollment.' });
      return;
    }
    setEnrollState({ status: 'loading', message: '' });
    try {
      const result = await marketplaceService.enroll(id);
      setEnrollState({
        status: 'success',
        message: result?.message || 'Enrollment request submitted.'
      });
      if (result?.status) setEnrollment((prev) => ({ ...(prev || {}), status: result.status }));
    } catch (err) {
      setEnrollState({
        status: 'error',
        message: err?.friendlyMessage || 'We could not submit your enrollment. Please try again.'
      });
    }
  };

  const handleOpenPreview = async (lessonId) => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview({});
    try {
      const data = await marketplaceService.getFreePreviewLesson(lessonId);
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setPreviewError(
        err?.response?.status === 403
          ? 'This lesson is not available as a free preview.'
          : 'We could not load this preview right now.'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError(null);
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      navigate(`/login?next=${encodeURIComponent(`/courses/${id}`)}`);
      return;
    }
    setReviewState({ status: 'loading', message: '' });
    try {
      const result = await marketplaceService.submitReview(id, {
        rating: Number(reviewDraft.rating),
        comment: reviewDraft.comment
      });
      const saved = result?.review || null;
      if (saved) {
        setMyReview(saved);
        setReviewDraft({ rating: saved.rating || 5, comment: saved.comment || '' });
      } else {
        setReviewDraft({ rating: 5, comment: '' });
      }
      setReviewState({
        status: 'success',
        message: saved?.status === 'Pending'
          ? 'Thanks — your review was submitted and is awaiting moderation.'
          : 'Thanks — your rating is now live.'
      });
      await load();
    } catch (err) {
      const status = err?.response?.status;
      setReviewState({
        status: 'error',
        message:
          status === 403
            ? (err?.response?.data?.message || 'Only students actively enrolled in this course can leave a review.')
            : err?.friendlyMessage || 'We could not save your review.'
      });
    }
  };

  const handleReviewDelete = async () => {
    if (!myReview || deletingReview) return;
    if (!window.confirm('Delete your review for this course? This cannot be undone.')) return;
    setDeletingReview(true);
    try {
      await reviewService.deleteReview(id, myReview.id);
      setMyReview(null);
      setReviewDraft({ rating: 5, comment: '' });
      setReviewState({ status: 'success', message: 'Your review was deleted.' });
      await load();
    } catch (err) {
      setReviewState({
        status: 'error',
        message: err?.friendlyMessage || 'We could not delete your review.'
      });
    } finally {
      setDeletingReview(false);
    }
  };

  // Generate lesson / course content for a module via the AI service (course-level AI action).
  const handleGenerateMlContent = async (moduleId, title) => {
    const request = {
      courseId: course.id,
      moduleTitle: title,
      moduleDescription: (course.modules || []).find((m) => m.id === moduleId)?.description || ''
    };
    try {
      setModuleContentDrafts((prev) => ({ ...prev, [moduleId]: { status: 'generating' } }));
      const drafts = await aiService.generateQuiz(request);
      setModuleContentDrafts((prev) => ({
        ...prev,
        [moduleId]: { status: 'ready', shapes: drafts.shapes || [] }
      }));
    } catch (err) {
      setModuleContentDrafts((prev) => ({
        ...prev,
        [moduleId]: { status: 'error', message: err?.friendlyMessage || 'AI content generation failed.' }
      }));
    }
  };

  // Generate a quiz for a module and let the instructor review it before publishing.
  const handleGenerateQuiz = async (moduleId, title) => {
    const request = {
      courseId: course.id,
      moduleId,
      moduleTitle: title,
      questionCount: 5,
      scopeType: 'Module'
    };
    try {
      const quiz = await quizService.generateAiQuiz(request);
      setModuleQuizzes((prev) => ({
        ...prev,
        [moduleId]: { ...(prev[moduleId] || {}), list: [...(prev[moduleId]?.list || []), quiz] }
      }));

      // Also attach the newly generated quiz id to the module so it renders under it.
      if (quiz?.id) {
        setModuleContentDrafts((prev) => ({
          ...prev,
          [moduleId]: { ...(prev[moduleId] || {}), quizId: quiz.id }
        }));
      }
    } catch (err) {
      setModuleQuizzes((prev) => ({
        ...prev,
        [moduleId]: { ...(prev[moduleId] || {}), error: err?.friendlyMessage || 'Quiz generation failed.' }
      }));
    }
  };

  const ratingBreakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: (course?.reviews || []).filter((review) => review.rating === star).length
    }));
    const total = counts.reduce((sum, item) => sum + item.count, 0) || 1;
    return counts.map((item) => ({ ...item, percent: Math.round((item.count / total) * 100) }));
  }, [course]);

  if (loading) {
    return (
      <div className="mk-container">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mk-container mk-detail__error">
        <ErrorState
          title="Course unavailable"
          message={error}
          onRetry={load}
        />
        <Link to="/courses" className="btn-secondary">
          <ChevronLeft size={15} aria-hidden="true" /> Back to all courses
        </Link>
      </div>
    );
  }

  const price = formatPrice(course);
  const isFree = price === 'Free';
  const totalLessons = Number(course.lessonCount) || 0;
  const totalModules = (course.modules || []).length;
  const reviews = course.reviews || [];
  const instructor = course.instructor || {};
  // Self-service enrollment and reviews are student-only. The server re-validates
  // both (ownership, published state, enrollment status, one review per student),
  // this gate only keeps the UI honest for staff and anonymous visitors.
  const isStudent = currentUser?.role === 'Student';
  const canEnroll = Boolean(currentUser) && isStudent;
  const canReview = isStudent;
  // Instructor-authored metadata — the marketplace never invents placeholder content:
  // if the instructor has not written outcomes/requirements yet, the section explains
  // that honestly instead of fabricating generic bullets.
  const outcomes = course.learningOutcomes || [];
  const prerequisites = course.prerequisites || [];
  const targetAudience = course.targetAudience || [];
  const displayXp = xpSummary?.displayTotal ?? course.xpReward ?? 0;
  const enrolledLabel =
    enrollment?.status === 'Pending' ? 'Enrollment pending approval'
      : enrollment?.status === 'Active' ? 'You are enrolled'
        : enrollment ? 'You are enrolled' : null;

  return (
    <div className="mk-container">
      <nav className="mk-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/courses">Courses</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/courses?category=${encodeURIComponent(course.category || '')}`}>{course.category}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{course.title}</span>
      </nav>

      {/* ── HERO ── */}
      <section className="mk-detail__hero">
        <div className="mk-detail__hero-text">
          <div className="mk-detail__chips">
            <span className="mk-chip mk-chip--category">{course.category}</span>
            <span className={`mk-chip mk-chip--level mk-chip--${levelLabel(course.difficulty).toLowerCase()}`}>
              {levelLabel(course.difficulty)}
            </span>
            {course.isPublished && <span className="mk-chip mk-chip--published">Published</span>}
          </div>

          <h1>{course.title}</h1>
          <p className="mk-detail__lead">{course.description}</p>

          <div className="mk-detail__rating-row">
            <StarRating value={course.averageRating} count={course.ratingCount} size={16} />
            {course.averageRating > 0 && <span className="mk-detail__rating-note">{Number(course.averageRating).toFixed(1)} average</span>}
            <span className="mk-detail__meta-inline"><Users size={14} aria-hidden="true" /> {formatCount(course.enrollmentCount)} enrolled</span>
          </div>

          <div className="mk-detail__instructor-line">
            <Avatar name={instructor.fullName} src={instructor.avatarUrl} size={34} />
            <span>
              Created by{' '}
              <strong>
                {(instructor.id || course.instructorId) ? (
                  <Link to={`/instructors/${instructor.id || course.instructorId}`} style={{ color: 'inherit' }}>
                    {instructor.fullName || course.instructorName || 'EduFlow Instructor'}
                  </Link>
                ) : (
                  instructor.fullName || course.instructorName || 'EduFlow Instructor'
                )}
              </strong>
            </span>
            {instructor.bio && <span className="mk-detail__instructor-bio">{instructor.bio}</span>}
          </div>

          <ul className="mk-detail__facts">
            <li><Clock size={15} aria-hidden="true" /> {course.durationHours ? `${course.durationHours}h total` : 'Self-paced'}</li>
            <li><BookOpen size={15} aria-hidden="true" /> {totalLessons} lessons</li>
            <li><Layers size={15} aria-hidden="true" /> {totalModules} modules</li>
            <li><GraduationCap size={15} aria-hidden="true" /> {levelLabel(course.difficulty)}</li>
            <li><Globe2 size={15} aria-hidden="true" /> {course.language || 'English'}</li>
            <li><BarChart3 size={15} aria-hidden="true" /> Updated {timeAgo(course.updatedAt) || 'recently'}</li>
          </ul>
        </div>

        <aside className="mk-detail__card" aria-label="Enrollment">
          <div className="mk-detail__card-thumb">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={`Preview for ${course.title}`} />
            ) : (
              <span aria-hidden="true"><PlayCircle size={44} /></span>
            )}
          </div>

          <div className="mk-detail__price-row">
            <span className={`mk-detail__price ${isFree ? 'is-free' : ''}`}>{price}</span>
            {enrolledLabel && <span className="badge-success">{enrolledLabel}</span>}
          </div>

          <button
            type="button"
            className="btn-primary mk-detail__enroll"
            onClick={enrollment?.status === 'Active' || enrollment?.status === 'Completed' ? goToLearning : handleEnroll}
            disabled={
              enrollState.status === 'loading' ||
              enrollment?.status === 'Pending' ||
              (Boolean(currentUser) && !canEnroll)
            }
          >
            {enrollState.status === 'loading' ? (
              <><Loader2 size={16} className="spin" aria-hidden="true" /> Submitting…</>
            ) : enrollment?.status === 'Pending' ? (
              'Awaiting approval'
            ) : enrollment ? (
              'Continue Learning'
            ) : !currentUser ? (
              'Log in to enroll'
            ) : !canEnroll ? (
              'Staff account — not enrollable'
            ) : isFree ? (
              'Enroll Now — Free'
            ) : (
              `Enroll Now — ${price}`
            )}
          </button>

          {enrollState.message && (
            <p className={`mk-detail__enroll-msg ${enrollState.status}`} role="status">
              {enrollState.status === 'error' ? <AlertCircle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              {enrollState.message}
            </p>
          )}

          <ul className="mk-detail__includes">
            <li><Clock size={14} aria-hidden="true" /> {course.durationHours ? `${course.durationHours} hours of learning` : 'Self-paced learning'}</li>
            <li><Layers size={14} aria-hidden="true" /> {totalModules} modules</li>
            <li><PlayCircle size={14} aria-hidden="true" /> {totalLessons} lessons</li>
            <li><ListChecks size={14} aria-hidden="true" /> {course.quizCount || 0} quizzes</li>
            {displayXp > 0 && (
              <li title="XP is earned by completing lessons, quizzes and the course. All XP is validated server-side."><Zap size={14} aria-hidden="true" /> +{formatCount(displayXp)} XP</li>
            )}
            {course.certificateEnabled && (
              <li><Award size={14} aria-hidden="true" /> Certificate of Completion</li>
            )}
            <li><ShieldCheck size={14} aria-hidden="true" /> Instructor-approved enrollment</li>
          </ul>

          <div className="mk-detail__card-meta" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0', borderTop: '1px solid var(--border-subtle, rgba(128,128,128,0.2))' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <GraduationCap size={13} aria-hidden="true" /> Level: <strong>{levelLabel(course.difficulty)}</strong>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Globe2 size={13} aria-hidden="true" /> Language: <strong>{course.language || 'English'}</strong>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <ShieldCheck size={13} aria-hidden="true" /> Access: <strong>Lifetime</strong>
            </span>
          </div>

          <div className="mk-detail__card-instructor">
            <Avatar name={instructor.fullName} src={instructor.avatarUrl} size={44} />
            <div>
              <strong>{instructor.fullName || course.instructorName}</strong>
              <span>
                {formatCount(instructor.courseCount || 0)} courses · {formatCount(instructor.studentCount || 0)} learners
              </span>
            </div>
          </div>
        </aside>
      </section>

      {/* ── BODY ── */}
      <div className="mk-detail__layout">
        <div className="mk-detail__main">
          <section className="mk-detail__block" aria-labelledby="learn-title">
            <h2 id="learn-title">What you'll learn</h2>
            {outcomes.length === 0 ? (
              <p className="mk-detail__side-empty">
                The instructor is still authoring the learning outcomes for this course.
              </p>
            ) : (
              <ul className="mk-detail__outcomes">
                {outcomes.map((outcome) => (
                  <li key={outcome}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {displayXp > 0 && (
            <section className="mk-detail__block mk-xp" aria-label="Learning rewards">
              <div
                className="mk-xp__banner"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '16px 20px', borderRadius: 'var(--radius-md, 12px)',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(59, 130, 246, 0.10))',
                  border: '1px solid rgba(124, 58, 237, 0.35)'
                }}
              >
                <Zap size={26} aria-hidden="true" style={{ color: '#7C3AED' }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong style={{ fontSize: 15, display: 'block', color: 'var(--text-main)' }}>
                    Complete this course and earn up to {formatCount(displayXp)} XP
                  </strong>
                  <span
                    title="XP (experience points) is EduFlow's learning currency. You earn it by completing lessons, passing quizzes and finishing the course. All XP is calculated and validated on the server — it cannot be gained through repeated requests."
                    style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'help' }}
                  >
                    What is XP? Earn it through lessons, quizzes &amp; course completion.
                  </span>
                </div>
                {xpSummary && xpSummary.earnedFromLessonsAndQuizzes > 0 && (
                  <span className="mk-chip mk-chip--category" style={{ fontSize: 11 }}>
                    {formatCount(xpSummary.earnedFromLessonsAndQuizzes)} XP from lessons &amp; quizzes
                  </span>
                )}
              </div>
            </section>
          )}

          {/* ── Course curriculum + module editing (collapsible/expandable dropdowns + inline editor) ── */}
          <section className="mk-detail__block mk-cms" aria-labelledby="cms-title">
            <div className="mk-cms__block-head">
              <h2 id="cms-title">Course curriculum &amp; modules</h2>
              <span>
                {totalModules} modules · {totalLessons} lessons ·{' '}
                {formatMinutes((course.modules || []).reduce(
                  (sum, module) => sum + (module.lessons || []).reduce((inner, lesson) => inner + (lesson.estimatedMinutes || 0), 0),
                  0
                ))}
              </span>
            </div>

            {totalModules === 0 ? (
              <div className="mk-cms__block">
                <div className="mk-info-banner">
                  <Layers size={18} aria-hidden="true" />
                  <p>No modules yet. Click <strong>Add module</strong> to start building your curriculum.</p>
                </div>
                <div className="mk-module-actions">
                  <button type="button" className="btn-primary" onClick={() => setEditor(null)}>
                    <Plus size={15} aria-hidden="true" /> Add module
                  </button>
                </div>
              </div>
            ) : (
              <div className="mk-cms__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
                {/* Module dropdowns: each module header is expandable/collapsable and acts as a dropdown selector. */}
                {(course.modules || []).map((module) => {
                  const isOpen = Boolean(openModules[module.id]);
                  const captions = (module.lessons || []).map((lesson) => lesson.title || 'Untitled lesson');
                  const aiDraft = moduleContentDrafts[module.id] || {};
                  const notes = moduleNotes[module.id] || '';
                  const notices = moduleNotices[module.id] || '';
                  const freeText = moduleFreeTexts[module.id] || '';
                  const quizzes = (module.quizId ? [module.quizId] : []).map((qid) => ({
                    id: qid,
                    title: module.title,
                    scopeType: 'Module',
                    scopeId: module.id,
                    status: 'PendingAI',
                    questionCount: 0
                  }));
                  return (
                    <details key={module.id} className={`mk-module-dropdown ${isOpen ? 'is-open' : ''}`} open={isOpen}>
                      <summary className="mk-module-dropdown__head">
                        <span className="mk-module-dropdown__head-text">
                          <strong>{module.title}</strong>
                          <small>
                            {(module.lessons || []).length} lessons · {formatMinutes((module.lessons || []).reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0))}
                            {module.quizCount > 0 && ` · ${module.quizCount} quiz${module.quizCount > 1 ? 'zes' : ''}`}
                            <span style={{ marginLeft: 8 }}>{module.assetCount || 0} assets</span>
                          </small>
                        </span>
                        <ChevronDown size={18} className="mk-module-dropdown__chevron" aria-hidden="true" />
                        <span className="mk-module-dropdown__meta">
                          <span>{(module.lessons || []).length} lessons</span>
                          {module.description && <span>· {module.description.slice(0, 60)}…</span>}
                        </span>
                      </summary>

                      {isOpen && (
                        <div className="mk-module-dropdown__body" style={{ gridTemplateColumns: captions.length > 0 ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr' }}>
                          {/* Course content generated by AI — instructor picks slides/media assets. */}
                          <div className="mk-editor-card">
                            <div className="mk-editor-card__header">
                              <h3>AI course content</h3>
                              <span className="tag">AI generated</span>
                            </div>
                            <div className="mk-editor-card__body">
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button type="button" className="btn-secondary" onClick={() => {}}>
                                  <Wand2 size={15} aria-hidden="true" /> Generate with AI
                                </button>
                                <span className="mk-editor-card__progress">AI drafts slides, media and notes from the module outline.</span>
                              </div>
                              {aiDraft.shapes && aiDraft.shapes.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {aiDraft.shapes.map((shape) => (
                                    <li key={shape.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
                                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                                      <span className="mk-editor-card__preview">{shape.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : aiDraft.status ? (
                                <p className="mk-editor-card__empty">{aiDraft.status === 'generating' ? 'AI is drafting the next lesson…' : 'AI has not generated anything yet for this module.'}</p>
                              ) : null}
                              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button type="button" className="btn-secondary" onClick={() => {}}>
                                  <Upload size={14} aria-hidden="true" /> Upload slides / media
                                </button>
                                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <FileText size={14} aria-hidden="true" /> Add notes
                                  <input type="file" accept=".pdf,.pptx,.ppt,.docx,.doc" style={{ display: 'none' }} />
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="mk-editor-card">
                            <div className="mk-editor-card__header">
                              <h3>Notes</h3>
                              <span className="tag">Education</span>
                            </div>
                            <textarea
                              value={notes}
                              onChange={(e) => setModuleNotes(module.id, e.target.value)}
                              placeholder="Instructor notes for this module…"
                              rows={6}
                            />
                            {notes && <p className="mk-editor-card__preview" style={{ marginTop: 6 }}>{notes.slice(0, 160)}…</p>}
                          </div>

                          {/* Notices */}
                          <div className="mk-editor-card">
                            <div className="mk-editor-card__header">
                              <h3>Notices</h3>
                              <span className="tag">Announcements</span>
                            </div>
                            <textarea
                              value={notices}
                              onChange={(e) => setModuleNotices(module.id, e.target.value)}
                              placeholder="Writing a notice for students…"
                              rows={5}
                            />
                            {notices && <p className="mk-editor-card__preview" style={{ marginTop: 6 }}>{notices.slice(0, 160)}…</p>}
                          </div>

                          {/* Free text / type anything */}
                          <div className="mk-editor-card">
                            <div className="mk-editor-card__header">
                              <h3>Type anything</h3>
                              <span className="tag">Free text</span>
                            </div>
                            <textarea
                              value={freeText}
                              onChange={(e) => setModuleFreeTexts(module.id, e.target.value)}
                              placeholder="Type anything you want for this module…"
                              rows={6}
                            />
                            {freeText && <p className="mk-editor-card__preview" style={{ marginTop: 6 }}>{freeText.slice(0, 160)}…</p>}
                          </div>
                        </div>
                      )}

                      {/* Module actions */}
                      <div className="mk-module-actions">
                        <button type="button" className="btn-secondary" onClick={() => {}}>
                          <Edit3 size={14} aria-hidden="true" /> Edit details
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => {}}>
                          <Trash2 size={14} aria-hidden="true" /> Delete
                        </button>
                        <button type="button" className="btn-primary" onClick={() => {}}>
                          <Plus size={14} aria-hidden="true" /> Add lesson
                        </button>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mk-detail__block" aria-labelledby="prereq-title">
            <h2 id="prereq-title">Requirements</h2>
            {prerequisites.length === 0 ? (
              <p className="mk-detail__side-empty">
                No prerequisites — the course is open to everyone at this level.
              </p>
            ) : (
              <ul className="mk-detail__prereq">
                {prerequisites.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">•</span> {item}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {targetAudience.length > 0 && (
            <section className="mk-detail__block" aria-labelledby="audience-title">
              <h2 id="audience-title">Who this course is for</h2>
              <ul className="mk-detail__prereq">
                {targetAudience.map((item) => (
                  <li key={item}>
                    <Target size={14} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--primary)' }} /> {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mk-detail__block" aria-labelledby="instructor-title">
            <h2 id="instructor-title">Your instructor</h2>
            <div className="mk-detail__instructor-card">
              <Avatar name={instructor.fullName} src={instructor.avatarUrl} size={84} />
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {instructor.fullName || course.instructorName}
                </h3>
                <span className="mk-detail__instructor-role">
                  {instructor.role || 'Instructor'} · {formatCount(instructor.courseCount || 0)} published courses
                </span>
                <StarRating value={instructor.averageRating || course.averageRating} count={instructor.ratingCount || course.ratingCount} size={14} />
                <p>{instructor.bio || 'Educator publishing on the EduFlow course marketplace.'}</p>
                <ul className="mk-detail__instructor-stats">
                  <li><strong>{formatCount(instructor.studentCount || course.enrollmentCount || 0)}</strong><span>Learners</span></li>
                  <li><strong>{formatCount(instructor.courseCount || 0)}</strong><span>Courses</span></li>
                  <li><strong>{instructor.averageRating ? Number(instructor.averageRating).toFixed(1) : '—'}</strong><span>Rating</span></li>
                </ul>
                {instructor.id && (
                  <p style={{ marginTop: '10px' }}>
                    <Link to={`/instructors/${instructor.id}`} className="btn-secondary" style={{ fontSize: '12.5px', padding: '6px 14px' }}>
                      View Instructor Profile
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mk-detail__block" aria-labelledby="reviews-title">
            <div className="mk-detail__block-head">
              <h2 id="reviews-title">Ratings &amp; reviews</h2>
              <span>{course.ratingCount || 0} total</span>
            </div>

            <div className="mk-reviews__summary">
              <div className="mk-reviews__score">
                <strong>{course.averageRating > 0 ? Number(course.averageRating).toFixed(1) : '—'}</strong>
                <StarRating value={course.averageRating} count={0} showCount={false} size={16} />
                <span>Course rating</span>
              </div>
              <div className="mk-reviews__bars" aria-hidden="true">
                {ratingBreakdown.map((row) => (
                  <div key={row.star} className="mk-reviews__bar">
                    <span>{row.star} ★</span>
                    <span className="mk-reviews__track">
                      <span style={{ width: `${row.percent}%` }} />
                    </span>
                    <span>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {!canReview && !myReview ? (
              <div className="mk-reviews__form">
                <h3>Leave a review</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
                  {!currentUser
                    ? 'Log in with a student account to review this course.'
                    : currentUser?.role === 'Instructor'
                      ? 'Instructors and admins cannot leave reviews — only enrolled students can.'
                      : 'Only students with an approved enrollment can leave a review.'}
                </p>
                {!currentUser && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(`/login?next=${encodeURIComponent(`/courses/${id}`)}`)}
                  >
                    Log in to review
                  </button>
                )}
              </div>
            ) : (
            <form className="mk-reviews__form" onSubmit={handleReviewSubmit}>
              <h3>{myReview ? 'Your review' : 'Leave a review'}</h3>
              <div className="mk-reviews__stars" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={Number(reviewDraft.rating) === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    className={Number(reviewDraft.rating) >= star ? 'is-on' : ''}
                    onClick={() => setReviewDraft((prev) => ({ ...prev, rating: star }))}
                  >
                    <Star size={20} fill={Number(reviewDraft.rating) >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewDraft.comment}
                onChange={(event) => setReviewDraft((prev) => ({ ...prev, comment: event.target.value }))}
                placeholder={currentUser ? 'Share what you learned…' : 'Log in to write a review'}
                rows={3}
                maxLength={800}
                aria-label="Your review"
                disabled={!canReview}
              />
              <div className="mk-reviews__form-foot">
                <button type="submit" className="btn-primary" disabled={reviewState.status === 'loading'}>
                  {reviewState.status === 'loading' ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                  {myReview ? 'Update review' : 'Submit review'}
                </button>
                {myReview && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deletingReview || reviewState.status === 'loading'}
                    onClick={handleReviewDelete}
                  >
                    {deletingReview ? 'Deleting…' : 'Delete my review'}
                  </button>
                )}
                {reviewState.message && (
                  <p className={`mk-detail__enroll-msg ${reviewState.status}`} role="status">{reviewState.message}</p>
                )}
              </div>
            </form>
            )}

            {reviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews yet" message="Be the first learner to rate this course." />
            ) : (
              <ul className="mk-reviews__list">
                {reviews.map((review) => (
                  <li key={review.id} className="mk-review">
                    <Avatar name={review.studentName} src={review.studentAvatarUrl} size={40} />
                    <div>
                      <div className="mk-review__head">
                        <strong>{review.studentName}</strong>
                        <span>{timeAgo(review.createdAt)}</span>
                      </div>
                      <StarRating value={review.rating} count={0} showCount={false} size={13} />
                      {review.comment && <p>{review.comment}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="mk-detail__side">
          <div className="mk-detail__side-card">
            <h3>You May Also Like</h3>
            <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Related {course.category} courses, best rated first
            </p>
            {similar.length === 0 ? (
              <p className="mk-detail__side-empty">No other published courses in this category yet.</p>
            ) : (
              <ul className="mk-similar">
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link to={`/courses/${item.id}`} className="mk-similar__item">
                      <span
                        className="mk-similar__thumb"
                        style={{ background: item.thumbnailUrl ? undefined : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
                      >
                        {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" loading="lazy" />}
                      </span>
                      <span className="mk-similar__text">
                        <strong>{item.title}</strong>
                        <StarRating value={item.averageRating} count={item.ratingCount} size={12} />
                        <small>{formatPrice(item)} · {formatCount(item.enrollmentCount)} enrolled</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <FreePreviewModal
        preview={preview}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
      />
    </div>
  );
}
