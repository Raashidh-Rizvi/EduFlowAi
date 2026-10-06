import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, Users, CalendarDays, Globe, Linkedin,
  MessageSquareText, BadgeCheck
} from 'lucide-react';
import Avatar from '../../components/marketplace/Avatar';
import StarRating from '../../components/marketplace/StarRating';
import CourseCard from '../../components/marketplace/CourseCard';
import { SkeletonBlock } from '../../components/marketplace/Skeletons';
import { ErrorState, EmptyState } from '../../components/marketplace/States';
import { instructorService } from '../../services/instructorService';
import { formatCount, timeAgo } from '../../utils/marketplaceFormat';

function memberSinceLabel(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

/**
 * Public instructor profile: identity, biography, expertise, published
 * courses with genuine ratings, platform-wide student count, aggregate
 * rating and recent student feedback.
 */
export default function InstructorProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await instructorService.getPublicProfile(id));
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('This instructor could not be found.');
      } else {
        setError(err?.friendlyMessage || 'We could not load this profile.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  if (loading) {
    return (
      <div className="mk-container">
        <div className="mk-detail" aria-hidden="true">
          <div className="mk-detail__hero">
            <div className="mk-detail__hero-text">
              <SkeletonBlock width={140} height={12} />
              <SkeletonBlock width="60%" height={34} />
              <SkeletonBlock width="90%" height={14} />
              <SkeletonBlock width="70%" height={14} />
            </div>
            <SkeletonBlock width={180} height={180} radius="var(--radius-lg)" />
          </div>
          <SkeletonBlock height={160} radius="var(--radius-md)" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mk-container mk-detail__error">
        <ErrorState title="Instructor unavailable" message={error} onRetry={load} />
        <p style={{ marginTop: '12px', fontSize: '13.5px', fontWeight: 700 }}>
          <Link to="/courses" style={{ color: 'var(--primary)' }}>← Back to the course catalog</Link>
        </p>
      </div>
    );
  }

  const courses = profile.courses || [];
  const reviews = profile.recentReviews || [];

  return (
    <div className="mk-container">
      <p style={{ margin: '0 0 14px' }}>
        <Link to="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)' }}>
          <ChevronLeft size={15} aria-hidden="true" /> All courses
        </Link>
      </p>

      <div className="mk-detail">
        <div className="mk-detail__hero">
          <div className="mk-detail__hero-text">
            <span className="mk-chip mk-chip--level">Instructor</span>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {profile.fullName}
              <BadgeCheck size={22} color="var(--primary)" aria-label="Verified instructor" />
            </h1>
            {profile.headline && (
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>{profile.headline}</p>
            )}

            <div className="mk-detail__rating-row">
              <StarRating value={profile.averageRating} count={profile.reviewCount} size={16} />
              {profile.averageRating > 0 && (
                <span className="mk-detail__rating-note">
                  {Number(profile.averageRating).toFixed(1)} instructor rating
                </span>
              )}
            </div>

            {(profile.expertise || []).length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {(profile.expertise || []).map((tag) => (
                  <span key={tag} className="mk-chip">{tag}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Users size={14} aria-hidden="true" /> {formatCount(profile.studentCount)} learners</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><BookOpen size={14} aria-hidden="true" /> {formatCount(profile.publishedCourseCount)} published courses</span>
              {profile.memberSince && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} aria-hidden="true" /> Teaching since {memberSinceLabel(profile.memberSince)}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13.5px', fontWeight: 700 }}>
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Globe size={14} aria-hidden="true" /> Website
                </a>
              )}
              {profile.linkedInUrl && (
                <a href={profile.linkedInUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Linkedin size={14} aria-hidden="true" /> LinkedIn
                </a>
              )}
              {profile.isOwnProfile && (
                <Link to="/console" style={{ color: 'var(--primary)' }}>Edit your profile →</Link>
              )}
            </div>
          </div>

          <div>
            <Avatar name={profile.fullName} src={profile.avatarUrl} size={168} />
          </div>
        </div>

        <div className="mk-detail__layout">
          <div className="mk-detail__main">
            <section className="mk-detail__block" aria-labelledby="about-title">
              <h2 id="about-title">About</h2>
              <p>{profile.bio || 'This instructor has not written a biography yet.'}</p>
            </section>

            <section className="mk-detail__block" aria-labelledby="courses-title">
              <h2 id="courses-title">
                Published courses <span className="mk-count">({courses.length})</span>
              </h2>
              {courses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No published courses yet"
                  message="Courses appear here as soon as this instructor publishes them."
                />
              ) : (
                <div className="mk-grid mk-grid--catalog">
                  {courses.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={{
                        ...c,
                        instructorName: profile.fullName,
                        instructorAvatarUrl: profile.avatarUrl,
                        instructorId: profile.id,
                        lessonCount: c.lessonsCount,
                        enrollmentCount: c.studentsCount
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="mk-detail__side">
            <section className="mk-detail__block" aria-labelledby="feedback-title">
              <h2 id="feedback-title">
                Student feedback <span className="mk-count">({profile.reviewCount || 0})</span>
              </h2>
              {reviews.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="No reviews yet"
                  message="Approved student reviews across this instructor's published courses will appear here."
                />
              ) : (
                <ul className="mk-reviews__list">
                  {reviews.map((r) => (
                    <li key={r.id} className="mk-review">
                      <Avatar name={r.studentName} src={r.studentAvatarUrl} size={40} />
                      <div>
                        <div className="mk-review__head">
                          <strong>{r.studentName || 'Student'}</strong>
                          <span>{r.courseCode} · {timeAgo(r.createdAt)}</span>
                        </div>
                        <StarRating value={r.rating} count={0} showCount={false} size={13} />
                        {r.comment && <p>{r.comment}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {reviews.length > 0 && (
                <p style={{ marginTop: '10px', fontSize: '13.5px', fontWeight: 700 }}>
                  <Link to={`/courses?instructor=${profile.id}`} style={{ color: 'var(--primary)' }}>
                    Browse all courses by {profile.fullName} →
                  </Link>
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
