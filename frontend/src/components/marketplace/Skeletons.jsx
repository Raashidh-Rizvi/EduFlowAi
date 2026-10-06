import React from 'react';

/**
 * CSS-only shimmer placeholders used while marketplace data loads.
 * Keeps layout stable so content does not jump when responses arrive.
 */
export function SkeletonBlock({ width = '100%', height = 14, radius = 'var(--radius-xs)', style = {} }) {
  return (
    <span
      className="mk-skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="mk-card mk-card--skeleton" aria-hidden="true">
      <div className="mk-card__thumb mk-skeleton" />
      <div className="mk-card__body">
        <SkeletonBlock width="55%" height={11} />
        <SkeletonBlock width="92%" height={16} />
        <SkeletonBlock width="70%" height={16} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span className="mk-skeleton" style={{ width: 26, height: 26, borderRadius: '50%' }} />
          <SkeletonBlock width={110} height={11} />
        </div>
        <SkeletonBlock width="60%" height={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <SkeletonBlock width={70} height={16} />
          <SkeletonBlock width={96} height={32} radius="var(--radius-sm)" />
        </div>
      </div>
    </div>
  );
}

export function CourseGridSkeleton({ count = 6 }) {
  return (
    <div className="mk-grid" role="status" aria-label="Loading courses">
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function InstructorCardSkeleton() {
  return (
    <div className="mk-inst-card mk-card--skeleton" aria-hidden="true">
      <span className="mk-skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
      <SkeletonBlock width="65%" height={16} />
      <SkeletonBlock width="45%" height={11} />
      <SkeletonBlock width="100%" height={12} />
      <SkeletonBlock width="85%" height={12} />
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBlock width={64} height={22} radius="var(--radius-full)" />
        <SkeletonBlock width={64} height={22} radius="var(--radius-full)" />
      </div>
    </div>
  );
}

export function CategorySkeleton({ count = 8 }) {
  return (
    <div className="mk-cat-grid" role="status" aria-label="Loading categories">
      {Array.from({ length: count }).map((_, index) => (
        <div className="mk-cat-card mk-card--skeleton" key={index} aria-hidden="true">
          <span className="mk-skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)' }} />
          <SkeletonBlock width="70%" height={14} />
          <SkeletonBlock width="45%" height={11} />
        </div>
      ))}
    </div>
  );
}
