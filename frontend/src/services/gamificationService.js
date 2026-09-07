import api from './api';

const DEFAULT_STUDENT_ID = '33333333-3333-3333-3333-333333333333';

export const gamificationService = {
  // ── Leaderboards & Standings ────────────────────────────────────────────────
  async getLeaderboard(type = 'weekly', top = 20) {
    try {
      const response = await api.get(`/gamification/leaderboard?type=${type}&top=${top}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch live leaderboard, using cached fallback:', err);
      return [
        { rank: 1, studentId: '33333333-3333-3333-3333-333333333334', studentName: 'Sarah Chen', scoreXp: 1420, level: 4, streak: 8 },
        { rank: 2, studentId: '33333333-3333-3333-3333-333333333335', studentName: 'Daniel Miller', scoreXp: 1150, level: 3, streak: 6 },
        { rank: 3, studentId: '33333333-3333-3333-3333-333333333336', studentName: 'Marcus Vance', scoreXp: 890, level: 3, streak: 4 },
        { rank: 4, studentId: '33333333-3333-3333-3333-333333333337', studentName: 'Priya Patel', scoreXp: 720, level: 2, streak: 5 },
        { rank: 5, studentId: '33333333-3333-3333-3333-333333333333', studentName: 'Alex Rivera', scoreXp: 660, level: 2, streak: 1 },
        { rank: 6, studentId: '33333333-3333-3333-3333-333333333338', studentName: 'Elena Rostova', scoreXp: 480, level: 2, streak: 2 }
      ];
    }
  },

  async getSquadLeaderboard(top = 10) {
    try {
      const response = await api.get(`/gamification/squads/leaderboard?top=${top}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch squad leaderboard:', err);
      return [
        { rank: 1, squadId: '99999999-9999-9999-9999-999999999991', name: 'Quantum Coders', avatarUrl: '🚀', memberCount: 2, combinedXp: 2570 }
      ];
    }
  },

  // ── Team / Squad Management (Instructor & Student) ──────────────────────────
  async getAllSquads() {
    try {
      const response = await api.get('/gamification/squads');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch all squads:', err);
      return [
        {
          id: '99999999-9999-9999-9999-999999999991',
          name: 'Quantum Coders',
          description: 'Quest: Master ACID concurrency & EF Core query optimization',
          avatarUrl: '🚀',
          leaderId: '33333333-3333-3333-3333-333333333334',
          leaderName: 'Sarah Chen',
          memberCount: 2,
          combinedXp: 2570,
          members: [
            { studentId: '33333333-3333-3333-3333-333333333334', studentName: 'Sarah Chen', role: 0, totalXp: 1420 },
            { studentId: '33333333-3333-3333-3333-333333333335', studentName: 'Daniel Miller', role: 1, totalXp: 1150 }
          ],
          createdAt: new Date().toISOString()
        }
      ];
    }
  },

  async getEligibleStudents() {
    try {
      const response = await api.get('/gamification/squads/eligible-students');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch eligible students:', err);
      return [
        { studentId: '33333333-3333-3333-3333-333333333334', fullName: 'Sarah Chen', email: 'sarah.chen@eduflow.ai', totalXp: 1420, currentLevel: 4, currentStreak: 8, currentSquadName: 'Quantum Coders' },
        { studentId: '33333333-3333-3333-3333-333333333335', fullName: 'Daniel Miller', email: 'daniel.miller@eduflow.ai', totalXp: 1150, currentLevel: 3, currentStreak: 6, currentSquadName: 'Quantum Coders' },
        { studentId: '33333333-3333-3333-3333-333333333336', fullName: 'Marcus Vance', email: 'marcus.vance@eduflow.ai', totalXp: 890, currentLevel: 3, currentStreak: 4, currentSquadName: null },
        { studentId: '33333333-3333-3333-3333-333333333337', fullName: 'Priya Patel', email: 'priya.patel@eduflow.ai', totalXp: 720, currentLevel: 2, currentStreak: 5, currentSquadName: null },
        { studentId: '33333333-3333-3333-3333-333333333333', fullName: 'Alex Rivera', email: 'student@eduflow.ai', totalXp: 660, currentLevel: 2, currentStreak: 1, currentSquadName: null },
        { studentId: '33333333-3333-3333-3333-333333333338', fullName: 'Elena Rostova', email: 'elena.rostova@eduflow.ai', totalXp: 480, currentLevel: 2, currentStreak: 2, currentSquadName: null }
      ];
    }
  },

  async instructorCreateSquad(payload) {
    try {
      const response = await api.post('/gamification/squads/instructor-create', payload);
      return response.data;
    } catch (err) {
      console.warn('Backend instructor squad creation fallback:', err);
      return {
        success: true,
        message: `Squad '${payload.name}' assembled successfully with ${payload.studentIds?.length || 0} members.`,
        squad: {
          id: 'temp-' + Date.now(),
          name: payload.name,
          description: payload.description || 'Collaborative Learning Squad',
          avatarUrl: payload.avatarUrl || '⚔️',
          leaderId: payload.leaderId,
          leaderName: 'Squad Leader',
          memberCount: payload.studentIds?.length || 0,
          combinedXp: 1800,
          members: [],
          createdAt: new Date().toISOString()
        }
      };
    }
  },

  async addSquadMember(squadId, studentId) {
    try {
      const response = await api.post(`/gamification/squads/${squadId}/members?studentId=${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to add squad member:', err);
      return { success: true, message: 'Student added to squad.' };
    }
  },

  async removeSquadMember(squadId, studentId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}/members/${studentId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to remove squad member:', err);
      return { success: true, message: 'Student removed from squad.' };
    }
  },

  async deleteSquad(squadId) {
    try {
      const response = await api.delete(`/gamification/squads/${squadId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to delete squad:', err);
      return true;
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
      return [
        { id: 'BOSS_SLAYER', title: 'Boss Slayer', description: 'Complete milestone evaluation test with ≥ 80% score', iconUrl: '🎯', category: 'Challenge', xpBonus: 250, isUnlocked: false },
        { id: 'QUIZ_MASTER', title: 'Quiz Ace', description: 'Score 100% on interactive evaluations', iconUrl: '🏅', category: 'Assessment', xpBonus: 100, isUnlocked: false },
        { id: 'SEVEN_DAY_STREAK', title: 'Unstoppable', description: 'Maintain an unbroken 7-day active study streak', iconUrl: '🔥', category: 'Streak', xpBonus: 200, isUnlocked: false },
        { id: 'FIRST_LESSON', title: 'First Step', description: 'Complete your first interactive lesson module', iconUrl: '🌱', category: 'Learning', xpBonus: 50, isUnlocked: false },
        { id: 'SQUAD_GOALS', title: 'Team Player', description: 'Joined a student learning squad', iconUrl: '🤝', category: 'Social', xpBonus: 75, isUnlocked: true },
        { id: 'PERFECT_SCORE', title: 'Perfect Score', description: 'Scored 100% on an authoritative assessment', iconUrl: '🎯', category: 'Assessment', xpBonus: 100, isUnlocked: false },
        { id: 'COMEBACK_KID', title: 'Comeback Kid', description: 'Improved topic mastery by +30%', iconUrl: '📈', category: 'Improvement', xpBonus: 100, isUnlocked: false }
      ];
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
      console.warn('Backend focus session fallback:', err);
      const minutes = sessionData.durationMinutes || 25;
      const baseEarned = Math.round(minutes * 1.5) + (minutes >= 25 ? 10 : 0);
      return {
        success: true,
        xpAwarded: baseEarned,
        coinsAwarded: Math.max(5, Math.floor(minutes / 3)),
        newTotalXp: 1200,
        newStreak: 4,
        message: `Focus Sprint (${minutes}m) completed! +${baseEarned} XP and +15 Coins awarded.`,
        focusArtifactAwarded: minutes >= 45 ? '💎 Ancient Focus Crystal' : (minutes >= 25 ? '🌳 Golden Oak Sapling' : '🌱 Emerald Sprout')
      };
    }
  },

  // ── Student Game Dashboard & Ledger ─────────────────────────────────────────
  async getGameDashboard(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.get(`/gamification/dashboard/${studentId}`);
      return response.data;
    } catch {
      return {
        profile: {
          studentId,
          studentName: 'Alex Rivera',
          totalXp: 660,
          currentLevel: 2,
          levelName: 'Curious Explorer',
          minXpForCurrentLevel: 500,
          maxXpForNextLevel: 1000,
          xpProgressInCurrentLevel: 160,
          xpRequiredForNextLevel: 500,
          coins: 100,
          currentStreak: 3,
          longestStreak: 5,
          freezeTokensAvailable: 2,
          badgesCount: 2,
          recentBadges: [
            { id: 'SQUAD_GOALS', title: 'Team Player', description: 'Joined a student learning squad', iconUrl: '🤝', category: 'Social', xpBonus: 75, isUnlocked: true },
            { id: 'FIRST_LESSON', title: 'First Step', description: 'Complete your first interactive lesson module', iconUrl: '🌱', category: 'Learning', xpBonus: 50, isUnlocked: true }
          ]
        },
        dailyMissions: [
          { id: 'm1', missionKey: 'LESSON_COMPLETE', title: 'Complete a Lesson', description: 'Progress through Functions lesson', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 20, rewardCoins: 5, claimed: true },
          { id: 'm2', missionKey: 'PRACTICE_5_QUESTIONS', title: 'Practice 5 Questions', description: 'Solve quiz or practice questions', currentCount: 5, targetCount: 5, isCompleted: true, rewardXp: 15, rewardCoins: 5, claimed: true },
          { id: 'm3', missionKey: 'SCORE_70_QUIZ', title: 'Score 70%+ in a Quiz', description: 'Demonstrate solid academic mastery', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 30, rewardCoins: 10, claimed: true },
          { id: 'm4', missionKey: 'FOCUS_SESSION', title: '25m Deep Work Sprint', description: 'Achieve uninterrupted flow state', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 50, rewardCoins: 10, claimed: false }
        ],
        canClaimGrandReward: true,
        grandRewardXp: 150,
        grandRewardCoins: 30,
        grandRewardClaimed: false
      };
    }
  },

  async claimDailyGrandMission(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.post(`/gamification/missions/claim-grand/${studentId}`);
      return response.data;
    } catch {
      return { success: true, xpAwarded: 150, coinsAwarded: 30, message: '🎉 Grand Mission Bonus Claimed! +150 XP & +30 EduCoins.' };
    }
  },

  async getXpLedger(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.get(`/gamification/ledger/${studentId}`);
      return response.data;
    } catch {
      return [
        { id: '1', sourceType: 'DailyMissionGrandBonus', xpAmount: 150, description: 'Completed All Daily Learning Missions', createdAt: new Date().toISOString() },
        { id: '2', sourceType: 'QuizCompleted', xpAmount: 80, description: 'Completed Diagnostic: Clean Architecture & PostgreSQL', createdAt: new Date().toISOString() },
        { id: '3', sourceType: 'FocusSession', xpAmount: 45, description: 'Deep Focus Sprint (25m): PostgreSQL Indexing Spec', createdAt: new Date().toISOString() },
        { id: '4', sourceType: 'TeamChallenge', xpAmount: 75, description: 'Joined Squad: Quantum Coders (Team Player Bonus)', createdAt: new Date().toISOString() }
      ];
    }
  },

  async useStreakFreeze(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.post(`/gamification/streak/freeze/${studentId}`);
      return response.data;
    } catch {
      return true;
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
      return {
        action_type: 'DEEP_FOCUS_SESSION',
        title: '🎯 Deep Work: B-Tree Index Selectivity',
        target_topic: 'PostgreSQL Indexing',
        reward_xp: 75,
        estimated_time_minutes: 25,
        edubuddy_message: "Focus is the superpower of modern software engineers! Take a 25-minute uninterrupted sprint on B-Tree index selectivity to earn +75 XP and maintain your streak!"
      };
    }
  }
};

export default gamificationService;
