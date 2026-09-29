import api from "./api";

/**
 * Formats API errors for audit logs, handling ASP.NET problem details,
 * validation errors, and unavailable routes cleanly.
 */
export function formatAuditApiError(
  error,
  fallbackMessage = "Audit log service is not available yet.",
) {
  if (!error) return fallbackMessage;
  const data = error.response?.data;

  // ASP.NET validation errors dictionary
  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }

  // Direct error message / code
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  // 404 (unregistered route on backend) or network outage
  if (!error.response || [404, 502, 503].includes(error.response.status)) {
    return "Audit log service is not available yet.";
  }

  return error.friendlyMessage || error.message || fallbackMessage;
}

/**
 * Admin Audit Logs service contract matching AUDIT_LOGS.md specifications.
 */
export const adminAuditService = {
  async getOptions(signal) {
    const response = await api.get("/admin/audit-logs/options", { signal });
    return response.data;
  },
  /**
   * Fetches paginated audit logs with filters.
   * @param {Object} params - { page, pageSize, search, action, entityType, actorId, fromUtc, toUtc }
   * @param {AbortSignal} [signal] - optional cancellation signal
   */
  async getLogs(params = {}, signal) {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.pageSize) cleanParams.pageSize = params.pageSize;
    if (params.search && params.search.trim())
      cleanParams.search = params.search.trim();
    if (params.action && params.action !== "All")
      cleanParams.action = params.action.trim();
    if (params.entityType && params.entityType !== "All")
      cleanParams.entityType = params.entityType.trim();
    if (params.actorId && params.actorId.trim())
      cleanParams.actorId = params.actorId.trim();
    if (params.fromUtc) cleanParams.fromUtc = params.fromUtc;
    if (params.toUtc) cleanParams.toUtc = params.toUtc;

    const response = await api.get("/admin/audit-logs", {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * Fetches a single audit log detail by ID.
   * @param {string} id - audit log UUID
   * @param {AbortSignal} [signal] - optional cancellation signal
   */
  async getLog(id, signal) {
    const response = await api.get(`/admin/audit-logs/${id}`, {
      signal,
    });
    return response.data;
  },
};

export default adminAuditService;
