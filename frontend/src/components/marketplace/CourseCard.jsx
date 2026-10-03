import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, BarChart3, Users, BookOpen, Layers, ArrowRight } from 'lucide-react';
import StarRating from './StarRating';
import Avatar from './Avatar';
import { formatDurationHours, formatMinutes, formatPrice, formatCount, levelLabel } from '../../utils/marketplaceFormat';

const THUMB_FALLBACKS = [
  'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)'
];

function fallbackGradient(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % THUMB_FALLBACKS.length;
  return THUMB_FALLBACKS[hash];
}

/**
 * Marketplace course card. Every stat shown (rating, ratings count,
 * enrolments, duration) comes straight from the backend aggregate.
 */
export default function CourseCard({ course, style = {}, className = '' }) {
  const [thumbFailed, setThumbFailed] = React.useState(false);
  if (!course) return null;

  // Prefer the live sum of uploaded lesson minutes; durationHours is only a fallback.
  const duration = Number(course.totalMinutes) > 0
    ? formatMinutes(course.totalMinutes)
    : formatDurationHours(course.durationHours);
  const price = formatPrice(course);
  const isFree = price === 'Free';
  const instructorName = course.instructorName || 'EduFlow Instructor';
  const lessonsCount = Number(course.lessonCount) || 0;
  const modulesCount = Number(course.moduleCount) || 0;
  const blurb = course.shortDescription || course.description || '';

  return (
    <article className={`mk-card glass-card-hover ${className}`.trim()} style={style}>
      <Link
        to={`/courses/${course.id}`}
        className="mk-card__thumb-link"
        aria-label={`View course: ${course.title}`}
        tabIndex={-1}
      >
        <div
          className="mk-card__thumb"
          style={{ background: course.thumbnailUrl && !thumbFailed ? undefined : fallbackGradient(course.code || course.title) }}
        >
          {course.thumbnailUrl && !thumbFailed && (
            <img
              src={course.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setThumbFailed(true)}
            />
          )}
          <span className={`mk-chip mk-chip--level mk-chip--${levelLabel(course.difficulty).toLowerCase()}`}>
            {levelLabel(course.difficulty)}
          </span>
          <span className={`mk-chip mk-chip--price ${isFree ? 'mk-chip--free' : ''}`}>{price}</span>
        </div>
      </Link>

      <div className="mk-card__body">
        <span className="mk-card__category">{course.category || 'General'}</span>

        <h3 className="mk-card__title">
          <Link to={`/courses/${course.id}`}>{course.title}</Link>
        </h3>

        {blurb && <p className="mk-card__blurb">{blurb.length > 96 ? `${blurb.slice(0, 96).trimEnd()}…` : blurb}</p>}

        <div className="mk-card__instructor">
          <Avatar name={instructorName} src={course.instructorAvatarUrl} size={24} />
          <span>{instructorName}</span>
        </div>

        <StarRating value={course.averageRating} count={course.ratingCount} size={13} />

        <ul className="mk-card__meta">
          <li title="Course duration">
            <Clock size={13} aria-hidden="true" />
            {duration || 'Self-paced'}
          </li>
          <li title="Enrolled learners">
            <Users size={13} aria-hidden="true" />
            {formatCount(course.enrollmentCount)} enrolled
          </li>
          {modulesCount > 0 && (
            <li title="Number of modules">
              <Layers size={13} aria-hidden="true" />
              {modulesCount} modules
            </li>
          )}
          {lessonsCount > 0 && (
            <li title="Number of lessons">
              <BookOpen size={13} aria-hidden="true" />
              {lessonsCount} lessons
            </li>
          )}
        </ul>

        <div className="mk-card__footer">
          <span className={`mk-card__price ${isFree ? 'mk-card__price--free' : ''}`}>
            {price}
            {isFree && <small>Enroll free</small>}
          </span>
          <Link to={`/courses/${course.id}`} className="btn-primary mk-card__cta">
            View Course <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
