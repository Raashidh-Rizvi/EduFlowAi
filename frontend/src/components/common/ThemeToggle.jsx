import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ compact = false, showLabel = false, style = {} }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
      aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
      className="theme-toggle-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: compact ? '6px' : '7px 10px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        color: isDark ? '#F59E0B' : '#4F46E5',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-sm)',
        fontSize: '12px',
        fontWeight: '600',
        ...style
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)',
        transition: 'transform 0.4s ease'
      }}>
        {isDark ? (
          <Sun size={compact ? 15 : 16} />
        ) : (
          <Moon size={compact ? 15 : 16} />
        )}
      </div>
      {showLabel && (
        <span style={{ color: 'var(--text-main)' }}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
