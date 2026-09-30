import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Interactive 1-5 star input. Keyboard accessible (radio semantics) and
 * fully controlled: `value` is the selected rating, `onChange` receives it.
 */
export default function StarInput({ value = 0, onChange, size = 26, disabled = false, label = 'Your rating' }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= shown;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            disabled={disabled}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onFocus={() => !disabled && setHovered(star)}
            onBlur={() => setHovered(0)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled && !active ? 0.45 : 1
            }}
          >
            <Star
              size={size}
              color={active ? 'var(--warning)' : 'var(--text-subtle)'}
              fill={active ? 'var(--warning)' : 'transparent'}
              strokeWidth={2}
            />
          </button>
        );
      })}
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px' }}>
        {value > 0 ? `${value} / 5` : 'Select a rating'}
      </span>
    </div>
  );
}
