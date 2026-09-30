import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Inbox,
  RefreshCw,
  PlusCircle,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
} from "lucide-react";
import supportService, { formatApiError } from "../../services/supportService";
import TicketDetail, {
  SupportStatusBadge,
  SupportTypeBadge,
} from "./TicketDetail";
import { LoadingBlock, fmtDate } from "../../pages/Instructor/shared";

export default function SupportHistory({
  onSwitchToNew,
  initialTicketId = null,
  currentUser,
}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const abortControllerRef = useRef(null);

  // Fetch list of tickets
  const fetchTickets = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await supportService.getMyTickets(
        { page, pageSize, type: typeFilter, status: statusFilter },
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
      console.warn("[SupportHistory] Failed to fetch tickets:", err);
      setError(formatApiError(err, "Support service is not available yet."));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTickets();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTickets]);

  // Load specific ticket detail when initialTicketId is passed or on row click
  const loadTicketDetail = useCallback(async (ticketId) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await supportService.getMyTicket(ticketId);
      setSelectedTicket(detail);
    } catch (err) {
      console.warn("[SupportHistory] Failed to load ticket detail:", err);
      setDetailError(
        formatApiError(err, "Support service is not available yet."),
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTicketId) {
      loadTicketDetail(initialTicketId);
    }
  }, [initialTicketId, loadTicketDetail]);

  // Reset page when filters change
  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // If viewing detail of a ticket
  if (detailLoading) {
    return <LoadingBlock label="Loading ticket details" />;
  }

  if (selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        onBack={() => {
          setSelectedTicket(null);
          setDetailError(null);
          fetchTickets();
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Filter and Action Bar */}
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
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <select
            className="form-select"
            value={typeFilter}
            onChange={handleTypeChange}
            aria-label="Filter by category"
            style={{
              width: "auto",
              minWidth: "130px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          >
            <option value="All">All Categories</option>
            <option value="Bug">Bug</option>
            <option value="Dispute">Dispute</option>
            <option value="Feedback">Feedback</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Filter by status"
            style={{
              width: "auto",
              minWidth: "130px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            className="btn-ghost"
            title="Refresh tickets"
            style={{
              padding: "6px 10px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw
              size={14}
              className={loading ? "spin" : ""}
              style={loading ? { animation: "spin 1s linear infinite" } : {}}
            />
            Refresh
          </button>
        </div>

        {onSwitchToNew && (
          <button
            type="button"
            onClick={onSwitchToNew}
            className="btn-primary"
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PlusCircle size={15} /> New Ticket
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={fetchTickets}
            className="btn-ghost"
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            Retry
          </button>
        </div>
      )}

      {detailError && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: "12.5px",
          }}
        >
          {detailError}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <LoadingBlock label="Loading support history" />
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div
          className="card-premium"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary-soft)",
              border: "1px solid var(--primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Inbox size={24} color="var(--primary)" />
          </div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            {typeFilter !== "All" || statusFilter !== "All"
              ? "No tickets match your filters"
              : "No support tickets yet"}
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              maxWidth: "420px",
              margin: 0,
            }}
          >
            {typeFilter !== "All" || statusFilter !== "All"
              ? "Try changing or clearing your category and status filters."
              : "Have a question, encountered a bug, or need to dispute an evaluation? Submit a ticket to get private assistance from our support team."}
          </p>
          {onSwitchToNew && (
            <button
              type="button"
              onClick={onSwitchToNew}
              className="btn-primary"
              style={{
                marginTop: "8px",
                fontSize: "13px",
                padding: "8px 16px",
              }}
            >
              <PlusCircle size={15} /> Submit a Ticket
            </button>
          )}
        </div>
      ) : (
        /* Ticket List Table / Cards */
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              overflowX: "auto",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
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
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>
                    Ticket ID
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>
                    Category
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>
                    Submitted
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>
                    Responses
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
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
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background-color 0.15s ease",
                        cursor: "pointer",
                      }}
                      className="table-row-hover"
                      onClick={() => loadTicketDetail(t.id)}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <code
                          style={{
                            fontSize: "11.5px",
                            color: "var(--primary-text)",
                            backgroundColor: "var(--primary-soft)",
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            fontFamily: "var(--font-mono)",
                          }}
                          title={t.id}
                        >
                          {shortId}
                        </code>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <SupportTypeBadge type={t.type} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <SupportStatusBadge status={t.status} />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-muted)",
                          fontSize: "12.5px",
                        }}
                      >
                        {fmtDate(t.createdAt)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          <MessageSquare size={13} /> {t.responseCount ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadTicketDetail(t.id);
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 4px",
                fontSize: "12.5px",
                color: "var(--text-muted)",
              }}
            >
              <span>
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-ghost"
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
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
                    padding: "4px 8px",
                    fontSize: "12px",
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
    </div>
  );
}
