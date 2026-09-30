import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LifeBuoy,
  X,
  Send,
  History,
  FilePlus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import supportService, {
  generateUUID,
  formatApiError,
} from "../../services/supportService";
import SupportHistory from "./SupportHistory";

export default function HelpSupportDialog({ isOpen, onClose, currentUser }) {
  const dialogRef = useRef(null);
  const activeElementBeforeOpen = useRef(null);
  const isSubmittingRef = useRef(false);

  // Active view: 'new' | 'history'
  const [activeView, setActiveView] = useState("new");

  // Form draft state in memory only (cleared on logout / account change)
  const [ticketType, setTicketType] = useState("");
  const [message, setMessage] = useState("");
  const [clientRequestId, setClientRequestId] = useState(generateUUID);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(null); // { id: string }
  const [justCreatedTicketId, setJustCreatedTicketId] = useState(null);

  // Clear draft on currentUser change
  useEffect(() => {
    setTicketType("");
    setMessage("");
    setClientRequestId(generateUUID());
    setFormError("");
    setSubmitSuccess(null);
    setJustCreatedTicketId(null);
    setActiveView("new");
  }, [currentUser?.id, currentUser?.role]);

  // Modal open/close lifecycle and focus management
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      activeElementBeforeOpen.current = document.activeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (
        activeElementBeforeOpen.current &&
        typeof activeElementBeforeOpen.current.focus === "function"
      ) {
        activeElementBeforeOpen.current.focus();
      }
    }
  }, [isOpen]);

  const isDirty = Boolean(ticketType || message.trim());

  // Confirm discard when closing if draft is dirty
  const handleRequestClose = useCallback(() => {
    if (isSubmittingRef.current) return; // In-flight guard

    if (isDirty && !submitSuccess) {
      const confirmDiscard = window.confirm(
        "You have an unsaved support inquiry draft. Discard this draft and close?",
      );
      if (!confirmDiscard) return;
    }

    // Reset transient submit success on close
    setSubmitSuccess(null);
    onClose();
  }, [isDirty, submitSuccess, onClose]);

  // Handle ESC key
  const handleCancel = (e) => {
    e.preventDefault();
    handleRequestClose();
  };

  const handleMessageChange = (e) => {
    const nextVal = e.target.value;
    if (nextVal.length <= 5000) {
      setMessage(nextVal);
      if (formError) setFormError("");
    }
  };

  const handleTypeChange = (e) => {
    setTicketType(e.target.value);
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setFormError("");

    // Validation
    if (!ticketType) {
      setFormError(
        "Please select a ticket category (Bug, Dispute, or Feedback).",
      );
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      setFormError("Please describe your issue or inquiry before submitting.");
      return;
    }

    if (trimmed.length > 5000) {
      setFormError("Message cannot exceed 5000 characters.");
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const payload = {
        type: ticketType,
        message: trimmed,
        clientRequestId,
      };

      const created = await supportService.createTicket(payload);

      // Successfully persisted
      setSubmitSuccess(created);
      setJustCreatedTicketId(created?.id || null);
      // Clear draft form
      setTicketType("");
      setMessage("");
      setClientRequestId(generateUUID());
    } catch (err) {
      console.warn("[HelpSupportDialog] Submission failed:", err);
      // If error occurred with message changed, regenerate key; otherwise retain key for exact retry
      setFormError(
        formatApiError(err, "Support service is not available yet."),
      );
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleViewInHistory = () => {
    const idToView = justCreatedTicketId;
    setSubmitSuccess(null);
    setActiveView("history");
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby="help-support-title"
      className="card-premium"
      style={{
        padding: "24px 28px",
        width: "min(760px, calc(100vw - 32px))",
        maxHeight: "90vh",
        overflowY: "auto",
        margin: "auto",
        color: "var(--text-main)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-popover)",
      }}
    >
      {/* Dialog Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <LifeBuoy size={20} />
          </div>
          <div>
            <h2
              id="help-support-title"
              style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}
            >
              Help & Support
            </h2>
            <p
              style={{
                fontSize: "12.5px",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              Submit private inquiries to EduFlow AI support
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequestClose}
          disabled={submitting}
          className="btn-ghost"
          aria-label="Close Help & Support dialog"
          style={{ padding: "6px", borderRadius: "50%" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* View Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "12px",
          marginBottom: "20px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSubmitSuccess(null);
            setActiveView("new");
          }}
          disabled={submitting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background:
              activeView === "new" ? "var(--primary-soft)" : "transparent",
            color:
              activeView === "new" ? "var(--primary)" : "var(--text-muted)",
            fontWeight: activeView === "new" ? 700 : 500,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <FilePlus size={15} /> New Ticket
        </button>

        <button
          type="button"
          onClick={() => {
            setSubmitSuccess(null);
            setActiveView("history");
          }}
          disabled={submitting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background:
              activeView === "history" ? "var(--primary-soft)" : "transparent",
            color:
              activeView === "history" ? "var(--primary)" : "var(--text-muted)",
            fontWeight: activeView === "history" ? 700 : 500,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <History size={15} /> Support History
        </button>
      </div>

      {/* Content based on active view */}
      {activeView === "history" ? (
        <SupportHistory
          onSwitchToNew={() => setActiveView("new")}
          initialTicketId={justCreatedTicketId}
          currentUser={currentUser}
        />
      ) : submitSuccess ? (
        /* Confirmed submission success screen */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "32px 16px",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--success-soft)",
              border: "1px solid var(--success-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--text-main)",
                margin: "0 0 6px 0",
              }}
            >
              Ticket Submitted Successfully
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                maxWidth: "440px",
                margin: 0,
              }}
            >
              Your inquiry has been registered. You can track progress and
              administrator responses in your Support History.
            </p>
          </div>

          {submitSuccess.id && (
            <div
              style={{
                backgroundColor: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Ticket ID:
              </span>
              <code
                style={{
                  fontSize: "12px",
                  color: "var(--primary-text)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {submitSuccess.id}
              </code>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={handleViewInHistory}
              className="btn-primary"
              style={{
                fontSize: "13px",
                padding: "8px 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Open in Support History <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                setJustCreatedTicketId(null);
              }}
              className="btn-secondary"
              style={{ fontSize: "13px", padding: "8px 16px" }}
            >
              Submit Another
            </button>
          </div>
        </div>
      ) : (
        /* New Ticket Form */
        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {formError && (
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
              <span style={{ flex: 1 }}>{formError}</span>
            </div>
          )}

          <fieldset
            disabled={submitting}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              border: 0,
              padding: 0,
              margin: 0,
            }}
          >
            {/* Category Field */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label
                htmlFor="ticket-type"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                Ticket Category{" "}
                <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <select
                id="ticket-type"
                className="form-select"
                value={ticketType}
                onChange={handleTypeChange}
                required
                style={{ fontSize: "13.5px", padding: "10px 14px" }}
              >
                <option value="">Select ticket category...</option>
                <option value="Bug">
                  Bug — Technical issue or error encountered on the platform
                </option>
                <option value="Dispute">
                  Dispute — Contest an evaluation, quiz score, or enrollment
                  decision
                </option>
                <option value="Feedback">
                  Feedback — Suggestion, general question, or platform feedback
                </option>
              </select>
            </div>

            {/* Message Field */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  htmlFor="ticket-message"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  Message <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: "11.5px",
                    color:
                      message.length >= 4800
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                >
                  {message.length} / 5000 characters
                </span>
              </div>
              <textarea
                id="ticket-message"
                className="form-textarea"
                rows={6}
                value={message}
                onChange={handleMessageChange}
                placeholder="Describe your inquiry or issue in detail. For bugs, include steps to reproduce; for disputes, include relevant assessment or course context..."
                required
                maxLength={5000}
                style={{
                  fontSize: "13.5px",
                  padding: "12px 14px",
                  lineHeight: "1.5",
                }}
              />
            </div>

            {/* Privacy / Security Notice */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <Lock size={14} color="var(--primary)" />
              <span>
                <strong>Privacy notice:</strong> Do not include passwords, API
                keys, or private tokens in inquiries.
              </span>
            </div>

            {/* Actions */}
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
                onClick={handleRequestClose}
                disabled={submitting}
                className="btn-secondary"
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !ticketType || !message.trim()}
                className="btn-primary"
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Send size={14} />
                {submitting ? "Submitting…" : "Submit Ticket"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </dialog>
  );
}
