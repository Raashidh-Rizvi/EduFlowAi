import React from 'react';
import { Star, Inbox, AlertTriangle } from 'lucide-react';
import CrescentLoader from '../../components/common/CrescentLoader';

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export const fmtMoney = (value) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

export const fmtNumber = (value, digits = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits).replace(/\.0$/, '');
};

export function StarRating({ value = 0, size = 14, showValue = false, count }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= rounded ? 'var(--warning)' : 'transparent'}
          color={i <= rounded ? 'var(--warning)' : 'var(--border-hover)'}
          strokeWidth={2}
        />
      ))}
      {showValue && (
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginLeft: '4px' }}>
          {fmtNumber(value, 1)}
        </span>
      )}
      {count !== undefined && (
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>({count})</span>
      )}
    </span>
  );
}

const STATUS_STYLES = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  ACTIVE: 'badge-success',
  COMPLETED: 'badge-primary',
  REJECTED: 'badge-danger',
  DROPPED: 'badge-neutral',
  CANCELLED: 'badge-neutral',
  DRAFT: 'badge-neutral',
  PUBLISHED: 'badge-success'
};

export function StatusPill({ status, label }) {
  const key = String(status || '').toUpperCase();
  const cls = STATUS_STYLES[key] || 'badge-neutral';
  return <span className={`badge-pill ${cls}`}>{label || key}</span>;
}

export function SectionHeading({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '64px 16px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
      <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
      {label}…
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="card-premium" style={{ padding: '44px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={24} color="var(--primary)" />
      </div>
      <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{title}</h3>
      {description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>{description}</p>}
      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
      borderRadius: 'var(--radius-md)', marginBottom: '16px',
      backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
      color: 'var(--accent)', fontSize: '13px', fontWeight: 600
    }}>
      <AlertTriangle size={16} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button className="btn-ghost" onClick={onRetry} style={{ padding: '5px 10px', fontSize: '12px' }}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Avatar({ name, url, size = 36, color = 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }) {
  const initials = (name || 'U').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  if (url) {
    return (
      <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: Math.max(10, Math.round(size * 0.36)), flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

