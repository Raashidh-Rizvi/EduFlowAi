import api from './api';

/**
 * Gamification API client.
 *
 * History: this service used to swallow every failing squad call and write a
 * fabricated squad into `localStorage` (`eduflow_custom_squads`) so the UI could
 * toast "created successfully". That made the console look live while the real
 * database stayed empty. Every mutation below now propagates the API error so
 * the caller can show the truth.
 */

// ── Session helpers ──────────────────────────────────────────────────────────

function readSessionUser() {
  try {
    return JSON.parse(localStorage.getItem('eduflow_user') || '{}');
  } catch {
    return {};
  }
}

export function getLoggedInStudentId() {
  const user = readSessionUser();
  return user.id || user.userId || user.studentId || '';
}

export function getLoggedInRole() {
  return readSessionUser().role || '';
}

export function isStaffRole(role = getLoggedInRole()) {
  return role === 'Admin' || role === 'Instructor';
}

/** Axios errors are noisy; surface the API's own message when there is one. */
function toApiError(err, fallback) {
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message;
  const error = new Error(message || fallback);
  error.status = err?.response?.status;
  return error;
}

export const gamificationService = {
  // ── Leaderboards & Standings ────────────────────────────────────────────────
  async getLeaderboard(type = 'weekly', top = 20) {
    const response = await api.get(`/gamification/leaderboard?type=${type}&top=${top}`);
    return response.data;
  },

  async getSquadLeaderboard(top = 10) {
    const response = await api.get(`/gamification/squads/leaderboard?top=${top}`);
    return response.data;
  },

  async getEligibleStudents() {
    const response = await api.get('/gamification/squads/eligible-students');
    return response.data;
  },

  // ── Team / Squad Management (Instructor & Admin) ────────────────────────────
  async getAllSquads() {
    const response = await api.get('/gamification/squads');
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Creates a squad server-side. Throws when the API rejects it. */
  async instructorCreateSquad(payload) {
    try {
      const response = await api.post('/gamification/squads/instructor-create', payload);
      return response.data;
    } catch (err) {
      throw toApiError(err, 'Squad creation failed.');
    }
  },

  async addSquadMember(squadId, studentId) {
    try {
      const response = await api.post(`/gamification/squads/${squadId}/members?studentId=${studentId}`);
      return response.data;
    } catch (err) {
      throw toApiError(err, 'Could not add the student to this squad.');
    }
  },

  async removeSquadMember(squadId, studentId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}/members/${studentId}`);
      return response.data;
    } catch (err) {
      throw toApiError(err, 'Could not remove the student from this squad.');
    }
  },

  async deleteSquad(squadId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}`);
      return response.data;
    } catch (err) {
      throw toApiError(err, 'Could not disband this squad.');
    }
  },

  // ── Quest courses (real learning content the quests point at) ──────────────
  /**
   * Courses a quest can bind to. `GET /courses` is already role-scoped by the
   * API: instructors see their own courses (incl. drafts), students and anon
   * see published ones, admins see everything.
   */
  async getQuestCourses() {
    const response = await api.get('/courses');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Real XP value of a course (course reward, or lessons + quizzes when the
   * course has no explicit reward). Used as the squad quest target so the goal
   * is derived from content instead of a hard-coded 2500.
   */
  async getCourseXpSummary(courseId) {
    if (!courseId) return null;
    const response = await api.get(`/courses/${courseId}/xp-summary`);
    return response.data;
  },

  // ── Badges Registry ─────────────────────────────────────────────────────────
  async getAllBadges(studentId = null) {
    const url = studentId ? `/gamification/badges?studentId=${studentId}` : '/gamification/badges';
    const response = await api.get(url);
    return response.data;
  },

  // ── Multiplier Controls ─────────────────────────────────────────────────────
  async getXpMultiplier() {
    const response = await api.get('/gamification/multiplier');
    return response.data;
  },

  /** Admin-only on the backend (403 for anyone else). Propagates that failure. */
  async setXpMultiplier(multiplier) {
    try {
      const response = await api.post('/gamification/multiplier', { multiplier });
      return response.data;
    } catch (err) {
      throw toApiError(err, 'The XP multiplier can only be changed by an administrator.');
    }
  },

  // ── Deep Work & Focus Studio ────────────────────────────────────────────────
  async recordFocusSession(sessionData) {
    const response = await api.post('/gamification/focus-session', sessionData);
    return response.data;
  },

  // ── Student Game Dashboard & Ledger ─────────────────────────────────────────
  async getGameDashboard(studentId = getLoggedInStudentId()) {
    const response = await api.get(`/gamification/dashboard/${studentId}`);
    return response.data;
  },

  async claimDailyGrandMission(studentId = getLoggedInStudentId()) {
    const response = await api.post(`/gamification/missions/claim-grand/${studentId}`);
    return response.data;
  },

  /** Self-only ledger for the signed-in learner. */
  async getXpLedger(studentId = getLoggedInStudentId()) {
    const response = await api.get(`/gamification/ledger/${studentId}`);
    return response.data;
  },

  /**
   * Cohort-wide ledger for the staff console. The self-only route above returns
   * the staffer's own (usually empty) transactions, which is why the ledger tab
   * used to render nothing. Admin/Instructor only — the API returns 403 otherwise.
   */
  async getCohortLedger(limit = 60) {
    try {
      const response = await api.get(`/gamification/ledger?limit=${Math.min(limit, 200)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      throw toApiError(err, 'The cohort ledger is only available to instructors and administrators.');
    }
  },

  async useStreakFreeze(studentId = getLoggedInStudentId()) {
    const response = await api.post(`/gamification/streak/freeze/${studentId}`);
    return response.data;
  },

  // Phase 2B fix: reads real user data from session; calls correct /api/ai/ route from Phase 1
  async getNextBestAction() {
    const user = readSessionUser();

    const response = await api.post('/ai/next-best-action', {
      student_name: user.fullName || user.name || 'Student',
      level:        user.level   || user.currentLevel  || 1,
      total_xp:     user.totalXp || user.xp            || 0,
      streak:       user.streak  || user.currentStreak || 0
    });
    return response.data;
  }
};

export default gamificationService;
