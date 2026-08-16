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
import StudentPortal from './pages/Student/StudentPortal';
import { authService } from './services/authService';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Student Portal ─────────────────────────────────────────────────────────
  if (currentUser.role === 'Student') {
    return (
      <StudentPortal
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // ── Instructor / Admin Console ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingAiProposals}
        currentUser={currentUser}
        onLogout={handleLogout}
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
          />

          <div style={{ flex: 1, paddingBottom: '32px' }}>
            {activeTab === 'dashboard' && (
              <Dashboard onNavigateTo={(tab) => setActiveTab(tab)} />
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
