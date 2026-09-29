import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Clock, BookOpen, Layers, Users, BarChart3,
  CheckCircle2, PlayCircle, Star, ShieldCheck, AlertCircle, Loader2, GraduationCap, Send
} from 'lucide-react';
import Avatar from '../../components/marketplace/Avatar';
import StarRating from '../../components/marketplace/StarRating';
import { SkeletonBlock } from '../../components/marketplace/Skeletons';
import { ErrorState, EmptyState } from '../../components/marketplace/States';
import { marketplaceService } from '../../services/marketplaceService';
import { reviewService } from '../../services/reviewService';
import { courseService } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import {
  formatMinutes, formatPrice, formatCount, levelLabel, timeAgo
} from '../../utils/marketplaceFormat';

function deriveOutcomes(course) {
  const outcomes = [];
  (course.modules || []).forEach((module) => {
    if (module.title) outcomes.push(`Explain the core ideas behind ${module.title}`);
    (module.lessons || []).slice(0, 1).forEach((lesson) => {
      if (lesson.title) outcomes.push(`Apply ${lesson.title} in a practical exercise`);
    });
  });
  if (course.description) outcomes.push(`Summarize ${course.title} and when to use it on real projects`);
  return [...new Set(outcomes)].slice(0, 6);
}

function derivePrerequisites(course) {
  const category = course.category || 'the subject';
  switch (levelLabel(course.difficulty)) {
    case 'Beginner':
      return ['No prior experience required — the course starts from the basics.', 'A computer with a modern browser and a stable internet connection.'];
    case 'Advanced':
      return [`Solid working knowledge of ${category} concepts and terminology.`, 'Hands-on experience shipping at least one small project.'];
    default:
      return [
        `Comfortable with introductory ${category} material (coursework or self-study).`,
        'Willingness to follow along with the practical labs.'
      ];
  }
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
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModules, setOpenModules] = useState({});
  const [enrollment, setEnrollment] = useState(null);
  const [enrollState, setEnrollState] = useState({ status: 'idle', message: '' });

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
  const outcomes = course.learningOutcomes?.length ? course.learningOutcomes : deriveOutcomes(course);
  const prerequisites = course.prerequisites?.length ? course.prerequisites : derivePrerequisites(course);
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
            onClick={handleEnroll}
            disabled={enrollState.status === 'loading' || enrollment?.status === 'Active' || enrollment?.status === 'Pending'}
          >
            {enrollState.status === 'loading' ? (
              <><Loader2 size={16} className="spin" aria-hidden="true" /> Submitting…</>
            ) : enrollment?.status === 'Pending' ? (
              'Awaiting approval'
            ) : enrollment ? (
              'Continue learning'
            ) : currentUser ? (
              isFree ? 'Enroll for free' : `Enroll — ${price}`
            ) : (
              'Log in to enroll'
            )}
          </button>

          {enrollState.message && (
            <p className={`mk-detail__enroll-msg ${enrollState.status}`} role="status">
              {enrollState.status === 'error' ? <AlertCircle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              {enrollState.message}
            </p>
          )}

          <ul className="mk-detail__includes">
            <li><PlayCircle size={14} aria-hidden="true" /> {totalLessons} on-demand lessons</li>
            <li><Clock size={14} aria-hidden="true" /> {course.durationHours ? `${course.durationHours} hours of content` : 'Learn at your own pace'}</li>
            <li><ShieldCheck size={14} aria-hidden="true" /> Instructor-approved enrollment</li>
            <li><CheckCircle2 size={14} aria-hidden="true" /> Full curriculum &amp; quizzes included</li>
          </ul>

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
            <ul className="mk-detail__outcomes">
              {outcomes.map((outcome) => (
                <li key={outcome}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mk-detail__block" aria-labelledby="curriculum-title">
            <div className="mk-detail__block-head">
              <h2 id="curriculum-title">Course curriculum</h2>
              <span>
                {totalModules} modules · {totalLessons} lessons ·{' '}
                {formatMinutes((course.modules || []).reduce(
                  (sum, module) => sum + (module.lessons || []).reduce((inner, lesson) => inner + (lesson.estimatedMinutes || 0), 0),
                  0
                ))}
              </span>
            </div>

            {totalModules === 0 ? (
              <EmptyState
                icon={Layers}
                title="Curriculum is being prepared"
                message="The instructor has not published lessons for this course yet."
              />
            ) : (
              <div className="mk-curriculum">
                {(course.modules || []).map((module) => {
                  const isOpen = Boolean(openModules[module.id]);
                  const minutes = (module.lessons || []).reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0);
                  return (
                    <div className={`mk-curriculum__module ${isOpen ? 'is-open' : ''}`} key={module.id}>
                      <button
                        type="button"
                        className="mk-curriculum__head"
                        onClick={() => setOpenModules((prev) => ({ ...prev, [module.id]: !prev[module.id] }))}
                        aria-expanded={isOpen}
                      >
                        <span className="mk-curriculum__head-text">
                          <strong>{module.title}</strong>
                          <small>
                            {(module.lessons || []).length} lessons · {formatMinutes(minutes)}
                            {module.quizCount > 0 && ` · ${module.quizCount} quiz${module.quizCount > 1 ? 'zes' : ''}`}
                          </small>
                        </span>
                        <ChevronDown size={18} aria-hidden="true" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                      </button>

                      {isOpen && (
                        <div className="mk-curriculum__body">
                          {module.description && <p className="mk-curriculum__desc">{module.description}</p>}
                          {(module.lessons || []).length === 0 ? (
                            <p className="mk-curriculum__empty">Lessons are being prepared for this module.</p>
                          ) : (
                            <ul>
                              {module.lessons.map((lesson) => (
                                <li key={lesson.id}>
                                  <PlayCircle size={15} aria-hidden="true" />
                                  <span>{lesson.title}</span>
                                  <small>{lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : '—'}</small>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mk-detail__block" aria-labelledby="prereq-title">
            <h2 id="prereq-title">Prerequisites</h2>
            <ul className="mk-detail__prereq">
              {prerequisites.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">•</span> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mk-detail__block" aria-labelledby="instructor-title">
            <h2 id="instructor-title">Your instructor</h2>
            <div className="mk-detail__instructor-card">
              <Avatar name={instructor.fullName} src={instructor.avatarUrl} size={84} />
              <div>
                <h3>{instructor.fullName || course.instructorName}</h3>
                <span className="mk-detail__instructor-role">
                  {instructor.role || 'Instructor'} · {formatCount(instructor.courseCount || 0)} published courses
                </span>
                <StarRating value={instructor.averageRating || course.averageRating} count={instructor.ratingCount || course.ratingCount} size={14} />
                <p>{instructor.bio || 'Educator publishing on the EduFlow course marketplace.'}</p>
                {(instructor.id || course.instructorId) && (
                  <p style={{ marginTop: '10px', fontSize: '13.5px', fontWeight: 700 }}>
                    <Link to={`/instructors/${instructor.id || course.instructorId}`} style={{ color: 'var(--primary)' }}>
                      View full instructor profile →
                    </Link>
                  </p>
                )}
                <ul className="mk-detail__instructor-stats">
                  <li><strong>{formatCount(instructor.studentCount || course.enrollmentCount || 0)}</strong><span>Learners</span></li>
                  <li><strong>{formatCount(instructor.courseCount || 0)}</strong><span>Courses</span></li>
                  <li><strong>{instructor.averageRating ? Number(instructor.averageRating).toFixed(1) : '—'}</strong><span>Rating</span></li>
                </ul>
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
                disabled={!currentUser}
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
            <h3>More in {course.category}</h3>
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
    </div>
  );
}
