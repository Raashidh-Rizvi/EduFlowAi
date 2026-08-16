import api from './api';

export const quizService = {
  async getQuizzes(courseId) {
    try {
      const response = await api.get(`/quizzes/course/${courseId}`);
      return response.data;
    } catch {
      return [];
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
