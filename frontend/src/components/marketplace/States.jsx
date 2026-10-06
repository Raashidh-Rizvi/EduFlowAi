import React from 'react';
import { SearchX, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';

/** Friendly empty result state for catalog / section lists. */
export function EmptyState({ title = 'No courses found', message, action, icon: Icon = SearchX }) {
  return (
    <div className="mk-state" role="status">
      <span className="mk-state__icon">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3 className="mk-state__title">{title}</h3>
      {message && <p className="mk-state__message">{message}</p>}
      {action}
    </div>
  );
}

/** Inline error state with a retry affordance. */
export function ErrorState({ message = 'We could not load this content.', onRetry, title = 'Something went wrong' }) {
  return (
    <div className="mk-state mk-state--error" role="alert">
      <span className="mk-state__icon">
        <AlertTriangle size={26} aria-hidden="true" />
      </span>
      <h3 className="mk-state__title">{title}</h3>
      <p className="mk-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function NoInstructorsState() {
  return (
    <EmptyState
      icon={Inbox}
      title="Instructor profiles are being prepared"
      message="Featured educators will appear here as soon as they publish their first course."
    />
  );
}

export default EmptyState;
