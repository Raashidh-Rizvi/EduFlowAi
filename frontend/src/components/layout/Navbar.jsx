import React, { useState } from "react";
import {
  Search,
  Bell,
  Sparkles,
  Activity,
  ShieldCheck,
  LogOut,
  Shield,
  ChevronDown,
  User,
} from "lucide-react";
import ThemeToggle from "../common/ThemeToggle";
import RoleSwitcher from "../common/RoleSwitcher";
import useApiHealth from "../../hooks/useApiHealth";

export default function Navbar({
  activeTab,
  unreadNotifications = 0,
  currentUser,
  onLogout,
  onSwitchRole,
  onNavigate,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const health = useApiHealth();

  // Identity always comes from the authenticated user supplied by App (which
  // sources it from GET /api/auth/me). Never default to a fabricated persona.
  const user = currentUser || {
    fullName: "",
    email: "",
    role: "",
  };

  const isAdmin = user.role === "Admin";

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2).toUpperCase();
  };

  const titles = {
    dashboard: {
      title: isAdmin ? "Platform Summary" : "Executive Overview",
      subtitle: isAdmin
        ? "Current database totals"
        : "Real-time telemetry on curriculum progression, student mastery, and AI agent queues",
    },
    admin: {
      title: "Platform Governance & Administration",
      subtitle:
        "Global directory management, RBAC elevations, system settings, and microservice health",
    },
    "ai-review": {
      title: "Human-in-the-Loop AI Review",
      subtitle:
        "Review, modify, and authorize agentic personalized study roadmaps and remedial quests",
    },
    courses: {
      title: isAdmin ? "Course Management" : "Curriculum & Learning Journey",
      subtitle: isAdmin
        ? "Manage platform courses, enrollments, modules, and course access."
        : "Manage modular course units, video resources, technical documentation, and visual roadmap nodes",
    },
    assessments: {
      title: "Assessments & Evaluation Engine",
      subtitle:
        "Author interactive quizzes, milestone challenges, rubric scoring, and code evaluation suites",
    },
    gamification: {
      title: "Gamification & Reward Mechanics",
      subtitle:
        "Monitor XP economy, streak velocity, unlockable milestone badges, and squad competitions",
    },
    insights: {
      title: "Cohort Insights & Risk Telemetry",
      subtitle:
        "Inspect student learning velocity, topic comprehension heatmaps, and automated intervention vectors",
    },
    communications: {
      title: "Communications & Notification Center",
      subtitle:
        "Broadcast course announcements, automated AI study nudges, and urgent milestone alerts",
    },
    "support-desk": {
      title: "Support Desk & Inquiries",
      subtitle:
        "Manage support tickets, triage bug reports, student disputes, and platform feedback",
    },
    "audit-logs": {
      title: "Platform Audit Logs",
      subtitle:
        "Governance audit trail of administrative actions and support desk operations",
    },
    "admin-profile": {
      title: "Personal Details",
      subtitle:
        "Current authenticated administrator personal, account, and system details",
    },
    "my-courses": {
      title: "My Courses",
      subtitle:
        "Manage, publish and review every course owned by your instructor account",
    },
    "create-course": {
      title: "Create a New Course",
      subtitle:
        "Author course metadata, pricing and structure — ownership is bound to your session",
    },
    "enrollment-requests": {
      title: "Enrollment Requests",
      subtitle:
        "Approve or decline student access to your courses and record a decision note",
    },
    "my-students": {
      title: "My Students",
      subtitle: "Roster and learning progress across every course you own",
    },
    reviews: {
      title: "Reviews & Ratings",
      subtitle: "Student feedback and aggregated ratings for your courses",
    },
    profile: {
      title: "Instructor Profile",
      subtitle: "Your identity, teaching statistics and workspace shortcuts",
    },
  };

  const current = titles[activeTab] || {
    title: "EduFlow AI Enterprise Console",
    subtitle: "Adaptive Learning System",
  };

  return (
    <header
      className="liquid-glass"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        margin: "24px 0",
        borderRadius: "var(--radius-xl)",
        gap: "20px",
        flexWrap: "wrap",
        position: "relative",
        zIndex: 100,
      }}
    >
      <div>
        <h1
          className="text-gradient"
          style={{
            fontSize: "24px",
            fontWeight: "800",
            letterSpacing: "-0.025em",
            margin: 0,
          }}
        >
          {current.title}
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginTop: "4px",
            fontWeight: "500",
          }}
        >
          {current.subtitle}
        </p>
      </div>

      {/* Direct Role Redirection Buttons (Student, Instructor, Admin) */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <RoleSwitcher currentRole={user.role} onSwitchRole={onSwitchRole} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Search Bar with Keyboard Hint */}
        <div
          className="glass-badge"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            width: "260px",
            transition: "all 0.15s ease",
          }}
        >
          <Search size={14} color="var(--primary)" />
          <input
            type="text"
            placeholder="Search resources, students..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "12.5px",
              width: "100%",
            }}
          />
          <kbd
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              padding: "2px 5px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Live Backend Telemetry Indicator — real round trip to GET /health */}
        <div
          className="glass-badge"
          title={
            health
              ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString()}`
              : "Checking API\u2026"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 14px",
            backgroundColor: health?.ok
              ? "var(--success-soft)"
              : "rgba(239, 68, 68, 0.12)",
            color: health?.ok ? "var(--success)" : "#EF4444",
            fontSize: "12px",
            fontWeight: "700",
            border: `1px solid ${health?.ok ? "var(--success-border)" : "rgba(239, 68, 68, 0.4)"}`,
          }}
        >
          <span
            className="status-dot-active"
            style={
              health?.ok
                ? undefined
                : { backgroundColor: "#EF4444", boxShadow: "0 0 6px #EF4444" }
            }
          ></span>
          <span>{health ? health.message : "API \u2026"}</span>
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle compact />

        {/* Notification Icon */}
        <div
          title="Notifications"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Bell size={15} color="var(--text-muted)" />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-3px",
                right: "-3px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "var(--primary)",
                color: "#FFFFFF",
                fontSize: "9px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid var(--bg-canvas)",
              }}
            >
              {unreadNotifications}
            </span>
          )}
        </div>

        {/* User Profile Pill */}
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "4px",
            paddingRight: "14px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-full)",
              background: isAdmin
                ? "var(--accent)"
                : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "12px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {getInitials(user.fullName)}
          </div>
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: "600",
              color: "var(--text-main)",
            }}
          >
            {user.fullName}
          </span>
          <ChevronDown
            size={14}
            color="var(--text-muted)"
            style={{
              transform: showProfileMenu ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          />
        </div>

        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 12px)",
              right: "24px",
              width: "260px",
              backgroundColor: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-card)",
              padding: "16px",
              boxShadow: "var(--shadow-popover)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isAdmin ? "var(--accent)" : "var(--primary)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "12.5px",
                }}
              >
                {getInitials(user.fullName)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text-main)",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.fullName}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                fontSize: "11.5px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Role:</span>
              <span
                style={{
                  fontWeight: "600",
                  color:
                    user.role === "Admin" ? "var(--accent)" : "var(--primary)",
                }}
              >
                {user.role}
              </span>
            </div>

            {isAdmin && onNavigate && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate("admin-profile");
                }}
                className="btn-secondary"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  fontSize: "12px",
                  gap: "6px",
                  justifyContent: "flex-start",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                <User size={13} color="var(--primary)" />
                Personal Details
              </button>
            )}

            {onLogout && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="btn-danger"
                style={{
                  width: "100%",
                  padding: "7px",
                  fontSize: "12px",
                  gap: "6px",
                }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
