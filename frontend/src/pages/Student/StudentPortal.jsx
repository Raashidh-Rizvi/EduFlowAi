import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Bot,
  Trophy,
  User,
  Zap,
  Flame,
  Shield,
  BookOpen,
  CheckCircle2,
  Lock,
  Star,
  Award,
  LogOut,
  ChevronRight,
  ChevronDown,
  Send,
  MessageCircle,
  ShieldCheck,
  Coins,
  Target,
  FileText,
  Eye,
  Download,
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  HelpCircle,
  Sparkles,
  UserCheck,
  Inbox,
  Clock,
  ExternalLink,
  MessageSquareText,
  LifeBuoy,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import HelpSupportDialog from "../../components/support/HelpSupportDialog";
import { useNavigate } from "react-router-dom";
import { downloadPdf, preparePdfForViewing } from "../../utils/pdfHelper";
import ThemeToggle from "../../components/common/ThemeToggle";
import { BrandLogo } from "../../components/common/BrandLogo";
import RoleSwitcher from "../../components/common/RoleSwitcher";
import StarRating from "../../components/marketplace/StarRating";
import CourseReviews from "../../components/reviews/CourseReviews";
import { aiService } from "../../services/aiService";
import { courseService } from "../../services/courseService";
import { enrollmentService } from "../../services/enrollmentService";
import { gradingService } from "../../services/gradingService";
import { quizService } from "../../services/quizService";
import { gamificationService } from "../../services/gamificationService";

// ─── Sub-Components ────────────────────────────────────────────────────────────

function HomeTab({
  profile,
  onMissionClaim,
  onFreezeUse,
  onNavigate,
  onStartQuiz,
}) {
  const pct = Math.min(
    100,
    Math.round((profile.xpInLevel / profile.xpToNext) * 100),
  );
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onMissionClaim(100, 40);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Level Progress Card */}
      <div
        className="card-premium glass-card-hover"
        style={{
          padding: "28px",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--secondary)",
                fontWeight: "800",
                letterSpacing: "0.04em",
                marginBottom: "4px",
              }}
            >
              LEVEL {profile.level} — {profile.levelName.toUpperCase()}
            </div>
            <div
              className="metric-gradient"
              style={{ fontSize: "32px", fontWeight: "800", lineHeight: "1.1" }}
            >
              {profile.totalXp.toLocaleString()}{" "}
              <span
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                }}
              >
                Total XP
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--warning)",
                }}
              >
                {profile.coins}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                Coins
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-canvas)",
            borderRadius: "var(--radius-full)",
            height: "10px",
            overflow: "hidden",
            marginBottom: "12px",
            border: "1px solid var(--border-subtle)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.4s ease",
              boxShadow: "0 0 10px rgba(139, 92, 246, 0.5)",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            fontWeight: "500",
          }}
        >
          {profile.xpInLevel.toLocaleString()} /{" "}
          {profile.xpToNext.toLocaleString()} XP to Level {profile.level + 1} (
          {pct}%)
        </div>
      </div>

      {/* Streak & Freeze Card */}
      <div
        className="card-premium glass-card-hover"
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          <Flame size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: "700",
              color: "var(--text-main)",
              fontSize: "14px",
            }}
          >
            {profile.streak} Day Learning Streak
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            {profile.freezeTokens} streak freeze protection available
          </div>
        </div>
        <button
          onClick={onFreezeUse}
          className="btn-secondary"
          style={{ padding: "6px 12px", fontSize: "11.5px" }}
        >
          <Shield size={13} />
          <span>Use Freeze</span>
        </button>
      </div>

      {/* Daily Mission */}
      <div>
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: "700",
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}
        >
          RECOMMENDED STUDY MISSION
        </div>
        <div
          className="card-premium glass-card-hover"
          style={{
            padding: "24px",
            borderColor: claimed
              ? "var(--success-border)"
              : "var(--primary-border)",
            background: claimed
              ? "rgba(16, 185, 129, 0.05)"
              : "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span className="badge-pill badge-primary">Standard Objective</span>
            <span
              style={{
                color: "var(--warning)",
                fontWeight: "700",
                fontSize: "12.5px",
              }}
            >
              +100 XP • +40 Coins
            </span>
          </div>
          <div
            style={{
              fontWeight: "700",
              fontSize: "15px",
              color: "var(--text-main)",
              marginBottom: "4px",
            }}
          >
            Clean Architecture & PostgreSQL Indexing
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: "1.5",
              marginBottom: "14px",
            }}
          >
            Read the curriculum specification PDF, review composite index
            selectivity, and complete the diagnostic evaluation.
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onStartQuiz(null)}
              className="btn-primary hover-scale"
              style={{
                flex: 1,
                padding: "9px",
                fontSize: "12.5px",
                borderRadius: "var(--radius-full)",
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                border: "none",
              }}
            >
              Start Mission Assessment
            </button>
            <button
              onClick={handleClaim}
              disabled={claimed}
              className={claimed ? "glass-badge" : "btn-secondary hover-scale"}
              style={
                claimed
                  ? { padding: "8px 16px", color: "var(--success)" }
                  : { padding: "8px 16px", borderRadius: "var(--radius-full)" }
              }
            >
              {claimed ? "✓ Completed" : "Claim Reward"}
            </button>
          </div>
        </div>
      </div>

      {/* Deep Work Focus Sprint Launcher */}
      <button
        onClick={() => onNavigate("focus")}
        className="card-premium glass-card-hover"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
          border: "1px solid var(--primary-border)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div
              style={{
                fontWeight: "800",
                fontSize: "13.5px",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Deep Work Focus Sprint{" "}
              <span
                className="badge-pill badge-primary"
                style={{ fontSize: "10px" }}
              >
                +35-75 XP
              </span>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Lock in uninterrupted concentration, grow your Mind Garden, and
              preserve your streak.
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="var(--primary)" />
      </button>

      {/* AI Coach Shortcut */}
      <button
        onClick={() => onNavigate("coach")}
        className="card-premium"
        style={{
          width: "100%",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            background: "var(--secondary-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--secondary)",
          }}
        >
          <Bot size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: "700",
              color: "var(--text-main)",
              fontSize: "13.5px",
              marginBottom: "2px",
            }}
          >
            AI Learning Assistant
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            Get personalized tutoring or clarify complex topics.
          </div>
        </div>
        <ChevronRight size={16} color="var(--text-muted)" />
      </button>
    </div>
  );
}

function EnrollmentStatusPill({ status }) {
  const key = String(status || "").toUpperCase();
  const styles = {
    PENDING: { label: "Pending approval", className: "badge-warning" },
    APPROVED: { label: "Approved", className: "badge-success" },
    ACTIVE: { label: "Approved", className: "badge-success" },
    COMPLETED: { label: "Completed", className: "badge-success" },
    REJECTED: { label: "Declined", className: "badge-danger" },
    CANCELLED: { label: "Cancelled", className: "badge-secondary" },
    DROPPED: { label: "Withdrawn", className: "badge-secondary" },
  };
  const style = styles[key] || {
    label: key || "Unknown",
    className: "badge-secondary",
  };
  return (
    <span
      className={`badge-pill ${style.className}`}
      style={{ fontSize: "10.5px" }}
    >
      {style.label}
    </span>
  );
}

function AwaitingApprovalCard({ course }) {
  const status = String(course.enrollmentStatus || "Pending");
  const isPending = status === "Pending";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span className="badge-pill badge-primary">{course.code}</span>
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: "700",
            color: "var(--text-main)",
          }}
        >
          {course.title}
        </span>
        <EnrollmentStatusPill status={status} />
      </div>

      <div
        className="card-premium"
        style={{
          padding: "20px",
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
            background: isPending
              ? "var(--warning-soft, var(--primary-soft))"
              : "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isPending
              ? "var(--warning, var(--primary))"
              : "var(--text-muted)",
          }}
        >
          {isPending ? <Clock size={19} /> : <Lock size={19} />}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            {isPending
              ? "Waiting for instructor approval"
              : "Course materials are locked"}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              lineHeight: "1.6",
            }}
          >
            {isPending
              ? "Your enrollment request has been sent to the instructor. Course materials, PDFs and lesson completion unlock the moment it is approved."
              : status === "Rejected"
                ? "Your enrollment request was declined. You can submit it again from the Enrollment tab if your circumstances change."
                : "You do not have an approved enrollment for this course. Submit a new request from the Enrollment tab to regain access."}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Whether a course's materials may be opened for this enrollment status. This is the
 * local pre-render hint only — opening a course always re-verifies the decision
 * server-side (GET /courses/{id}/access) before any curriculum is rendered.
 */
function canOpenCourseMaterials(status) {
  const value = String(status || "Active").toUpperCase();
  return (
    value === "ACTIVE" ||
    value === "COMPLETED" ||
    value === "APPROVED" ||
    value === "ACCESS GRANTED"
  );
}

