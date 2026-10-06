import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Global helper function to trigger a red-text white-background error pop-up from anywhere.
 */
export function showGlobalError(message, title = 'Error Occurred', details = '', code = '') {
  window.dispatchEvent(new CustomEvent('eduflow-global-error', {
    detail: { message, title, details, code }
  }));
}

export default function GlobalErrorModal() {
  const [errorState, setErrorState] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    code: ''
  });

  useEffect(() => {
    const handleGlobalError = (event) => {
      const { message, title, details, code } = event.detail || {};
      setErrorState({
        isOpen: true,
        title: title || 'Error Occurred',
        message: message || 'An unexpected error occurred. Please try again.',
        details: details || '',
        code: code || ''
      });
    };

    window.addEventListener('eduflow-global-error', handleGlobalError);
    return () => {
      window.removeEventListener('eduflow-global-error', handleGlobalError);
    };
  }, []);

  if (!errorState.isOpen) return null;

  const handleClose = () => {
    setErrorState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div
      className="global-error-popup-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-error-title"
        style={{
          backgroundColor: '#ffffff', // White background as explicitly required
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(220, 38, 38, 0.2)',
          border: '2px solid #ef4444',
          maxWidth: '480px',
          width: '100%',
          overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px 24px',
            borderBottom: '1px solid #fee2e2'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <h3
              id="global-error-title"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '800',
                color: '#dc2626', // Red color text
                letterSpacing: '-0.01em'
              }}
            >
              {errorState.title}
            </h3>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close error popup"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '14.5px',
              lineHeight: '1.55',
              color: '#b91c1c', // Red text color on white background
              fontWeight: '600'
            }}
          >
            {errorState.message}
          </p>

          {errorState.details && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                backgroundColor: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#991b1b',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            >
              {errorState.details}
            </div>
          )}

          {errorState.code && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#ef4444' }}>
                Error Code:
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#991b1b',
                  backgroundColor: '#fee2e2',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                {errorState.code}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px 18px 24px',
            backgroundColor: '#fafafa',
            borderTop: '1px solid #fee2e2',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={handleClose}
            style={{
              backgroundColor: '#ffffff', // White background
              color: '#dc2626', // Red color text
              border: '2px solid #dc2626', // Red border
              borderRadius: '8px',
              padding: '9px 24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.color = '#b91c1c';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#dc2626';
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
