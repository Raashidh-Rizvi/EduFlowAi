import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import MarketplaceLayout from './components/layout/MarketplaceLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminManagement from './pages/Admin/AdminManagement';
import AiReview from './pages/AiReview/AiReview';
import Courses from './pages/Courses/Courses';
import Assessments from './pages/Assessments/Assessments';
import Gamification from './pages/Gamification/Gamification';
import Insights from './pages/Insights/Insights';
import Communications from './pages/Communications/Communications';
import Login from './pages/Auth/Login';
import HomePage from './pages/Marketplace/HomePage';
import CatalogPage from './pages/Marketplace/CatalogPage';
import CourseDetailsPage from './pages/Marketplace/CourseDetailsPage';
import InstructorProfilePage from './pages/Marketplace/InstructorProfilePage';
import PolicyPage from './pages/Marketplace/PolicyPage';
import StudentPortal from './pages/Student/StudentPortal';
import InstructorPortal from './pages/Instructor/InstructorPortal';
import EnrollmentRequestsView from './pages/Instructor/views/EnrollmentRequestsView';
import { authService } from './services/authService';
import instructorService from './services/instructorService';
import { AuthProvider } from './context/AuthContext';
import { ShieldAlert } from 'lucide-react';

function readStoredUser() {
  try {
    const stored = localStorage.getItem('eduflow_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [unreadNotifications] = useState(3);
  const [pendingAiProposals] = useState(() => {
    try {
      const saved = localStorage.getItem('eduflow_ai_proposals_dynamic');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((p) => p.status === 'PendingInstructorApproval').length;
      }
    } catch {
      return 0;
    }
    return 0;
  });

  const [currentUser, setCurrentUser] = useState(readStoredUser);

  // Instructor/Admin console: live badge count of enrollment requests still awaiting
  // a decision, refreshed whenever the console mounts and after every decision.
  const [pendingEnrollments, setPendingEnrollments] = useState(0);

  const refreshPendingEnrollments = async () => {
    if (!currentUser || (currentUser.role !== 'Instructor' && currentUser.role !== 'Admin')) {
      setPendingEnrollments(0);
      return;
    }
    try {
      const summary = await instructorService.getEnrollmentRequestSummary();
      setPendingEnrollments(Number(summary?.pending) || 0);
    } catch {
      setPendingEnrollments(0);
    }
  };

  useEffect(() => {
    refreshPendingEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Session re-validation: the cached user in localStorage is only a rendering
  // hint. Identity and role are re-fetched from the secure backend endpoint
  // (GET /api/auth/me) on boot so a tampered or stale profile can never survive
  // a page refresh, and the session stays valid until logout or expiry.
  const [sessionChecked, setSessionChecked] = useState(
    () => !localStorage.getItem('eduflow_token') && !localStorage.getItem('eduflow_refresh_token')
  );

  useEffect(() => {
    if (sessionChecked) return;
    let alive = true;
    authService
      .restoreSession()
      .then((profile) => {
        if (alive) setCurrentUser(profile);
      })
      .finally(() => {
        if (alive) setSessionChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [sessionChecked]);

  const nextPath = useMemo(() => {
    const requested = new URLSearchParams(location.search).get('next');
    return requested && requested.startsWith('/') ? requested : '/console';
  }, [location.search]);

  const handleLogout = useCallback(async () => {
    // Revokes the refresh token server-side, then clears every local credential.
    await authService.logout();
    setCurrentUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleLoginSuccess = useCallback((user) => {
    // `user` is the normalized profile returned by authService (already persisted
    // together with the JWT + refresh token by the service layer).
    setCurrentUser(user);
    if (user.role === 'Admin' || user.role === 'Instructor') setActiveTab('dashboard');
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath]);

  const handleSwitchRole = useCallback(async (targetRole) => {
    // Demo personas are re-authenticated against the backend — switching portal
    // means logging in as that real account. The id/role shown afterwards always
    // come from the server response; nothing is fabricated client-side.
    const personaAccounts = {
      Student: { email: 'student@eduflow.ai', password: 'Password123!', tab: null },
      Instructor: { email: 'instructor@eduflow.ai', password: 'Password123!', tab: 'dashboard' },
      Admin: { email: 'admin@eduflow.ai', password: 'Password123!', tab: 'admin' }
    };

    const config = personaAccounts[targetRole];
    if (!config) return;
    if (currentUser?.role === targetRole) return;

    try {
      const user = await authService.switchAccount({ email: config.email, password: config.password });
      setCurrentUser(user);
      if (config.tab) setActiveTab(config.tab);
      navigate('/console', { replace: true });
    } catch (err) {
      // Failed switch keeps the current session intact (switchAccount does not
      // clear credentials on failure) and surfaces the backend's message.
      console.error(
        '[RoleSwitch] Portal switch failed:',
        err?.response?.data?.message || err?.friendlyMessage || err?.message
      );
    }
  }, [currentUser, navigate]);

  const authValue = useMemo(
    () => ({ currentUser, onLogout: handleLogout, onSwitchRole: handleSwitchRole, onLoginSuccess: handleLoginSuccess }),
    [currentUser, handleLogout, handleSwitchRole, handleLoginSuccess]
  );

  // Render nothing but a shell until the stored session has been re-validated
  // against the backend (prevents a stale/tampered cached role from flashing).
  if (!sessionChecked) {
    return <div className="fade-in" style={{ minHeight: '100vh' }} />;
  }

  // ── Console (instructor / admin / student workspace) ──────────────────────
  const consoleView = (() => {
    if (!currentUser) return <Navigate to="/login" replace />;

    if (currentUser.role === 'Student') {
      return <StudentPortal user={currentUser} onLogout={handleLogout} onSwitchRole={handleSwitchRole} />;
    }

    if (currentUser.role === 'Instructor') {
      return (
        <InstructorPortal
          user={currentUser}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          onLogoClick={() => navigate('/')}
        />
      );
    }

    // Admin is the only role that reaches the governance console. Any other
    // (unexpected) role is denied rather than silently granted console access.
    if (currentUser.role !== 'Admin') {
      return <AccessDenied requiredRole="Administrator" />;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-canvas)' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingAiProposals}
          pendingEnrollments={pendingEnrollments}
          currentUser={currentUser}
          onLogout={handleLogout}
          onLogoClick={() => navigate('/')}
        />

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

              {activeTab === 'admin' && currentUser.role === 'Admin' && <AdminManagement />}
              {activeTab === 'admin' && currentUser.role !== 'Admin' && <AccessDenied requiredRole="Admin" />}

              {activeTab === 'ai-review' && <AiReview />}
              {activeTab === 'enrollment-requests' && (
                <EnrollmentRequestsView
                  onNavigate={setActiveTab}
                  onDecisionMade={refreshPendingEnrollments}
                />
              )}
              {activeTab === 'courses' && <Courses currentUser={currentUser} />}
              {activeTab === 'assessments' && <Assessments currentUser={currentUser} />}
              {activeTab === 'gamification' && <Gamification />}
              {activeTab === 'insights' && <Insights onTriggerRemedial={() => setActiveTab('ai-review')} />}
              {activeTab === 'communications' && <Communications />}
            </div>
          </div>
        </main>
      </div>
    );
  })();

  const authView = currentUser
    ? <Navigate to={nextPath} replace />
    : <Login onLoginSuccess={handleLoginSuccess} initialMode={new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login'} />;

  return (
    <AuthProvider value={authValue}>
      <div className="fade-in">
        <Routes>
          <Route element={<MarketplaceLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CatalogPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/instructors/:id" element={<InstructorProfilePage />} />
            <Route path="/policies/:slug" element={<PolicyPage />} />
          </Route>

          <Route path="/login" element={authView} />
          <Route path="/console" element={consoleView} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
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
