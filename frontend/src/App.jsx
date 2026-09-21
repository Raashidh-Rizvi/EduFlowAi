import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminManagement from './pages/Admin/AdminManagement';
import AiReview from './pages/AiReview/AiReview';
import Courses from './pages/Courses/Courses';
import Assessments from './pages/Assessments/Assessments';
import Gamification from './pages/Gamification/Gamification';
import Insights from './pages/Insights/Insights';
import Communications from './pages/Communications/Communications';
import Login from './pages/Auth/Login';
import LandingPage from './pages/Landing/LandingPage';
import StudentPortal from './pages/Student/StudentPortal';
import { authService } from './services/authService';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('eduflow_active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const setActiveTab = (tab) => {
    try {
      sessionStorage.setItem('eduflow_active_tab', tab);
    } catch {}
    setActiveTabState(tab);
  };
  const [showLogin, setShowLogin] = useState(false);
  const [forceLanding, setForceLanding] = useState(false);
  const [unreadNotifications] = useState(3);
  const [pendingAiProposals, setPendingAiProposals] = useState(() => {
    try {
      const saved = localStorage.getItem('eduflow_ai_proposals_dynamic');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(p => p.status === 'PendingInstructorApproval').length;
      }
    } catch {
      return 0;
    }
    return 0;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eduflow_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    authService.logout();
    localStorage.removeItem('eduflow_user');
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    localStorage.setItem('eduflow_user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'Admin' || user.role === 'Instructor') {
      setActiveTab('dashboard');
    }
  };

  const handleSwitchRole = async (targetRole) => {
    const roleConfig = {
      Student: {
        email: 'student@eduflow.ai',
        password: 'Password123!',
        user: {
          userId: '33333333-3333-3333-3333-333333333333',
          id: '33333333-3333-3333-3333-333333333333',
          fullName: 'Alex Rivera',
          email: 'student@eduflow.ai',
          role: 'Student',
          token: 'demo-jwt-token-student'
        },
        tab: null
      },
      Instructor: {
        email: 'instructor@eduflow.ai',
        password: 'Password123!',
        user: {
          userId: '22222222-2222-2222-2222-222222222222',
          id: '22222222-2222-2222-2222-222222222222',
          fullName: 'Dr. Sarah Jenkins',
          email: 'instructor@eduflow.ai',
          role: 'Instructor',
          token: 'demo-jwt-token-instructor'
        },
        tab: 'dashboard'
      },
      Admin: {
        email: 'admin@eduflow.ai',
        password: 'Password123!',
        user: {
          userId: '11111111-1111-1111-1111-111111111111',
          id: '11111111-1111-1111-1111-111111111111',
          fullName: 'System Administrator',
          email: 'admin@eduflow.ai',
          role: 'Admin',
          token: 'demo-jwt-token-admin'
        },
        tab: 'admin'
      }
    };

    const config = roleConfig[targetRole];
    if (!config) return;

    let authenticatedUser = null;
    try {
      const res = await authService.login({ email: config.email, password: config.password });
      if (res && (res.token || res.role)) {
        authenticatedUser = res;
      }
    } catch (err) {
      console.log(`[RoleSwitch] Backend auth offline or bypassed, applying verified demo persona for ${targetRole}`);
    }

    if (!authenticatedUser) {
      authenticatedUser = config.user;
    }

    localStorage.setItem('eduflow_user', JSON.stringify(authenticatedUser));
    if (authenticatedUser.token) {
      localStorage.setItem('eduflow_token', authenticatedUser.token);
    }

    setCurrentUser(authenticatedUser);
    setForceLanding(false);
    setShowLogin(false);

    if (config.tab) {
      setActiveTab(config.tab);
    }
  };

  // ── Not logged in or Force Landing ─────────────────────────────────────────
  if (forceLanding || !currentUser) {
    if (!currentUser && showLogin) {
      return (
        <div className="fade-in">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      );
    }
    return (
      <div className="fade-in">
        <LandingPage 
          currentUser={currentUser}
          onLoginClick={() => {
            if (currentUser) {
              setForceLanding(false);
            } else {
              setShowLogin(true);
            }
          }} 
          onSwitchRole={handleSwitchRole}
        />
      </div>
    );
  }

  // ── Student Portal ─────────────────────────────────────────────────────────
  if (currentUser.role === 'Student') {
    return (
      <div className="fade-in">
        <StudentPortal 
          user={currentUser} 
          onLogout={handleLogout} 
          onSwitchRole={handleSwitchRole}
        />
      </div>
    );
  }

  // ── Instructor / Admin Console ─────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Smart Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingAiProposals}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLogoClick={() => setForceLanding(true)}
      />

      {/* Main Content Area with max-width containment */}
      <main style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Navbar
            activeTab={activeTab}
            unreadNotifications={unreadNotifications}
            currentUser={currentUser}
            onLogout={handleLogout}
            onSwitchRole={handleSwitchRole}
          />

          <div style={{ flex: 1, paddingBottom: '32px' }}>
            {activeTab === 'dashboard' && (
              <Dashboard onNavigateTo={(tab) => setActiveTab(tab)} currentUser={currentUser} />
            )}

            {/* Admin-only page */}
            {activeTab === 'admin' && currentUser.role === 'Admin' && (
              <AdminManagement />
            )}
            {activeTab === 'admin' && currentUser.role !== 'Admin' && (
              <AccessDenied requiredRole="Admin" />
            )}

            {/* Instructor + Admin pages */}
            {activeTab === 'ai-review' && (
              <AiReview />
            )}

            {activeTab === 'courses' && (
              <Courses currentUser={currentUser} />
            )}

            {activeTab === 'assessments' && (
              <Assessments currentUser={currentUser} />
            )}

            {activeTab === 'gamification' && (
              <Gamification />
            )}

            {activeTab === 'insights' && (
              <Insights onTriggerRemedial={() => setActiveTab('ai-review')} />
            )}

            {activeTab === 'communications' && (
              <Communications />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AccessDenied({ requiredRole }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      gap: '16px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--accent-soft)',
        border: '1px solid var(--accent-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ShieldAlert size={28} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Access Restricted</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '380px' }}>
        This section requires <strong style={{ color: 'var(--accent)' }}>{requiredRole}</strong> level authorization.
        Please contact system governance to request elevated permissions.
      </p>
    </div>
  );
}
