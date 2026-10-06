import api from "./api";

/**
 * UUID generator for clientRequestId and idempotency keys.
 */
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts a clear error message from an API response, handling ASP.NET
 * ValidationProblemDetails, error codes, and unavailable endpoints honestly.
 */
export function formatApiError(
  error,
  fallbackMessage = "Support service is not available yet.",
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
    return "Support service is not available yet.";
  }

  return error.friendlyMessage || error.message || fallbackMessage;
}

/**
 * Support Ticket service contract matching SUPPORT_DESK.md specifications.
 */
export const supportService = {
  /**
   * Create a new support ticket (Student or Instructor).
   * @param {{ type: string, message: string, clientRequestId: string }} payload
   */
  async createTicket(payload) {
    const response = await api.post("/support/tickets", payload);
    return response.data;
  },

  /**
   * List paginated tickets owned by the authenticated caller.
   * @param {{ page?: number, pageSize?: number, type?: string, status?: string }} params
   * @param {AbortSignal} [signal]
   */
  async getMyTickets(params = {}, signal) {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.pageSize) cleanParams.pageSize = params.pageSize;
    if (params.type && params.type !== "All") cleanParams.type = params.type;
    if (params.status && params.status !== "All")
      cleanParams.status = params.status;

    const response = await api.get("/support/tickets", {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * Inspect a single owned support ticket with full response thread.
   * @param {string} id - Ticket UUID
   * @param {AbortSignal} [signal]
   */
  async getMyTicket(id, signal) {
    const response = await api.get(`/support/tickets/${id}`, { signal });
    return response.data;
  },

  /**
   * Admin: List and filter all support tickets.
   * @param {{ page?: number, pageSize?: number, search?: string, type?: string, status?: string }} params
   * @param {AbortSignal} [signal]
   */
  async getAdminTickets(params = {}, signal) {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.pageSize) cleanParams.pageSize = params.pageSize;
    if (params.search && params.search.trim())
      cleanParams.search = params.search.trim();
    if (params.type && params.type !== "All") cleanParams.type = params.type;
    if (params.status && params.status !== "All")
      cleanParams.status = params.status;

    const response = await api.get("/admin/support-tickets", {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * Admin: Retrieve detail of any ticket including submitter identity and responses.
   * @param {string} id - Ticket UUID
   * @param {AbortSignal} [signal]
   */
  async getAdminTicket(id, signal) {
    const response = await api.get(`/admin/support-tickets/${id}`, { signal });
    return response.data;
  },

  /**
   * Admin: Progress, reply to, or resolve a support ticket.
   * @param {string} id - Ticket UUID
   * @param {{ status?: string, responseMessage?: string, expectedVersion: string }} payload
   */
  async updateAdminTicket(id, payload) {
    const response = await api.put(`/admin/support-tickets/${id}`, payload);
    return response.data;
  },
};

export default supportService;
