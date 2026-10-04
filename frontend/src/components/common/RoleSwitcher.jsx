import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Presentation,
  ShieldCheck,
  ChevronDown,
  Zap,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';
import { authService } from '../../services/authService';

const ROLES = [
  {
    key: 'Student',
    label: 'Student Profile',
    sublabel: 'Alex Rivera',
    email: 'student@eduflow.ai',
    icon: GraduationCap,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    targetPath: '/console/student'
  },
  {
    key: 'Instructor',
    label: 'Instructor Profile',
    sublabel: 'Dr. Sarah Jenkins',
    email: 'instructor@eduflow.ai',
    icon: Presentation,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    targetPath: '/console/instructor'
  },
  {
    key: 'Admin',
    label: 'Administrator Profile',
    sublabel: 'System Administrator',
    email: 'admin@eduflow.ai',
    icon: ShieldCheck,
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    targetPath: '/console/admin'
  }
];

export default function RoleSwitcher({ currentRole, onSwitchRole, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleRoleSelect = async (roleConfig) => {
    if (currentRole === roleConfig.key) {
      setIsOpen(false);
      return;
    }

    setSwitchingRole(roleConfig.key);
    setError(null);

    try {
      const profile = await authService.switchAccount({
        email: roleConfig.email,
        password: 'Password123!'
      });

      window.dispatchEvent(new CustomEvent('eduflow-session-updated', { detail: profile }));

      if (onSwitchRole) {
        onSwitchRole(profile);
      }

      setIsOpen(false);

      if (roleConfig.key === 'Student') {
        navigate('/console/student');
      } else if (roleConfig.key === 'Instructor') {
        navigate('/console/instructor');
      } else if (roleConfig.key === 'Admin') {
        navigate('/console/admin');
      } else {
        navigate('/console');
      }
    } catch (err) {
      console.error('Quick login failed:', err);
      setError('Quick login failed. Please try again.');
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentRoleConfig = ROLES.find((r) => r.key === currentRole);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hover-scale"
        aria-haspopup="true"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: compact ? '6px 12px' : '8px 16px',
          borderRadius: 'var(--radius-full, 9999px)',
          backgroundColor: isOpen
            ? 'var(--bg-surface-hover, rgba(255,255,255,0.12))'
            : 'var(--bg-surface, rgba(255,255,255,0.06))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
          color: 'var(--text-main, #FFFFFF)',
          fontSize: compact ? '12px' : '13px',
          fontWeight: '600',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <Zap size={compact ? 13 : 14} color="#F59E0B" fill="#F59E0B" />
        <span>
          {currentRoleConfig ? (
            <>
              <span style={{ color: 'var(--text-muted, #94A3B8)', fontWeight: '400', marginRight: '4px' }}>
                Role:
              </span>
              <strong style={{ color: currentRoleConfig.color }}>{currentRoleConfig.key}</strong>
            </>
          ) : (
            'Quick Login'
          )}
        </span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'var(--text-muted, #94A3B8)'
          }}
        />
      </button>

      {isOpen && (
        <div
          className="liquid-glass fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '310px',
            backgroundColor: 'var(--bg-card, #1E293B)',
            border: '1px solid var(--border-card, rgba(255, 255, 255, 0.15))',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '14px',
            zIndex: 1000,
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              marginBottom: '10px',
              borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#F59E0B" />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted, #94A3B8)'
                }}
              >
                Quick Login / Switch Role
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: '11.5px',
                color: '#EF4444',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                marginBottom: '10px'
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = currentRole === role.key;
              const isLoading = switchingRole === role.key;

              return (
                <button
                  key={role.key}
                  type="button"
                  disabled={Boolean(switchingRole)}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md, 12px)',
                    border: isActive
                      ? `1.5px solid ${role.color}`
                      : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                    backgroundColor: isActive
                      ? role.bgColor
                      : 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
                    cursor: switchingRole ? 'wait' : 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !switchingRole) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, rgba(255, 255, 255, 0.08))';
                      e.currentTarget.style.borderColor = role.borderColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface, rgba(255, 255, 255, 0.03))';
                      e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.06))';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: role.bgColor,
                      border: `1px solid ${role.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: role.color,
                      flexShrink: 0
                    }}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <Icon size={19} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-main, #FFFFFF)'
                        }}
                      >
                        Login as {role.key}
                      </span>
                      {isActive && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            backgroundColor: role.color,
                            color: '#FFFFFF',
                            fontWeight: '700'
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted, #94A3B8)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px'
                      }}
                    >
                      {role.sublabel}
                    </div>
                  </div>

                  {isActive && !isLoading && (
                    <Check size={16} color={role.color} style={{ flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

