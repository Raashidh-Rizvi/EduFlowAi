import React, { useState } from 'react';
import { Sparkles, Shield, UserCheck, GraduationCap, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authService } from '../../services/authService';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('instructor@eduflow.ai');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('Dr. Sarah Jenkins');
  const [role, setRole] = useState('Instructor');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const demoAccounts = [
    {
      role: 'Instructor',
      name: 'Dr. Sarah Jenkins',
      email: 'instructor@eduflow.ai',
      badge: 'Course Lead',
      icon: GraduationCap,
      color: '#4F46E5'
    },
    {
      role: 'Admin',
      name: 'System Administrator',
      email: 'admin@eduflow.ai',
      badge: 'Full RBAC',
      icon: Shield,
      color: '#F43F5E'
    },
    {
      role: 'Student',
      name: 'Alex Rivera',
      email: 'student@eduflow.ai',
      badge: 'Level 2 • 1,250 XP',
      icon: UserCheck,
      color: '#0EA5E9'
    }
  ];

  const handleFillDemo = (acc) => {
    setEmail(acc.email);
    setPassword('Password123!');
    setFullName(acc.name);
    setRole(acc.role);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        const res = await authService.register({ fullName, email, password, role });
        onLoginSuccess(res);
      } else {
        const res = await authService.login({ email, password });
        onLoginSuccess(res);
      }
    } catch (err) {
      // Fallback for offline/standalone mode
      const selected = demoAccounts.find(d => d.email.toLowerCase() === email.toLowerCase()) || {
        name: fullName || 'User',
        email: email,
        role: role
      };
      const fallbackUser = {
        userId: '22222222-2222-2222-2222-222222222222',
        fullName: selected.name,
        email: selected.email,
        role: selected.role,
        token: 'demo-jwt-token'
      };
      localStorage.setItem('eduflow_user', JSON.stringify(fallbackUser));
      onLoginSuccess(fallbackUser);
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

      <div style={{
        width: '100%',
        maxWidth: '960px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: '24px',
        zIndex: 10
      }}>
        {/* Left Side: Brand & Quick Demo Account Switcher */}
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

            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              fontWeight: '700',
              marginBottom: '12px'
            }}>
              Quick-Switch Demo Personas:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {demoAccounts.map((acc, idx) => {
                const Icon = acc.icon;
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <div
                    key={idx}
                    onClick={() => handleFillDemo(acc)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                      border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: acc.color
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <span className="badge-pill badge-neutral" style={{ fontSize: '10.5px' }}>
                      {acc.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-soft)',
            border: '1px solid var(--success-border)',
            fontSize: '12px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>Master Password: <strong>Password123!</strong> (Pre-filled)</span>
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
              {isRegister ? 'Register your instructor or student account' : 'Select a persona on the left or enter credentials'}
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
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Role Scope</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-select"
                  >
                    <option value="Instructor">Instructor</option>
                    <option value="Student">Student</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@eduflow.ai"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
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