function EnrollmentRequestsTab({
  requests,
  courses,
  loading,
  busyCourseId,
  onCancel,
  onReRequest,
  onBrowse,
  onGoToCourse,
  onOpenCourse,
}) {
  if (loading) {
    return (
      <div
        className="card-premium"
        style={{
          padding: "36px 20px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        Loading your enrollment requests…
      </div>
    );
  }

  const enrolled = (courses || []).filter((c) =>
    canOpenCourseMaterials(c.enrollmentStatus),
  );

  // Approved enrollments shown as course cards — the same shape as the
  // instructor's "My Courses" grid. Opening one routes to the course page
  // (details → continue learning → quiz → curriculum & syllabus).
  const myCoursesSection = (
    <div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: "800",
          color: "var(--text-main)",
        }}
      >
        My Courses
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          marginTop: "2px",
        }}
      >
        Open an approved course to see its details, continue learning and take
        its quiz — the curriculum and syllabus live inside.
      </div>
      {enrolled.length === 0 ? (
        <div
          className="card-premium"
          style={{
            padding: "22px 18px",
            marginTop: "12px",
            textAlign: "center",
            fontSize: "12.5px",
            color: "var(--text-muted)",
          }}
        >
          No approved courses yet — request one below and its card appears here
          once your instructor approves it.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: "14px",
            marginTop: "12px",
          }}
        >
          {enrolled.map((course) => (
            <EnrolledCourseCard
              key={course.id}
              course={course}
              onOpen={onOpenCourse}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (!requests.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {myCoursesSection}
      <div
        className="card-premium"
        style={{
          padding: "52px 20px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "var(--radius-sm)",
            background: "var(--primary-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
          }}
        >
          <Inbox size={24} />
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "var(--text-main)",
          }}
        >
          No enrollment requests yet
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            maxWidth: "380px",
            lineHeight: "1.6",
          }}
        >
          Browse the course catalog and request a course — your instructor will
          approve or decline it.
        </div>
        <button
          className="btn-primary"
          onClick={onBrowse}
          style={{ fontSize: "12.5px" }}
        >
          <ExternalLink size={14} /> Browse courses
        </button>
      </div>
      </div>
    );
  }

  const ordered = [...requests].sort(
    (a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {myCoursesSection}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--text-main)",
            }}
          >
            My Enrollment Requests
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Approval is required before a course opens its materials. Click an approved course to open its page.
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={onBrowse}
          style={{ fontSize: "12.5px" }}
        >
          <ExternalLink size={14} /> Browse courses
        </button>
      </div>

      {ordered.map((request) => {
        const status = String(request.status || "Pending");
        const isPending = status === "Pending";
        const isRejected =
          status === "Rejected" ||
          status === "Cancelled" ||
          status === "Dropped";
        const isApproved = !isPending && !isRejected;
        const busy = busyCourseId === request.courseId;

        return (
          <div
            key={request.enrollmentId || request.courseId}
            className="card-premium glass-card-hover"
            onClick={() => {
              if (isApproved && onGoToCourse) {
                onGoToCourse(request.courseId);
              }
            }}
            style={{
              padding: "16px 18px",
              cursor: isApproved ? "pointer" : "default",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="badge-pill badge-primary"
                    style={{ fontSize: "10.5px" }}
                  >
                    {request.courseCode}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                    }}
                  >
                    {request.courseTitle}
                  </span>
                  <EnrollmentStatusPill
                    status={request.statusLabel || request.status}
                  />
                </div>

                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    marginTop: "7px",
                  }}
                >
                  Requested {new Date(request.requestedAt).toLocaleDateString()}
                  {request.reviewedAt && (
                    <>
                      {" "}
                      · Reviewed{" "}
                      {new Date(request.reviewedAt).toLocaleDateString()}
                    </>
                  )}
                </div>

                {request.reviewNotes && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      marginTop: "9px",
                      padding: "7px 11px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {request.reviewNotes}
                  </div>
                )}
              </div>

              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {isPending && (
                  <button
                    className="btn-ghost"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(request);
                    }}
                    style={{ fontSize: "12.5px" }}
                  >
                    {busy ? "Withdrawing…" : "Withdraw"}
                  </button>
                )}
                {isRejected && (
                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReRequest(request);
                    }}
                    style={{ fontSize: "12.5px" }}
                  >
                    {busy ? "Sending…" : "Request again"}
                  </button>
                )}
                {isApproved && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--success)",
                        fontWeight: "600",
                      }}
                    >
                      <UserCheck size={14} /> Access granted
                    </span>
                    <button
                      type="button"
                      className="btn-primary hover-scale"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onGoToCourse) onGoToCourse(request.courseId);
                      }}
                      style={{
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "var(--radius-full)",
                        background:
                          "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                        border: "none",
                        color: "#ffffff",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      <Play size={13} fill="#ffffff" /> Continue Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// An approved enrollment rendered as a course card — the same visual language the
// instructor's "My Courses" grid uses, so both roles read the workspace the same way.
function EnrolledCourseCard({ course, onOpen }) {
  const progress = course.courseProgress || null;
  const pct = progress ? Math.round(progress.percentage || 0) : 0;
  const moduleCount = (course.modules || []).length;
  const lessonCount =
    (course.modules || []).reduce(
      (n, m) => n + ((m.lessons || []).length || 0),
      0,
    ) || course.totalLessons || 0;

  const open = () => onOpen(course.id);

  return (
    <div
      className="card-premium glass-card-interactive"
      role="button"
      tabIndex={0}
      aria-label={`Open ${course.title}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "13px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-md)",
            background:
              "linear-gradient(135deg, var(--primary-soft), var(--secondary-soft))",
            border: "1px solid var(--border-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={20} color="var(--primary)" />
        </div>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <EnrollmentStatusPill status={course.enrollmentStatus} />
          {progress && (
            <span className="badge-pill badge-primary">{pct}% complete</span>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--primary)",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          {course.code}
          {course.instructorName ? ` · ${course.instructorName}` : ""}
        </div>
        <h3
          style={{
            fontSize: "15.5px",
            fontWeight: 800,
            color: "var(--text-main)",
            margin: "5px 0 0",
            lineHeight: 1.35,
          }}
        >
          {course.title}
        </h3>
        <p
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            margin: "7px 0 0",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {course.description || "No description yet."}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "11.5px",
          color: "var(--text-muted)",
          alignItems: "center",
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <BookOpen size={13} /> {moduleCount} modules
        </span>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <Clock size={13} /> {lessonCount} lessons
        </span>
        <StarRating
          value={course.averageRating || 0}
          count={course.ratingCount || 0}
          size={13}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          paddingTop: "8px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {course.courseGrade?.gradingStatus === "Active" ? (
          <span
            className="badge-pill badge-success"
            title={`Weighted ${course.courseGrade.coursePercentage}% of the course`}
          >
            Grade {course.courseGrade.grade}
          </span>
        ) : (
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            {progress
              ? `${progress.completedUnits} of ${progress.totalUnits} completed`
              : "Syllabus available"}
          </span>
        )}
        <button
          type="button"
          className="btn-primary hover-scale"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          style={{
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "var(--radius-full)",
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            border: "none",
            color: "#ffffff",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Play size={13} fill="#ffffff" /> Continue Course
        </button>
      </div>
    </div>
  );
}

function BackToCoursesButton({ onClick, label = "Back to My Courses" }) {
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={onClick}
      style={{
        alignSelf: "flex-start",
        fontSize: "12.5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
      }}
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}

/**
 * Course page opened from an Enrollment card: details, continue learning, quiz and
 * the full curriculum/syllabus tree. ACCESS IS ROLE BASED AND SERVER VERIFIED —
 * the parent resolves GET /courses/{id}/access from the JWT before anything here
 * renders, so an approved enrollment, the course instructor, or an admin is required;
 * everyone else gets the locked explanation instead of the materials.
 */
function CourseDetailView({
  course,
  access,
  coursesLoading,
  currentUser,
  onBack,
  onOpenPdf,
  onCompleteLesson,
  onStartQuiz,
}) {
  if (!access || access.state !== "ready") {
    return (
      <div
        className="card-premium"
        style={{
          padding: "36px 20px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        Verifying your access to this course…
      </div>
    );
  }

  if (!access.hasAccess) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <BackToCoursesButton onClick={onBack} />
        <div
          className="card-premium"
          style={{
            padding: "34px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--warning-soft, var(--primary-soft))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--warning, var(--primary))",
            }}
          >
            <Lock size={22} />
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-main)",
            }}
          >
            Course materials are locked
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              maxWidth: "420px",
              lineHeight: 1.6,
            }}
          >
            {access.reason ||
              "Only learners with an approved enrollment — plus the course instructor and admins — can open this curriculum and syllabus."}
          </div>
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{ fontSize: "12.5px" }}
          >
            <ArrowLeft size={14} /> Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <BackToCoursesButton onClick={onBack} />
        <div
          className="card-premium"
          style={{
            padding: "36px 20px",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          {coursesLoading
            ? "Loading your course…"
            : "This course is not in your enrolled courses."}
        </div>
      </div>
    );
  }

  const moduleCount = (course.modules || []).length;
  const lessonCount =
    (course.modules || []).reduce(
      (n, m) => n + ((m.lessons || []).length || 0),
      0,
    ) || course.totalLessons || 0;
  const progress = course.courseProgress || null;
  const pct = progress ? Math.round(progress.percentage || 0) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <BackToCoursesButton onClick={onBack} />

      {/* Course details */}
      <div
        className="card-premium"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span className="badge-pill badge-primary">{course.code}</span>
          <EnrollmentStatusPill status={course.enrollmentStatus} />
          {progress && (
            <span className="badge-pill badge-primary">Progress {pct}%</span>
          )}
          {course.courseGrade?.gradingStatus === "Active" && (
            <span
              className="badge-pill badge-success"
              title={`Weighted ${course.courseGrade.coursePercentage}% of the course; ${course.courseGrade.assessedWeight}% assessed so far`}
            >
              Grade {course.courseGrade.grade} •{" "}
              {course.courseGrade.coursePercentage}%
            </span>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text-main)",
              lineHeight: 1.3,
            }}
          >
            {course.title}
          </div>
          <p
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              margin: "8px 0 0",
              lineHeight: 1.65,
            }}
          >
            {course.description ||
              "Your instructor has not added a course description yet."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "center",
            flexWrap: "wrap",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          {course.instructorName && (
            <span>
              By{" "}
              <strong style={{ color: "var(--text-main)" }}>
                {course.instructorName}
              </strong>
            </span>
          )}
          <StarRating
            value={course.averageRating || 0}
            count={course.ratingCount || 0}
            size={13}
          />
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <BookOpen size={13} /> {moduleCount} modules
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Clock size={13} /> {lessonCount} lessons
          </span>
        </div>

        {progress && (
          <div>
            <div
              style={{
                height: "7px",
                borderRadius: "var(--radius-full)",
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, pct)}%`,
                  background:
                    "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              {progress.completedUnits} of {progress.totalUnits} lessons and
              assessments completed
            </div>
          </div>
        )}
      </div>

      {/* Curriculum & syllabus, continue learning and quiz actions */}
      <CurriculumTab
        courses={[course]}
        currentUser={currentUser}
        onOpenPdf={onOpenPdf}
        onCompleteLesson={onCompleteLesson}
        onStartQuiz={onStartQuiz}
      />
    </div>
  );
}

function CurriculumTab({
  courses,
  currentUser,
  onOpenPdf,
  onCompleteLesson,
  onStartQuiz,
}) {
  const [expandedMods, setExpandedMods] = useState({ m1: true, m2: true, m_0: true, m_1: true });
  const [reviewsOpen, setReviewsOpen] = useState({});

  const toggleMod = (id) => {
    setExpandedMods((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleReviews = (id) => {
    setReviewsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasAccess = (status) => {
    const value = String(status || "Active").toUpperCase();
    return value === "ACTIVE" || value === "COMPLETED" || value === "APPROVED" || value === "ACCESS GRANTED";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "var(--text-main)",
          }}
        >
          Curriculum & Syllabus
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          Study the syllabus PDFs and lecture materials, then complete each unit
          for XP and course progress.
        </div>
      </div>

      {courses.length === 0 ? (
        <div
          className="card-premium"
          style={{
            padding: "60px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-sm)",
              background: "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <BookOpen size={24} />
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            No Enrolled Courses Found
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              maxWidth: "380px",
              lineHeight: "1.5",
            }}
          >
            When instructors publish courses and materials with attached PDFs,
            they will appear here.
          </div>
        </div>
      ) : (
        courses.map((course) => {
          // A course whose enrollment is still awaiting (or denied by) the instructor
          // never renders its module tree or lesson actions — the backend withholds the
          // material anyway, and this keeps the portal honest about why.
          if (!hasAccess(course.enrollmentStatus)) {
            return <AwaitingApprovalCard key={course.id} course={course} />;
          }

          const modulesToRender = (course.modules && course.modules.length > 0)
            ? course.modules
            : [
                {
                  id: `mod_fallback_1_${course.id}`,
                  title: "Module 1: Core Architecture & PDF Lecture Slides",
                  description: "Core architectural principles and PDF reading slides.",
                  pdfUrl: "/api/syllabus-demo.pdf",
                  attachmentFileName: "Module1_Architecture_Slides.pdf",
                  lessons: [
                    {
                      id: `les_fallback_1_${course.id}`,
                      title: "Lesson 1.1: System Concepts & Fundamental Patterns",
                      duration: "25 mins",
                      xp: 40,
                      completed: false,
                      pdfUrl: "/api/slides-lesson1.pdf",
                      attachmentFileName: "Lesson1_Slides.pdf",
                      content: "Study architectural patterns and key abstractions.",
                    },
                    {
                      id: `les_fallback_2_${course.id}`,
                      title: "Lesson 1.2: Deep Dive Implementation & Practice",
                      duration: "35 mins",
                      xp: 50,
                      completed: false,
                      pdfUrl: "/api/slides-lesson2.pdf",
                      attachmentFileName: "Lesson2_Slides.pdf",
                      content: "Hands-on implementation and performance evaluation.",
                    },
                  ],
                },
                {
                  id: `mod_fallback_2_${course.id}`,
                  title: "Module 2: Advanced Design, Databases & Assessments",
                  description: "Advanced topics, PDF documentation, and module quiz.",
                  pdfUrl: "/api/syllabus-demo2.pdf",
                  attachmentFileName: "Module2_Advanced_Slides.pdf",
                  lessons: [
                    {
                      id: `les_fallback_3_${course.id}`,
                      title: "Lesson 2.1: Performance Optimization & Evaluation",
                      duration: "40 mins",
                      xp: 60,
                      completed: false,
                      pdfUrl: "/api/slides-lesson3.pdf",
                      attachmentFileName: "Lesson3_Slides.pdf",
                      content: "Review query plans, caching strategies, and DIP.",
                    },
                  ],
                },
              ];

          return (
            <div
              key={course.id}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span className="badge-pill badge-primary">{course.code}</span>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: "var(--text-main)",
                  }}
                >
                  {course.title}
                </span>
                {course.courseProgress && (
                  <span
                    className="badge-pill badge-primary"
                    title={`${course.courseProgress.completedUnits} of ${course.courseProgress.totalUnits} lessons and assessments completed`}
                  >
                    Progress {Math.round(course.courseProgress.percentage)}%
                  </span>
                )}
                {course.courseGrade?.gradingStatus === "Active" && (
                  <span
                    className="badge-pill badge-success"
                    title={`Weighted ${course.courseGrade.coursePercentage}% of the course; ${course.courseGrade.assessedWeight}% assessed so far`}
                  >
                    Grade {course.courseGrade.grade} • {course.courseGrade.coursePercentage}%
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {course.instructorName && (
                  <span
                    style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  >
                    By{" "}
                    <strong style={{ color: "var(--text-main)" }}>
                      {course.instructorName}
                    </strong>
                  </span>
                )}
                <StarRating
                  value={course.averageRating || 0}
                  count={course.ratingCount || 0}
                  size={13}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => toggleReviews(course.id)}
                  style={{ padding: "5px 12px", fontSize: "12px", gap: "6px" }}
                  aria-expanded={!!reviewsOpen[course.id]}
                >
                  <MessageSquareText size={13} />{" "}
                  {reviewsOpen[course.id] ? "Hide reviews" : "Rate & reviews"}
                </button>
              </div>

              {/* Action bar: Continue Learning & Take Quiz */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "2px 0" }}>
                <button
                  type="button"
                  className="btn-primary hover-scale"
                  onClick={() => {
                    // Resume where studying stopped: the first module that still
                    // has an unfinished lesson, otherwise the opening module.
                    const target =
                      modulesToRender.find((m) =>
                        (m.lessons || []).some((l) => !l.completed),
                      ) || modulesToRender[0];
                    if (target) {
                      setExpandedMods((prev) => ({ ...prev, [target.id]: true }));
                      document
                        .getElementById(`module-${course.id}-${target.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  style={{
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "var(--radius-full)",
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <Play size={13} fill="#ffffff" /> Continue Learning
                </button>
                <button
                  type="button"
                  className="btn-secondary hover-scale"
                  onClick={() => onStartQuiz(course.id)}
                  style={{
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  <HelpCircle size={13} color="var(--primary)" /> Take Course Quiz (+80 XP)
                </button>
              </div>

              {reviewsOpen[course.id] && (
                <CourseReviews courseId={course.id} currentUser={currentUser} />
              )}

              {modulesToRender.map((mod, modIdx) => {
                const isExpanded = !!expandedMods[mod.id];
                return (
                  <div
                    key={mod.id}
                    id={`module-${course.id}-${mod.id}`}
                    className="card-premium"
                    style={{
                      overflow: "hidden",
                      padding: 0,
                    }}
                  >
                    {/* Module Header */}
                    <div
                      onClick={() => toggleMod(mod.id)}
                      style={{
                        padding: "12px 16px",
                        background: isExpanded
                          ? "var(--primary-soft)"
                          : "var(--bg-surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div style={{ color: "var(--text-muted)" }}>
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "var(--secondary)",
                              fontWeight: "700",
                            }}
                          >
                            MODULE {modIdx + 1}
                          </div>
                          <div
                            style={{
                              fontSize: "13.5px",
                              fontWeight: "700",
                              color: "var(--text-main)",
                            }}
                          >
                            {mod.title}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {mod.pdfUrl && (
                          <span
                            className="badge-pill badge-secondary"
                            style={{ fontSize: "10.5px" }}
                          >
                            <FileText size={11} /> PDF
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {mod.lessons.length} Lessons
                        </span>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {/* Attached Module PDF Material */}
                        {mod.pdfUrl && (
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <FileText size={18} color="var(--secondary)" />
                              <div>
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    color: "var(--text-main)",
                                  }}
                                >
                                  {mod.attachmentFileName ||
                                    "Module Reading Material.pdf"}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Official module documentation
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={async () => {
                                  const doc = await preparePdfForViewing(
                                    mod.pdfUrl,
                                    `${mod.title} – PDF Material`,
                                    mod.attachmentFileName ||
                                      "module_syllabus.pdf",
                                  );
                                  onOpenPdf(doc);
                                }}
                                className="btn-secondary"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  gap: "4px",
                                }}
                              >
                                <Eye size={12} /> View PDF
                              </button>
                              <button
                                onClick={() =>
                                  downloadPdf(
                                    mod.pdfUrl,
                                    mod.attachmentFileName || "material.pdf",
                                    mod.title,
                                  )
                                }
                                className="btn-ghost"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  gap: "4px",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                <Download size={12} /> Download
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Lessons List */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {mod.lessons.map((les) => (
                            <div
                              key={les.id}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "var(--radius-sm)",
                                background: les.completed
                                  ? "var(--success-soft)"
                                  : "var(--bg-surface)",
                                border: `1px solid ${les.completed ? "var(--success-border)" : "var(--border-subtle)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: les.completed
                                      ? "var(--success-soft)"
                                      : "var(--primary-soft)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: les.completed
                                      ? "var(--success)"
                                      : "var(--primary)",
                                  }}
                                >
                                  {les.completed ? (
                                    <CheckCircle2 size={14} />
                                  ) : (
                                    <BookOpen size={12} />
                                  )}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: "12.5px",
                                      fontWeight: "600",
                                      color: "var(--text-main)",
                                    }}
                                  >
                                    {les.title}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {les.content}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {les.pdfUrl && (
                                  <button
                                    onClick={async () => {
                                      const doc = await preparePdfForViewing(
                                        les.pdfUrl,
                                        les.title,
                                        les.attachmentFileName ||
                                          "lesson_attachment.pdf",
                                      );
                                      onOpenPdf(doc);
                                    }}
                                    className="badge-pill badge-secondary"
                                    style={{
                                      cursor: "pointer",
                                      fontSize: "10.5px",
                                    }}
                                  >
                                    PDF
                                  </button>
                                )}

                                <span
                                  style={{
                                    fontSize: "11.5px",
                                    fontWeight: "700",
                                    color: "var(--warning)",
                                  }}
                                >
                                  +{les.xp} XP
                                </span>

                                {!les.completed ? (
                                  <button
                                    onClick={() =>
                                      onCompleteLesson(
                                        les.id,
                                        les.xp,
                                        course.id,
                                        mod.id,
                                      )
                                    }
                                    className="btn-primary"
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    Complete
                                  </button>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--success)",
                                      fontWeight: "700",
                                    }}
                                  >
                                    ✓ Done
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Module End Assessment Trigger */}
                        <div
                          style={{
                            paddingTop: "6px",
                            borderTop: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                            }}
                          >
                            Ready for evaluation?
                          </span>
                          <button
                            onClick={() => onStartQuiz(course.id)}
                            className="btn-primary"
                            style={{
                              padding: "5px 12px",
                              fontSize: "11.5px",
                              gap: "4px",
                            }}
                          >
                            <HelpCircle size={13} /> Take Quiz (+80 XP)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

function QuizRunner({ quiz, onComplete, onCancel }) {
  // The runner never sees answer keys: it collects answers, submits them once, and
  // renders only the authoritative result returned by the server.
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answersPayload, setAnswersPayload] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div
        className="card-premium"
        style={{ textAlign: "center", padding: "40px 20px" }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--text-main)",
          }}
        >
          No Questions Available
        </div>
        <button
          onClick={onCancel}
          className="btn-primary"
          style={{ marginTop: "12px" }}
        >
          Back to Curriculum
        </button>
      </div>
    );
  }

  const q = quiz.questions[qIdx];
  const isLast = qIdx === quiz.questions.length - 1;

  const submitAnswers = async (answers) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setRewardResult(await onComplete(quiz, answers));
    } catch (err) {
      setSubmitError(
        err?.friendlyMessage ||
          "Your answers could not be submitted. No result was recorded.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    const updatedAnswers = [
      ...answersPayload,
      { questionId: q.id, selectedAnswer: q.options[selected] || "" },
    ];
    setAnswersPayload(updatedAnswers);

    if (!isLast) {
      setQIdx((i) => i + 1);
      setSelected(null);
    } else {
      await submitAnswers(updatedAnswers);
    }
  };

  if (submitError) {
    return (
      <div
        className="card-premium"
        style={{ textAlign: "center", padding: "36px 20px" }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "var(--text-main)",
            marginBottom: "8px",
          }}
        >
          Submission Failed
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          {submitError}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={() => submitAnswers(answersPayload)}
            disabled={submitting}
            className="btn-primary"
            style={{ padding: "10px 24px" }}
          >
            {submitting ? "Retrying..." : "Retry Submission"}
          </button>
          <button
            onClick={onCancel}
            className="btn-ghost"
            style={{ padding: "10px 24px" }}
          >
            Return to Curriculum
          </button>
        </div>
      </div>
    );
  }

  if (rewardResult) {
    const passed = rewardResult.passed;
    const finalScore = Math.round(rewardResult.percentageScore);
    const badge = rewardResult.badgeUnlocked;
    const breakdown = rewardResult.questionBreakdown || [];

    return (
      <div
        className="card-premium"
        style={{ textAlign: "center", padding: "36px 20px" }}
      >
        <div
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "var(--text-main)",
            marginBottom: "6px",
          }}
        >
          {rewardResult.status === "Evaluating"
            ? "Submitted — Awaiting Marking"
            : passed
              ? "🎉 Assessment Passed"
              : "Assessment Finished"}
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Score: {rewardResult.scoreObtained}/{rewardResult.maxScore} (
          {finalScore}%)
          {quiz.passingScorePercent != null &&
            ` • Required: ${quiz.passingScorePercent}%`}
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "14px 28px",
            borderRadius: "var(--radius-md)",
            background: passed ? "var(--success-soft)" : "var(--primary-soft)",
            border: `1px solid ${passed ? "var(--success-border)" : "var(--primary-border)"}`,
            color: passed ? "var(--success)" : "var(--text-main)",
            fontWeight: "700",
            fontSize: "15px",
            marginBottom: "16px",
          }}
        >
          +{rewardResult.xpEarned ?? 0} XP • +{rewardResult.coinsEarned ?? 0}{" "}
          EduCoins Earned
        </div>
        {badge && (
          <div
            style={{
              margin: "0 auto 16px auto",
              maxWidth: "380px",
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              background: "var(--warning-soft)",
              border: "1px solid var(--warning-border)",
              color: "var(--warning)",
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            🏆 New Badge Unlocked: {badge.replace(/_/g, " ")}!
          </div>
        )}
        {rewardResult.feedback && (
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              maxWidth: "440px",
              margin: "0 auto 20px auto",
              lineHeight: "1.5",
            }}
          >
            {rewardResult.feedback}
          </div>
        )}
        {breakdown.length > 0 && (
          <div
            style={{
              textAlign: "left",
              maxWidth: "560px",
              margin: "0 auto 24px auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {breakdown.map((item, i) => (
              <div
                key={item.questionId || i}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${item.isCorrect ? "var(--success-border)" : "var(--accent-border)"}`,
                  background: item.isCorrect
                    ? "var(--success-soft)"
                    : "var(--accent-soft)",
                  fontSize: "12px",
                  color: "var(--text-main)",
                  lineHeight: "1.5",
                }}
              >
                <div style={{ fontWeight: "700" }}>
                  {i + 1}. {item.prompt} ({item.pointsAwarded} marks)
                </div>
                <div>Your answer: {item.selectedAnswer || "(no answer)"}</div>
                {item.correctAnswer && item.correctAnswer !== "Hidden" && (
                  <div>Correct answer: {item.correctAnswer}</div>
                )}
                {item.explanation && (
                  <div style={{ color: "var(--text-muted)" }}>
                    {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div>
          <button
            onClick={onCancel}
            className="btn-primary"
            style={{ padding: "10px 24px" }}
          >
            Return to Curriculum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            {quiz.title}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            Question {qIdx + 1} of {quiz.questions.length}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="btn-ghost"
          style={{ padding: "4px" }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          background: "var(--bg-canvas)",
          borderRadius: "var(--radius-full)",
          height: "6px",
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((qIdx + 1) / quiz.questions.length) * 100}%`,
            background: "var(--primary)",
            borderRadius: "var(--radius-full)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div
        className="card-premium"
        style={{ padding: "16px", backgroundColor: "var(--bg-surface)" }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "var(--text-main)",
            lineHeight: "1.5",
          }}
        >
          {q.prompt}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {q.options.map((opt, i) => {
          const isSelected = i === selected;
          return (
            <div
              key={i}
              onClick={() => !submitting && setSelected(i)}
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                background: isSelected
                  ? "var(--primary-soft)"
                  : "var(--bg-card)",
                border: `1px solid ${isSelected ? "var(--primary-border)" : "var(--border-card)"}`,
                cursor: submitting ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: isSelected
                    ? "var(--primary)"
                    : "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : "var(--text-main)",
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "500",
                  color: "var(--text-main)",
                }}
              >
                {opt}
              </span>
            </div>
          );
        })}
      </div>

      <button
        disabled={selected === null || submitting}
        onClick={handleNext}
        className="btn-primary"
        style={{
          width: "100%",
          padding: "11px",
          opacity: selected === null || submitting ? 0.5 : 1,
          cursor: selected === null || submitting ? "default" : "pointer",
        }}
      >
        {submitting
          ? "Submitting..."
          : isLast
            ? "Submit Assessment"
            : "Next Question →"}
      </button>
    </div>
  );
}

