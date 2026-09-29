import api, { clearSession } from "./api";

const TOKEN_KEY = "eduflow_token";
const REFRESH_TOKEN_KEY = "eduflow_refresh_token";
const EXPIRES_KEY = "eduflow_token_expires_at";
const USER_KEY = "eduflow_user";

/**
 * Normalizes both AuthResponse (login/register/refresh) and UserProfileDto
 * (/auth/me) into the single user shape the UI consumes. The id and role always
 * originate from the backend — never from anything the client fabricates.
 */
export function toUserProfile(payload) {
  if (!payload) return null;
  const id = payload.userId || payload.id;
  return {
    userId: id,
    id,
    fullName: payload.fullName || "",
    email: payload.email || "",
    role: payload.role,
    avatarUrl: payload.avatarUrl ?? null,
    isActive: payload.isActive ?? true,
  };
}

function persistSession(authResponse) {
  if (!authResponse?.token) return null;
  localStorage.setItem(TOKEN_KEY, authResponse.token);
  if (authResponse.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
  }
  if (authResponse.expiresAt) {
    localStorage.setItem(
      EXPIRES_KEY,
      String(new Date(authResponse.expiresAt).getTime()),
    );
  }
  const profile = toUserProfile(authResponse);
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
  return profile;
}

export const authService = {
  async register(data) {
    const response = await api.post("/auth/register", data);
    return persistSession(response.data);
  },

  async login(data) {
    const response = await api.post("/auth/login", data);
    return persistSession(response.data);
  },

  /**
   * Fetches the authenticated user's profile and role from the secure backend
   * endpoint. This is the single source of truth for identity in the UI.
   */
  async getProfile() {
    const response = await api.get("/auth/me");
    const profile = toUserProfile(response.data);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    return profile;
  },

  /**
   * Strictly reads the current authenticated administrator's profile from
   * GET /api/auth/me without defaulting missing boolean/identity fields.
   * Throws if the server payload does not strictly match required shape.
   */
  async getAdminProfile() {
    const response = await api.get("/auth/me");
    const data = response?.data;
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response received from identity service.");
    }
    const id = data.id || data.userId;
    if (!id || typeof id !== "string") {
      throw new Error("Missing or invalid account ID in profile payload.");
    }
    if (typeof data.fullName !== "string") {
      throw new Error("Missing or invalid full name in profile payload.");
    }
    if (typeof data.email !== "string") {
      throw new Error("Missing or invalid email in profile payload.");
    }
    if (typeof data.role !== "string") {
      throw new Error("Missing or invalid role in profile payload.");
    }
    if (typeof data.isActive !== "boolean") {
      throw new Error("Missing or invalid isActive status in profile payload.");
    }

    return {
      id,
      userId: id,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl ?? null,
      isActive: data.isActive,
      createdAt: data.createdAt ?? null,
    };
  },

  /**
   * Re-validates the stored session against the backend on app boot.
   * Returns the server-authoritative profile, or null when the session is
   * absent/expired (in which case all local credentials are cleared).
   */
  async restoreSession() {
    if (
      !localStorage.getItem(TOKEN_KEY) &&
      !localStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
      return null;
    }
    try {
      return await this.getProfile();
    } catch {
      clearSession();
      return null;
    }
  },

  /**
   * Re-authenticates as a different persona (portal switch). The previous
   * session's refresh token is revoked only AFTER the new login succeeds, so a
   * failed switch never leaves the user silently signed out. On failure the
   * existing local session is left untouched.
   */
  async switchAccount(credentials) {
    const previousRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const profile = await this.login(credentials);
    if (
      previousRefreshToken &&
      previousRefreshToken !== localStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
      try {
        await api.post("/auth/logout", { refreshToken: previousRefreshToken });
      } catch {
        // Best effort — the replaced token still expires server-side.
      }
    }
    return profile;
  },

  /**
   * Revokes the refresh token server-side (invalidating the session's ability
   * to renew) and clears every local credential. Safe to call when signed out.
   */
  async logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // Network failure must not block local sign-out; the token still
        // expires server-side on its own schedule.
      }
    }
    clearSession();
  },

  clearSession,
};

export default authService;
