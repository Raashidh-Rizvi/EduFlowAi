import React, { useState } from 'react';
import { Sparkles, Shield, UserCheck, GraduationCap, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('instructor@eduflow.ai');
  const [password, setPassword] = useState('Password123!');
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
      color: 'var(--secondary)'
    },
    {
      role: 'Admin',
      name: 'System Administrator',
      email: 'admin@eduflow.ai',
      badge: 'Full RBAC',
      icon: Shield,
      color: 'var(--accent)'
    },
    {
      role: 'Student',
      name: 'Alex Rivera',
      email: 'student@eduflow.ai',
      badge: 'Level 2 • 1,250 XP',
      icon: UserCheck,
      color: 'var(--primary)'
    },
    {
      role: 'Student',
      name: 'Maya Patel',
      email: 'maya@eduflow.ai',
      badge: 'Level 6 • 8,420 XP',
      icon: Sparkles,
      color: 'var(--warning)'
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
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '920px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: '24px',
        zIndex: 10
      }}>
        {/* Left Side: Brand & Quick Demo Account Selection */}
        <div className="glass-panel" style={{
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid var(--border-accent)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <Sparkles size={26} color="#FFFFFF" />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                  EduFlow <span style={{ color: 'var(--secondary)' }}>AI</span>
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Adaptive Gamified Learning Platform</p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
              Select a pre-seeded demo role below to test full <strong>RBAC authentication</strong>, real-time gamification loops, and the <strong>Human-in-the-Loop AI review queue</strong>.
            </p>

            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', fontWeight: '700', marginBottom: '10px' }}>
              Click to autofill seeded credentials:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {demoAccounts.map((acc, idx) => {
                const Icon = acc.icon;
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <div
                    key={idx}
                    onClick={() => handleFillDemo(acc)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(0, 0, 0, 0.25)',
                      border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: acc.color
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: acc.color,
                      fontWeight: '700',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {acc.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '11.5px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>Master Password: <strong>Password123!</strong> (Pre-configured)</span>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="glass-panel" style={{
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
              {isRegister ? 'Create Account' : 'Sign in to Console'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {isRegister ? 'Register your instructor or student account' : 'Enter credentials or click any demo role on the left'}
            </p>
          </div>

          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent)',
              fontSize: '12px',
              marginBottom: '16px'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      marginTop: '4px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      marginTop: '4px',
                      outline: 'none'
                    }}
                  >
                    <option value="Instructor">Instructor</option>
                    <option value="Student">Student</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <Mail size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@eduflow.ai"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Password</label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <Lock size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Authenticate & Enter Console')}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRegister ? 'Sign In' : 'Register Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
