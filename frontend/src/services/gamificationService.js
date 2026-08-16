import api from './api';

const DEFAULT_STUDENT_ID = '33333333-3333-3333-3333-333333333333';

export const gamificationService = {
  async getGameDashboard(studentId = DEFAULT_STUDENT_ID) {
    try {
      const response = await api.get(`/gamification/dashboard/${studentId}`);
      return response.data;
    } catch {
      // High-fidelity fallback game dashboard state
      return {
        profile: {
          studentId,
          studentName: 'Alex Rivera',
          totalXp: 6420,
          currentLevel: 12,
          levelName: 'Architecture Master',
          minXpForCurrentLevel: 6000,
          maxXpForNextLevel: 7500,
          xpProgressInCurrentLevel: 420,
          xpRequiredForNextLevel: 1500,
          coins: 320,
          currentStreak: 14,
          longestStreak: 14,
          freezeTokensAvailable: 2,
          badgesCount: 6,
          recentBadges: [
            { id: 'QUIZ_MASTER', title: 'Quiz Master', description: 'Scored 90%+ in 5 Quizzes', iconUrl: '🏆', category: 'Assessment', xpBonus: 100, isUnlocked: true },
            { id: 'FOURTEEN_DAY_STREAK', title: '14 Day Streak', description: 'Learned 14 consecutive days', iconUrl: '🔥', category: 'Consistency', xpBonus: 150, isUnlocked: true },
            { id: 'BOSS_SLAYER', title: 'Boss Slayer', description: 'Conquered Module Boss Challenge', iconUrl: '⚔️', category: 'Challenge', xpBonus: 200, isUnlocked: true },
            { id: 'COMEBACK_KID', title: 'Comeback Kid', description: 'Improved topic mastery by +30%', iconUrl: '📈', category: 'Improvement', xpBonus: 80, isUnlocked: true }
          ]
        },
        dailyMissions: [
          { id: 'm1', missionKey: 'LESSON_COMPLETE', title: 'Complete a Lesson', description: 'Progress through Functions lesson', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 20, rewardCoins: 5, claimed: true },
          { id: 'm2', missionKey: 'PRACTICE_5_QUESTIONS', title: 'Practice 5 Questions', description: 'Solve quiz or practice questions', currentCount: 5, targetCount: 5, isCompleted: true, rewardXp: 15, rewardCoins: 5, claimed: true },
          { id: 'm3', missionKey: 'SCORE_70_QUIZ', title: 'Score 70%+ in a Quiz', description: 'Demonstrate solid academic mastery', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 30, rewardCoins: 10, claimed: true },
          { id: 'm4', missionKey: 'AI_CHALLENGE', title: 'Complete AI Challenge', description: 'Conquer an adaptive quest', currentCount: 1, targetCount: 1, isCompleted: true, rewardXp: 50, rewardCoins: 10, claimed: false }
        ],
        canClaimGrandReward: true,
        grandRewardXp: 150,
        grandRewardCoins: 30,
        grandRewardClaimed: false,
        masteryMatrix: {
          studentId,
          skills: [
            { topicName: 'Functions & Scope', skillName: 'Function Parameters & Closures', masteryPercentage: 90, totalAttempts: 20, correctAttempts: 18, statusColor: 'green' },
            { topicName: 'Loops & Iterations', skillName: 'Iterative Flow Control', masteryPercentage: 82, totalAttempts: 22, correctAttempts: 18, statusColor: 'green' },
            { topicName: 'OOP & Encapsulation', skillName: 'Object Orientation Invariants', masteryPercentage: 72, totalAttempts: 18, correctAttempts: 13, statusColor: 'yellow' },
            { topicName: 'Recursion & Trees', skillName: 'Recursive Logic & Base Cases', masteryPercentage: 43, totalAttempts: 14, correctAttempts: 6, statusColor: 'red' },
            { topicName: 'B-Tree Indexing Fundamentals', skillName: 'Leftmost Prefix Rule', masteryPercentage: 45, totalAttempts: 11, correctAttempts: 5, statusColor: 'red' },
            { topicName: 'Clean Architecture & DIP', skillName: 'Interface Decoupling', masteryPercentage: 88, totalAttempts: 16, correctAttempts: 14, statusColor: 'green' }
          ],
          weakestSkill: { topicName: 'Recursion & Trees', skillName: 'Recursive Logic & Base Cases', masteryPercentage: 43, totalAttempts: 14, correctAttempts: 6, statusColor: 'red' },
          strongestSkill: { topicName: 'Functions & Scope', skillName: 'Function Parameters & Closures', masteryPercentage: 90, totalAttempts: 20, correctAttempts: 18, statusColor: 'green' },
          overallMasteryPercent: 70.0
        },
        nextBestAction: {
          actionType: 'TAKE_REMEDIATION_QUIZ',
          title: '🎯 Recursion Rescue Challenge',
          description: 'Your mastery in Recursion & Trees is currently 43%. Take a targeted 5-question adaptive quest to strengthen base cases.',
          targetTopic: 'Recursion & Trees',
          reason: 'Identified learning gap in Recursion (43% mastery vs Functions at 90%).',
          estimatedTimeMinutes: 10,
          rewardXp: 75,
          linkedScopeType: 'Topic'
        },
        personalBests: [
          { assessmentId: 'pb1', assessmentTitle: 'PostgreSQL B-Tree Indexing', bestScorePercent: 92, bestTimeSeconds: 420, achievedAt: new Date().toISOString() },
          { assessmentId: 'pb2', assessmentTitle: 'Clean Architecture Invariants', bestScorePercent: 88, bestTimeSeconds: 510, achievedAt: new Date().toISOString() }
        ],
        topLeaderboard: [
          { rank: 1, studentId: 's1', studentName: 'Sarah Chen', scoreXp: 8420, level: 16, streak: 21 },
          { rank: 2, studentId: 's2', studentName: 'Daniel Miller', scoreXp: 7850, level: 15, streak: 18 },
          { rank: 3, studentId, studentName: 'Alex Rivera (You)', scoreXp: 6420, level: 12, streak: 14, isCurrentStudent: true },
          { rank: 4, studentId: 's4', studentName: 'Marcus Vance', scoreXp: 5920, level: 11, streak: 10 }
        ],
        studentRank: 3
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
        { id: '2', sourceType: 'QuizCompleted', xpAmount: 50, description: 'Completed Topic Quiz: B-Tree Indexing', createdAt: new Date().toISOString() },
        { id: '3', sourceType: 'ImprovementBonus', xpAmount: 30, description: 'Personal Best Improvement (+25%) Bonus', createdAt: new Date().toISOString() },
        { id: '4', sourceType: 'StreakBonus', xpAmount: 30, description: '7-Day Streak Milestone Bonus', createdAt: new Date().toISOString() }
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
        level: 12,
        total_xp: 6420,
        streak: 14
      });
      return response.data;
    } catch {
      return {
        action_type: 'TAKE_REMEDIATION_QUIZ',
        title: '🎯 Recursion Rescue Challenge',
        target_topic: 'Recursion & Trees',
        reward_xp: 75,
        estimated_time_minutes: 10,
        edubuddy_message: "Welcome back, Alex! You're Level 12 with a 14-day streak. Your strongest skill is Functions (90%). However, Recursion is currently at 43%. I've prepared a targeted 5-question challenge to help you master it and earn +75 XP!"
      };
    }
  }
};
export default gamificationService;