function CodeSnippetCard({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        margin: "8px 0",
        padding: "10px 16px",
        borderRadius: "16px",
        background: "rgba(125, 125, 125, 0.08)",
        border: "1px solid var(--border-subtle)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          flex: 1,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          color: "var(--text-main)",
        }}
      >
        {code}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="btn-ghost"
        title="Copy to clipboard"
        style={{
          padding: "4px 8px",
          borderRadius: "8px",
          border: "none",
          background: copied ? "rgba(16, 185, 129, 0.15)" : "transparent",
          color: copied ? "#10b981" : "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
          fontWeight: "600",
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
      >
        {copied ? (
          <>
            <Check size={13} />
            <span>Copied</span>
          </>
        ) : (
          <Copy size={13} />
        )}
      </button>
    </div>
  );
}

function CoachTab({ studentId, courseId }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello. I am your AI Learning Assistant. I analyze curriculum progress and clarify technical concepts. What topic are you studying today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [slideDecks, setSlideDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deckError, setDeckError] = useState("");
  const [deckLoadAttempt, setDeckLoadAttempt] = useState(0);

  // Discover available slide decks for targeted focus
  useEffect(() => {
    let isMounted = true;
    setDeckError("");
    aiService
      .getSlideDecks()
      .then((decks) => {
        if (isMounted && Array.isArray(decks)) {
          setSlideDecks(decks);
          if (!decks.length)
            setDeckError(
              "No indexed lectures are available yet. Index a lecture to use the Learning Agent.",
            );
        }
      })
      .catch((err) => {
        if (isMounted) setDeckError(err.message);
      });
    return () => {
      isMounted = false;
    };
  }, [deckLoadAttempt]);

  const PROMPTS = [
    "What is searching and problem solving in this lecture?",
    "Explain PostgreSQL Composite Indexes",
    "How do ACID transactions work in EF Core?",
    "What is Clean Architecture domain isolation?",
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  // Automatically scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isLoading]);

  // Keep input focused so user can type the next question immediately without clicking
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  // Track if user scrolled up to show "Jump to latest" button
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  // Production-grade ChatGPT-style Message Formatter:
  // - Converts **bold** into bold <strong> without asterisks
  // - Converts *italic* / *title* into styled <em> without asterisks
  // - Strips any stray lone asterisks completely
  // - Converts [title](url) and raw URLs into clickable links (↗)
  // - Removes citation artifacts like 【1†L1-L5】
  // - Formats section headers (Simple Definition, Real-World Example, etc.) cleanly
  // - Formats code blocks and logic expressions (e.g. P -> Q) with copy-to-clipboard cards
  const renderFormattedMessage = (text) => {
    if (!text) return null;

    // 1. Strip raw citation artifacts like 【1†L1-L5】
    const cleanText = text.replace(/【[^】]*】/g, "").trim();

    // 2. Parse fenced code blocks: ```code```
    const parts = cleanText.split(/(```[\s\S]*?```)/g);

    return parts.map((part, partIdx) => {
      if (!part) return null;

      // Handle fenced code block
      if (part.startsWith("```") && part.endsWith("```")) {
        const rawCode = part.slice(3, -3).replace(/^[a-zA-Z0-9_-]*\n/, "").trim();
        return <CodeSnippetCard key={`code-${partIdx}`} code={rawCode} />;
      }

      // Handle prose lines
      const lines = part.split("\n");
      return lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`space-${partIdx}-${lineIdx}`} style={{ height: "6px" }} />;
        }

        // Academic Web Notice Banner (🌐 Note: ...)
        if (trimmed.startsWith("🌐 Note:") || trimmed.startsWith("🌐")) {
          return (
            <div
              key={`note-${partIdx}-${lineIdx}`}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                fontSize: "12px",
                lineHeight: "1.5",
                marginBottom: "8px",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
              }}
            >
              <span>{trimmed}</span>
            </div>
          );
        }

        // Logic statement pill (e.g., P -> Q, A => B, etc. like the screenshot)
        if (
          /^(?:[A-Za-z0-9_\(\)]+\s*(?:->|→|=>|∧|∨|¬|⊢)\s*[A-Za-z0-9_\(\)]+)$/.test(trimmed) &&
          trimmed.length < 50
        ) {
          return <CodeSnippetCard key={`logic-${partIdx}-${lineIdx}`} code={trimmed} />;
        }

        // Clean Markdown / Numbered Headers (e.g. "6. Why do we need CNF?", "### Title")
        const isMarkdownHeader = /^#{1,6}\s+/.test(trimmed);
        const isNumberedHeader = /^\d+\.\s+[^:]+[:?]?$/.test(trimmed);
        const isSectionHeader =
          /^(Simple Definition|Real[‑-]World Example|Key Breakdown|Key Takeaway|Verified Web Sources)[\s–\-:]*$/i.test(
            trimmed,
          );

        if (isMarkdownHeader || isNumberedHeader || isSectionHeader) {
          const title = trimmed
            .replace(/^#{1,6}\s+/, "")
            .replace(/^[–\-]\s*/, "")
            .replace(/[\s–\-:]+$/, "");
          return (
            <div
              key={`head-${partIdx}-${lineIdx}`}
              style={{
                fontWeight: "800",
                fontSize: "14px",
                color: "var(--text-main)",
                marginTop: "10px",
                marginBottom: "4px",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </div>
          );
        }

        // Bullet line detection (• or - or *)
        const isBullet = /^[•\-*]\s+/.test(trimmed);
        const lineContent = isBullet ? trimmed.replace(/^[•\-*]\s+/, "") : line;

        // Parse inline tokens: Links, URLs, Inline Code, Bold-Italic, Bold, Italic
        const tokenRegex =
          /(\[[^\]]+\]\([^\)]+\)|https?:\/\/[^\s\)]+|`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
        const subTokens = lineContent.split(tokenRegex);

        const renderedTokens = subTokens.map((token, tokIdx) => {
          if (!token) return null;

          // Markdown Link: [Title](URL)
          const linkMatch = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
          if (linkMatch) {
            return (
              <a
                key={tokIdx}
                href={linkMatch[2]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--primary)",
                  textDecoration: "underline",
                  fontWeight: "600",
                  wordBreak: "break-all",
                }}
              >
                {linkMatch[1]} ↗
              </a>
            );
          }

          // Raw URL: https://...
          if (token.startsWith("http://") || token.startsWith("https://")) {
            return (
              <a
                key={tokIdx}
                href={token}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--primary)",
                  textDecoration: "underline",
                  fontWeight: "600",
                  wordBreak: "break-all",
                }}
              >
                {token} ↗
              </a>
            );
          }

          // Inline Code: `code`
          if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
            return (
              <code
                key={tokIdx}
                style={{
                  background: "rgba(125, 125, 125, 0.12)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "12px",
                  color: "var(--text-main)",
                }}
              >
                {token.slice(1, -1)}
              </code>
            );
          }

          // Bold Italic: ***text***
          if (token.startsWith("***") && token.endsWith("***") && token.length >= 6) {
            return (
              <strong key={tokIdx} style={{ fontWeight: "700" }}>
                <em style={{ fontStyle: "italic" }}>{token.slice(3, -3)}</em>
              </strong>
            );
          }

          // Bold: **text**
          if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
            return (
              <strong key={tokIdx} style={{ fontWeight: "700", color: "var(--text-main)" }}>
                {token.slice(2, -2)}
              </strong>
            );
          }

          // Italic / Emphasis: *text* (Strip stars, render clean italic/bold)
          if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
            return (
              <em
                key={tokIdx}
                style={{
                  fontStyle: "italic",
                  fontWeight: "600",
                  color: "var(--text-main)",
                }}
              >
                {token.slice(1, -1)}
              </em>
            );
          }

          // Plain text: strip any remaining stray asterisks
          return token.replace(/\*/g, "");
        });

        if (isBullet) {
          return (
            <div
              key={`bullet-${partIdx}-${lineIdx}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "4px",
                paddingLeft: "4px",
                lineHeight: "1.55",
              }}
            >
              <span style={{ color: "var(--primary)", fontWeight: "bold" }}>•</span>
              <div style={{ flex: 1 }}>{renderedTokens}</div>
            </div>
          );
        }

        return (
          <div
            key={`line-${partIdx}-${lineIdx}`}
            style={{
              marginBottom: "4px",
              lineHeight: "1.55",
              color: "var(--text-main)",
            }}
          >
            {renderedTokens}
          </div>
        );
      });
    });
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    setMessages((m) => [...m, { sender: "user", text }]);
    setInput("");
    setIsLoading(true);
    setTimeout(() => {
      scrollToBottom("smooth");
      inputRef.current?.focus();
    }, 30);

    try {
      const activeDeck = slideDecks.find((d) => d.source_file === selectedDeck);
      const effectiveCourseId = activeDeck?.course_id || courseId;
      const res = await aiService.chatWithCoach(
        text,
        studentId,
        effectiveCourseId,
        selectedDeck || null,
        sessionId,
      );
      if (res && (res.reply || res.answer)) {
        setMessages((m) => [
          ...m,
          {
            sender: "ai",
            text: res.reply || res.answer,
            action: res.suggested_action,
            topic: res.identified_weak_topic,
            citations: res.citations,
          },
        ]);
        return;
      }
      throw new Error("The AI assistant returned no answer. Please retry.");
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          sender: "ai",
          text: err.message || "The AI assistant is unavailable. Please retry.",
          error: true,
          retryText: text,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollToBottom("smooth");
        inputRef.current?.focus();
      }, 50);
    }
  };

  const requestLearning = async (requestType, topic = null) => {
    if (!selectedDeck || isLoading) return;
    setIsLoading(true);
    const label =
      requestType === "breakdown"
        ? "Break Into Topics"
        : requestType === "explain"
          ? `Explain: ${topic?.topic || topic?.title}`
          : topic
            ? `Study plan: ${topic.topic || topic.title}`
            : "Complete Lecture Study Plan";
    setMessages((m) => [
      ...m,
      { sender: "user", text: label, learningDeck: selectedDeck },
    ]);
    setTimeout(() => {
      scrollToBottom("smooth");
      inputRef.current?.focus();
    }, 30);
    try {
      const activeDeck = slideDecks.find((d) => d.source_file === selectedDeck);
      const result = await aiService.learn({
        student_id: studentId,
        session_id: sessionId,
        course_id: activeDeck?.course_id || null,
        source_file: selectedDeck,
        request_type: requestType,
        sub_lecture_id: topic?.id || null,
        topic: topic?.topic || null,
      });
      if (requestType === "breakdown") setSelectedTopic(null);
      setMessages((m) => [
        ...m,
        {
          sender: "ai",
          learningDeck: selectedDeck,
          text:
            result.answer ||
            (result.plan
              ? result.plan.title
              : "Lecture topics — select a topic or subtopic to study."),
          subLectures: result.sub_lectures,
          plan: result.plan,
          citations: result.citations,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          sender: "ai",
          learningDeck: selectedDeck,
          error: true,
          text:
            err.message || "The learning service is unavailable. Please retry.",
          retryLearning: { requestType, topic },
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollToBottom("smooth");
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ─── MINIMALIST UNIFIED CONTROL BAR (Height ~38px) ─── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "6px 12px",
          marginBottom: "6px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          fontSize: "12px",
        }}
      >
        {/* Left: AI Icon + Title + Lecture Dropdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "800",
              color: "var(--text-main)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            <Bot size={16} color="var(--primary)" />
            <span>AI Assistant</span>
          </div>

          <div
            style={{
              height: "14px",
              width: "1px",
              background: "var(--border-subtle)",
              flexShrink: 0,
            }}
          />

          {/* Compact Lecture Focus Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              Focus:
            </span>
            <select
              value={selectedDeck}
              disabled={isLoading}
              onChange={(e) => {
                setSelectedDeck(e.target.value);
                setSelectedTopic(null);
              }}
              style={{
                padding: "3px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "11.5px",
                outline: "none",
                cursor: "pointer",
                flex: 1,
                minWidth: 0,
                textOverflow: "ellipsis",
              }}
            >
              <option value="">
                🌐 All Enrolled Lectures (Global Course Scope)
              </option>
              {slideDecks.map((d, i) => (
                <option key={i} value={d.source_file}>
                  📑 {d.display_title} ({d.total_chunks} slides)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Controls: Scope badge + Collapsible Study Tools Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {selectedDeck ? (
            <span
              style={{
                fontSize: "10.5px",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10B981",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              🎯 Strict Focus
            </span>
          ) : (
            <span
              style={{
                fontSize: "10.5px",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                color: "var(--primary)",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              🌐 Global
            </span>
          )}

          {selectedDeck && (
            <button
              onClick={() => setIsToolsExpanded((prev) => !prev)}
              className="btn-ghost"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 9px",
                fontSize: "11px",
                fontWeight: "700",
                borderRadius: "var(--radius-sm)",
                border: isToolsExpanded
                  ? "1px solid var(--primary-border)"
                  : "1px solid var(--border-subtle)",
                background: isToolsExpanded
                  ? "var(--primary-soft)"
                  : "var(--bg-main)",
                color: isToolsExpanded ? "var(--primary)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Toggle lecture study plan and topic breakdown"
            >
              <span>Study Tools</span>
              <ChevronDown
                size={13}
                style={{
                  transform: isToolsExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          )}
        </div>
      </div>

      {deckError && (
        <div
          role="alert"
          style={{
            marginBottom: "6px",
            fontSize: "11.5px",
            color: "var(--text-muted)",
          }}
        >
          {deckError}{" "}
          <button
            className="btn-ghost"
            onClick={() => setDeckLoadAttempt((n) => n + 1)}
          >
            Retry loading lectures
          </button>
        </div>
      )}

      {/* COLLAPSIBLE STUDY TOOLS ACCORDION (Hidden by default to give 100% focus to chat) */}
      {selectedDeck && isToolsExpanded && (
        <div
          style={{
            flexShrink: 0,
            marginBottom: "8px",
            padding: "10px 12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--primary-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--primary)",
              }}
            >
              ⚡ Lecture Tools:{" "}
              {slideDecks.find((d) => d.source_file === selectedDeck)
                ?.display_title || "Active Deck"}
            </span>
            <button
              onClick={() => setIsToolsExpanded(false)}
              className="btn-ghost"
              style={{
                padding: "2px 6px",
                fontSize: "11px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              className="btn-ghost"
              disabled={isLoading}
              onClick={() => {
                requestLearning("plan");
                setIsToolsExpanded(false);
              }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-main)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              📅 Complete Study Plan
            </button>
            <button
              className="btn-ghost"
              disabled={isLoading}
              onClick={() => {
                requestLearning("breakdown");
                setIsToolsExpanded(false);
              }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-main)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              📑 Break Into Topics
            </button>
          </div>

          {selectedTopic && (
            <div
              style={{
                padding: "8px 10px",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--primary-soft)",
                fontSize: "11.5px",
                marginTop: "2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <strong>
                  Selected Topic:{" "}
                  {selectedTopic.topic || selectedTopic.title}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Slides {selectedTopic.page_start}–{selectedTopic.page_end}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "6px",
                }}
              >
                <button
                  className="btn-ghost"
                  disabled={isLoading}
                  onClick={() => {
                    requestLearning("plan", selectedTopic);
                    setIsToolsExpanded(false);
                  }}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  Study This Topic
                </button>
                <button
                  className="btn-ghost"
                  disabled={isLoading}
                  onClick={() => {
                    requestLearning("explain", selectedTopic);
                    setIsToolsExpanded(false);
                  }}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  Explain This Topic
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        aria-live="polite"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          paddingRight: "4px",
          paddingBottom: "12px",
          scrollBehavior: "smooth",
        }}
      >
        {messages
          .filter(
            (msg) => !msg.learningDeck || msg.learningDeck === selectedDeck,
          )
          .map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent:
                  msg.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: msg.sender === "user" ? "82%" : "100%",
                  width: msg.sender === "ai" ? "100%" : undefined,
                  padding: msg.sender === "user" ? "9px 14px" : "13px 18px",
                  borderRadius:
                    msg.sender === "user"
                      ? "16px 16px 4px 16px"
                      : "12px",
                  background:
                    msg.sender === "user"
                      ? "var(--primary)"
                      : "var(--bg-surface)",
                  border:
                    msg.sender === "ai"
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  color: msg.sender === "user" ? "#FFFFFF" : "var(--text-main)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  boxShadow:
                    msg.sender === "ai"
                      ? "0 1px 4px rgba(0, 0, 0, 0.04)"
                      : "none",
                }}
              >
                <div
                  role={msg.error ? "alert" : undefined}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  {renderFormattedMessage(msg.text)}
                </div>
                {msg.error && (
                  <button
                    className="btn-ghost"
                    disabled={isLoading}
                    onClick={() =>
                      msg.retryLearning
                        ? requestLearning(
                            msg.retryLearning.requestType,
                            msg.retryLearning.topic,
                          )
                        : sendMessage(msg.retryText)
                    }
                  >
                    Retry
                  </button>
                )}
                {msg.subLectures?.map((section) => (
                  <details
                    key={section.id}
                    open
                    style={{
                      marginTop: "10px",
                      padding: "8px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <summary style={{ cursor: "pointer", fontWeight: "700" }}>
                      {section.title} · Slides {section.page_start}–
                      {section.page_end}
                    </summary>
                    <button
                      className="btn-ghost"
                      disabled={isLoading}
                      aria-pressed={
                        selectedTopic?.id === section.id &&
                        !selectedTopic?.topic
                      }
                      onClick={() => setSelectedTopic(section)}
                      style={{ marginTop: "6px", color: "var(--primary)" }}
                    >
                      Select Topic
                    </button>
                    <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                      {section.topics.map((topic, index) => (
                        <li key={index}>
                          <button
                            className="btn-ghost"
                            disabled={isLoading}
                            aria-pressed={
                              selectedTopic?.id === section.id &&
                              selectedTopic?.topic === topic
                            }
                            onClick={() =>
                              setSelectedTopic({ ...section, topic })
                            }
                            style={{ textAlign: "left" }}
                          >
                            {topic}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
                {msg.plan && (
                  <ol style={{ margin: "10px 0 0", paddingLeft: "22px" }}>
                    {msg.plan.sessions.map((session) => (
                      <li
                        key={session.session_number}
                        style={{ marginBottom: "12px" }}
                      >
                        <strong>
                          Session {session.session_number}: {session.title}
                        </strong>
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}
                          · {session.estimated_minutes} minutes
                        </span>
                        <ul style={{ paddingLeft: "18px", marginTop: "4px" }}>
                          {session.tasks.map((task, index) => (
                            <li key={index}>{task}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--text-muted)",
                        marginBottom: "5px",
                      }}
                    >
                      {msg.citations.some((c) => c.page_number === 0 || c.source_file?.startsWith("http"))
                        ? "🌐 Verified External Web Sources & Citations:"
                        : "📑 Verifiable Slide Citations & Exploration:"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      {msg.citations.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            title={c.preview_text}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              backgroundColor: c.source_file?.startsWith("http")
                                ? "rgba(16, 185, 129, 0.12)"
                                : "rgba(59, 130, 246, 0.12)",
                              border: c.source_file?.startsWith("http")
                                ? "1px solid rgba(16, 185, 129, 0.3)"
                                : "1px solid rgba(59, 130, 246, 0.25)",
                              fontSize: "11px",
                              fontWeight: "600",
                              color: c.source_file?.startsWith("http")
                                ? "#10b981"
                                : "var(--primary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {c.page_number > 0
                              ? `Slide ${c.page_number} (${Math.round(c.relevance_score * 100)}% match)`
                              : `🌐 ${c.preview_text || "Web Source"} (${Math.round(c.relevance_score * 100)}% match)`}
                          </span>
                          {c.source_file?.startsWith("http") ? (
                            <a
                              href={c.source_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-ghost"
                              style={{
                                padding: "2px 8px",
                                fontSize: "10px",
                                fontWeight: "600",
                                borderRadius: "var(--radius-sm)",
                                border: "1px dashed var(--border-subtle)",
                                color: "var(--primary)",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              🔗 Open Source ↗
                            </a>
                          ) : (
                            <button
                              disabled={
                                isLoading ||
                                (selectedDeck && c.source_file !== selectedDeck)
                              }
                              onClick={() =>
                                sendMessage(
                                  `Can you explain Slide ${c.page_number} in simple terms with a real-world example?`,
                                )
                              }
                              className="btn-ghost"
                              style={{
                                padding: "2px 8px",
                                fontSize: "10px",
                                fontWeight: "600",
                                borderRadius: "var(--radius-sm)",
                                border: "1px dashed var(--border-subtle)",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                              }}
                            >
                              🔍 Deep Dive Slide {c.page_number}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {msg.action && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--primary-soft)",
                      border: "1px solid var(--primary-border)",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={12} />
                    <span>
                      Suggested Action:{" "}
                      {msg.action?.includes("http") ? (
                        <a
                          href={msg.action.match(/https?:\/\/[^\s\)]+/)?.[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--primary)",
                            textDecoration: "underline",
                          }}
                        >
                          {msg.action.replace("Review Slide 0", "Explore external reference")} ↗
                        </a>
                      ) : (
                        msg.action?.replace("Review Slide 0", "Explore external reference")
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        {isLoading && (
          <div
            role="status"
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              maxWidth: "80%",
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--primary)",
                animation: "pulse 1.5s infinite",
              }}
            />
            Reading your lecture and synthesizing answer…
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: "1px", width: "100%", flexShrink: 0 }} />
      </div>

      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom("smooth")}
          style={{
            position: "absolute",
            bottom: "58px",
            right: "14px",
            zIndex: 10,
            background: "var(--bg-surface)",
            border: "1px solid var(--primary-border)",
            borderRadius: "var(--radius-full)",
            padding: "5px 12px",
            fontSize: "11px",
            fontWeight: "700",
            color: "var(--primary)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronDown size={14} />
          <span>Latest answer</span>
        </button>
      )}

      {/* FIXED BOTTOM INPUT DOCK - ChatGPT / WhatsApp Style */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: "6px",
          paddingBottom: "2px",
          background: "var(--bg-canvas)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {/* Horizontal Quick Prompts - automatically minimized once chat begins */}
        {(messages.length <= 1 || showSuggestions) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              padding: "2px 0",
            }}
          >
            {PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  sendMessage(p);
                  setShowSuggestions(false);
                }}
                disabled={isLoading}
                className="btn-ghost"
                style={{
                  padding: "3px 10px",
                  fontSize: "11px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                  cursor: "pointer",
                  background: "var(--bg-surface)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* ChatGPT Style Floating Input Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "var(--bg-surface)",
            borderRadius: "24px",
            border: "1.5px solid var(--border-subtle)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          {messages.length > 1 && (
            <button
              onClick={() => setShowSuggestions((prev) => !prev)}
              type="button"
              className="btn-ghost"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: "600",
                borderRadius: "var(--radius-full)",
                border: showSuggestions
                  ? "1px solid var(--primary-border)"
                  : "1px solid var(--border-subtle)",
                background: showSuggestions
                  ? "var(--primary-soft)"
                  : "transparent",
                color: showSuggestions
                  ? "var(--primary)"
                  : "var(--text-muted)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
              title="Toggle question suggestion ideas"
            >
              <span>💡</span>
              <span className="hidden-mobile">Ideas</span>
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={
              isLoading
                ? "AI Assistant is thinking..."
                : selectedDeck
                  ? "Ask a question about this lecture (Press Enter to send)..."
                  : "Ask anything about your curriculum (Press Enter to send)..."
            }
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              background:
                input.trim() && !isLoading
                  ? "var(--primary)"
                  : "var(--bg-card-hover, rgba(120, 120, 120, 0.12))",
              color: input.trim() && !isLoading ? "#FFFFFF" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !isLoading ? "pointer" : "default",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            title="Send message (Enter)"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusFlowTab({ profile, onSessionCompleted }) {
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState(
    "PostgreSQL B-Tree Index Selectivity",
  );
  const [customTask, setCustomTask] = useState("");
  const [soundMode, setSoundMode] = useState("binaural"); // 'none' | 'binaural' | 'rain'
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      return Number(localStorage.getItem("eduflow_focus_count") || 0);
    } catch {
      return 0;
    }
  });
  const [gardenArtifacts, setGardenArtifacts] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("eduflow_mind_garden") ||
          '["🌱 Focus Seedling", "🌳 Golden Oak Sapling"]',
      );
    } catch {
      return ["🌱 Focus Seedling", "🌳 Golden Oak Sapling"];
    }
  });
  const [celebrationModal, setCelebrationModal] = useState(null);

  // Web Audio synthesizer for ambient focus soundscapes
  useEffect(() => {
    let ctx = null;
    let osc = null;
    let gain = null;

    if (isActive && audioPlaying && soundMode !== "none") {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gain = ctx.createGain();
        gain.gain.setValueAtTime(0.03, ctx.currentTime);

        if (soundMode === "binaural") {
          osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(216, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
        } else if (soundMode === "rain") {
          const bufferSize = ctx.sampleRate * 2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = data[i];
            data[i] *= 1.5;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          noise.connect(gain);
          gain.connect(ctx.destination);
          noise.start();
          osc = noise;
        }
      } catch (err) {
        console.warn("Web Audio error:", err);
      }
    }

    return () => {
      try {
        if (osc) osc.stop();
        if (ctx) ctx.close();
      } catch {}
    };
  }, [isActive, audioPlaying, soundMode]);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleFinishSprint();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSelectPreset = (mins) => {
    setIsActive(false);
    setPresetMinutes(mins);
    setTimeLeft(mins * 60);
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const handleFinishSprint = async () => {
    playChime();
    const taskName = customTask.trim() || selectedTask;
    const minutes = presetMinutes;

    try {
      const res = await gamificationService.recordFocusSession({
        durationMinutes: minutes,
        topicOrTask: taskName,
        focusTechnique: `Pomodoro (${minutes}m)`,
      });

      const artifact =
        res.focusArtifactAwarded ||
        (minutes >= 45
          ? "💎 Ancient Focus Crystal"
          : minutes >= 25
            ? "🌳 Golden Oak Sapling"
            : "🌱 Emerald Sprout");

      const newGarden = [...gardenArtifacts, artifact];
      setGardenArtifacts(newGarden);
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      try {
        localStorage.setItem("eduflow_focus_count", String(newCount));
        localStorage.setItem("eduflow_mind_garden", JSON.stringify(newGarden));
      } catch {}

      setCelebrationModal({
        xp: res.xpAwarded ?? 0,
        coins: res.coinsAwarded ?? 0,
        artifact,
        task: taskName,
        message: res.message,
      });

      if (onSessionCompleted) {
        await onSessionCompleted();
      }
    } catch (err) {
      console.warn("Session recording error:", err);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalSec = presetMinutes * 60;
  const progressPct = Math.round(((totalSec - timeLeft) / totalSec) * 100);

  let growthEmoji = "🌱";
  let growthLabel = "Focus Seed Planted";
  if (progressPct >= 75) {
    growthEmoji = presetMinutes >= 45 ? "💎" : "🌳";
    growthLabel =
      presetMinutes >= 45
        ? "Ancient Crystal Resonating"
        : "Golden Oak Thriving";
  } else if (progressPct >= 35) {
    growthEmoji = "🌿";
    growthLabel = "Deep Flow State Reached";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        className="card-premium"
        style={{
          padding: "22px",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span className="badge-pill badge-primary">DEEP WORK STUDIO</span>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Flow State & Pomodoro Motivation
            </span>
          </div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            Study Focus & Mind Garden
          </h3>
          <p
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            Lock in uninterrupted concentration. Uninterrupted focus awards +XP,
            grows your Mind Garden, and protects your streak!
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <div
            className="card-premium"
            style={{
              padding: "8px 14px",
              textAlign: "center",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--primary)",
              }}
            >
              {completedSessions}
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
              Sprints Finished
            </div>
          </div>
          <div
            className="card-premium"
            style={{
              padding: "8px 14px",
              textAlign: "center",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--warning)",
              }}
            >
              {gardenArtifacts.length}
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
              Mind Garden
            </div>
          </div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div
        className="card-premium glass-card-hover"
        style={{
          padding: "32px 24px",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Interval Presets */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { mins: 25, label: "25m Classic Sprint", xp: "+35 XP" },
            { mins: 45, label: "45m Deep Work", xp: "+75 XP" },
            { mins: 15, label: "15m Quick Burst", xp: "+20 XP" },
            { mins: 1, label: "1m Test Demo", xp: "+10 XP" },
          ].map((p) => (
            <button
              key={p.mins}
              onClick={() => handleSelectPreset(p.mins)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                backgroundColor:
                  presetMinutes === p.mins
                    ? "var(--primary)"
                    : "var(--bg-card)",
                color:
                  presetMinutes === p.mins ? "#ffffff" : "var(--text-main)",
                fontSize: "11.5px",
                fontWeight: "700",
                border:
                  presetMinutes === p.mins
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border-subtle)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{p.label}</span>
              <span style={{ fontSize: "10px", opacity: 0.85 }}>({p.xp})</span>
            </button>
          ))}
        </div>

        {/* Growing Mind Garden Visualization */}
        <div
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "var(--bg-card)",
            border: "4px solid var(--border-card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: isActive ? "0 0 35px rgba(139, 92, 246, 0.35)" : "none",
            transition: "all 0.5s ease",
          }}
        >
          <div
            style={{
              fontSize: "46px",
              animation: isActive ? "pulse 2s infinite" : "none",
            }}
          >
            {growthEmoji}
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              color: "var(--text-main)",
              letterSpacing: "-0.02em",
              marginTop: "4px",
            }}
          >
            {formatTime(timeLeft)}
          </div>
          <div
            style={{
              fontSize: "10.5px",
              color: "var(--secondary)",
              fontWeight: "700",
            }}
          >
            {growthLabel}
          </div>
        </div>

        {/* Focus Progress Bar */}
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "6px",
            }}
          >
            <span>Flow State Progress</span>
            <span>{progressPct}% Completed</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--bg-card)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Active Study Objective */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <label
            style={{
              fontSize: "11.5px",
              fontWeight: "700",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Active Concentration Topic:
          </label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            disabled={isActive}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-xs)",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-card)",
              color: "var(--text-main)",
              fontSize: "12.5px",
            }}
          >
            <option value="PostgreSQL B-Tree Index Selectivity">
              PostgreSQL B-Tree Index Selectivity (Module 1)
            </option>
            <option value="ACID Transactions & Graph Deadlocks">
              ACID Transactions & Graph Deadlocks (Module 2)
            </option>
            <option value="Clean Architecture & DIP Invariants">
              Clean Architecture & DIP Invariants
            </option>
            <option value="Custom Technical Research">
              Custom Technical Sprint...
            </option>
          </select>

          {selectedTask === "Custom Technical Research" && (
            <input
              type="text"
              placeholder="What are you focusing on?"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              disabled={isActive}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-card)",
                color: "var(--text-main)",
                fontSize: "12px",
              }}
            />
          )}
        </div>

        {/* Ambient Audio Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <button
              onClick={() => setAudioPlaying(!audioPlaying)}
              className="btn-ghost"
              style={{
                padding: "6px",
                color: audioPlaying ? "var(--primary)" : "var(--text-muted)",
              }}
              title={
                audioPlaying ? "Mute ambient sound" : "Unmute ambient sound"
              }
            >
              {audioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <span>Ambient Sound:</span>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "binaural", label: "Gamma 40Hz Wave" },
              { id: "rain", label: "Rain Resonance" },
              { id: "none", label: "Silent" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSoundMode(s.id);
                  setAudioPlaying(s.id !== "none");
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor:
                    soundMode === s.id ? "var(--bg-card)" : "transparent",
                  color:
                    soundMode === s.id ? "var(--primary)" : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: soundMode === s.id ? "700" : "500",
                  border:
                    soundMode === s.id
                      ? "1px solid var(--border-card)"
                      : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Action Buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
          <button
            onClick={() => {
              if (!isActive && audioPlaying && soundMode !== "none") {
                // Audio will start automatically
              }
              setIsActive(!isActive);
            }}
            className="btn-primary hover-scale"
            style={{
              padding: "10px 32px",
              fontSize: "14px",
              fontWeight: "800",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(139, 92, 246, 0.4)",
            }}
          >
            {isActive ? <Pause size={16} /> : <Play size={16} />}
            {isActive
              ? "Pause Sprint"
              : timeLeft === totalSec
                ? "Start Focus Sprint"
                : "Resume Sprint"}
          </button>

          <button
            onClick={() => {
              setIsActive(false);
              setTimeLeft(presetMinutes * 60);
            }}
            className="btn-secondary hover-scale"
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Reset timer"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "360px",
            marginTop: "4px",
          }}
        >
          💡 <strong>Psychology Tip:</strong> Completing a continuous focus
          sprint activates the dopamine reward pathways, reinforcing deep
          academic recall.
        </div>
      </div>

      {/* Mind Garden Showcase */}
      <div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "var(--text-main)",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}
        >
          MIND GARDEN & FOCUS ARTIFACTS
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {gardenArtifacts.map((art, idx) => (
            <div
              key={idx}
              className="card-premium"
              style={{
                padding: "10px 16px",
                backgroundColor: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--text-main)",
              }}
            >
              <span>{art.split(" ")[0]}</span>
              <span>{art.slice(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Celebration Modal upon Completion */}
      {celebrationModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="card-premium"
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "var(--bg-card)",
              padding: "28px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              border: "2px solid var(--success-border)",
            }}
          >
            <div style={{ fontSize: "56px" }}>🎉</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Focus Sprint Conquered!
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              You completed your sprint on{" "}
              <strong>{celebrationModal.task}</strong> without losing
              concentration!
            </p>

            <div
              style={{
                padding: "12px 20px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--success-soft)",
                border: "1px solid var(--success-border)",
                color: "var(--success)",
                fontWeight: "800",
                fontSize: "16px",
              }}
            >
              +{celebrationModal.xp} XP • +{celebrationModal.coins} Coins
              Awarded!
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              Unlocked Focus Artifact:{" "}
              <strong>{celebrationModal.artifact}</strong> added to your Mind
              Garden!
            </div>

            <button
              onClick={() => setCelebrationModal(null)}
              className="btn-primary hover-scale"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "13px",
                fontWeight: "800",
                marginTop: "6px",
              }}
            >
              Collect Rewards & Keep Flowing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardTab({ profile, studentId }) {
  const [standings, setStandings] = useState([]);
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanks() {
      try {
        const [lb, sq] = await Promise.all([
          gamificationService.getLeaderboard("weekly", 10),
          gamificationService.getStudentSquad(studentId),
        ]);
        setStandings(lb || []);
        setSquads(sq ? [sq] : []);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRanks();
  }, [studentId]);

  const mySquad = squads[0] || null;

  const targetXp = 2500;
  const squadProgressPct = mySquad
    ? Math.min(100, Math.round(((mySquad.combinedXp || 0) / targetXp) * 100))
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Collaborative Squad Banner */}
      {mySquad && (
        <div
          className="card-premium glass-card-hover"
          style={{
            padding: "20px",
            backgroundColor: "var(--bg-surface)",
            borderLeft: "4px solid var(--secondary)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>
                {mySquad.avatarUrl || "🚀"}
              </span>
              <div>
                <span
                  className="badge-pill badge-neutral"
                  style={{ fontSize: "10px", marginBottom: "2px" }}
                >
                  MY SQUAD COLLABORATIVE GOAL
                </span>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  {mySquad.name}
                </h4>
              </div>
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "800",
                color: "var(--secondary)",
              }}
            >
              {mySquad.combinedXp?.toLocaleString() || 0} XP
            </span>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-xs)",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11.5px",
                marginBottom: "4px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                Quest: {mySquad.description || "Sprint Quest"}
              </span>
              <span style={{ fontWeight: "700", color: "var(--text-main)" }}>
                {squadProgressPct}% Completed
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "6px",
                backgroundColor: "var(--bg-canvas)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${squadProgressPct}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: "600",
              }}
            >
              Teammates:
            </span>
            {(mySquad.members || []).map((m) => (
              <span
                key={m.studentId}
                className="badge-pill badge-neutral"
                style={{ fontSize: "11px" }}
              >
                {m.studentName} ({m.totalXp} XP)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Leaderboard */}
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "var(--text-main)",
          }}
        >
          Cohort Standings
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          Weekly ranking of all learners based on genuine lesson mastery and
          focus sprints.
        </div>
      </div>

      <div
        className="card-premium"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px",
        }}
      >
        {standings.map((s, idx) => {
          const isMe =
            s.studentName === profile.fullName ||
            s.studentId === studentId;
          return (
            <div
              key={s.studentId || idx}
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                background: isMe
                  ? "var(--primary-soft)"
                  : idx === 0
                    ? "var(--warning-soft)"
                    : "var(--bg-surface)",
                border: isMe
                  ? "1px solid var(--primary-border)"
                  : idx === 0
                    ? "1px solid var(--warning-border)"
                    : "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontWeight: "800",
                  fontSize: "13px",
                  color: idx === 0 ? "var(--warning)" : "var(--text-muted)",
                  width: "26px",
                  flexShrink: 0,
                }}
              >
                {idx === 0
                  ? "🥇"
                  : idx === 1
                    ? "🥈"
                    : idx === 2
                      ? "🥉"
                      : `#${idx + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {s.studentName}{" "}
                  {isMe && (
                    <span
                      className="badge-pill badge-primary"
                      style={{ fontSize: "10px" }}
                    >
                      YOU
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Level {s.level || 1} • {s.streak || 0}d streak
                </div>
              </div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "13.5px",
                  color: isMe ? "var(--primary)" : "var(--secondary)",
                  flexShrink: 0,
                }}
              >
                {(s.scoreXp || 0).toLocaleString()} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ profile, onLogout }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        className="card-premium"
        style={{
          padding: "18px 20px",
          display: "flex",
          gap: "14px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "var(--radius-sm)",
            background: "var(--primary-soft)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "800",
            color: "var(--primary)",
            flexShrink: 0,
          }}
        >
          {profile.fullName[0]}
        </div>
        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "800",
              color: "var(--text-main)",
            }}
          >
            {profile.fullName}
          </div>
          <div
            style={{
              fontSize: "11.5px",
              color: "var(--secondary)",
              fontWeight: "600",
              marginBottom: "4px",
            }}
          >
            Level {profile.level} — {profile.levelName}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--warning)",
                fontWeight: "700",
              }}
            >
              {profile.totalXp.toLocaleString()} XP
            </span>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--secondary)",
                fontWeight: "700",
              }}
            >
              {profile.coins} Coins
            </span>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--accent)",
                fontWeight: "700",
              }}
            >
              {profile.streak} Day Streak
            </span>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: "700",
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}
        >
          EARNED CREDENTIALS & BADGES
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
          }}
        >
          {profile.badges.map((b) => (
            <div
              key={b.id || b.name}
              className="card-premium"
              style={{
                padding: "14px",
                textAlign: "center",
                opacity: b.unlocked ? 1 : 0.45,
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "4px" }}>
                {b.unlocked ? b.icon : "🔒"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: b.unlocked ? "var(--text-main)" : "var(--text-muted)",
                  marginBottom: "2px",
                }}
              >
                {b.name}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance / Theme Toggle */}
      <div
        className="card-premium"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            Interface Theme
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Toggle between high-contrast Dark and Light modes
          </div>
        </div>
        <ThemeToggle showLabel />
      </div>

      <button
        onClick={onLogout}
        className="btn-danger"
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  );
}

// ─── Main StudentPortal Component ─────────────────────────────────────────────
export default function StudentPortal({ user, onLogout, onSwitchRole }) {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const stored = sessionStorage.getItem("eduflow_student_active_tab");
      // The Curriculum tab was merged into Enrollment; migrate stale sessions.
      if (!stored || stored === "curriculum") return "enrollments";
      return stored;
    } catch {
      return "enrollments";
    }
  });

  const setActiveTab = (tab) => {
    try {
      sessionStorage.setItem("eduflow_student_active_tab", tab);
    } catch {}
    setActiveTabState(tab);
  };
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [serverQuiz, setServerQuiz] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [busyCourseId, setBusyCourseId] = useState(null);
  const navigate = useNavigate();

  // The course page opened from an Enrollment card (also set by /learn/:courseId).
  const [openCourseId, setOpenCourseIdState] = useState(() => {
    try {
      return sessionStorage.getItem("eduflow_student_open_course") || null;
    } catch {
      return null;
    }
  });

  // Server-side authorization for the open course: the JWT decides, never a cached
  // status. Only an approved enrollment, the course instructor or an admin resolves
  // to hasAccess:true — everyone else sees the locked explanation instead.
  const [openAccess, setOpenAccess] = useState({ state: "idle" });

  const setOpenCourseId = (courseId) => {
    try {
      if (courseId) {
        sessionStorage.setItem("eduflow_student_open_course", courseId);
      } else {
        sessionStorage.removeItem("eduflow_student_open_course");
      }
    } catch {}
    setOpenCourseIdState(courseId);
  };

  useEffect(() => {
    if (!openCourseId) {
      setOpenAccess({ state: "idle" });
      return;
    }
    let alive = true;
    setOpenAccess({ state: "checking" });
    enrollmentService
      .getCourseAccess(openCourseId)
      .then((res) => {
        if (alive)
          setOpenAccess({
            state: "ready",
            hasAccess: Boolean(res?.hasAccess),
            reason: res?.reason,
          });
      })
      .catch(() => {
        if (alive)
          setOpenAccess({
            state: "ready",
            hasAccess: false,
            reason: "We could not verify your access to this course.",
          });
      });
    return () => {
      alive = false;
    };
  }, [openCourseId]);

  const refreshRequests = async () => {
    try {
      const list = await enrollmentService.getMyRequests();
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      // Keep whatever is already on screen rather than blanking the tab.
    } finally {
      setRequestsLoading(false);
    }
  };

  const patchCourseStatus = (courseId, status) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, enrollmentStatus: status } : c,
      ),
    );
  };

  const handleCancelRequest = async (request) => {
    setBusyCourseId(request.courseId);
    try {
      await enrollmentService.cancelEnrollment(request.courseId);
      patchCourseStatus(request.courseId, "Cancelled");
      await refreshRequests();
    } catch (err) {
      console.warn("Could not withdraw the enrollment request:", err);
      await refreshRequests();
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleReRequest = async (request) => {
    setBusyCourseId(request.courseId);
    try {
      await enrollmentService.requestEnrollment(request.courseId);
      patchCourseStatus(request.courseId, "Pending");
      await refreshRequests();
    } catch (err) {
      console.warn("Could not resubmit the enrollment request:", err);
      await refreshRequests();
    } finally {
      setBusyCourseId(null);
    }
  };

  useEffect(() => {
    async function loadStudentData() {
      // 0. Enrollment requests gate the curriculum and feed the Enrollment tab.
      await refreshRequests();

      // 1. Load Enrolled Courses with Full Modules & Syllabus
      let loadedCourses = [];
      try {
        let rawCourses = [];
        try {
          rawCourses = await courseService.getMyCourses();
        } catch {
          rawCourses = await courseService.getCourses();
        }
        if (Array.isArray(rawCourses) && rawCourses.length > 0) {
          // One course refusing its detail endpoint (deleted or unpublished) must
          // never blank the whole workspace: fall back to the enrollment row so the
          // card and its status still render.
          const fullCoursesDetails = await Promise.all(
            rawCourses.map(async (c) => {
              const targetId = c.courseId || c.id;
              try {
                const detail = await courseService.getCourseById(targetId);
                return detail || c;
              } catch {
                return c;
              }
            }),
          );

          const statusByCourse = new Map();
          rawCourses.forEach((c) =>
            statusByCourse.set(c.courseId || c.id, c.status),
          );

          const mapped = fullCoursesDetails.map((c) => ({
            id: c.id || c.courseId,
            enrollmentStatus:
              statusByCourse.get(c.id || c.courseId) || c.status || "Active",
            code: c.code || c.courseCode || "CS-301",
            title: c.title || c.courseTitle || "Untitled course",
            description: c.description || "",
            totalLessons: c.totalLessons || 0,
            instructorId: c.instructorId || null,
            instructorName: c.instructorName || null,
            averageRating: c.averageRating || 0,
            ratingCount: c.ratingCount || 0,
            modules: (c.modules || []).map((m, idx) => ({
              id: m.id || `m_${idx}`,
              title: m.title,
              description: m.description || "",
              pdfUrl: m.pdfUrl || null,
              attachmentFileName: m.attachmentFileName || "Module Syllabus.pdf",
              lessons: (m.lessons || []).map((l, lIdx) => ({
                id: l.id || `l_${lIdx}`,
                title: l.title,
                duration: `${l.estimatedMinutes || 30} mins`,
                xp: l.xpReward || 40,
                completed: l.isCompleted || false,
                pdfUrl: l.pdfUrl || null,
                attachmentFileName: l.attachmentFileName || null,
              })),
            })),
          }));
          if (mapped.length > 0) {
            // Cards render from the enrollment payload immediately; grades and
            // detailed progress arrive right after and merge into the same list.
            setCourses(mapped);
            loadedCourses = mapped;
            Promise.all([
              Promise.all(mapped.map((c) => gradingService.getGrade(c.id).catch(() => null))),
              Promise.all(mapped.map((c) => courseService.getProgress(c.id).catch(() => null))),
            ])
              .then(([grades, progress]) => {
                setCourses((prev) =>
                  prev.map((c, i) => ({
                    ...c,
                    courseGrade: grades[i] ?? c.courseGrade,
                    courseProgress: progress[i] ?? c.courseProgress,
                  })),
                );
              })
              .catch(() => {
                // Enrichment is optional — the cards stay usable without it.
              });
          }
        }
      } catch (err) {
        console.warn("Could not load courses, using seed:", err);
      }

      // 2. The next quiz comes from the student's own courses; the API only returns
      //    published quizzes for courses the student is enrolled in.
      try {
        const courseIds = (Array.isArray(loadedCourses) ? loadedCourses : []).map((c) => c.id);
        for (const courseId of courseIds) {
          const qList = await quizService.getQuizzes(courseId).catch(() => []);
          if (Array.isArray(qList) && qList.length > 0) {
            setServerQuiz(qList[0]);
            break;
          }
        }
      } catch (err) {
        console.warn("Could not load course quizzes:", err);
      }

      // 3. Load Live Gamification Dashboard Profile
      await refreshProfile();
    }
    loadStudentData().finally(() => setCoursesLoading(false));
  }, [user]);

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "Student",
    level: 1,
    levelName: "Novice",
    totalXp: 0,
    xpInLevel: 0,
    xpToNext: 100,
    coins: 0,
    streak: 0,
    freezeTokens: 0,
    badges: [],
  });

  async function refreshProfile() {
    if (!user?.id) return;
    try {
      const gameData = await gamificationService.getGameDashboard(user.id);
      if (gameData && gameData.profile) {
        const prof = gameData.profile;
        setProfile((prev) => ({
          ...prev,
          fullName: prof.studentName || user?.fullName || prev.fullName,
          totalXp: prof.totalXp,
          level: prof.currentLevel,
          levelName: prof.levelName || prev.levelName,
          xpInLevel: prof.xpProgressInCurrentLevel,
          xpToNext: prof.xpRequiredForNextLevel,
          coins: prof.coins,
          streak: prof.currentStreak,
          freezeTokens: prof.freezeTokensAvailable,
          badges: (prof.recentBadges || []).map((b) => ({
            id: b.id,
            name: b.title,
            icon: b.iconUrl || "🏅",
            unlocked: b.isUnlocked,
            desc: b.description,
          })),
        }));
      }
    } catch (err) {
      console.warn("Could not load gamification dashboard:", err);
    }
  }

  const handleMissionClaim = async () => {
    try {
      await gamificationService.claimDailyGrandMission(user.id);
    } catch (err) {
      alert(err?.friendlyMessage || "The daily reward could not be claimed.");
    }
    await refreshProfile();
  };

  const handleFreezeUse = async () => {
    if (profile.freezeTokens <= 0) return;
    try {
      await gamificationService.useStreakFreeze(user.id);
      alert("Streak freeze activated for today.");
    } catch (err) {
      alert(err?.friendlyMessage || "The streak freeze could not be used.");
    }
    await refreshProfile();
  };

  const handleStartQuiz = async (quizToRun) => {
    const target = quizToRun || serverQuiz || {
      id: "default_course_quiz",
      passingScorePercent: 70,
      title: "Module Mastery & Knowledge Check",
    };
    try {
      const attempt = await quizService.startQuiz(target.id);
      setActiveQuiz({
        id: attempt.quizId || target.id,
        attemptId: attempt.attemptId || `att_${Date.now()}`,
        title: attempt.quizTitle || target.title || "Module Assessment Quiz",
        passingScorePercent: target.passingScorePercent || 70,
        questions: (attempt.questions && attempt.questions.length > 0)
          ? attempt.questions
          : [
              {
                id: "q1",
                prompt: "What is the primary objective of microservices architecture?",
                options: [
                  "Loose coupling and independent deployability",
                  "Single database for all services",
                  "Monolithic code organization",
                  "Eliminating HTTP communication",
                ],
              },
              {
                id: "q2",
                prompt: "How does indexing enhance database query performance?",
                options: [
                  "By establishing lookup trees to reduce sequential disk reads",
                  "By compressing tables into text files",
                  "By disabling transactions during read operations",
                  "By translating SQL directly to HTML templates",
                ],
              },
              {
                id: "q3",
                prompt: "What principle ensures high-level policy does not depend on low-level detail?",
                options: [
                  "Dependency Inversion Principle (DIP)",
                  "Single Responsibility Principle (SRP)",
                  "Open/Closed Principle (OCP)",
                  "Liskov Substitution Principle (LSP)",
                ],
              },
            ],
      });
    } catch (err) {
      setActiveQuiz({
        id: target.id || "quiz_fallback",
        attemptId: `att_${Date.now()}`,
        title: target.title || "Module Assessment Quiz",
        passingScorePercent: target.passingScorePercent || 70,
        questions: [
          {
            id: "q1",
            prompt: "What is the primary objective of microservices architecture?",
            options: [
              "Loose coupling and independent deployability",
              "Single database for all services",
              "Monolithic code organization",
              "Eliminating HTTP communication",
            ],
          },
          {
            id: "q2",
            prompt: "How does indexing enhance database query performance?",
            options: [
              "By establishing lookup trees to reduce sequential disk reads",
              "By compressing tables into text files",
              "By disabling transactions during read operations",
              "By translating SQL directly to HTML templates",
            ],
          },
          {
            id: "q3",
            prompt: "What principle ensures high-level policy does not depend on low-level detail?",
            options: [
              "Dependency Inversion Principle (DIP)",
              "Single Responsibility Principle (SRP)",
              "Open/Closed Principle (OCP)",
              "Liskov Substitution Principle (LSP)",
            ],
          },
        ],
      });
    }
  };

  const handleCompleteLesson = async (lessonId, xpReward, courseId, modId) => {
    try {
      await courseService.completeLesson(lessonId);
    } catch (err) {
      alert(err?.friendlyMessage || "The lesson could not be marked complete.");
      return;
    }

    const courseProgress = await courseService.getProgress(courseId).catch(() => null);
    setCourses((prevCourses) =>
      prevCourses.map((c) =>
        c.id !== courseId
          ? c
          : {
              ...c,
              courseProgress: courseProgress ?? c.courseProgress,
              modules: c.modules.map((m) =>
                m.id !== modId
                  ? m
                  : {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        l.id === lessonId ? { ...l, completed: true } : l,
                      ),
                    },
              ),
            },
      ),
    );
    await refreshProfile();
  };

  const handleQuizComplete = async (quiz, answers) => {
    const res = await quizService.submitQuiz(quiz.id, answers, quiz.attemptId);
    await refreshProfile();
    return res;
  };

  // Quiz button on a course page: resolve that course's published quiz first and
  // fall back to the shared default assessment when the course has none yet.
  const handleCourseQuiz = async (courseId) => {
    if (courseId) {
      try {
        const list = await quizService.getQuizzes(courseId);
        if (Array.isArray(list) && list.length > 0) {
          handleStartQuiz(list[0]);
          return;
        }
      } catch {
        // Fall through to the default assessment.
      }
    }
    handleStartQuiz(null);
  };

  const TABS = [
    { id: "enrollments", label: "Enrollment", icon: UserCheck },
    { id: "home", label: "Dashboard", icon: Home },
    { id: "focus", label: "Focus & Flow", icon: Zap },
    { id: "coach", label: "AI Assistant", icon: Bot },
    { id: "ranks", label: "Rankings & Squad", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        height: activeTab === "coach" ? "100vh" : undefined,
        overflow: activeTab === "coach" ? "hidden" : undefined,
        backgroundColor: "var(--bg-canvas)",
        maxWidth: activeTab === "coach" ? "1040px" : "720px",
        margin: "0 auto",
        position: "relative",
        transition: "max-width 0.2s ease",
      }}
    >
      {/* Student Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: activeTab === "coach" ? "8px 16px" : "12px 20px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <BrandLogo size="sm" subtitle="Student Workspace" />

        {/* Direct Redirection Role Switcher */}
        <RoleSwitcher
          currentRole="Student"
          onSwitchRole={onSwitchRole}
          compact
        />

        {/* Stat Pills, Help & Support & Theme Toggle */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="hover-scale"
            style={{
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              gap: "5px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--primary-border)",
              backgroundColor: "var(--primary-soft)",
              color: "var(--primary)",
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Open Help & Support"
            aria-label="Open Help & Support"
          >
            <LifeBuoy size={13} />
            <span>Help & Support</span>
          </button>
          <span
            className="badge-pill badge-warning"
            style={{ fontSize: "11px" }}
          >
            <Zap size={11} /> {profile.totalXp.toLocaleString()} XP
          </span>
          <span
            className="badge-pill badge-danger"
            style={{ fontSize: "11px" }}
          >
            <Flame size={11} /> {profile.streak}d streak
          </span>
          <ThemeToggle compact />
        </div>
      </div>

      {/* Page Content */}
      <div
        style={{
          flex: 1,
          padding: activeTab === "coach" ? "6px 14px 0" : "18px 20px",
          overflowY: activeTab === "coach" ? "hidden" : "auto",
          paddingBottom: activeTab === "coach" ? "56px" : "80px",
          display: activeTab === "coach" ? "flex" : "block",
          flexDirection: activeTab === "coach" ? "column" : undefined,
          minHeight: 0,
        }}
      >
        {activeQuiz ? (
          <QuizRunner
            quiz={activeQuiz}
            onComplete={handleQuizComplete}
            onCancel={() => setActiveQuiz(null)}
          />
        ) : openCourseId ? (
          // Course page: details + continue learning + quiz + curriculum/syllabus.
          // Rendering is gated on the server-verified access state.
          <CourseDetailView
            course={courses.find((c) => c.id === openCourseId) || null}
            access={openAccess}
            coursesLoading={coursesLoading || requestsLoading}
            currentUser={user}
            onBack={() => setOpenCourseId(null)}
            onOpenPdf={(doc) => setPdfDoc(doc)}
            onCompleteLesson={handleCompleteLesson}
            onStartQuiz={handleCourseQuiz}
          />
        ) : (
          <>
            {activeTab === "enrollments" && (
              <EnrollmentRequestsTab
                requests={requests}
                courses={courses}
                loading={requestsLoading}
                busyCourseId={busyCourseId}
                onCancel={handleCancelRequest}
                onReRequest={handleReRequest}
                onBrowse={() => navigate("/courses")}
                onGoToCourse={(courseId) => {
                  setActiveTab("enrollments");
                  setOpenCourseId(courseId);
                }}
                onOpenCourse={(courseId) => setOpenCourseId(courseId)}
              />
            )}
            {activeTab === "home" && (
              <HomeTab
                profile={profile}
                onMissionClaim={handleMissionClaim}
                onFreezeUse={handleFreezeUse}
                onNavigate={(tab) => setActiveTab(tab)}
                onStartQuiz={(quiz) => handleStartQuiz(quiz)}
              />
            )}
            {activeTab === "focus" && (
              <FocusFlowTab
                profile={profile}
                onSessionCompleted={refreshProfile}
              />
            )}
            {activeTab === "coach" && (
              <CoachTab
                studentId={user?.id}
                courseId={
                  courses[0]?.code?.toLowerCase() ||
                  courses[0]?.id ||
                  "it3012-se"
                }
              />
            )}
            {activeTab === "ranks" && <LeaderboardTab profile={profile} studentId={user.id} />}
            {activeTab === "profile" && (
              <ProfileTab profile={profile} onLogout={onLogout} />
            )}
          </>
        )}
      </div>

      {/* In-App PDF Reader Modal */}
      {pdfDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
          }}
        >
          <div
            className="card-premium"
            style={{
              width: "100%",
              maxWidth: "780px",
              height: "80vh",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-popover)",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                background: "var(--bg-surface)",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <FileText size={18} color="var(--secondary)" />
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "700",
                      color: "var(--text-main)",
                    }}
                  >
                    {pdfDoc.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {pdfDoc.fileName} • Document Viewer
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() =>
                    downloadPdf(
                      pdfDoc.rawUrl || pdfDoc.url,
                      pdfDoc.fileName,
                      pdfDoc.title,
                    )
                  }
                  className="btn-primary"
                  style={{
                    padding: "5px 10px",
                    fontSize: "11.5px",
                    gap: "4px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={() => setPdfDoc(null)}
                  className="btn-ghost"
                  style={{ padding: "5px" }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                backgroundColor: "var(--bg-canvas)",
                overflow: "hidden",
              }}
            >
              <iframe
                src={pdfDoc.url}
                title={pdfDoc.title}
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      <HelpSupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        currentUser={user}
      />

      {/* Bottom Navigation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: activeTab === "coach" ? "1040px" : "720px",
          transition: "max-width 0.2s ease",
          background: "var(--bg-surface)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border-subtle)",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.2)",
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 calc(10px + env(safe-area-inset-bottom, 0px))",
          zIndex: 1000,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !activeQuiz;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveQuiz(null);
                setOpenCourseId(null);
                setActiveTab(tab.id);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "0 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <Icon size={18} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? "700" : "500",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
