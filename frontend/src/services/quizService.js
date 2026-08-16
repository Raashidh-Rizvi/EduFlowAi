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
          courseId: courseId || '44444444-4444-4444-4444-444444444444',
          title: 'Diagnostic Quiz: PostgreSQL Indexing & Query Execution Plans',
          description: 'Evaluate your understanding of Clean Architecture and Gamification Engines.',
          timeLimitMinutes: 20,
          passingScorePercent: 70,
          xpReward: 60,
          coinReward: 25,
          questionsCount: 3
        }
      ];
    }
  },

  async getQuizById(quizId) {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      return response.data;
    } catch (err) {
      console.warn('Falling back to local quiz detail', err);
      return null;
    }
  },

  async createQuiz(data) {
    const response = await api.post('/quizzes', data);
    return response.data;
  },

  async updateQuiz(quizId, data) {
    const response = await api.put(`/quizzes/${quizId}`, data);
    return response.data;
  },

  async deleteQuiz(quizId) {
    const response = await api.delete(`/quizzes/${quizId}`);
    return response.data;
  },

  async generateAiQuiz(data) {
    const response = await api.post('/quizzes/generate-ai', data);
    return response.data;
  },

  async uploadQuiz(data) {
    const response = await api.post('/quizzes/upload-quiz', data);
    return response.data;
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
