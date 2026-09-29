import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Compass, SearchX } from 'lucide-react';
import CourseCard from '../../components/marketplace/CourseCard';
import Pagination from '../../components/marketplace/Pagination';
import { CourseGridSkeleton } from '../../components/marketplace/Skeletons';
import { ErrorState, EmptyState } from '../../components/marketplace/States';
import { marketplaceService } from '../../services/marketplaceService';
import { levelLabel } from '../../utils/marketplaceFormat';

const LEVELS = [
  { value: 'Easy', label: 'Beginner' },
  { value: 'Medium', label: 'Intermediate' },
  { value: 'Hard', label: 'Advanced' },
  { value: 'Boss', label: 'Expert' }
];

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'title', label: 'Course title (A–Z)' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' }
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'All pricing' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' }
];

const PAGE_SIZE = 9;

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const level = searchParams.get('level') || '';
  const price = searchParams.get('price') || '';
  const instructor = searchParams.get('instructor') || '';
  const sort = searchParams.get('sort') || 'popular';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const updateParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined || value === 'all') next.delete(key);
            else next.set(key, String(value));
          });
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courses, categoryList] = await Promise.all([
        marketplaceService.getCourses({
          search: query,
          category,
          level,
          price,
          instructor,
          sort,
          page,
          pageSize: PAGE_SIZE
        }),
        marketplaceService.getCategories().catch(() => categories)
      ]);
      setResult({
        items: courses?.items || [],
        total: courses?.total || 0,
        totalPages: courses?.totalPages || 1,
        page: courses?.page || page
      });
      setCategories(categoryList || []);
    } catch (err) {
      setError(err?.friendlyMessage || 'We could not load the course catalog.');
    } finally {
      setLoading(false);
    }
  }, [query, category, level, price, instructor, sort, page, categories]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, level, price, instructor, sort, page]);

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  const onSearchInput = (value) => {
    setSearchInput(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => updateParams({ q: value.trim() }), 350);
  };

  const activeFilterCount = useMemo(
    () => [category, level, price !== 'all' ? price : '', instructor].filter(Boolean).length,
    [category, level, price, instructor]
  );

  const clearFilters = () => {
    setSearchParams(query ? new URLSearchParams({ q: query }) : new URLSearchParams(), { replace: true });
  };

  const filterPanel = (
    <div className="mk-filters__panel">
      <div className="mk-filters__group">
        <h3>Category</h3>
        <ul className="mk-filters__list">
          <li>
            <button
              type="button"
              className={!category ? 'is-active' : ''}
              onClick={() => updateParams({ category: '' })}
            >
              All categories <span>{result.total || ''}</span>
            </button>
          </li>
          {categories.map((item) => (
            <li key={item.name}>
              <button
                type="button"
                className={category === item.name ? 'is-active' : ''}
                onClick={() => updateParams({ category: item.name })}
              >
                {item.name} <span>{item.courseCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mk-filters__group">
        <h3>Level</h3>
        <ul className="mk-filters__list">
          <li>
            <button type="button" className={!level ? 'is-active' : ''} onClick={() => updateParams({ level: '' })}>
              All levels
            </button>
          </li>
          {LEVELS.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                className={level === item.value ? 'is-active' : ''}
                onClick={() => updateParams({ level: item.value })}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mk-filters__group">
        <h3>Pricing</h3>
        <ul className="mk-filters__list">
          {PRICE_OPTIONS.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                className={(price || 'all') === item.value ? 'is-active' : ''}
                onClick={() => updateParams({ price: item.value })}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {activeFilterCount > 0 && (
        <button type="button" className="btn-ghost mk-filters__clear" onClick={clearFilters}>
          <X size={14} aria-hidden="true" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );

  return (
    <div className="mk-catalog">
      <header className="mk-catalog__head">
        <div>
          <span className="mk-eyebrow">
            <span className="mk-eyebrow__dot" aria-hidden="true" /> Course catalog
          </span>
          <h1>{query ? `Results for “${query}”` : category || 'All published courses'}</h1>
          <p>
            {loading ? 'Loading courses…' : `${result.total.toLocaleString()} ${result.total === 1 ? 'course' : 'courses'} available`}
            {instructor ? ' from this instructor' : ''}
          </p>
        </div>

        <div className="mk-catalog__tools">
          <form
            className="mk-catalog__search"
            role="search"
            onSubmit={(event) => { event.preventDefault(); updateParams({ q: searchInput.trim() }); }}
          >
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchInput(event.target.value)}
              placeholder="Search courses, topics, instructors…"
              aria-label="Search courses"
            />
          </form>

          <label className="mk-catalog__sort">
            <span className="mk-visually-hidden">Sort courses by</span>
            <select value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-secondary mk-catalog__filter-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters {activeFilterCount > 0 && <span className="mk-badge-count">{activeFilterCount}</span>}
          </button>
        </div>
      </header>

      <div className="mk-catalog__body">
        <aside className={`mk-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Course filters">
          {filterPanel}
        </aside>

        <div className="mk-catalog__results">
          {loading ? (
            <CourseGridSkeleton count={PAGE_SIZE} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No courses match your filters"
              message="Try a different keyword, or clear the filters to see the whole catalog."
              action={
                <button type="button" className="btn-primary" onClick={clearFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              <div className="mk-grid mk-grid--catalog">
                {result.items.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={result.totalPages}
                total={result.total}
                pageSize={PAGE_SIZE}
                onChange={(nextPage) => updateParams({ page: nextPage }, { resetPage: false })}
              />
            </>
          )}
        </div>
      </div>

      <section className="mk-catalog__hint" aria-label="Need help choosing">
        <Compass size={18} aria-hidden="true" />
        <p>
          Not sure where to start? Browse <Link to="/#categories">categories</Link> or see the{' '}
          <Link to="/courses?sort=rating">highest-rated courses</Link>.
        </p>
      </section>
    </div>
  );
}
