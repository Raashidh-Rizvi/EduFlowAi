import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import Courses from '../Courses/Courses';
import Assessments from '../Assessments/Assessments';
import AiReview from '../AiReview/AiReview';
import Gamification from '../Gamification/Gamification';
import Insights from '../Insights/Insights';
import Communications from '../Communications/Communications';
import InstructorSidebar from './InstructorSidebar';
import DashboardView from './views/DashboardView';
import MyCoursesView from './views/MyCoursesView';
import CreateCourseView from './views/CreateCourseView';
import EnrollmentRequestsView from './views/EnrollmentRequestsView';
import MyStudentsView from './views/MyStudentsView';
import ReviewsView from './views/ReviewsView';
import ProfileView from './views/ProfileView';
import instructorService from '../../services/instructorService';
import { useUIVersion } from '../../context/UIVersionContext';
import InstructorPortalV2 from './InstructorPortalV2';

const SECTION_KEY = 'eduflow_instructor_section';

const readPendingAi = () => {
  try {
    const saved = localStorage.getItem('eduflow_ai_proposals_dynamic');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter(p => p.status === 'PendingInstructorApproval').length;
    }
  } catch {}
  return 0;
};

export default function InstructorPortal({ user, onLogout, onSwitchRole, onLogoClick }) {
  const { uiVersion } = useUIVersion();

  // Delegate entirely to V2 portal when v2 is active
  if (uiVersion === 'v2') {
    return (
      <InstructorPortalV2
        user={user}
        onLogout={onLogout}
        onSwitchRole={onSwitchRole}
        onLogoClick={onLogoClick}
      />
    );
  }

  // ── V1 (original layout) ─────────────────────────────────────────────────
  return <InstructorPortalV1 user={user} onLogout={onLogout} onSwitchRole={onSwitchRole} onLogoClick={onLogoClick} />;
}

function InstructorPortalV1({ user, onLogout, onSwitchRole, onLogoClick }) {
  const [section, setSectionState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SECTION_KEY);
      return stored || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [pendingEnrollments, setPendingEnrollments] = useState(0);
  const [pendingAiProposals] = useState(readPendingAi);

  const setSection = useCallback((next) => {
    try {
      sessionStorage.setItem(SECTION_KEY, next);
    } catch {}
    setSectionState(next);
    try {
      const main = document.getElementById('instructor-main');
      if (main) main.scrollTop = 0;
    } catch {}
  }, []);

  const refreshPendingEnrollments = useCallback(async () => {
    try {
      const summary = await instructorService.getEnrollmentRequestSummary();
      setPendingEnrollments(summary?.pending ?? 0);
    } catch {
      setPendingEnrollments(0);
    }
  }, []);

  useEffect(() => {
    refreshPendingEnrollments();
  }, [refreshPendingEnrollments, section]);

  const renderSection = () => {
    switch (section) {
      case 'my-courses':
        return <MyCoursesView onNavigate={setSection} />;
      case 'create-course':
        return <CreateCourseView onNavigate={setSection} />;
      case 'enrollment-requests':
        return (
          <EnrollmentRequestsView
            onNavigate={setSection}
            onDecisionMade={refreshPendingEnrollments}
          />
        );
      case 'my-students':
        return <MyStudentsView />;
      case 'reviews':
        return <ReviewsView />;
      case 'profile':
        return <ProfileView />;
      case 'courses':
        return <Courses currentUser={user} />;
      case 'assessments':
        return <Assessments currentUser={user} />;
      case 'ai-review':
        return <AiReview />;
      case 'gamification':
        return <Gamification />;
      case 'insights':
        return <Insights onTriggerRemedial={() => setSection('ai-review')} />;
      case 'communications':
        return <Communications />;
      case 'dashboard':
      default:
        return <DashboardView user={user} onNavigate={setSection} />;
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-canvas)' }}>
      <InstructorSidebar
        activeSection={section}
        onNavigate={setSection}
        pendingEnrollments={pendingEnrollments}
        pendingAiProposals={pendingAiProposals}
        currentUser={user}
        onLogout={onLogout}
        onLogoClick={onLogoClick}
      />

      <main id="instructor-main" style={{
        flex: 1, padding: '24px 32px', overflowY: 'auto', maxHeight: '100vh',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Navbar
            activeTab={section}
            currentUser={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
          />

          <div style={{ flex: 1, paddingBottom: '32px' }}>
            {renderSection()}
          </div>
        </div>
      </main>
    </div>
  );
}

