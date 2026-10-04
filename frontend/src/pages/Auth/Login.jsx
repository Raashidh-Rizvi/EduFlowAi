import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, ChevronLeft, GraduationCap, Presentation, ShieldCheck, Zap } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import RoleSwitcher from '../../components/common/RoleSwitcher';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authService } from '../../services/authService';
import { getAuthenticationErrorMessage } from '../../services/authErrors';
import { normalizeEmail, validateAuthentication, AUTH_MESSAGES } from '../../services/authValidation';

export default function Login({ onLoginSuccess, initialMode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickLogin = async (demoEmail) => {
    if (submitting.current) return;
    setEmail(demoEmail);
    setPassword('Password123!');
    submitting.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authService.login({ email: demoEmail, password: 'Password123!' });
      window.dispatchEvent(new CustomEvent('eduflow-session-updated', { detail: res }));
      onLoginSuccess(res);
    } catch (err) {
      setErrorMsg(getAuthenticationErrorMessage(err));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const validation = validateAuthentication({ fullName, email, password, confirmPassword }, isRegister);
    setErrorMsg(validation || '');
    if (validation) return;
    submitting.current = true;
    setLoading(true);

    try {
      if (isRegister) {
        const res = await authService.register({ fullName: fullName.trim(), email: normalizeEmail(email), password, role: 'Student' });
        onLoginSuccess(res);
      } else {
        const res = await authService.login({ email: normalizeEmail(email), password });
        onLoginSuccess(res);
      }
    } catch (err) {
      // Never fabricate a local identity when authentication fails — the user id
      // and role must always come from the backend for the credentials submitted.
      setErrorMsg(getAuthenticationErrorMessage(err));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Header Bar Actions */}
      <div style={{ position: 'absolute', top: '24px', right: '28px', zIndex: 50, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <RoleSwitcher onSwitchRole={onLoginSuccess} />
        <ThemeToggle showLabel />
      </div>

      <Link
        to="/"
        style={{
          position: 'absolute',
          top: '28px',
          left: '28px',
          zIndex: 50,
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none'
        }}
      >
        <ChevronLeft size={15} aria-hidden="true" /> Back to course catalog
      </Link>

      <div style={{
        width: '100%',
        maxWidth: '960px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: '24px',
        zIndex: 10
      }}>
        {/* Left Side: Brand & Quick Demo Logins */}
        <div className="card-premium" style={{
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid var(--border-card)'
        }}>
          <div>
            {/* Logo */}
            <div style={{ marginBottom: '20px' }}>
              <BrandLogo size="lg" subtitle="Adaptive Enterprise Learning Platform" />
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              Enterprise learning orchestration with deterministic rewards, LangGraph multi-agent study plans, and instructor-verified safety guardrails.
            </p>

            {/* Quick Demo Accounts */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Zap size={14} color="#F59E0B" fill="#F59E0B" />
                <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Quick Demo Links
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin('student@eduflow.ai')}
                  className="hover-scale"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: loading ? 'wait' : 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <GraduationCap size={16} color="#3B82F6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#3B82F6' }}>Login as Student</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Alex Rivera</div>
                  </div>
                  <ArrowRight size={13} color="#3B82F6" />
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin('instructor@eduflow.ai')}
                  className="hover-scale"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: loading ? 'wait' : 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Presentation size={16} color="#8B5CF6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#8B5CF6' }}>Login as Instructor</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dr. Sarah Jenkins</div>
                  </div>
                  <ArrowRight size={13} color="#8B5CF6" />
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin('admin@eduflow.ai')}
                  className="hover-scale"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: loading ? 'wait' : 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <ShieldCheck size={16} color="#EC4899" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#EC4899' }}>Login as Administrator</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>System Administrator</div>
                  </div>
                  <ArrowRight size={13} color="#EC4899" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="card-premium" style={{
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '1px solid var(--border-card)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {isRegister ? 'Create Account' : 'Sign in to Platform'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {isRegister ? 'Create your Student account' : 'Enter your email and password'}
            </p>
          </div>

          {errorMsg && (
            <div role="alert" style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <>
                <div>
                  <label className="form-label" htmlFor="auth-full-name">Full Name</label>
                  <input
                    id="auth-full-name"
                    autoComplete="name"
                    maxLength={200}
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="form-input"
                  />
                </div>

              </>
            )}

            <div>
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="auth-email"
                  autoComplete="email"
                  maxLength={254}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="auth-password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  aria-describedby={isRegister ? "auth-password-policy" : undefined}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <p id="auth-password-policy" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{AUTH_MESSAGES.password}</p>
                <div>
                  <label className="form-label" htmlFor="auth-confirm-password">Confirm Password</label>
                  <input id="auth-confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                    required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-input" />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                marginTop: '10px',
                padding: '11px 18px',
                fontSize: '13.5px',
                width: '100%'
              }}
            >
              {loading ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Authenticate & Continue')}
              <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              disabled={loading}
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); setConfirmPassword(''); }}
              style={{
                color: 'var(--primary)',
                fontWeight: '600',
                textDecoration: 'underline'
              }}
            >
              {isRegister ? 'Sign In' : 'Register Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
