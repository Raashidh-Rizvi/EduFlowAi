import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  UserCheck,
  Users,
  Star,
  UserCog,
  Sparkles,
  CheckCircle2,
  Trophy,
  BarChart3,
  Bell,
  LogOut,
  ChevronRight,
  LifeBuoy,
} from "lucide-react";
import { BrandLogo } from "../../components/common/BrandLogo";
import { useUIVersion } from "../../context/UIVersionContext";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "my-courses", label: "My Courses", icon: BookOpen },
      { id: "create-course", label: "Create Course", icon: PlusCircle },
      {
        id: "enrollment-requests",
        label: "Enrollment Requests",
        icon: UserCheck,
      },
      { id: "my-students", label: "My Students", icon: Users },
      { id: "reviews", label: "Reviews & Ratings", icon: Star },
      { id: "profile", label: "Profile", icon: UserCog },
    ],
  },
  {
    label: "Course Studio",
    items: [
      { id: "courses", label: "Curriculum & Modules", icon: BookOpen },
      { id: "assessments", label: "Assessments & Quizzes", icon: CheckCircle2 },
      { id: "ai-review", label: "AI Review & Analytics", icon: Sparkles },
    ],
  },
  {
    label: "Instructor Console",
    items: [
      { id: "gamification", label: "Gamification & XP", icon: Trophy },
      { id: "insights", label: "Cohort Insights", icon: BarChart3 },
      { id: "communications", label: "Communications Hub", icon: Bell },
    ],
  },
];

export default function InstructorSidebarV2({
  activeSection,
  onNavigate,
  onOpenSupport,
  pendingEnrollments = 0,
  pendingAiProposals = 0,
  currentUser,
  onLogout,
  onLogoClick,
}) {
  const user = currentUser || {};
  const { uiVersion, setUIVersion } = useUIVersion();
  const getInitials = (name) => {
    if (!name) return "IN";
    const parts = name.split(" ").filter(Boolean);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2).toUpperCase();
  };

  const getBadge = (id) => {
    if (id === "enrollment-requests" && pendingEnrollments > 0)
      return pendingEnrollments;
    if (id === "ai-review" && pendingAiProposals > 0) return pendingAiProposals;
    return null;
  };

  return (
    <aside className="v2-sidebar">
      {/* Brand */}
      <div className="v2-sidebar-brand">
        <BrandLogo
          size="sm"
          subtitle="Instructor"
          onClick={onLogoClick}
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="v2-nav-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const badge = getBadge(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`v2-nav-item${isActive ? " active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    size={16}
                    color={isActive ? "var(--v2-text-active)" : "var(--v2-text-muted)"}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </span>
                  {badge !== null && (
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "99px",
                        background: "rgba(139,92,246,0.2)",
                        color: "var(--v2-accent-text)",
                        border: "1px solid rgba(139,92,246,0.35)",
                        flexShrink: 0,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div key="support">
          <div className="v2-nav-section-label">Support</div>
          <button
            type="button"
            onClick={onOpenSupport}
            className="v2-nav-item"
            style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <LifeBuoy
              size={16}
              color="var(--v2-text-muted)"
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Help & Support
            </span>
          </button>
        </div>
      </div>

      {/* Footer — user console + sign out */}
      <div className="v2-sidebar-footer">
        <div className="v2-sidebar-user">
          <div
            className="v2-avatar"
            style={{ width: 32, height: 32, fontSize: "12px" }}
          >
            {getInitials(user.fullName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "var(--v2-text-main)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.fullName || "Instructor"}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--v2-text-muted)",
                marginTop: "1px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Instructor Console
            </div>
          </div>
          <ChevronRight size={14} color="var(--v2-text-muted)" />
        </div>

        {/* UI Version Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "99px",
            background: "var(--v2-overlay-1)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}
        >
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--v2-text-muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            UI
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["v1", "v2"].map((v) => (
              <button
                key={v}
                onClick={() => setUIVersion(v)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "99px",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor:
                    uiVersion === v
                      ? "rgba(139,92,246,0.8)"
                      : "rgba(139,92,246,0.2)",
                  background:
                    uiVersion === v ? "var(--v2-accent-1)" : "transparent",
                  color: uiVersion === v ? "#fff" : "var(--v2-text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "9px",
            background: "transparent",
            border: "none",
            color: "var(--v2-text-muted)",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(236,72,153,0.1)";
            e.currentTarget.style.color = "var(--v2-danger-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--v2-text-muted)";
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
