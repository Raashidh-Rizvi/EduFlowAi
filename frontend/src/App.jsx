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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadNotifications] = useState(3);
  const [pendingAiProposals] = useState(2);

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
    // Reset tab to default for role
    if (user.role === 'Admin' || user.role === 'Instructor') {
      setActiveTab('dashboard');
    }
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Student Portal (completely separate experience) ────────────────────────
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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar — dynamically filtered by role */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingAiProposals}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '28px 36px',
        overflowY: 'auto',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
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
      <div style={{ fontSize: '56px' }}>🚫</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF' }}>Access Denied</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '380px' }}>
        This section requires <strong style={{ color: 'var(--accent)' }}>{requiredRole}</strong> privileges.
        Contact your system administrator to request elevated access.
      </p>
    </div>
  );
}
