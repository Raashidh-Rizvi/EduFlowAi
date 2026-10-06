import React from 'react';

/**
 * CrescentLoader - A sleek, animated crescent loader component.
 */
export default function CrescentLoader({
  size = 24,
  color = 'var(--primary, #8B5CF6)',
  strokeWidth = 2.5,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`crescent-loader-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        ...style
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'crescentSpin 0.75s linear infinite',
          transformOrigin: 'center center'
        }}
      >
        <style>{`
          @keyframes crescentSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        {/* Semi-transparent background track */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity="0.2"
        />
        {/* Crescent arc foreground */}
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
