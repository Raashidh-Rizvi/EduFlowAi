import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Shield,
  Mail,
  User,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  KeyRound,
  Lock,
} from "lucide-react";
import authService from "../../services/authService";
import { Avatar, SectionHeading, ErrorBanner } from "../Instructor/shared";

function SkeletonCard({ title, icon: Icon }) {
  return (
    <div
      className="card-premium"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "14px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-canvas)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color="var(--text-muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: "16px",
              width: "140px",
              backgroundColor: "var(--border-subtle)",
              borderRadius: "4px",
              marginBottom: "6px",
            }}
          />
          <div
            style={{
              height: "12px",
              width: "180px",
              backgroundColor: "var(--border-subtle)",
              borderRadius: "4px",
              opacity: 0.6,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div
          style={{
            height: "38px",
            width: "100%",
            backgroundColor: "var(--bg-canvas)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
          }}
        />
        <div
          style={{
            height: "38px",
            width: "60%",
            backgroundColor: "var(--bg-canvas)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
          }}
        />
      </div>
    </div>
  );
}

export default function AdminProfile({ currentUser, onSessionRevalidate }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [accessChanged, setAccessChanged] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTimeoutRef = useRef(null);
  const isAliveRef = useRef(true);

  const currentUserId = currentUser?.userId || currentUser?.id;

  const loadProfile = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);
    setAccessChanged(false);

    try {
      const data = await authService.getAdminProfile();

      if (!isAliveRef.current) return;

      // Verify that the authenticated account is an active Administrator
      if (data.role !== "Admin" || data.isActive !== true) {
        setAccessChanged(true);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (err) {
      if (!isAliveRef.current) return;
      const msg =
        err?.response?.data?.message ||
        err?.friendlyMessage ||
        err?.message ||
        "Could not load administrator personal details from server.";
      setErrorMessage(msg);
      setProfile(null);
    } finally {
      if (isAliveRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isAliveRef.current = true;
    loadProfile(false);

    return () => {
      isAliveRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [currentUserId, loadProfile]);

  const handleCopyId = useCallback(async () => {
    if (!profile?.id) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.id);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = profile.id;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Fallback gracefully without breaking or throwing
      console.warn("Failed to copy account ID to clipboard");
    }
  }, [profile?.id]);

  // Session-changed or inactive response: hide Admin details to maintain security
  if (accessChanged) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <SectionHeading
          title="Personal Details"
          subtitle="Authenticated administrator personal, account, and system details"
          actions={
            <button
              className="btn-secondary"
              onClick={() => loadProfile(true)}
              disabled={isRefreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              Re-verify
            </button>
          }
        />

        <div
          className="card-premium"
          style={{
            padding: "44px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            maxWidth: "600px",
            margin: "24px auto",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent-soft)",
              border: "1px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldAlert size={28} color="var(--accent)" />
          </div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            Session Authorization Changed
          </h3>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "460px",
            }}
          >
            The live identity record returned from the authentication server is
            either inactive or no longer holds administrator privileges. Admin
            profile details are hidden to maintain system security.
          </p>
          {onSessionRevalidate && (
            <button
              className="btn-primary"
              onClick={onSessionRevalidate}
              style={{
                marginTop: "8px",
                padding: "8px 18px",
                fontSize: "13px",
              }}
            >
              Revalidate Session
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SectionHeading
        title="Personal Details"
        subtitle="Authenticated administrator personal, account, and system details"
        actions={
          <button
            className="btn-secondary"
            onClick={() => loadProfile(true)}
            disabled={isLoading || isRefreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      <ErrorBanner message={errorMessage} onRetry={() => loadProfile(false)} />

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          <SkeletonCard title="Personal Information" icon={User} />
          <SkeletonCard title="Account Information" icon={Shield} />
          <SkeletonCard title="System Information" icon={KeyRound} />
        </div>
      ) : profile ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            {/* Card 1: Personal Information */}
            <div
              className="card-premium"
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--primary-soft)",
                    border: "1px solid var(--primary-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={18} color="var(--primary)" />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Personal Information
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: "2px 0 0",
                    }}
                  >
                    Administrator identity and avatar
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  flexWrap: "wrap",
                }}
              >
                <Avatar
                  name={profile.fullName}
                  url={profile.avatarUrl}
                  size={72}
                  color="var(--accent)"
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                    }}
                  >
                    Full Name
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                      wordBreak: "break-word",
                    }}
                  >
                    {profile.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    {profile.avatarUrl
                      ? "Custom avatar image"
                      : "System-generated initials fallback"}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Account Information */}
            <div
              className="card-premium"
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--primary-soft)",
                    border: "1px solid var(--primary-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield size={18} color="var(--primary)" />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Account Information
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: "2px 0 0",
                    }}
                  >
                    Email address and platform governance role
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                      wordBreak: "break-all",
                    }}
                  >
                    <Mail
                      size={15}
                      color="var(--primary)"
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "600",
                        color: "var(--text-main)",
                      }}
                    >
                      {profile.email}
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Assigned Role
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="badge-pill"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-border)",
                      }}
                    >
                      <ShieldCheck size={14} />
                      {profile.role}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Full platform administration privilege
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: System Information */}
            <div
              className="card-premium"
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--primary-soft)",
                    border: "1px solid var(--primary-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <KeyRound size={18} color="var(--primary)" />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    System Information
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: "2px 0 0",
                    }}
                  >
                    Unique identifier, account status, and metadata
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Account ID (UUID)
                    </span>
                    {copied && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "var(--success)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Check size={12} /> Copied!
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "12px",
                        color: "var(--text-main)",
                        wordBreak: "break-all",
                      }}
                    >
                      {profile.id}
                    </div>
                    <button
                      onClick={handleCopyId}
                      className="btn-secondary"
                      title="Copy Account UUID"
                      aria-label="Copy Account UUID to clipboard"
                      style={{
                        padding: "8px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      {copied ? (
                        <Check size={14} color="var(--success)" />
                      ) : (
                        <Copy size={14} />
                      )}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Account Status
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {profile.isActive ? (
                      <span
                        className="badge-pill badge-success"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          fontSize: "12px",
                        }}
                      >
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span
                        className="badge-pill badge-danger"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          fontSize: "12px",
                        }}
                      >
                        <XCircle size={13} /> Suspended
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {profile.isActive
                        ? "Account is verified and authorized"
                        : "Account access is currently restricted"}
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Account Created
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Calendar size={14} color="var(--text-muted)" />
                    <span style={{ fontStyle: "italic" }}>
                      Not available from the current profile API
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Access Notice */}
          <div
            className="card-premium"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <Lock
              size={16}
              color="var(--primary)"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  marginBottom: "2px",
                }}
              >
                Security & Access Governance
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Personal details are read directly from the authenticated
                identity endpoint (
                <code
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11.5px",
                  }}
                >
                  GET /api/auth/me
                </code>
                ). Password hashes, JWT tokens, and credentials are strictly
                protected and never exposed. Role assignment and status
                modifications are managed through platform governance.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
