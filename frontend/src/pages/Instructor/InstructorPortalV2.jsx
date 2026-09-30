import React, { useCallback, useEffect, useState } from "react";
import NavbarV2 from "../../components/layout/NavbarV2";
import Courses from "../Courses/Courses";
import Assessments from "../Assessments/Assessments";
import AiReview from "../AiReview/AiReview";
import Gamification from "../Gamification/Gamification";
import Insights from "../Insights/Insights";
import Communications from "../Communications/Communications";
import InstructorSidebarV2 from "./InstructorSidebarV2";
import DashboardView from "./views/DashboardView";
import MyCoursesView from "./views/MyCoursesView";
import CreateCourseView from "./views/CreateCourseView";
import EnrollmentRequestsView from "./views/EnrollmentRequestsView";
import MyStudentsView from "./views/MyStudentsView";
import ReviewsView from "./views/ReviewsView";
import ProfileView from "./views/ProfileView";
import instructorService from "../../services/instructorService";
import HelpSupportDialog from "../../components/support/HelpSupportDialog";

const SECTION_KEY = "eduflow_instructor_section";

const readPendingAi = () => {
  try {
    const saved = localStorage.getItem("eduflow_ai_proposals_dynamic");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed))
        return parsed.filter((p) => p.status === "PendingInstructorApproval")
          .length;
    }
  } catch {}
  return 0;
};

export default function InstructorPortalV2({
  user,
  onLogout,
  onSwitchRole,
  onLogoClick,
}) {
  const [section, setSectionState] = useState(() => {
    try {
      return sessionStorage.getItem(SECTION_KEY) || "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [pendingEnrollments, setPendingEnrollments] = useState(0);
  const [pendingAiProposals] = useState(readPendingAi);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const setSection = useCallback((next) => {
    try {
      sessionStorage.setItem(SECTION_KEY, next);
    } catch {}
    setSectionState(next);
    try {
      const main = document.getElementById("instructor-main-v2");
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
      case "my-courses":
        return <MyCoursesView onNavigate={setSection} />;
      case "create-course":
        return <CreateCourseView onNavigate={setSection} />;
      case "enrollment-requests":
        return (
          <EnrollmentRequestsView
            onNavigate={setSection}
            onDecisionMade={refreshPendingEnrollments}
          />
        );
      case "my-students":
        return <MyStudentsView />;
      case "reviews":
        return <ReviewsView />;
      case "profile":
        return <ProfileView />;
      case "courses":
        return <Courses currentUser={user} />;
      case "assessments":
        return <Assessments currentUser={user} />;
      case "ai-review":
        return <AiReview />;
      case "gamification":
        return <Gamification />;
      case "insights":
        return <Insights onTriggerRemedial={() => setSection("ai-review")} />;
      case "communications":
        return <Communications />;
      case "dashboard":
      default:
        return <DashboardView user={user} onNavigate={setSection} />;
    }
  };

  return (
    <div className="v2-shell v2-fade-in">
      <InstructorSidebarV2
        activeSection={section}
        onNavigate={setSection}
        onOpenSupport={() => setIsSupportOpen(true)}
        pendingEnrollments={pendingEnrollments}
        pendingAiProposals={pendingAiProposals}
        currentUser={user}
        onLogout={onLogout}
        onLogoClick={onLogoClick}
      />

      <div className="v2-main">
        <NavbarV2
          activeTab={section}
          currentUser={user}
          onLogout={onLogout}
          onSwitchRole={onSwitchRole}
        />
        <div
          id="instructor-main-v2"
          className="v2-page-content"
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - var(--v2-navbar-h))",
          }}
        >
          {renderSection()}
        </div>
      </div>

      <HelpSupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        currentUser={user}
      />
    </div>
  );
}
