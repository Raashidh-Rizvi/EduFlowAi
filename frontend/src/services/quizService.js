import api from './api';

export const quizService = {
  async getQuizzes(courseId) {
    try {
      const response = await api.get(`/quizzes/course/${courseId}`);
      return response.data;
    } catch {
      return [
        {
          id: '99999999-9999-9999-9999-999999999999',
          title: 'Module 1 Mastery Quiz',
          description: 'Evaluate your understanding of Clean Architecture and Gamification Engines.',
          timeLimitMinutes: 15,
          passingScorePercent: 70,
          xpReward: 60,
          coinReward: 25,
          questionsCount: 2
        }
      ];
    }
  },

  async startQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/start`);
    return response.data;
  },

  async submitQuiz(quizId, answers) {
    const response = await api.post('/quizzes/submit', { quizId, answers });
    return response.data;
  }
};
