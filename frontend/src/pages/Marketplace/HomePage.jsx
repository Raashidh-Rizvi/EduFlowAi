import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Sparkles, Users, BookOpen, Layers, Star,
  TrendingUp, Clock, Award, GraduationCap, ChevronRight, Flame
} from 'lucide-react';
import CourseCard from '../../components/marketplace/CourseCard';
import Avatar from '../../components/marketplace/Avatar';
import StarRating from '../../components/marketplace/StarRating';
import SectionHeader from '../../components/marketplace/SectionHeader';
import { CourseGridSkeleton, CategorySkeleton, InstructorCardSkeleton, SkeletonBlock } from '../../components/marketplace/Skeletons';
import { ErrorState, EmptyState } from '../../components/marketplace/States';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../context/AuthContext';
import { formatCount, formatPrice, levelLabel } from '../../utils/marketplaceFormat';

const CATEGORY_ICONS = {
  'Computer Science': '🧠',
  'Software Engineering': '⚙️',
  'Data Science': '📊',
  'Artificial Intelligence': '🤖',
  'Business': '📈',
  'Design': '🎨',
  'Mathematics': '➗',
  'Marketing': '📣',
  'Cloud & DevOps': '☁️',
  'Cybersecurity': '🔐',
  'Mobile Development': '📱',
  'General': '📚'
};

function categoryIcon(name = '') {
  return CATEGORY_ICONS[name] || CATEGORY_ICONS[Object.keys(CATEGORY_ICONS).find((k) => name.toLowerCase().includes(k.toLowerCase()))] || '📘';
}

