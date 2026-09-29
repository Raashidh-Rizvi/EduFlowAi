import React from 'react';
import { Star } from 'lucide-react';

/**
 * Accessible 1-5 star rating with the live average and rating volume.
 * `value` and `count` always come from backend aggregates.
 */
export default function StarRating({
  value = 0,
  count = 0,
  size = 14,
  showValue = true,
  showCount = true,
  className = ''
}) {
  const safeValue = Number(value) || 0;
  const rounded = Math.round(safeValue * 2) / 2;

  return (
    <div
      className={`mk-rating ${className}`.trim()}
      role="img"
      aria-label={`Rated ${safeValue.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`}
    >
      <span className="mk-rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.min(Math.max(rounded - star + 1, 0), 1);
          return (
            <span key={star} className="mk-rating__star">
              <Star size={size} className="mk-rating__star-base" strokeWidth={2} />
              <span className="mk-rating__star-fill" style={{ width: `${fill * 100}%` }}>
                <Star size={size} strokeWidth={2} fill="currentColor" />
              </span>
            </span>
          );
        })}
      </span>

      {showValue && (
        <span className="mk-rating__value">{safeValue > 0 ? safeValue.toFixed(1) : 'New'}</span>
      )}

      {showCount && (
        <span className="mk-rating__count">
          ({count > 0 ? count.toLocaleString() : 0})
        </span>
      )}
    </div>
  );
}
