import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LifeBuoy,
  Search,
  RefreshCw,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Send,
  ArrowRight,
  X,
  User,
  Check,
  Copy,
  AlertCircle,
} from "lucide-react";
import supportService, { formatApiError } from "../../services/supportService";
import {
  SupportStatusBadge,
  SupportTypeBadge,
} from "../../components/support/TicketDetail";
import { LoadingBlock, fmtDate, fmtDateTime } from "../Instructor/shared";

export default function SupportDesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected ticket for inspection & management
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Admin response & mutation states
  const [adminResponse, setAdminResponse] = useState("");
  const [mutationInProgress, setMutationInProgress] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Resolution confirmation dialog state
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);

  const [copiedId, setCopiedId] = useState(false);
  const listAbortControllerRef = useRef(null);
  const detailAbortControllerRef = useRef(null);

  // 300ms debounce on search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Close modal on Escape key press
  useEffect(() => {
    if (!selectedTicketId) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !mutationInProgress) {
        if (showResolveConfirm) {
          setShowResolveConfirm(false);
        } else {
          handleCloseDetail();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTicketId, mutationInProgress, showResolveConfirm]);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (selectedTicketId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedTicketId]);

  // Fetch ticket inventory
  const fetchTickets = useCallback(async () => {
    if (listAbortControllerRef.current) {
      listAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    listAbortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await supportService.getAdminTickets(
        {
          page,
          pageSize,
          search: debouncedSearch,
          type: typeFilter,
          status: statusFilter,
        },
        controller.signal,
      );

      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setTickets(items);
      setTotalPages(data?.totalPages ?? 1);
      setTotalCount(data?.totalCount ?? items.length);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      console.warn("[SupportDesk] Failed to fetch tickets:", err);
      setError(formatApiError(err, "Support service is not available yet."));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTickets();
    return () => {
      if (listAbortControllerRef.current) {
        listAbortControllerRef.current.abort();
      }
    };
  }, [fetchTickets]);

  // Load ticket detail when selected
  const loadTicketDetail = useCallback(async (ticketId) => {
    if (!ticketId) {
      setTicketDetail(null);
      return;
    }

    if (detailAbortControllerRef.current) {
      detailAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    detailAbortControllerRef.current = controller;

    setDetailLoading(true);
    setDetailError(null);
    setMutationError(null);
    setConflictWarning(null);

    try {
      const detail = await supportService.getAdminTicket(
        ticketId,
        controller.signal,
      );
      setTicketDetail(detail);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      console.warn("[SupportDesk] Failed to load ticket detail:", err);
      setDetailError(
        formatApiError(err, "Support service is not available yet."),
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
    setAdminResponse("");
    loadTicketDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedTicketId(null);
    setTicketDetail(null);
    setAdminResponse("");
    setMutationError(null);
    setConflictWarning(null);
    fetchTickets();
  };

  const handleCopyId = (id) => {
    if (id) {
      navigator.clipboard?.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setTypeFilter("All");
    setStatusFilter("All");
    setPage(1);
  };

  // Perform ticket mutation (Send reply, Mark in progress, or Resolve)
  const performMutation = async (newStatus, customMessage = null) => {
    if (!ticketDetail || mutationInProgress) return;

    setMutationInProgress(true);
    setMutationError(null);
    setConflictWarning(null);

    const messageToSend =
      customMessage !== null ? customMessage : adminResponse.trim();

    const payload = {
      status: newStatus,
      responseMessage: messageToSend || null,
      expectedVersion: ticketDetail.version,
    };

    try {
      const updated = await supportService.updateAdminTicket(
        ticketDetail.id,
        payload,
      );
      setTicketDetail(updated);
      setAdminResponse(""); // Clear on success
      fetchTickets();
    } catch (err) {
      console.warn("[SupportDesk] Mutation failed:", err);

      if (
        err.response?.status === 409 ||
        err.response?.data?.code === "ticket_conflict"
      ) {
        // Concurrency conflict: reload latest data, retain draft response
        setConflictWarning(
          "This ticket was modified by another administrator. Latest data reloaded. Your unsent response has been retained below.",
        );
        try {
          const latest = await supportService.getAdminTicket(ticketDetail.id);
          setTicketDetail(latest);
        } catch {
          // ignore secondary reload error
        }
      } else {
        setMutationError(
          formatApiError(err, "Support service is not available yet."),
        );
      }
    } finally {
      setMutationInProgress(false);
      setShowResolveConfirm(false);
    }
  };

  // Action: Send Reply (keeps current status)
  const handleSendReply = () => {
    if (!adminResponse.trim()) {
      setMutationError("Please type a response message before sending.");
      return;
    }
    performMutation(ticketDetail.status, adminResponse.trim());
  };

  // Action: Mark In Progress (Open only, message optional)
  const handleMarkInProgress = () => {
    performMutation("InProgress", adminResponse.trim() || null);
  };

  // Action: Initiate Resolve Ticket
  const handleResolveClick = () => {
    const hasExistingResponses =
      ticketDetail.responses && ticketDetail.responses.length > 0;
    const hasNewResponse = Boolean(adminResponse.trim());

    if (!hasExistingResponses && !hasNewResponse) {
      setMutationError(
        "A ticket cannot be resolved without at least one response.",
      );
      return;
    }

    setMutationError(null);
    setShowResolveConfirm(true);
  };

  const isResolved = ticketDetail?.status === "Resolved";
  const responses = Array.isArray(ticketDetail?.responses)
    ? ticketDetail.responses
    : [];

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            Support Desk
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--text-muted)",
              margin: "4px 0 0",
            }}
          >
            Triage bug reports, resolve student disputes, and respond to
            platform feedback
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            className="btn-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "8px 14px",
            }}
          >
            <RefreshCw
              size={15}
              className={loading ? "spin" : ""}
              style={loading ? { animation: "spin 1s linear infinite" } : {}}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
            fontSize: "13.5px",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={fetchTickets}
            className="btn-ghost"
            style={{ padding: "6px 12px", fontSize: "12.5px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="card-premium"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Search Field */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: "1 1 260px",
            minWidth: "220px",
            position: "relative",
          }}
        >
          <Search
            size={16}
            color="var(--text-muted)"
            style={{
              position: "absolute",
              left: "12px",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search message, submitter, or UUID..."
            style={{ paddingLeft: "36px", fontSize: "13px" }}
          />
        </div>

        {/* Category & Status Selectors */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              Type:
            </span>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: "auto",
                minWidth: "130px",
                fontSize: "13px",
                padding: "7px 12px",
              }}
            >
              <option value="All">All Types</option>
              <option value="Bug">Bug</option>
              <option value="Dispute">Dispute</option>
              <option value="Feedback">Feedback</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              Status:
            </span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: "auto",
                minWidth: "130px",
                fontSize: "13px",
                padding: "7px 12px",
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {(searchTerm || typeFilter !== "All" || statusFilter !== "All") && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-ghost"
              style={{ fontSize: "12.5px", padding: "6px 10px" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Inventory */}
      {loading ? (
        <LoadingBlock label="Loading support ticket inventory" />
      ) : tickets.length === 0 ? (
        <div
          className="card-premium"
          style={{
            padding: "56px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <LifeBuoy size={28} />
          </div>
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            {searchTerm || typeFilter !== "All" || statusFilter !== "All"
              ? "No tickets match the current filters"
              : "No support tickets in system"}
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              maxWidth: "420px",
              margin: 0,
            }}
          >
            {searchTerm || typeFilter !== "All" || statusFilter !== "All"
              ? "Try modifying your search query or reset the type and status filters."
              : "Support tickets submitted by students and instructors will appear here for triage and resolution."}
          </p>
          {(searchTerm || typeFilter !== "All" || statusFilter !== "All") && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-primary"
              style={{
                marginTop: "8px",
                fontSize: "13px",
                padding: "8px 16px",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            className="card-premium"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-canvas)",
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Ticket ID
                    </th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Submitter
                    </th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Category
                    </th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Status
                    </th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Submitted
                    </th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>
                      Updated
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const shortId = t.id ? `${t.id.slice(0, 8)}…` : "—";
                    const isSelected = selectedTicketId === t.id;
                    return (
                      <tr
                        key={t.id}
                        className="table-row-hover"
                        onClick={() => handleSelectTicket(t.id)}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "var(--primary-soft)"
                            : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <code
                            style={{
                              fontSize: "11.5px",
                              color: "var(--primary-text)",
                              backgroundColor: "var(--primary-soft)",
                              padding: "3px 7px",
                              borderRadius: "var(--radius-xs)",
                              fontFamily: "var(--font-mono)",
                            }}
                            title={t.id}
                          >
                            {shortId}
                          </code>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "var(--text-main)",
                              }}
                            >
                              {t.submittedBy?.fullName || "Anonymous"}
                            </div>
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "var(--text-muted)",
                              }}
                            >
                              {t.submittedBy?.email}{" "}
                              {t.submittedBy?.role && `• ${t.submittedBy.role}`}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <SupportTypeBadge type={t.type} />
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <SupportStatusBadge status={t.status} />
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          {fmtDate(t.createdAt)}
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          {fmtDate(t.updatedAt || t.createdAt)}
                        </td>
                        <td
                          style={{ padding: "14px 18px", textAlign: "right" }}
                        >
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTicket(t.id);
                            }}
                            style={{
                              padding: "5px 10px",
                              fontSize: "12.5px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            aria-label={`View ticket ${t.id}`}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 8px",
                fontSize: "13px",
                color: "var(--text-muted)",
              }}
            >
              <span>
                Showing page {page} of {totalPages} ({totalCount} total tickets)
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Ticket Detail Modal / Panel */}
      {selectedTicketId &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(5, 5, 15, 0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
              boxSizing: "border-box",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !mutationInProgress) {
                handleCloseDetail();
              }
            }}
          >
            <div
              className="card-premium"
              style={{
                width: "min(820px, calc(100vw - 32px))",
                maxHeight: "90vh",
                overflowY: "auto",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-lg)",
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.4), var(--shadow-popover)",
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                position: "relative",
              }}
            >
              {/* Detail Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        margin: 0,
                        color: "var(--text-main)",
                      }}
                    >
                      Support Ticket Details
                    </h2>
                    {ticketDetail && (
                      <>
                        <SupportTypeBadge type={ticketDetail.type} />
                        <SupportStatusBadge status={ticketDetail.status} />
                      </>
                    )}
                  </div>
                  {ticketDetail && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "6px",
                      }}
                    >
                      <code
                        style={{
                          fontSize: "12px",
                          color: "var(--primary-text)",
                          backgroundColor: "var(--primary-soft)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-xs)",
                          fontFamily: "var(--font-mono)",
                        }}
                        title={ticketDetail.id}
                      >
                        {ticketDetail.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyId(ticketDetail.id)}
                        className="btn-ghost"
                        style={{
                          padding: "3px",
                          height: "24px",
                          width: "24px",
                        }}
                        title="Copy Ticket UUID"
                      >
                        {copiedId ? (
                          <Check size={13} color="var(--success)" />
                        ) : (
                          <Copy size={13} color="var(--text-muted)" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  disabled={mutationInProgress}
                  className="btn-ghost"
                  style={{
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-canvas)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: mutationInProgress ? "not-allowed" : "pointer",
                    opacity: mutationInProgress ? 0.5 : 1,
                    color: "var(--text-main)",
                    transition: "all 0.15s ease",
                  }}
                  aria-label="Close ticket detail"
                  title="Close (Esc)"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Detail Loading or Error */}
              {detailLoading ? (
                <LoadingBlock label="Loading ticket conversation" />
              ) : detailError ? (
                <div
                  role="alert"
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--accent-soft)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <AlertTriangle size={18} />
                  <span style={{ flex: 1 }}>{detailError}</span>
                  <button
                    type="button"
                    onClick={() => loadTicketDetail(selectedTicketId)}
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "12.5px" }}
                  >
                    Retry
                  </button>
                </div>
              ) : ticketDetail ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {/* Conflict or Mutation Errors */}
                  {conflictWarning && (
                    <div
                      role="alert"
                      style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--warning-soft)",
                        border: "1px solid var(--warning-border)",
                        color: "var(--warning)",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <AlertCircle size={18} />
                      <span>{conflictWarning}</span>
                    </div>
                  )}

                  {mutationError && (
                    <div
                      role="alert"
                      style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--accent-soft)",
                        border: "1px solid var(--accent-border)",
                        color: "var(--accent)",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <AlertTriangle size={18} />
                      <span>{mutationError}</span>
                    </div>
                  )}

                  {/* Submitter & Metadata Box */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            backgroundColor: "var(--primary-soft)",
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "14px",
                          }}
                        >
                          {ticketDetail.submittedBy?.fullName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "var(--text-main)",
                            }}
                          >
                            {ticketDetail.submittedBy?.fullName || "Anonymous"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {ticketDetail.submittedBy?.email}
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
                        <span
                          className="badge-pill badge-neutral"
                          style={{ fontSize: "11px" }}
                        >
                          {ticketDetail.submittedBy?.role || "User"}
                        </span>
                        <span
                          className={`badge-pill ${ticketDetail.submittedBy?.isActive ? "badge-success" : "badge-danger"}`}
                          style={{ fontSize: "11px" }}
                        >
                          {ticketDetail.submittedBy?.isActive
                            ? "Active Account"
                            : "Suspended Account"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border-subtle)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        Submitted: {fmtDateTime(ticketDetail.createdAt)}
                      </span>
                      {ticketDetail.updatedAt &&
                        ticketDetail.updatedAt !== ticketDetail.createdAt && (
                          <span>
                            Last Updated: {fmtDateTime(ticketDetail.updatedAt)}
                          </span>
                        )}
                      {ticketDetail.resolvedAt && (
                        <span style={{ color: "var(--success)" }}>
                          Resolved: {fmtDateTime(ticketDetail.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Original Message Section */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      Original Inquiry Message
                    </h4>
                    <div
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-card)",
                        borderRadius: "var(--radius-md)",
                        padding: "16px 20px",
                        fontSize: "13.5px",
                        lineHeight: "1.6",
                        color: "var(--text-main)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {ticketDetail.message}
                    </div>
                  </div>

                  {/* Response History Section */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      Response History ({responses.length})
                    </h4>

                    {responses.length === 0 ? (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          backgroundColor: "var(--bg-canvas)",
                          borderRadius: "var(--radius-md)",
                          border: "1px dashed var(--border-subtle)",
                          color: "var(--text-muted)",
                          fontSize: "13px",
                        }}
                      >
                        No administrator responses recorded yet.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {responses.map((resp, idx) => (
                          <div
                            key={resp.id || idx}
                            style={{
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              borderLeft: "3px solid var(--primary)",
                              borderRadius: "var(--radius-md)",
                              padding: "14px 18px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <Shield size={14} color="var(--primary)" />
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "var(--primary-text)",
                                  }}
                                >
                                  {resp.adminName ||
                                    resp.authorLabel ||
                                    "Support Administrator"}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {fmtDateTime(resp.createdAt)}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                lineHeight: "1.6",
                                color: "var(--text-secondary)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {resp.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Response / Mutation Controls */}
                  {isResolved ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        marginTop: "6px",
                      }}
                    >
                      <div
                        role="status"
                        style={{
                          padding: "16px 20px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--success-soft)",
                          border: "1px solid var(--success-border)",
                          color: "var(--success)",
                          fontSize: "13px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span>
                          This ticket was resolved on{" "}
                          {fmtDateTime(ticketDetail.resolvedAt)}. Resolved
                          tickets are read-only and cannot be reopened or
                          mutated.
                        </span>
                      </div>
                      <div
                        style={{ display: "flex", justifyContent: "flex-end" }}
                      >
                        <button
                          type="button"
                          onClick={handleCloseDetail}
                          className="btn-secondary"
                          style={{ fontSize: "13px", padding: "8px 18px" }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "20px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <label
                          htmlFor="admin-reply-textarea"
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "var(--text-main)",
                          }}
                        >
                          Administrator Response
                        </label>
                        <span
                          style={{
                            fontSize: "11.5px",
                            color:
                              adminResponse.length >= 4800
                                ? "var(--accent)"
                                : "var(--text-muted)",
                          }}
                        >
                          {adminResponse.length} / 5000 characters
                        </span>
                      </div>

                      <textarea
                        id="admin-reply-textarea"
                        className="form-textarea"
                        rows={4}
                        value={adminResponse}
                        onChange={(e) => {
                          if (e.target.value.length <= 5000) {
                            setAdminResponse(e.target.value);
                            if (mutationError) setMutationError(null);
                          }
                        }}
                        placeholder="Write administrator response to the submitter..."
                        disabled={mutationInProgress}
                        maxLength={5000}
                        style={{ fontSize: "13.5px", padding: "10px 14px" }}
                      />

                      <div
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        Note: All responses are published directly to the
                        submitter. Internal notes are not supported.
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleCloseDetail}
                          disabled={mutationInProgress}
                          className="btn-secondary"
                          style={{ fontSize: "13px", padding: "8px 16px" }}
                        >
                          Close
                        </button>

                        {/* Mark In Progress (Open only) */}
                        {ticketDetail.status === "Open" && (
                          <button
                            type="button"
                            onClick={handleMarkInProgress}
                            disabled={mutationInProgress}
                            className="btn-secondary"
                            style={{ fontSize: "13px", padding: "8px 16px" }}
                          >
                            Mark In Progress
                          </button>
                        )}

                        {/* Send Reply (Keeps current status) */}
                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={mutationInProgress || !adminResponse.trim()}
                          className="btn-secondary"
                          style={{
                            fontSize: "13px",
                            padding: "8px 16px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Send size={14} /> Send Reply
                        </button>

                        {/* Resolve Ticket */}
                        <button
                          type="button"
                          onClick={handleResolveClick}
                          disabled={mutationInProgress}
                          className="btn-primary"
                          style={{
                            fontSize: "13px",
                            padding: "8px 18px",
                            backgroundColor: "var(--success)",
                            borderColor: "var(--success)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <CheckCircle2 size={15} /> Resolve Ticket
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )}

      {/* Resolve Confirmation Modal */}
      {showResolveConfirm &&
        ticketDetail &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(5, 5, 15, 0.85)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: "20px",
              boxSizing: "border-box",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !mutationInProgress) {
                setShowResolveConfirm(false);
              }
            }}
          >
            <div
              className="card-premium"
              style={{
                width: "min(480px, calc(100vw - 32px))",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                position: "relative",
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.5), var(--shadow-popover)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--success-soft)",
                    color: "var(--success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      margin: 0,
                      color: "var(--text-main)",
                    }}
                  >
                    Resolve Support Ticket?
                  </h3>
                  <p
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    This action marks the ticket as complete and read-only.
                  </p>
                </div>
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.5",
                }}
              >
                <p style={{ margin: "0 0 8px 0" }}>
                  You are resolving ticket{" "}
                  <code
                    style={{
                      color: "var(--primary-text)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {ticketDetail.id}
                  </code>
                  .
                </p>
                {adminResponse.trim() ? (
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>
                    Your pending response will be published to the submitter
                    along with the resolution.
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>
                    This ticket will be resolved using its existing response
                    history without sending an additional reply.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowResolveConfirm(false)}
                  disabled={mutationInProgress}
                  className="btn-secondary"
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => performMutation("Resolved")}
                  disabled={mutationInProgress}
                  className="btn-primary"
                  style={{
                    fontSize: "13px",
                    padding: "8px 18px",
                    backgroundColor: "var(--success)",
                    borderColor: "var(--success)",
                  }}
                >
                  {mutationInProgress ? "Resolving…" : "Confirm & Resolve"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
