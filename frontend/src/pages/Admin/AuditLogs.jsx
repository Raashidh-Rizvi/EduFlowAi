import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
  X,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Info,
  Layers,
} from "lucide-react";
import {
  adminAuditService,
  formatAuditApiError,
} from "../../services/adminAuditService";
import { LoadingBlock } from "../Instructor/shared";

// Action Badge component with distinct, accessible styles
function ActionBadge({ action }) {
  let bg = "rgba(100, 116, 139, 0.12)";
  let color = "var(--text-secondary)";
  let border = "1px solid rgba(100, 116, 139, 0.25)";

  if (action === "SupportTicket.Created") {
    bg = "rgba(139, 92, 246, 0.12)";
    color = "var(--primary-light, #a78bfa)";
    border = "1px solid rgba(139, 92, 246, 0.3)";
  } else if (action === "SupportTicket.Replied") {
    bg = "rgba(59, 130, 246, 0.12)";
    color = "#60a5fa";
    border = "1px solid rgba(59, 130, 246, 0.3)";
  } else if (action === "SupportTicket.StatusChanged") {
    bg = "rgba(245, 158, 11, 0.12)";
    color = "#fbbf24";
    border = "1px solid rgba(245, 158, 11, 0.3)";
  } else if (action === "SupportTicket.Resolved") {
    bg = "rgba(16, 185, 129, 0.12)";
    color = "#34d399";
    border = "1px solid rgba(16, 185, 129, 0.3)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
        fontFamily: "monospace",
        backgroundColor: bg,
        color: color,
        border: border,
        whiteSpace: "nowrap",
      }}
    >
      {action}
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ actions: [], resourceTypes: [] });
  const [optionsError, setOptionsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 20; // Default page size per AUDIT_LOGS.md
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Detail Modal State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [logDetail, setLogDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const abortControllerRef = useRef(null);
  const detailAbortControllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    adminAuditService.getOptions(controller.signal)
      .then((options) => { if (!controller.signal.aborted) setFilterOptions(options); })
      .catch((err) => {
        if (!controller.signal.aborted) setOptionsError(formatAuditApiError(err, "Audit filter options could not be loaded."));
      });
    return () => controller.abort();
  }, []);

  // 300ms debounce on search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Convert local date string (YYYY-MM-DD) to ISO UTC boundaries
  const getDateBoundaries = useCallback(() => {
    let fromUtc = null;
    let toUtc = null;
    setDateError(null);

    if (fromDate) {
      const parts = fromDate.split("-").map(Number);
      if (parts.length === 3) {
        // Start of local calendar day
        const localFrom = new Date(
          parts[0],
          parts[1] - 1,
          parts[2],
          0,
          0,
          0,
          0,
        );
        fromUtc = localFrom.toISOString();
      }
    }

    if (toDate) {
      const parts = toDate.split("-").map(Number);
      if (parts.length === 3) {
        // Next local midnight as exclusive upper boundary
        const localToNextMidnight = new Date(
          parts[0],
          parts[1] - 1,
          parts[2] + 1,
          0,
          0,
          0,
          0,
        );
        toUtc = localToNextMidnight.toISOString();
      }
    }

    if (fromUtc && toUtc && new Date(fromUtc) >= new Date(toUtc)) {
      setDateError("From date must be earlier than or equal to To date.");
      return { fromUtc: null, toUtc: null, invalid: true };
    }

    return { fromUtc, toUtc, invalid: false };
  }, [fromDate, toDate]);

  // Fetch paginated audit logs
  const fetchAuditLogs = useCallback(async () => {
    const { fromUtc, toUtc, invalid } = getDateBoundaries();
    if (invalid) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await adminAuditService.getLogs(
        {
          page,
          pageSize,
          search: debouncedSearch,
          action: actionFilter,
          entityType: typeFilter,
          actorId: actorIdFilter,
          fromUtc,
          toUtc,
        },
        controller.signal,
      );

      setLogs(data?.items || []);
      setTotalPages(data?.totalPages || 0);
      setTotalCount(data?.totalCount || 0);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setError(
        formatAuditApiError(
          err,
          "Failed to load audit logs. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    actionFilter,
    typeFilter,
    actorIdFilter,
    getDateBoundaries,
  ]);

  useEffect(() => {
    fetchAuditLogs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAuditLogs]);

  // Fetch single log detail
  const handleOpenDetail = useCallback(async (id) => {
    setSelectedLogId(id);
    setLogDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    if (detailAbortControllerRef.current) {
      detailAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    detailAbortControllerRef.current = controller;

    try {
      const detail = await adminAuditService.getLog(id, controller.signal);
      setLogDetail(detail);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setDetailError(
        formatAuditApiError(
          err,
          "Audit log event details could not be loaded.",
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    if (detailAbortControllerRef.current) {
      detailAbortControllerRef.current.abort();
    }
    setSelectedLogId(null);
    setLogDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setActionFilter("All");
    setTypeFilter("All");
    setActorIdFilter("");
    setFromDate("");
    setToDate("");
    setDateError(null);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    (actionFilter && actionFilter !== "All") ||
    (typeFilter && typeFilter !== "All") ||
    actorIdFilter ||
    fromDate ||
    toDate,
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        minHeight: "100%",
      }}
    >
      {optionsError && <p role="alert">{optionsError} Reload this page to retry loading filter options.</p>}
      {/* Coverage Notice Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          padding: "16px 20px",
          borderRadius: "12px",
          backgroundColor: "rgba(139, 92, 246, 0.08)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
        }}
      >
        <Info
          size={20}
          color="var(--primary-500, #8b5cf6)"
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <div
          style={{
            flex: 1,
            fontSize: "13.5px",
            lineHeight: "1.5",
            color: "var(--text-secondary)",
          }}
        >
          <strong style={{ color: "var(--text-primary)", fontWeight: "600" }}>
            Governance Coverage Notice:{" "}
          </strong>
          Recorded actions from enabled audit integrations; earlier actions may
          be absent. Support Desk, course changes, enrollment decisions and roster
          changes, student withdrawals, and permanent user deletions are captured.
          Authentication and other account changes remain deferred to preserve
          existing account deletion protections.
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-subtle)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          {/* Search Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Search Logs
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                color="var(--text-subtle)"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                placeholder="Search action, resource, actor..."
                value={searchTerm}
                maxLength={100}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-canvas)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Action Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-canvas)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
            >
              <option value="All">All Actions</option>
              {filterOptions.actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Resource / Entity Type Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Resource Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-canvas)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
            >
              <option value="All">All Resource Types</option>
              {filterOptions.resourceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Optional Actor ID Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Actor UUID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 3fa85f64-5717-4562-b3fc..."
              value={actorIdFilter}
              maxLength={36}
              onChange={(e) => {
                setActorIdFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-canvas)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          {/* Date Range: From */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-canvas)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          {/* Date Range: To */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              To Date (Inclusive)
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-canvas)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {dateError && (
          <div
            style={{
              color: "#ef4444",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={15} />
            {dateError}
          </div>
        )}

        {/* Action Buttons Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--text-subtle)" }}>
            Showing <strong>{logs.length}</strong> of{" "}
            <strong>{totalCount}</strong> recorded events
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <X size={15} />
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={fetchAuditLogs}
              disabled={loading}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--primary-600, #7c3aed)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Error State */}
        {error && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <AlertTriangle size={36} color="#ef4444" />
            <div
              style={{
                fontSize: "15px",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              Failed to Load Audit Logs
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "var(--text-secondary)",
                maxWidth: "500px",
              }}
            >
              {error}
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              style={{
                marginTop: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--primary-600)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {!error && loading && (
          <div style={{ padding: "48px 24px" }}>
            <LoadingBlock message="Retrieving governance audit events..." />
          </div>
        )}

        {/* Empty States */}
        {!error && !loading && logs.length === 0 && (
          <div
            style={{
              padding: "64px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <ShieldCheck
              size={42}
              color="var(--text-subtle)"
              style={{ opacity: 0.5 }}
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              {hasActiveFilters
                ? "No recorded actions match these filters."
                : "No recorded actions yet."}
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "var(--text-subtle)",
                maxWidth: "450px",
                lineHeight: "1.5",
              }}
            >
              {hasActiveFilters
                ? "Try adjusting your search query, action type, date boundaries, or clearing active filters."
                : "Recorded actions from enabled audit integrations; earlier actions may be absent."}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  marginTop: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-canvas)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Table View */}
        {!error && !loading && logs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13.5px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-subtle)",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "14px 20px" }}>Timestamp</th>
                  <th style={{ padding: "14px 20px" }}>Actor</th>
                  <th style={{ padding: "14px 20px" }}>Action</th>
                  <th style={{ padding: "14px 20px" }}>Target Resource</th>
                  <th style={{ padding: "14px 20px", textAlign: "right" }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const localTimeStr = new Date(log.createdAt).toLocaleString();
                  const utcTimeStr = new Date(log.createdAt).toUTCString();

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Timestamp */}
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <span
                          title={`UTC: ${utcTimeStr}`}
                          style={{
                            cursor: "help",
                            color: "var(--text-primary)",
                          }}
                        >
                          {localTimeStr}
                        </span>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {log.actor?.displayName || "Unavailable actor"}
                          </span>
                          {log.actor?.id && (
                            <span
                              style={{
                                fontSize: "11.5px",
                                fontFamily: "monospace",
                                color: "var(--text-subtle)",
                              }}
                            >
                              {log.actor.id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 20px" }}>
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Target Resource */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontWeight: "600",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {log.entityType}
                          </span>
                          <span
                            title={log.entityId}
                            style={{
                              fontSize: "11.5px",
                              fontFamily: "monospace",
                              color: "var(--text-subtle)",
                              cursor: "default",
                            }}
                          >
                            {log.entityId
                              ? `${log.entityId.substring(0, 18)}...`
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* View Details */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(log.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor: "var(--bg-canvas)",
                            color: "var(--text-primary)",
                            fontSize: "12.5px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Eye size={14} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!error && !loading && totalPages > 1 && (
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-subtle)" }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> (
              {totalCount} total events)
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-canvas)",
                  color:
                    page <= 1 ? "var(--text-subtle)" : "var(--text-primary)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "13px",
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-canvas)",
                  color:
                    page >= totalPages
                      ? "var(--text-subtle)"
                      : "var(--text-primary)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "13px",
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Dialog Modal */}
      {selectedLogId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          onClick={handleCloseDetail}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "16px",
              border: "1px solid var(--border-subtle)",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <ShieldCheck size={22} color="var(--primary-500, #8b5cf6)" />
                <h3
                  id="audit-detail-title"
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                  }}
                >
                  Audit Event Details
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {detailLoading && (
                <div style={{ padding: "32px 0" }}>
                  <LoadingBlock message="Loading verified event details..." />
                </div>
              )}

              {detailError && (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={32} color="#ef4444" />
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                    }}
                  >
                    Unavailable Record
                  </div>
                  <div
                    style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                  >
                    {detailError}
                  </div>
                </div>
              )}

              {!detailLoading && !detailError && logDetail && (
                <>
                  {/* Event ID with copy */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-subtle)",
                        textTransform: "uppercase",
                      }}
                    >
                      Event Identifier
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>{logDetail.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(logDetail.id, "eventId")}
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          color: "var(--text-subtle)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {copiedId === "eventId" ? (
                          <Check size={14} color="#10b981" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedId === "eventId" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Two Column Grid: Timestamps & Action */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--text-subtle)",
                          textTransform: "uppercase",
                        }}
                      >
                        UTC Timestamp
                      </span>
                      <span
                        style={{
                          fontSize: "13.5px",
                          fontFamily: "monospace",
                          color: "var(--text-primary)",
                        }}
                      >
                        {new Date(logDetail.createdAt).toISOString()}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--text-subtle)",
                          textTransform: "uppercase",
                        }}
                      >
                        Local Time
                      </span>
                      <span
                        style={{
                          fontSize: "13.5px",
                          color: "var(--text-primary)",
                        }}
                      >
                        {new Date(logDetail.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actor Details */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-subtle)",
                        textTransform: "uppercase",
                      }}
                    >
                      Actor Identity
                    </span>
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <User size={18} color="var(--primary-500)" />
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "13.5px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {logDetail.actor?.displayName ||
                              "Unavailable actor"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontFamily: "monospace",
                              color: "var(--text-subtle)",
                            }}
                          >
                            Actor ID:{" "}
                            {logDetail.actor?.id ||
                              "N/A (Missing or deleted account)"}
                          </div>
                        </div>
                      </div>
                      {logDetail.actor?.id && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(logDetail.actor.id, "actorId")
                          }
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
                            color: "var(--text-subtle)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                          }}
                        >
                          {copiedId === "actorId" ? (
                            <Check size={14} color="#10b981" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Target Resource */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-subtle)",
                        textTransform: "uppercase",
                      }}
                    >
                      Target Resource
                    </span>
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "13.5px",
                            color: "var(--text-primary)",
                          }}
                        >
                          Type: {logDetail.entityType}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontFamily: "monospace",
                            color: "var(--text-subtle)",
                          }}
                        >
                          Resource ID: {logDetail.entityId || "N/A"}
                        </div>
                      </div>
                      {logDetail.entityId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(logDetail.entityId, "entityId")
                          }
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
                            color: "var(--text-subtle)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                          }}
                        >
                          {copiedId === "entityId" ? (
                            <Check size={14} color="#10b981" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Allowlisted Metadata Section */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-subtle)",
                        textTransform: "uppercase",
                      }}
                    >
                      Event Metadata
                    </span>

                    {logDetail.metadataUnavailable ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                          color: "#f59e0b",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Info size={16} />
                        Metadata is unavailable or uses an unapproved legacy
                        format. Raw data is excluded for security.
                      </div>
                    ) : Object.keys(logDetail.metadata || {}).length === 0 ? (
                      <div
                        style={{
                          padding: "12px",
                          color: "var(--text-subtle)",
                          fontSize: "13px",
                          fontStyle: "italic",
                        }}
                      >
                        No additional metadata properties recorded for this
                        event.
                      </div>
                    ) : (
                      <div
                        style={{
                          borderRadius: "8px",
                          border: "1px solid var(--border-subtle)",
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px",
                          }}
                        >
                          <tbody>
                            {Object.entries(logDetail.metadata).map(
                              ([key, val], idx) => (
                                <tr
                                  key={key}
                                  style={{
                                    borderBottom:
                                      idx <
                                      Object.keys(logDetail.metadata).length - 1
                                        ? "1px solid var(--border-subtle)"
                                        : "none",
                                    backgroundColor:
                                      idx % 2 === 0
                                        ? "rgba(255, 255, 255, 0.01)"
                                        : "transparent",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "10px 14px",
                                      fontWeight: "600",
                                      color: "var(--text-secondary)",
                                      width: "35%",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {key}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px 14px",
                                      color: "var(--text-primary)",
                                      fontFamily: "monospace",
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {val === null ? (
                                      <span
                                        style={{
                                          color: "var(--text-subtle)",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        null
                                      </span>
                                    ) : typeof val === "boolean" ? (
                                      val ? (
                                        "true"
                                      ) : (
                                        "false"
                                      )
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-canvas)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
