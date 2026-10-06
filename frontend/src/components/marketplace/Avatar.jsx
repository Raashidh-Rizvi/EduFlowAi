import React from 'react';

function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Instructor / student profile image with a deterministic gradient
 * fallback when no avatar is stored (or the remote image fails to load).
 */
export default function Avatar({ name = '', src, size = 40, className = '', title }) {
  const [failed, setFailed] = React.useState(false);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`mk-avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      title={title || name}
      aria-hidden={showImage ? undefined : 'true'}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ? `${name}` : 'Profile'}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="mk-avatar__fallback">{initialsOf(name)}</span>
      )}
    </span>
  );
}
