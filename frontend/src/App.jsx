import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard/Dashboard';
import AiReview from './pages/AiReview/AiReview';
import Courses from './pages/Courses/Courses';
import Assessments from './pages/Assessments/Assessments';
import Gamification from './pages/Gamification/Gamification';
import Insights from './pages/Insights/Insights';
import Communications from './pages/Communications/Communications';
import Login from './pages/Auth/Login';
import { authService } from './services/authService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [pendingAiProposals, setPendingAiProposals] = useState(2);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eduflow_user');
      return stored ? JSON.parse(stored) : {
        fullName: 'Dr. Sarah Jenkins',
        email: 'instructor@eduflow.ai',
        role: 'Instructor'
      };
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        pendingCount={pendingAiProposals}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '28px 36px',
        overflowY: 'auto',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header Bar */}
        <Navbar 
          activeTab={activeTab} 
          unreadNotifications={unreadNotifications}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic Page Views */}
        <div style={{ flex: 1, paddingBottom: '32px' }}>
          {activeTab === 'dashboard' && (
            <Dashboard onNavigateTo={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'ai-review' && (
            <AiReview />
          )}

          {activeTab === 'courses' && (
            <Courses />
          )}

          {activeTab === 'assessments' && (
            <Assessments />
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
