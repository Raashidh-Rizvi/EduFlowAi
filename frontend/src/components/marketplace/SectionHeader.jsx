import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/** Consistent section heading with optional "view all" link. */
export default function SectionHeader({ eyebrow, title, description, to, linkLabel = 'View all' }) {
  return (
    <div className="mk-section-head">
      <div className="mk-section-head__text">
        {eyebrow && <span className="mk-section-head__eyebrow">{eyebrow}</span>}
        <h2 className="mk-section-head__title">{title}</h2>
        {description && <p className="mk-section-head__desc">{description}</p>}
      </div>
      {to && (
        <Link to={to} className="mk-section-head__link">
          {linkLabel} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
