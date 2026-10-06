import React from 'react';

/**
 * CrescentLoader — A premium glowing arc/crescent spinner.
 *
 * Matches the dark-navy + blue-glow visual style used across EduFlow.
 *
 * Props:
 *   size      — diameter in px   (default: 40)
 *   label     — text below arc   (default: '')
 *   fullPage  — fills viewport   (default: false)
 *   inline    — tiny inline use  (default: false)
 */
export default function CrescentLoader({
  size = 40,
  label = '',
  fullPage = false,
  inline = false,
}) {
  /* ── inline variant: tiny arc next to text ─────────────────────── */
  if (inline) {
    const s = size || 16;
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        aria-label={label || 'Loading'}
        role="status"
      >
        <span className="crescent-arc" style={{ '--crescent-size': `${s}px` }} aria-hidden="true" />
        {label && <span style={{ fontSize: '0.85em', opacity: 0.75 }}>{label}</span>}
      </span>
    );
  }

  /* ── block variant: centred with optional label ─────────────────── */
  const wrapStyle = fullPage
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'var(--bg-canvas, #02020f)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '60px 16px',
        minHeight: 200,
      };

  return (
    <div style={wrapStyle} role="status" aria-label={label || 'Loading'}>
      <span
        className="crescent-arc"
        style={{ '--crescent-size': `${size}px` }}
        aria-hidden="true"
      />
      {label && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-muted, #6b7280)',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Convenience: a compact loading row used inside cards / panels.
 * Drop-in replacement for the old `LoadingBlock` from shared.jsx.
 */
export function LoadingBlock({ label = 'Loading', size = 28 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '48px 16px',
        color: 'var(--text-muted)',
        fontSize: '13.5px',
      }}
      role="status"
      aria-label={label}
    >
      <span
        className="crescent-arc"
        style={{ '--crescent-size': `${size}px` }}
        aria-hidden="true"
      />
      {label}…
    </div>
  );
}

/**
 * Convenience: a tiny inline arc + text span.
 * Replaces `<Loader2 className="spin" />` in button / inline contexts.
 */
export function InlineLoader({ label = '', size = 15 }) {
  return (
    <CrescentLoader inline size={size} label={label} />
  );
}
