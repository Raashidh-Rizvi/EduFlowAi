import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  GraduationCap,
  Clock,
  LifeBuoy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldCheck,
  ArrowRight,
  Archive,
  FileEdit,
  HelpCircle,
  Bug,
  Scale,
  MessageSquare,
} from "lucide-react";
import { insightsService } from "../../services/insightsService";
import {
  SectionHeading,
  LoadingBlock,
  ErrorBanner,
  fmtDateTime,
} from "../Instructor/shared";

function isValidCount(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function validateSummaryShape(data) {
  if (!data || typeof data !== "object") return false;
  const { users, courses, enrollments } = data;
  if (!users || !courses || !enrollments) return false;

  const usersValid =
    isValidCount(users.total) &&
    isValidCount(users.students) &&
    isValidCount(users.instructors) &&
    isValidCount(users.admins) &&
    isValidCount(users.active) &&
    isValidCount(users.suspended);

  const coursesValid =
    isValidCount(courses.total) &&
    isValidCount(courses.published) &&
    isValidCount(courses.unpublished) &&
    isValidCount(courses.draft) &&
    isValidCount(courses.archived) &&
    isValidCount(courses.otherUnpublished);

  const enrollmentsValid =
    isValidCount(enrollments.totalRecords) &&
    isValidCount(enrollments.active) &&
    isValidCount(enrollments.completed) &&
    isValidCount(enrollments.pending) &&
    isValidCount(enrollments.rejected) &&
    isValidCount(enrollments.cancelled) &&
    isValidCount(enrollments.dropped);

  if (!usersValid || !coursesValid || !enrollmentsValid) return false;

  if (data.support) {
    const s = data.support;
    const supportValid =
      isValidCount(s.total) &&
      isValidCount(s.open) &&
      isValidCount(s.inProgress) &&
      isValidCount(s.resolved) &&
      isValidCount(s.unresolved) &&
      s.byType &&
      isValidCount(s.byType.bug) &&
      isValidCount(s.byType.dispute) &&
      isValidCount(s.byType.feedback);
    if (!supportValid) return false;
  }

  return true;
}

function calcPercentage(count, total) {
  if (!isValidCount(count) || !isValidCount(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, (count / total) * 100));
}

function fmtPct(count, total) {
  if (!isValidCount(count) || !isValidCount(total) || total <= 0) return "0.0%";
  return `${calcPercentage(count, total).toFixed(1)}%`;
}

export default function PlatformSummary({ onNavigateTo, currentUser }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [staleWarning, setStaleWarning] = useState(null);

  const isMountedRef = useRef(true);
  const currentUserIdRef = useRef(currentUser?.id);

  useEffect(() => {
    isMountedRef.current = true;
    currentUserIdRef.current = currentUser?.id;
    return () => {
      isMountedRef.current = false;
    };
  }, [currentUser]);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setStaleWarning(null);

      try {
        const response = await insightsService.getPlatformAnalytics();

        if (!isMountedRef.current) return;
        if (currentUserIdRef.current !== currentUser?.id) return;

        if (!response || !response.adminSummary) {
          throw new Error("Platform summary is not available on this server.");
        }

        if (!validateSummaryShape(response.adminSummary)) {
          throw new Error(
            "Received platform summary data with missing or invalid fields.",
          );
        }

        setSummary(response.adminSummary);
        setErrorMessage(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        if (currentUserIdRef.current !== currentUser?.id) return;

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load platform summary.";

        if (summary) {
          // Stale data fallback during refresh failure
          setStaleWarning(
            `Refresh failed: ${msg}. Showing data from ${fmtDateTime(summary.generatedAt)}.`,
          );
        } else {
          setErrorMessage(msg);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [currentUser?.id, summary],
  );

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <div style={{ padding: "16px 0" }}>
        <LoadingBlock label="Fetching authoritative platform summary" />
      </div>
    );
  }

  if (errorMessage && !summary) {
    return (
      <div style={{ padding: "16px 0" }}>
        <ErrorBanner message={errorMessage} onRetry={() => loadData(false)} />
      </div>
    );
  }

  if (!summary) return null;

  const {
    users,
    courses,
    enrollments,
    support,
    supportAvailability,
    generatedAt,
  } = summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
              letterSpacing: "-0.015em",
            }}
          >
            Platform Summary
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "4px",
              fontWeight: 500,
            }}
          >
            Current database totals &bull; Generated: {fmtDateTime(generatedAt)}
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: isRefreshing ? "not-allowed" : "pointer",
            opacity: isRefreshing ? 0.7 : 1,
          }}
          title="Refresh current database totals"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? "spin" : ""}
            style={isRefreshing ? { animation: "spin 1s linear infinite" } : {}}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stale Warning Banner (if refresh failed but cached snapshot is visible) */}
      {staleWarning && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--warning-soft)",
            border: "1px solid var(--warning-border)",
            color: "var(--warning)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span style={{ flex: 1 }}>{staleWarning}</span>
          <button
            className="btn-ghost"
            onClick={() => loadData(true)}
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 High-Level Platform Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        {/* 1. Total Registered Users */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Total Users
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {users.total.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-soft)",
                border: "1px solid var(--primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={22} color="var(--primary)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span>
              {users.students.toLocaleString()} Students &bull;{" "}
              {users.instructors.toLocaleString()} Instructors &bull;{" "}
              {users.admins.toLocaleString()} Admins
            </span>
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("admin")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>Manage User Directory</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 2. Active Accounts */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Active Accounts
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "var(--success)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {users.active.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--success-soft)",
                border: "1px solid var(--success-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={22} color="var(--success)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span>
              {users.suspended.toLocaleString()} Suspended &bull;{" "}
              {fmtPct(users.active, users.total)} enabled
            </span>
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("admin")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--success)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>View Account Statuses</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 3. Total Courses */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Total Courses
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {courses.total.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--secondary-soft)",
                border: "1px solid var(--secondary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={22} color="var(--secondary)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span>
              {courses.published.toLocaleString()} Published &bull;{" "}
              {courses.unpublished.toLocaleString()} Unpublished
            </span>
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("courses")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--secondary)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>Course Catalog</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 4. Active Enrollments */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Active Enrollments
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {enrollments.active.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-soft)",
                border: "1px solid var(--primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={22} color="var(--primary)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span>
              {enrollments.completed.toLocaleString()} Completed &bull;{" "}
              {enrollments.totalRecords.toLocaleString()} Total Records
            </span>
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("courses")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>Explore Enrollments</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 5. Pending Enrollment Requests */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Pending Requests
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color:
                    enrollments.pending > 0
                      ? "var(--warning)"
                      : "var(--text-main)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {enrollments.pending.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--warning-soft)",
                border: "1px solid var(--warning-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={22} color="var(--warning)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span>
              {enrollments.rejected.toLocaleString()} Rejected &bull;{" "}
              {enrollments.cancelled.toLocaleString()} Cancelled
            </span>
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("enrollment-requests")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--warning)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>Review Requests</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 6. Unresolved Support Tickets */}
        <div
          className="card-premium hover-scale"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Unresolved Support
              </span>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color:
                    supportAvailability === "Available" && support
                      ? support.unresolved > 0
                        ? "var(--accent)"
                        : "var(--text-main)"
                      : "var(--text-muted)",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {supportAvailability === "Available" && support
                  ? support.unresolved.toLocaleString()
                  : "Unavailable"}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-soft)",
                border: "1px solid var(--accent-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LifeBuoy size={22} color="var(--accent)" />
            </div>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {supportAvailability === "Available" && support ? (
              <span>
                {support.open.toLocaleString()} Open &bull;{" "}
                {support.inProgress.toLocaleString()} In Progress (
                {support.resolved.toLocaleString()} Resolved)
              </span>
            ) : (
              <span>Support reporting not available yet.</span>
            )}
          </div>
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo("support-desk")}
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                width: "100%",
                marginTop: "4px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <span>Open Support Desk</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Detailed Visual Distributions & Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "24px",
        }}
      >
        {/* User Directory & Account Governance */}
        <div className="card-premium" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <Users size={18} color="var(--primary)" />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              User Directory & Account Status
            </h3>
          </div>

          {users.total === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: "20px 0",
              }}
            >
              No user records in the system yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Role Breakdown Bar */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    Distribution by Role
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Total: {users.total.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    height: "12px",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    overflow: "hidden",
                    backgroundColor: "var(--bg-input)",
                  }}
                >
                  <div
                    title={`Students: ${users.students} (${fmtPct(users.students, users.total)})`}
                    style={{
                      width: `${calcPercentage(users.students, users.total)}%`,
                      backgroundColor: "var(--primary)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`Instructors: ${users.instructors} (${fmtPct(users.instructors, users.total)})`}
                    style={{
                      width: `${calcPercentage(users.instructors, users.total)}%`,
                      backgroundColor: "var(--secondary)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`Admins: ${users.admins} (${fmtPct(users.admins, users.total)})`}
                    style={{
                      width: `${calcPercentage(users.admins, users.total)}%`,
                      backgroundColor: "var(--accent)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--primary)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Students:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {users.students.toLocaleString()} (
                      {fmtPct(users.students, users.total)})
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--secondary)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Instructors:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {users.instructors.toLocaleString()} (
                      {fmtPct(users.instructors, users.total)})
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>Admins:</span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {users.admins.toLocaleString()} (
                      {fmtPct(users.admins, users.total)})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Account Status Breakdown Bar */}
              <div
                style={{
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border-card)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    Account State
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Active vs. Suspended
                  </span>
                </div>
                <div
                  style={{
                    height: "12px",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    overflow: "hidden",
                    backgroundColor: "var(--bg-input)",
                  }}
                >
                  <div
                    title={`Active: ${users.active} (${fmtPct(users.active, users.total)})`}
                    style={{
                      width: `${calcPercentage(users.active, users.total)}%`,
                      backgroundColor: "var(--success)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`Suspended: ${users.suspended} (${fmtPct(users.suspended, users.total)})`}
                    style={{
                      width: `${calcPercentage(users.suspended, users.total)}%`,
                      backgroundColor: "var(--accent)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--success)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Active (Enabled):
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {users.active.toLocaleString()} (
                      {fmtPct(users.active, users.total)})
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Suspended:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {users.suspended.toLocaleString()} (
                      {fmtPct(users.suspended, users.total)})
                    </strong>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-subtle)",
                    marginTop: "8px",
                  }}
                >
                  * Active accounts indicates enabled credentials, not recent
                  online presence.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Course Publication Distribution */}
        <div className="card-premium" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <BookOpen size={18} color="var(--secondary)" />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Curriculum & Publication Distribution
            </h3>
          </div>

          {courses.total === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: "20px 0",
              }}
            >
              No course records in the system yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Publication Status */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    Publication Status
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Total: {courses.total.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    height: "12px",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    overflow: "hidden",
                    backgroundColor: "var(--bg-input)",
                  }}
                >
                  <div
                    title={`Published: ${courses.published} (${fmtPct(courses.published, courses.total)})`}
                    style={{
                      width: `${calcPercentage(courses.published, courses.total)}%`,
                      backgroundColor: "var(--success)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`Unpublished: ${courses.unpublished} (${fmtPct(courses.unpublished, courses.total)})`}
                    style={{
                      width: `${calcPercentage(courses.unpublished, courses.total)}%`,
                      backgroundColor: "var(--warning)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--success)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Published:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {courses.published.toLocaleString()} (
                      {fmtPct(courses.published, courses.total)})
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--warning)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Unpublished:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {courses.unpublished.toLocaleString()} (
                      {fmtPct(courses.unpublished, courses.total)})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Unpublished Course Categories */}
              <div
                style={{
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border-card)",
                }}
              >
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  Unpublished Breakdown
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FileEdit size={12} /> Draft
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        marginTop: "4px",
                      }}
                    >
                      {courses.draft.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--text-subtle)",
                        marginTop: "2px",
                      }}
                    >
                      {fmtPct(courses.draft, courses.unpublished)} of unpub.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Archive size={12} /> Archived
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        marginTop: "4px",
                      }}
                    >
                      {courses.archived.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--text-subtle)",
                        marginTop: "2px",
                      }}
                    >
                      {fmtPct(courses.archived, courses.unpublished)} of unpub.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <HelpCircle size={12} /> Other Unpub.
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        marginTop: "4px",
                      }}
                    >
                      {courses.otherUnpublished.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--text-subtle)",
                        marginTop: "2px",
                      }}
                    >
                      {fmtPct(courses.otherUnpublished, courses.unpublished)} of
                      unpub.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Roster Lifecycle */}
        <div className="card-premium" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <GraduationCap size={18} color="var(--primary)" />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Enrollment Roster Lifecycle
            </h3>
          </div>

          {enrollments.totalRecords === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: "20px 0",
              }}
            >
              No enrollment records in the system yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                  All Statuses
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  Total Rows: {enrollments.totalRecords.toLocaleString()}
                </span>
              </div>

              {/* Progress Bar for Enrollments */}
              <div
                style={{
                  height: "12px",
                  borderRadius: "var(--radius-full)",
                  display: "flex",
                  overflow: "hidden",
                  backgroundColor: "var(--bg-input)",
                }}
              >
                <div
                  title={`Active: ${enrollments.active}`}
                  style={{
                    width: `${calcPercentage(enrollments.active, enrollments.totalRecords)}%`,
                    backgroundColor: "var(--primary)",
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  title={`Completed: ${enrollments.completed}`}
                  style={{
                    width: `${calcPercentage(enrollments.completed, enrollments.totalRecords)}%`,
                    backgroundColor: "var(--success)",
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  title={`Pending: ${enrollments.pending}`}
                  style={{
                    width: `${calcPercentage(enrollments.pending, enrollments.totalRecords)}%`,
                    backgroundColor: "var(--warning)",
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  title={`Rejected: ${enrollments.rejected}`}
                  style={{
                    width: `${calcPercentage(enrollments.rejected, enrollments.totalRecords)}%`,
                    backgroundColor: "var(--accent)",
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  title={`Cancelled: ${enrollments.cancelled}`}
                  style={{
                    width: `${calcPercentage(enrollments.cancelled, enrollments.totalRecords)}%`,
                    backgroundColor: "var(--text-subtle)",
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  title={`Dropped: ${enrollments.dropped}`}
                  style={{
                    width: `${calcPercentage(enrollments.dropped, enrollments.totalRecords)}%`,
                    backgroundColor: "#64748B",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Grid of 6 Status counts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginTop: "6px",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--primary)",
                      fontWeight: 700,
                    }}
                  >
                    Active
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.active.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.active, enrollments.totalRecords)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--success)",
                      fontWeight: 700,
                    }}
                  >
                    Completed
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.completed.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.completed, enrollments.totalRecords)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--warning)",
                      fontWeight: 700,
                    }}
                  >
                    Pending
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.pending.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.pending, enrollments.totalRecords)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    Rejected
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.rejected.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.rejected, enrollments.totalRecords)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Cancelled
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.cancelled.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.cancelled, enrollments.totalRecords)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Dropped
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      marginTop: "2px",
                    }}
                  >
                    {enrollments.dropped.toLocaleString()}
                  </div>
                  <div
                    style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                  >
                    {fmtPct(enrollments.dropped, enrollments.totalRecords)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support Desk & Inquiries Distribution */}
        <div className="card-premium" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <LifeBuoy size={18} color="var(--accent)" />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
              }}
            >
              Support Desk & Inquiries
            </h3>
          </div>

          {supportAvailability !== "Available" || !support ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <LifeBuoy size={28} color="var(--text-muted)" />
              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Support reporting not available yet.
              </p>
            </div>
          ) : support.total === 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={28} color="var(--success)" />
              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                No support tickets recorded yet.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Status Breakdown */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    By Resolution Status
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Total: {support.total.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    height: "12px",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    overflow: "hidden",
                    backgroundColor: "var(--bg-input)",
                  }}
                >
                  <div
                    title={`Open: ${support.open} (${fmtPct(support.open, support.total)})`}
                    style={{
                      width: `${calcPercentage(support.open, support.total)}%`,
                      backgroundColor: "var(--accent)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`In Progress: ${support.inProgress} (${fmtPct(support.inProgress, support.total)})`}
                    style={{
                      width: `${calcPercentage(support.inProgress, support.total)}%`,
                      backgroundColor: "var(--warning)",
                      transition: "width 0.4s ease",
                    }}
                  />
                  <div
                    title={`Resolved: ${support.resolved} (${fmtPct(support.resolved, support.total)})`}
                    style={{
                      width: `${calcPercentage(support.resolved, support.total)}%`,
                      backgroundColor: "var(--success)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>Open:</span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {support.open.toLocaleString()}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--warning)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      In Progress:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {support.inProgress.toLocaleString()}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--success)",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      Resolved:
                    </span>
                    <strong style={{ color: "var(--text-main)" }}>
                      {support.resolved.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* By Type Breakdown */}
              <div
                style={{
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border-card)",
                }}
              >
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  By Ticket Type
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      <Bug size={12} /> Bug
                    </div>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "var(--text-main)",
                        marginTop: "2px",
                      }}
                    >
                      {support.byType.bug.toLocaleString()}
                    </div>
                    <div
                      style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                    >
                      {fmtPct(support.byType.bug, support.total)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--warning)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      <Scale size={12} /> Dispute
                    </div>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "var(--text-main)",
                        marginTop: "2px",
                      }}
                    >
                      {support.byType.dispute.toLocaleString()}
                    </div>
                    <div
                      style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                    >
                      {fmtPct(support.byType.dispute, support.total)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      <MessageSquare size={12} /> Feedback
                    </div>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "var(--text-main)",
                        marginTop: "2px",
                      }}
                    >
                      {support.byType.feedback.toLocaleString()}
                    </div>
                    <div
                      style={{ fontSize: "10.5px", color: "var(--text-muted)" }}
                    >
                      {fmtPct(support.byType.feedback, support.total)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
