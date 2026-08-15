import api from './api';

export const gamificationService = {
  async getStudentProfile() {
    try {
      const response = await api.get('/gamification/students/me/profile');
      return response.data;
    } catch {
      // Fallback
      return {
        studentId: '33333333-3333-3333-3333-333333333333',
        studentName: 'Alex Rivera',
        totalXp: 1250,
        currentLevel: 2,
        levelName: 'Code Apprentice',
        minXpForCurrentLevel: 500,
        maxXpForNextLevel: 1500,
        xpProgressInCurrentLevel: 750,
        xpRequiredForNextLevel: 1000,
        coins: 180,
        currentStreak: 5,
        longestStreak: 12,
        freezeTokensAvailable: 2,
        badgesCount: 4
      };
    }
  },

  async getWeeklyLeaderboard(top = 20) {
    try {
      const response = await api.get(`/leaderboard/weekly?top=${top}`);
      return response.data;
    } catch {
      return [
        { rank: 1, studentName: 'Maya Patel', scoreXp: 8420, level: 6, streak: 18, avatarUrl: null },
        { rank: 2, studentName: 'Alex Rivera', scoreXp: 4890, level: 4, streak: 12, avatarUrl: null },
        { rank: 3, studentName: 'Chen Wei', scoreXp: 4650, level: 4, streak: 9, avatarUrl: null },
        { rank: 4, studentName: 'Elena Rostova', scoreXp: 2940, level: 3, streak: 6, avatarUrl: null },
        { rank: 5, studentName: 'Tariq Mansoor', scoreXp: 2810, level: 3, streak: 5, avatarUrl: null }
      ];
    }
  },

  async getAllBadges() {
    try {
      const response = await api.get('/gamification/badges');
      return response.data;
    } catch {
      return [
        { id: 'FIRST_LESSON', title: 'First Step', description: 'Completed first lesson', iconUrl: '🚀', isUnlocked: true },
        { id: 'QUIZ_MASTER', title: 'Quiz Ace', description: 'Scored 100% on a quiz', iconUrl: '🎯', isUnlocked: true },
        { id: 'SEVEN_DAY_STREAK', title: 'Unstoppable', description: '7-day study streak', iconUrl: '🔥', isUnlocked: false },
        { id: 'CHALLENGE_CHAMPION', title: 'Boss Slayer', description: 'Defeated 5 boss encounters', iconUrl: '🏆', isUnlocked: false }
      ];
    }
  },

  async useStreakFreeze() {
    const response = await api.post('/gamification/streaks/freeze');
    return response.data;
  },

  async submitChallenge(challengeId, answers) {
    const response = await api.post(`/challenges/${challengeId}/submit`, { attemptAnswers: answers });
    return response.data;
  }
};
