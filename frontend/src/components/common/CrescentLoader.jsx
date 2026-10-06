import React from 'react';

/**
 * CrescentLoader — A premium glowing arc/crescent spinner.
 *
 * Matches the dark-navy + blue-glow visual style used across EduFlow.
 *
 * Props:
 *   size        — diameter in px (default: 40)
 *   color       — stroke color (default: 'var(--primary, #8B5CF6)')
 *   strokeWidth — thickness of arc (default: 2.5)
 *   label       — text below/next to arc (default: '')
 *   fullPage    — fills viewport (default: false)
 *   inline      — tiny inline use (default: false)
 *   className   — extra CSS classes
 *   style       — extra inline styles
 */
export default function CrescentLoader({
  size = 40,
  color = 'var(--primary, #8B5CF6)',
  strokeWidth = 2.5,
  label = '',
  fullPage = false,
  inline = false,
  className = '',
  style = {}
}) {
  const spinnerSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'crescentSpin 0.75s linear infinite',
        transformOrigin: 'center center',
        flexShrink: 0
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes crescentSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity="0.2"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );

  if (inline) {
    return (
      <span
        className={`crescent-loader-inline ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
        aria-label={label || 'Loading'}
        role="status"
      >
        {spinnerSvg}
        {label && <span style={{ fontSize: '0.85em', opacity: 0.85 }}>{label}</span>}
      </span>
    );
  }

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
        ...style
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '40px 16px',
        ...style
      };

  return (
    <div className={`crescent-loader-wrapper ${className}`} style={wrapStyle} role="status" aria-label={label || 'Loading'}>
      {spinnerSvg}
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
 */
export function LoadingBlock({ label = 'Loading', size = 28 }) {
  return (
    <CrescentLoader size={size} label={`${label}…`} />
  );
}

/**
 * Convenience: a tiny inline arc + text span.
 */
export function InlineLoader({ label = '', size = 16 }) {
  return (
    <CrescentLoader inline size={size} label={label} />
  );
}
