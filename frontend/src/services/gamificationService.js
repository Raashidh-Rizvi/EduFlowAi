import api from './api';

// Phase 2A fix: Read real logged-in student ID from session — never use hardcoded test ID
function getLoggedInStudentId() {
  try {
    const user = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
    return user.id || user.userId || user.studentId || '';
  } catch {
    return '';
  }
}

export const gamificationService = {
  // ── Leaderboards & Standings ────────────────────────────────────────────────
  async getLeaderboard(type = 'weekly', top = 20) {
    const response = await api.get(`/gamification/leaderboard?type=${type}&top=${top}`);
    return response.data;
  },

  // ── Team / Squad Management (Instructor & Student) ──────────────────────────
  getLocalCustomSquads() {
    try {
      const stored = localStorage.getItem('eduflow_custom_squads');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveLocalCustomSquad(squad) {
    try {
      const existing = this.getLocalCustomSquads();
      const updated = [squad, ...existing.filter(s => s.id !== squad.id)];
      localStorage.setItem('eduflow_custom_squads', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving squad:', e);
    }
  },

  removeLocalCustomSquad(squadId) {
    try {
      const existing = this.getLocalCustomSquads();
      const updated = existing.filter(s => s.id !== squadId);
      localStorage.setItem('eduflow_custom_squads', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed removing squad:', e);
    }
  },

  async getAllSquads() {
    const response = await api.get('/gamification/squads');
    const remoteSquads = Array.isArray(response.data) ? response.data : [];
    return remoteSquads;
  },

  async getSquadLeaderboard(top = 10) {
    const response = await api.get(`/gamification/squads/leaderboard?top=${top}`);
    return response.data;
  },

  async getEligibleStudents() {
    const response = await api.get('/gamification/squads/eligible-students');
    return response.data;
  },

  async instructorCreateSquad(payload) {
    let remoteRes = null;
    try {
      const response = await api.post('/gamification/squads/instructor-create', payload);
      if (response.data && response.data.success) {
        remoteRes = response.data;
      }
    } catch (err) {
      console.warn('Backend instructor squad creation fallback:', err);
    }

    // Build enriched local squad object
    const studentList = await this.getEligibleStudents();
    const selectedIds = payload.studentIds || [];
    const leaderId = payload.leaderId || selectedIds[0];
    
    let leaderName = 'Student Leader';
    let combinedXp = 0;

    const members = selectedIds.map(id => {
      const found = studentList.find(st => (st.studentId || st.id || st.userId) === id);
      const name = found ? (found.fullName || found.name) : 'Student';
      const xp = found ? (found.totalXp ?? found.totalXP ?? 500) : 500;
      combinedXp += xp;
      if (id === leaderId) leaderName = name;
      return {
        studentId: id,
        studentName: name,
        role: id === leaderId ? 'Leader' : 'Member',
        totalXp: xp
      };
    });

    const newSquad = {
      id: remoteRes?.squad?.id || ('squad-' + Date.now()),
      name: payload.name,
      description: payload.description || `Quest: ${payload.activeQuest || 'Sprint'}`,
      avatarUrl: payload.avatarUrl || '🚀',
      leaderId: leaderId,
      leaderName: leaderName,
      activeQuest: payload.activeQuest || 'Architecture Mastery Sprint',
      targetGoalXp: payload.targetGoalXp || 2500,
      combinedXp: combinedXp,
      memberCount: members.length,
      members: members
    };

    this.saveLocalCustomSquad(newSquad);

    return {
      success: true,
      message: `Squad '${payload.name}' created successfully.`,
      squad: newSquad
    };
  },

  async addSquadMember(squadId, studentId) {
    try {
      const response = await api.post(`/gamification/squads/${squadId}/members?studentId=${studentId}`);
      if (response.data && response.data.success) return response.data;
    } catch (err) {
      console.warn('Failed to add squad member remote:', err);
    }
    // Update local squad
    const squads = this.getLocalCustomSquads();
    const sq = squads.find(s => s.id === squadId);
    if (sq) {
      const studentList = await this.getEligibleStudents();
      const st = studentList.find(s => (s.studentId || s.id || s.userId) === studentId);
      const name = st ? (st.fullName || st.name) : 'Student';
      const xp = st ? (st.totalXp ?? st.totalXP ?? 500) : 500;
      if (!(sq.members || []).some(m => m.studentId === studentId)) {
        sq.members = sq.members || [];
        sq.members.push({ studentId, studentName: name, role: 'Member', totalXp: xp });
        sq.memberCount = sq.members.length;
        sq.combinedXp = (sq.combinedXp || 0) + xp;
        this.saveLocalCustomSquad(sq);
      }
    }
    return { success: true, message: 'Student added to squad.' };
  },

  async removeSquadMember(squadId, studentId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}/members/${studentId}`);
      if (response.data && response.data.success) return response.data;
    } catch (err) {
      console.warn('Failed to remove squad member remote:', err);
    }
    const squads = this.getLocalCustomSquads();
    const sq = squads.find(s => s.id === squadId);
    if (sq && sq.members) {
      const removed = sq.members.find(m => m.studentId === studentId);
      sq.members = sq.members.filter(m => m.studentId !== studentId);
      sq.memberCount = sq.members.length;
      if (removed) sq.combinedXp = Math.max(0, (sq.combinedXp || 0) - (removed.totalXp || 0));
      this.saveLocalCustomSquad(sq);
    }
    return { success: true, message: 'Student removed from squad.' };
  },

  async deleteSquad(squadId) {
    try {
      await api.delete(`/gamification/squads/${squadId}`);
    } catch (err) {
      console.warn('Failed to delete squad remote:', err);
    }
    this.removeLocalCustomSquad(squadId);
    return true;
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

  async setXpMultiplier(multiplier) {
    const response = await api.post('/gamification/multiplier', { multiplier });
    return response.data;
  },

  // ── Deep Work & Focus Studio ────────────────────────────────────────────────
  async recordFocusSession(sessionData) {
    const response = await api.post('/gamification/focus-session', sessionData);
    return response.data;
  },

  // ── Student Game Dashboard & Ledger ─────────────────────────────────────────
  // Phase 2A fix: uses real student ID from session, not hardcoded test ID
  async getGameDashboard(studentId = getLoggedInStudentId()) {
    const response = await api.get(`/gamification/dashboard/${studentId}`);
    return response.data;
  },

  // Phase 2A fix: uses real student ID from session
  async claimDailyGrandMission(studentId = getLoggedInStudentId()) {
    const response = await api.post(`/gamification/missions/claim-grand/${studentId}`);
    return response.data;
  },

  // Phase 2A fix: uses real student ID from session
  async getXpLedger(studentId = getLoggedInStudentId()) {
    const response = await api.get(`/gamification/ledger/${studentId}`);
    return response.data;
  },

  // Phase 2A fix: uses real student ID from session
  async useStreakFreeze(studentId = getLoggedInStudentId()) {
    const response = await api.post(`/gamification/streak/freeze/${studentId}`);
    return response.data;
  },

  // Phase 2B fix: reads real user data from session; calls correct /api/ai/ route from Phase 1
  async getNextBestAction() {
    const userStr = localStorage.getItem('eduflow_user');
    const user = userStr ? JSON.parse(userStr) : {};

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
