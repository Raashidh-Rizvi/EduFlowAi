import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authService } from '../../services/authService';
import { getAuthenticationErrorMessage } from '../../services/authErrors';

export default function Login({ onLoginSuccess, initialMode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        const res = await authService.register({ fullName, email, password, role: 'Student' });
        onLoginSuccess(res);
      } else {
        const res = await authService.login({ email, password });
        onLoginSuccess(res);
      }
    } catch (err) {
      // Never fabricate a local identity when authentication fails — the user id
      // and role must always come from the backend for the credentials submitted.
      setErrorMsg(getAuthenticationErrorMessage(err));
    } finally {
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
      {/* Theme Toggle Button */}
      <div style={{ position: 'absolute', top: '24px', right: '28px', zIndex: 50 }}>
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
        {/* Left Side: Brand */}
        <div className="card-premium" style={{
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid var(--border-card)'
        }}>
          <div>
            {/* Logo */}
            <div style={{ marginBottom: '24px' }}>
              <BrandLogo size="lg" subtitle="Adaptive Enterprise Learning Platform" />
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              Enterprise learning orchestration with deterministic rewards, LangGraph multi-agent study plans, and instructor-verified safety guardrails.
            </p>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Sign in with your account. New learners can create a Student account.
            </p>
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
            <div style={{
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <>
                <div>
                  <label className="form-label" htmlFor="auth-full-name">Full Name</label>
                  <input
                    id="auth-full-name"
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
              onClick={() => setIsRegister(!isRegister)}
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
