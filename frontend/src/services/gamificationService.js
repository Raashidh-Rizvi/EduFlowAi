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
        totalXp: 0,
        currentLevel: 1,
        levelName: 'Novice Explorer',
        minXpForCurrentLevel: 0,
        maxXpForNextLevel: 500,
        xpProgressInCurrentLevel: 0,
        xpRequiredForNextLevel: 500,
        coins: 0,
        currentStreak: 0,
        longestStreak: 0,
        freezeTokensAvailable: 1,
        badgesCount: 0
      };
    }
  },

  async getWeeklyLeaderboard(top = 20) {
    try {
      const response = await api.get(`/leaderboard/weekly?top=${top}`);
      return response.data;
    } catch {
      return [
        { rank: 1, studentName: 'Alex Rivera', scoreXp: 0, level: 1, streak: 0, avatarUrl: null }
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