const RANK_STYLES = ['mk-popular__rank--1', 'mk-popular__rank--2', 'mk-popular__rank--3', 'mk-popular__rank--4'];

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');

  const [data, setData] = useState({
    stats: null,
    categories: [],
    instructors: [],
    featured: [],
    popular: [],
    spotlight: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, categories, instructors, featured, popular] = await Promise.all([
        marketplaceService.getStats().catch(() => null),
        marketplaceService.getCategories().catch(() => []),
        marketplaceService.getInstructors(6).catch(() => []),
        marketplaceService.getCourses({ sort: 'rating', pageSize: 8 }).catch(() => ({ items: [] })),
        marketplaceService.getCourses({ sort: 'popular', pageSize: 4 }).catch(() => ({ items: [] }))
      ]);

      setData({
        stats,
        categories: categories || [],
        instructors: instructors || [],
        featured: featured?.items || [],
        popular: popular?.items || [],
        spotlight: (featured?.items || [])[0] || (popular?.items || [])[0] || null
      });
    } catch (err) {
      setError(err?.friendlyMessage || 'We could not reach the course catalog right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
    })();
    return () => { active = false; };
  }, [load]);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = search.trim();
    navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses');
  };

  const handleCta = () => {
    navigate(currentUser ? '/console' : '/login');
  };

  const stats = data.stats;

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="mk-hero" aria-labelledby="hero-title">
        <div className="mk-hero__glow mk-hero__glow--one" aria-hidden="true" />
        <div className="mk-hero__glow mk-hero__glow--two" aria-hidden="true" />

        <div className="mk-hero__content">
          <span className="mk-eyebrow">
            <span className="mk-eyebrow__dot" aria-hidden="true" />
            {stats ? `${formatCount(stats.publishedCourses)} published courses live` : 'Open course marketplace'}
          </span>

          <h1 id="hero-title" className="mk-hero__title">
            Discover courses that <span className="text-gradient">move you forward</span>
          </h1>

          <p className="mk-hero__lead">
            Explore published programs from expert instructors, compare real ratings and enrolment
            numbers, and start learning today. Every course page shows the full curriculum before you enroll.
          </p>

          <form className="mk-hero__search" role="search" onSubmit={submitSearch}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="What do you want to learn? Try “database”, “AI”…"
              aria-label="Search courses"
            />
            <button type="submit" className="btn-primary mk-hero__search-btn">
              Explore Courses <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>

          <div className="mk-hero__quick">
            <span>Popular searches:</span>
            <Link to="/courses?price=free">Free courses</Link>
            <Link to="/courses?sort=rating">Top rated</Link>
            <Link to="/courses?level=Easy">Beginner friendly</Link>
          </div>

          <div className="mk-hero__cta">
            <button type="button" className="btn-primary mk-hero__cta-primary" onClick={handleCta}>
              {currentUser ? 'Open My Dashboard' : 'Get Started Free'} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link to="/courses" className="btn-secondary mk-hero__cta-secondary">
              <BookOpen size={16} aria-hidden="true" /> Browse catalog
            </Link>
          </div>

          {stats && (
            <dl className="mk-hero__stats">
              <div>
                <dt><BookOpen size={15} aria-hidden="true" /> Courses</dt>
                <dd>{formatCount(stats.publishedCourses)}</dd>
              </div>
              <div>
                <dt><GraduationCap size={15} aria-hidden="true" /> Instructors</dt>
                <dd>{formatCount(stats.instructors)}</dd>
              </div>
              <div>
                <dt><Users size={15} aria-hidden="true" /> Enrollments</dt>
                <dd>{formatCount(stats.enrollments)}</dd>
              </div>
              <div>
                <dt><Star size={15} aria-hidden="true" /> Avg. rating</dt>
                <dd>{stats.averageRating > 0 ? `${Number(stats.averageRating).toFixed(1)}` : 'New'}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="mk-hero__visual" aria-hidden="true">
          <div className="mk-hero__spotlight">
            {loading ? (
              <div className="mk-hero__spotlight-skeleton">
                <SkeletonBlock height={150} radius="var(--radius-md)" />
                <SkeletonBlock width="75%" height={16} />
                <SkeletonBlock width="55%" height={13} />
                <SkeletonBlock width="90%" height={12} />
              </div>
            ) : data.spotlight ? (
              <>
                <div className="mk-hero__spotlight-thumb">
                  {data.spotlight.thumbnailUrl ? (
                    <img src={data.spotlight.thumbnailUrl} alt="" loading="eager" />
                  ) : (
                    <span>{categoryIcon(data.spotlight.category)}</span>
                  )}
                  <span className="mk-chip mk-chip--price mk-chip--free">
                    {formatPrice(data.spotlight)}
                  </span>
                </div>
                <span className="mk-hero__spotlight-tag">
                  <Sparkles size={12} /> Highest rated right now
                </span>
                <h3>{data.spotlight.title}</h3>
                <div className="mk-hero__spotlight-meta">
                  <span><StarRating value={data.spotlight.averageRating} count={data.spotlight.ratingCount} size={13} /></span>
                  <span><Clock size={13} /> {data.spotlight.durationHours ? `${data.spotlight.durationHours}h` : 'Self-paced'}</span>
                  <span><Users size={13} /> {formatCount(data.spotlight.enrollmentCount)}</span>
                </div>
                <div className="mk-hero__spotlight-instructor">
                  <Avatar name={data.spotlight.instructorName} src={data.spotlight.instructorAvatarUrl} size={28} />
                  <span>{data.spotlight.instructorName}</span>
                </div>
                <span className="mk-hero__spotlight-level">{levelLabel(data.spotlight.difficulty)}</span>
              </>
            ) : (
              <p>No published courses yet — check back soon.</p>
            )}
          </div>

          <div className="mk-hero__float mk-hero__float--rating">
            <Award size={16} />
            <div>
              <strong>{stats && stats.averageRating > 0 ? Number(stats.averageRating).toFixed(1) : '—'}</strong>
              <span>Average course rating</span>
            </div>
          </div>

          <div className="mk-hero__float mk-hero__float--learners">
            <TrendingUp size={16} />
            <div>
              <strong>{stats ? formatCount(stats.enrollments) : '0'}</strong>
              <span>Active enrollments</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CATEGORIES ───────────────────────── */}
      <section id="categories" className="mk-section" aria-labelledby="categories-title">
        <SectionHeader
          eyebrow="Browse by topic"
          title="Course categories"
          description="Pick a field and jump straight into its published catalog."
          to="/courses"
          linkLabel="All categories"
        />
        <h2 id="categories-title" className="mk-visually-hidden">Course categories</h2>

        {loading ? (
          <CategorySkeleton count={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.categories.length === 0 ? (
          <EmptyState title="No categories yet" message="Categories appear as soon as instructors publish courses." />
        ) : (
          <div className="mk-cat-grid">
            {data.categories.slice(0, 10).map((category) => (
              <Link
                key={category.name}
                to={`/courses?category=${encodeURIComponent(category.name)}`}
                className="mk-cat-card glass-card-hover"
              >
                <span className="mk-cat-card__icon" aria-hidden="true">{categoryIcon(category.name)}</span>
                <span className="mk-cat-card__name">{category.name}</span>
                <span className="mk-cat-card__count">
                  {category.courseCount} {category.courseCount === 1 ? 'course' : 'courses'}
                  <ChevronRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── FEATURED COURSES ───────────────────────── */}
      <section id="courses" className="mk-section" aria-labelledby="featured-title">
        <SectionHeader
          eyebrow="Editor's pick"
          title="Featured courses"
          description="Highest-rated published programs on the platform, ranked by real student reviews."
          to="/courses?sort=rating"
          linkLabel="View all courses"
        />
        <h2 id="featured-title" className="mk-visually-hidden">Featured courses</h2>

        {loading ? (
          <CourseGridSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.featured.length === 0 ? (
          <EmptyState
            title="No published courses yet"
            message="Once instructors publish their programs they will appear here."
          />
        ) : (
          <div className="mk-grid">
            {data.featured.slice(0, 4).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── POPULAR ───────────────────────── */}
      <section id="popular" className="mk-section mk-section--tint" aria-labelledby="popular-title">
        <SectionHeader
          eyebrow="Trending now"
          title="Popular courses"
          description="Ranked by live enrolment counts and learner ratings — never by static numbers."
          to="/courses?sort=popular"
          linkLabel="See what's popular"
        />
        <h2 id="popular-title" className="mk-visually-hidden">Popular courses</h2>

        {loading ? (
          <CourseGridSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.popular.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Nothing trending yet"
            message="Courses move up this list as learners enroll and leave ratings."
          />
        ) : (
          <ol className="mk-popular">
            {data.popular.map((course, index) => (
              <li key={course.id} className="mk-popular__item">
                <span className={`mk-popular__rank ${RANK_STYLES[index] || ''}`} aria-hidden="true">
                  {index + 1}
                </span>
                <CourseCard course={course} className="mk-popular__card" />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ───────────────────────── INSTRUCTORS ───────────────────────── */}
      <section id="instructors" className="mk-section" aria-labelledby="instructors-title">
        <SectionHeader
          eyebrow="Meet the educators"
          title="Featured instructors"
          description="The people behind the catalog — with their live course and rating totals."
          to="/courses"
          linkLabel="Explore their courses"
        />
        <h2 id="instructors-title" className="mk-visually-hidden">Featured instructors</h2>

        {loading ? (
          <div className="mk-inst-grid">
            {Array.from({ length: 3 }).map((_, index) => <InstructorCardSkeleton key={index} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.instructors.length === 0 ? (
          <EmptyState title="Instructor profiles are being prepared" message="Featured educators will appear here once they publish." />
        ) : (
          <div className="mk-inst-grid">
            {data.instructors.map((instructor) => (
              <article key={instructor.id} className="mk-inst-card glass-card-hover">
                <Avatar name={instructor.fullName} src={instructor.avatarUrl} size={72} className="mk-inst-card__avatar" />
                <h3 className="mk-inst-card__name">{instructor.fullName}</h3>
                <span className="mk-inst-card__role">{instructor.role || 'Instructor'}</span>
                <p className="mk-inst-card__bio">
                  {instructor.bio || 'Educator publishing on the EduFlow marketplace.'}
                </p>
                <div className="mk-inst-card__stats">
                  <span title="Published courses">
                    <BookOpen size={13} aria-hidden="true" /> {instructor.courseCount} courses
                  </span>
                  <span title="Learners enrolled">
                    <Users size={13} aria-hidden="true" /> {formatCount(instructor.studentCount)}
                  </span>
                </div>
                <StarRating value={instructor.averageRating} count={instructor.ratingCount} size={13} />
                <Link
                  to={`/courses?instructor=${encodeURIComponent(instructor.id)}`}
                  className="btn-secondary mk-inst-card__cta"
                >
                  View courses <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── CTA BAND ───────────────────────── */}
      <section className="mk-cta-band" aria-labelledby="cta-title">
        <div className="mk-cta-band__text">
          <h2 id="cta-title">Ready to start your next course?</h2>
          <p>
            Create a free account, save courses you love and submit your enrollment in seconds.
            Instructors approve requests personally, so you always know who is teaching you.
          </p>
        </div>
        <div className="mk-cta-band__actions">
          <button type="button" className="btn-primary" onClick={handleCta}>
            {currentUser ? 'Go to dashboard' : 'Get Started Free'} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <Link to="/courses" className="btn-secondary">Browse all courses</Link>
        </div>
      </section>
    </>
  );
}
