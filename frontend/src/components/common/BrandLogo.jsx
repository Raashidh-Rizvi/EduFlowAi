import React from 'react';

/**
 * High-tech AI Neural Brain Icon for EduFlow AI
 * Crafted with gradient synaptic flow lines, circuit nodes, and glowing aura.
 */
export const BrainIcon = ({ size = 24, className = '', glow = true, style = {} }) => {
  const iconId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: glow ? 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.45))' : 'none',
        transition: 'filter 0.3s ease, transform 0.3s ease',
        flexShrink: 0,
        ...style
      }}
    >
      <defs>
        <linearGradient id={`brain-grad-1-${iconId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        <linearGradient id={`brain-grad-2-${iconId}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="60%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id={`brain-glow-${iconId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.8" />
        </linearGradient>

        <radialGradient id={`node-glow-${iconId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer Brain Contour - Left Hemisphere */}
      <path
        d="M 23 8 C 17 8 11 12 10 18 C 8 20 7 24 8 28 C 9 32 12 35 15 37 C 18 39 21 40 23 42"
        stroke={`url(#brain-grad-1-${iconId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Outer Brain Contour - Right Hemisphere */}
      <path
        d="M 25 8 C 31 8 37 12 38 18 C 40 20 41 24 40 28 C 39 32 36 35 33 37 C 30 39 27 40 25 42"
        stroke={`url(#brain-grad-2-${iconId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Synaptic Fissure / Flow Canal */}
      <path
        d="M 24 8 L 24 42"
        stroke={`url(#brain-glow-${iconId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.85"
      />

      {/* Left Neural Pathways & Circuit Connections */}
      <path
        d="M 10 18 C 14 18 16 22 23 22"
        stroke={`url(#brain-grad-1-${iconId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 14 13 C 17 16 19 16 23 14"
        stroke={`url(#brain-grad-1-${iconId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 8 28 C 13 28 16 32 23 30"
        stroke={`url(#brain-grad-1-${iconId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 15 37 C 17 33 20 34 23 38"
        stroke={`url(#brain-grad-1-${iconId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Right Neural Pathways & Circuit Connections */}
      <path
        d="M 38 18 C 34 18 32 22 25 22"
        stroke={`url(#brain-grad-2-${iconId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 34 13 C 31 16 29 16 25 14"
        stroke={`url(#brain-grad-2-${iconId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 40 28 C 35 28 32 32 25 30"
        stroke={`url(#brain-grad-2-${iconId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 33 37 C 31 33 28 34 25 38"
        stroke={`url(#brain-grad-2-${iconId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Glowing Synapse Nodes (AI Active Neurons) */}
      <circle cx="10" cy="18" r="2.2" fill="#38BDF8" />
      <circle cx="14" cy="13" r="2" fill="#60A5FA" />
      <circle cx="16.5" cy="22" r="2" fill="#818CF8" />
      <circle cx="8" cy="28" r="2.2" fill="#6366F1" />
      <circle cx="15" cy="37" r="2" fill="#A855F7" />

      <circle cx="38" cy="18" r="2.2" fill="#C084FC" />
      <circle cx="34" cy="13" r="2" fill="#E879F9" />
      <circle cx="31.5" cy="22" r="2" fill="#A855F7" />
      <circle cx="40" cy="28" r="2.2" fill="#818CF8" />
      <circle cx="33" cy="37" r="2" fill="#38BDF8" />

      {/* Central Cortex Power Spark */}
      <circle cx="24" cy="22" r="2.8" fill="#FFFFFF" filter={`url(#node-glow-${iconId})`} />
      <circle cx="24" cy="30" r="2.2" fill="#38BDF8" />
    </svg>
  );
};

/**
 * Reusable, responsive Brand Logo component for EduFlow AI
 */
export const BrandLogo = ({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showTag = true,
  subtitle = null,
  compact = false,
  variant = 'default',
  onClick = null,
  style = {}
}) => {
  const sizeMap = {
    sm: { icon: 20, box: 30, text: '15px', badge: '9.5px', subtitle: '10px' },
    md: { icon: 24, box: 36, text: '18px', badge: '10.5px', subtitle: '11px' },
    lg: { icon: 30, box: 44, text: '22px', badge: '11.5px', subtitle: '12px' },
    xl: { icon: 38, box: 54, text: '28px', badge: '13px', subtitle: '13.5px' },
  };

  const config = sizeMap[size] || sizeMap.md;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : size === 'xl' ? '14px' : '10px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: `${config.box}px`,
          height: `${config.box}px`,
          borderRadius: size === 'xl' ? '14px' : size === 'sm' ? '8px' : '10px',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.3), transparent 70%)',
            pointerEvents: 'none'
          }}
        />
        <BrainIcon size={config.icon} glow={true} />
      </div>

      {/* Typography */}
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.1 }}>
            <span
              style={{
                fontSize: config.text,
                fontWeight: '800',
                color: 'var(--text-main)',
                letterSpacing: '-0.025em',
                fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
              }}
            >
              EduFlow
            </span>
            {showTag && (
              <span
                style={{
                  fontSize: config.badge,
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  color: '#818CF8',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              >
                AI
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: config.subtitle,
                color: 'var(--text-muted)',
                fontWeight: '500',
                margin: '3px 0 0 0',
                lineHeight: 1
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
