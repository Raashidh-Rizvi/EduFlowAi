import api from './api';

const DEFAULT_STUDENT_ID = '33333333-3333-3333-3333-333333333333';

export const gamificationService = {
  // ── Leaderboards & Standings ────────────────────────────────────────────────
  async getLeaderboard(type = 'weekly', top = 20) {
    try {
      const response = await api.get(`/gamification/leaderboard?type=${type}&top=${top}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch live leaderboard:', err);
      return [];
    }
  },

  async getSquadLeaderboard(top = 10) {
    try {
      const response = await api.get(`/gamification/squads/leaderboard?top=${top}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch squad leaderboard:', err);
      return [];
    }
  },

  // ── Team / Squad Management (Instructor & Student) ──────────────────────────
  async getAllSquads() {
    try {
      const response = await api.get('/gamification/squads');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch all squads:', err);
      return [];
    }
  },

  async getEligibleStudents() {
    try {
      const response = await api.get('/gamification/squads/eligible-students');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch eligible students:', err);
      return [];
    }
  },

  async instructorCreateSquad(payload) {
    try {
      const response = await api.post('/gamification/squads/instructor-create', payload);
      return response.data;
    } catch (err) {
      console.warn('Backend instructor squad creation fallback:', err);
      return { success: false, message: 'Failed to create squad.' };
    }
  },

  async addSquadMember(squadId, studentId) {
    try {
      const response = await api.post(`/gamification/squads/${squadId}/members?studentId=${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to add squad member:', err);
      return { success: false, message: 'Failed to add student to squad.' };
    }
  },

  async removeSquadMember(squadId, studentId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}/members/${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to remove squad member:', err);
      return { success: false, message: 'Failed to remove student from squad.' };
    }
  },

  async deleteSquad(squadId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to delete squad:', err);
      return false;
    }
  },

  // ── Badges Registry ─────────────────────────────────────────────────────────
  async getAllBadges(studentId = null) {
    try {
      const url = studentId ? `/gamification/badges?studentId=${studentId}` : '/gamification/badges';
      const response = await api.get(url);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch badges:', err);
      return [];
    }
  },

  // ── Multiplier Controls ─────────────────────────────────────────────────────
  async getXpMultiplier() {
    try {
      const response = await api.get('/gamification/multiplier');
      return response.data;
    } catch {
      return 1.0;
    }
  },

  async setXpMultiplier(multiplier) {
    try {
      const response = await api.post('/gamification/multiplier', { multiplier });
      return response.data;
    } catch {
      return multiplier;
    }
  },

  // ── Deep Work & Focus Studio ────────────────────────────────────────────────
  async recordFocusSession(sessionData) {
    try {
      const response = await api.post('/gamification/focus-session', sessionData);
      return response.data;
    } catch (err) {
      console.warn('Failed to record focus session:', err);
      return { success: false, message: 'Failed to record session.' };
    }
  },

  // ── Student Game Dashboard & Ledger ─────────────────────────────────────────
  async getGameDashboard(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.get(`/gamification/dashboard/${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch gamification dashboard:', err);
      return null;
    }
  },

  async claimDailyGrandMission(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.post(`/gamification/missions/claim-grand/${studentId}`);
      return response.data;
    } catch {
      return { success: false, message: 'Failed to claim mission.' };
    }
  },

  async getXpLedger(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.get(`/gamification/ledger/${studentId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  async useStreakFreeze(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.post(`/gamification/streak/freeze/${studentId}`);
      return response.data;
    } catch {
      return false;
    }
  },

  async getNextBestAction(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.post('/ai/next-best-action', {
        student_id: studentId,
        student_name: 'Alex Rivera',
        level: 2,
        total_xp: 660,
        streak: 3
      });
      return response.data;
    } catch {
      return null;
    }
  }
};

export default gamificationService;
