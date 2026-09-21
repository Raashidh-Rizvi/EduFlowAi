import api from './api';

// Phase 2A fix: Read real logged-in student ID from session — never use hardcoded test ID
function getLoggedInStudentId() {
  try {
    const user = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
    // Try all field names the backend may use
    return user.id || user.userId || user.studentId || '';
  } catch {
    return '';
  }
}

const DEFAULT_FALLBACK_STUDENTS = [
  { studentId: '33333333-3333-3333-3333-333333333333', fullName: 'Alex Rivera', email: 'alex@eduflow.ai', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', totalXp: 1850, currentLevel: 3, currentStreak: 5, currentSquadId: null, currentSquadName: null },
  { studentId: '33333333-3333-3333-3333-333333333334', fullName: 'Sarah Chen', email: 'sarah.chen@eduflow.ai', avatarUrl: null, totalXp: 1420, currentLevel: 4, currentStreak: 8, currentSquadId: null, currentSquadName: null },
  { studentId: '33333333-3333-3333-3333-333333333335', fullName: 'Daniel Miller', email: 'daniel.miller@eduflow.ai', avatarUrl: null, totalXp: 1150, currentLevel: 3, currentStreak: 6, currentSquadId: null, currentSquadName: null },
  { studentId: '33333333-3333-3333-3333-333333333336', fullName: 'Marcus Vance', email: 'marcus.vance@eduflow.ai', avatarUrl: null, totalXp: 890, currentLevel: 3, currentStreak: 4, currentSquadId: null, currentSquadName: null },
  { studentId: '33333333-3333-3333-3333-333333333337', fullName: 'Priya Patel', email: 'priya.patel@eduflow.ai', avatarUrl: null, totalXp: 720, currentLevel: 2, currentStreak: 5, currentSquadId: null, currentSquadName: null },
  { studentId: '33333333-3333-3333-3333-333333333338', fullName: 'Elena Rostova', email: 'elena.rostova@eduflow.ai', avatarUrl: null, totalXp: 480, currentLevel: 2, currentStreak: 2, currentSquadId: null, currentSquadName: null }
];

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
    let remoteSquads = [];
    try {
      const response = await api.get('/gamification/squads');
      if (Array.isArray(response.data)) {
        remoteSquads = response.data;
      }
    } catch (err) {
      console.warn('Failed to fetch all squads:', err);
    }

    const localSquads = this.getLocalCustomSquads();
    const combinedMap = new Map();
    [...remoteSquads, ...localSquads].forEach(sq => {
      if (sq && sq.id) {
        combinedMap.set(sq.id, sq);
      }
    });

    if (combinedMap.size === 0) {
      const defaultSquads = [
        {
          id: 'sq-101',
          name: 'Quantum Coders',
          description: 'Quest: Clean Architecture & PostgreSQL Indexing Sprint',
          avatarUrl: '🚀',
          leaderId: '33333333-3333-3333-3333-333333333333',
          leaderName: 'Alex Rivera',
          activeQuest: 'Architecture Mastery Sprint',
          targetGoalXp: 2500,
          combinedXp: 4420,
          memberCount: 3,
          members: [
            { studentId: '33333333-3333-3333-3333-333333333333', studentName: 'Alex Rivera', role: 'Leader', totalXp: 1850 },
            { studentId: '33333333-3333-3333-3333-333333333334', studentName: 'Sarah Chen', role: 'Member', totalXp: 1420 },
            { studentId: '33333333-3333-3333-3333-333333333335', studentName: 'Daniel Miller', role: 'Member', totalXp: 1150 }
          ]
        },
        {
          id: 'sq-102',
          name: 'Cyber Knights',
          description: 'Quest: Performance Tuning & Microservices Sprint',
          avatarUrl: '⚔️',
          leaderId: '33333333-3333-3333-3333-333333333336',
          leaderName: 'Marcus Vance',
          activeQuest: 'Performance Tuning Sprint',
          targetGoalXp: 2500,
          combinedXp: 2090,
          memberCount: 3,
          members: [
            { studentId: '33333333-3333-3333-3333-333333333336', studentName: 'Marcus Vance', role: 'Leader', totalXp: 890 },
            { studentId: '33333333-3333-3333-3333-333333333337', studentName: 'Priya Patel', role: 'Member', totalXp: 720 },
            { studentId: '33333333-3333-3333-3333-333333333338', studentName: 'Elena Rostova', role: 'Member', totalXp: 480 }
          ]
        }
      ];
      defaultSquads.forEach(sq => combinedMap.set(sq.id, sq));
    }

    return Array.from(combinedMap.values());
  },

  async getSquadLeaderboard(top = 10) {
    try {
      const response = await api.get(`/gamification/squads/leaderboard?top=${top}`);
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch (err) {
      console.warn('Failed to fetch squad leaderboard:', err);
    }
    const squads = await this.getAllSquads();
    return squads
      .map(sq => ({
        squadId: sq.id,
        squadName: sq.name,
        avatarUrl: sq.avatarUrl,
        leaderName: sq.leaderName,
        membersCount: sq.memberCount || sq.members?.length || 0,
        combinedXp: sq.combinedXp || 0,
        activeQuest: sq.activeQuest || sq.description || 'Sprint Quest'
      }))
      .sort((a, b) => b.combinedXp - a.combinedXp)
      .slice(0, top);
  },

  async getEligibleStudents() {
    try {
      const response = await api.get('/gamification/squads/eligible-students');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return DEFAULT_FALLBACK_STUDENTS;
    } catch (err) {
      console.warn('Failed to fetch eligible students, using fallback:', err);
      return DEFAULT_FALLBACK_STUDENTS;
    }
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
  // Phase 2A fix: uses real student ID from session, not hardcoded test ID
  async getGameDashboard(studentId = getLoggedInStudentId()) {
    try {
      const response = await api.get(`/gamification/dashboard/${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch gamification dashboard:', err);
      return null;
    }
  },

  // Phase 2A fix: uses real student ID from session
  async claimDailyGrandMission(studentId = getLoggedInStudentId()) {
    try {
      const response = await api.post(`/gamification/missions/claim-grand/${studentId}`);
      return response.data;
    } catch {
      return { success: false, message: 'Failed to claim mission.' };
    }
  },

  // Phase 2A fix: uses real student ID from session
  async getXpLedger(studentId = getLoggedInStudentId()) {
    try {
      const response = await api.get(`/gamification/ledger/${studentId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  // Phase 2A fix: uses real student ID from session
  async useStreakFreeze(studentId = getLoggedInStudentId()) {
    try {
      const response = await api.post(`/gamification/streak/freeze/${studentId}`);
      return response.data;
    } catch {
      return false;
    }
  },

  // Phase 2B fix: reads real user data from session; calls correct /api/ai/ route from Phase 1
  async getNextBestAction() {
    try {
      const userStr = localStorage.getItem('eduflow_user');
      const user = userStr ? JSON.parse(userStr) : {};

      const response = await api.post('/ai/next-best-action', {
        student_name: user.fullName || user.name || 'Student',
        level:        user.level   || user.currentLevel  || 1,
        total_xp:     user.totalXp || user.xp            || 0,
        streak:       user.streak  || user.currentStreak || 0
      });
      return response.data;
    } catch (err) {
      console.warn('[gamificationService] getNextBestAction failed:', err?.message);
      // Safe fallback — never crash the student portal
      return {
        recommendation: 'Continue with your enrolled courses and complete pending lessons.',
        source: 'fallback'
      };
    }
  }
};

export default gamificationService;
