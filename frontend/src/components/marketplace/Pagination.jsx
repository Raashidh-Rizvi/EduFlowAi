import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  sorted.forEach((p) => {
    if (previous && p - previous > 1) items.push('gap');
    items.push(p);
    previous = p;
  });
  return items;
}

/** Accessible pagination control driven by backend page/pageSize totals. */
export default function Pagination({ page = 1, totalPages = 1, onChange, total = 0, pageSize = 12 }) {
  if (!totalPages || totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="mk-pagination" aria-label="Course results pages">
      <p className="mk-pagination__summary" aria-live="polite">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total.toLocaleString()}</strong> courses
      </p>

      <ul className="mk-pagination__list">
        <li>
          <button
            type="button"
            className="mk-pagination__btn"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </li>

        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className="mk-pagination__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`mk-pagination__btn ${item === page ? 'is-active' : ''}`}
                onClick={() => onChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          )
        )}

        <li>
          <button
            type="button"
            className="mk-pagination__btn"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
