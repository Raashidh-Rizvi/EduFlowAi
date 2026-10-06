import React, { useState } from "react";
import {
  Clock,
  User,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowLeft,
  Shield,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { fmtDateTime } from "../../pages/Instructor/shared";

export function SupportStatusBadge({ status }) {
  if (status === "InProgress") {
    return <span className="badge-pill badge-primary">In Progress</span>;
  }
  if (status === "Resolved") {
    return <span className="badge-pill badge-success">Resolved</span>;
  }
  return <span className="badge-pill badge-warning">Open</span>;
}

export function SupportTypeBadge({ type }) {
  const typeStyles = {
    Bug: "badge-danger",
    Dispute: "badge-warning",
    Feedback: "badge-secondary",
  };
  const cls = typeStyles[type] || "badge-neutral";
  return <span className={`badge-pill ${cls}`}>{type || "General"}</span>;
}

export default function TicketDetail({ ticket, onBack, isAdmin = false }) {
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const handleCopyId = () => {
    if (ticket.id) {
      navigator.clipboard?.writeText(ticket.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isResolved = ticket.status === "Resolved";
  const responses = Array.isArray(ticket.responses) ? ticket.responses : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top action / navigation bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "6px 10px",
            }}
          >
            <ArrowLeft size={16} /> Back to list
          </button>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "auto",
            flexWrap: "wrap",
          }}
        >
          <SupportTypeBadge type={ticket.type} />
          <SupportStatusBadge status={ticket.status} />
        </div>
      </div>

      {/* Ticket Meta Card */}
      <div
        style={{
          background: "var(--bg-canvas)",
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
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Ticket ID
            </span>
            <code
              style={{
                fontSize: "12px",
                color: "var(--primary-text)",
                backgroundColor: "var(--primary-soft)",
                padding: "2px 8px",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-mono)",
              }}
              title={ticket.id}
            >
              {ticket.id}
            </code>
            <button
              type="button"
              onClick={handleCopyId}
              className="btn-ghost"
              style={{ padding: "4px", height: "26px", width: "26px" }}
              title="Copy Ticket UUID"
              aria-label="Copy full Ticket UUID"
            >
              {copied ? (
                <Check size={14} color="var(--success)" />
              ) : (
                <Copy size={14} color="var(--text-muted)" />
              )}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Clock size={13} /> Submitted: {fmtDateTime(ticket.createdAt)}
            </span>
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Updated: {fmtDateTime(ticket.updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Submitter info (shown in Admin view or when submittedBy is available) */}
        {ticket.submittedBy && (
          <div
            style={{
              paddingTop: "10px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {ticket.submittedBy.fullName?.charAt(0) || "U"}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  {ticket.submittedBy.fullName}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  {ticket.submittedBy.email}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="badge-pill badge-neutral"
                style={{ fontSize: "11px" }}
              >
                {ticket.submittedBy.role}
              </span>
              <span
                className={`badge-pill ${ticket.submittedBy.isActive ? "badge-success" : "badge-danger"}`}
                style={{ fontSize: "11px" }}
              >
                {ticket.submittedBy.isActive ? "Active" : "Suspended"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Resolved Banner */}
      {isResolved && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            backgroundColor: "var(--success-soft)",
            border: "1px solid var(--success-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--success)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>
            This ticket was marked as resolved
            {ticket.resolvedAt ? ` on ${fmtDateTime(ticket.resolvedAt)}` : ""}.
            Resolved tickets remain permanently visible in your support history.
          </span>
        </div>
      )}

      {/* Original Message Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h4
          style={{
            fontSize: "13px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          Original Inquiry
        </h4>
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "18px 20px",
            fontSize: "13.5px",
            lineHeight: "1.6",
            color: "var(--text-main)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {ticket.message}
        </div>
      </div>

      {/* Response History Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4
            style={{
              fontSize: "13px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Response History ({responses.length})
          </h4>
        </div>

        {responses.length === 0 ? (
          <div
            style={{
              padding: "24px 20px",
              textAlign: "center",
              backgroundColor: "var(--bg-canvas)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            <MessageSquare
              size={20}
              style={{ margin: "0 auto 8px", opacity: 0.6 }}
            />
            <div>No administrator response yet.</div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-subtle)",
                marginTop: "4px",
              }}
            >
              Your inquiry has been logged and our support team will respond
              here once reviewed.
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {responses.map((resp, idx) => (
              <div
                key={resp.id || idx}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderLeft: "3px solid var(--primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
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
                      gap: "8px",
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
                      {isAdmin
                        ? resp.adminName || resp.authorLabel || "Support Team"
                        : resp.authorLabel || "Support team"}
                    </span>
                  </div>
                  <span
                    style={{ fontSize: "11.5px", color: "var(--text-muted)" }}
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
    </div>
  );
}
